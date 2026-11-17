// pb-offsite (Nov 17 2026): copies run photos, sealed originals, plan sets and the nightly database dump to the owner's
// Backblaze B2 bucket (S3 API). Secrets (set by the owner in the dashboard): B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT.
// Called by pg_cron (pb_backup.offsite_kick) every 10 minutes while files are waiting. Each file is copied once, with
// Object Lock (governance mode) so the app's key can't delete it: evidence 4 years, plan sets 1 year, database dumps 35 days
// (the first of each month 400 days). Recorded in pb_backup.offsite. Protected by x-pb-push-secret. Logs counts only.
import { AwsClient } from 'npm:aws4fetch@1.0.20';
const url = () => Deno.env.get('SUPABASE_URL')!, key = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const hdr = (x: Record<string, string> = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...x });
const empty = () => new Response(null, { status: 204 });
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await fetch(`${url()}/rest/v1/rpc/${name}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) });
  let data: unknown = null; try { data = await r.json(); } catch (_e) { data = null; }
  return { ok: r.ok, status: r.status, data };
}
function same(a: string, b: string) { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768)); return btoa(s); };
// MD5 (Content-MD5 is required by the S3 API for uploads with Object Lock)
export function md5(data: Uint8Array): Uint8Array {
  const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
  const n = data.length, padLen = ((n + 8) >>> 6) + 1 << 6, m = new Uint8Array(padLen); m.set(data); m[n] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(padLen - 8, (n * 8) >>> 0, true); dv.setUint32(padLen - 4, Math.floor(n / 536870912) >>> 0, true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);
  for (let off = 0; off < padLen; off += 64) {
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(off + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const s = S[(i >> 4) * 4 + (i & 3)], t = (A + F + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B; B = (B + ((t << s) | (t >>> (32 - s)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16), ov = new DataView(out.buffer); ov.setUint32(0, a0, true); ov.setUint32(4, b0, true); ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return out;
}
function lockDays(bucket: string, name: string) {
  if (bucket === 'run-photos' || bucket === 'run-seals') return 1461;
  if (bucket === 'plan-sets') return 366;
  return /^\d{4}-\d{2}-01\//.test(name) ? 400 : 35;
}
function b2() {
  const id = Deno.env.get('B2_KEY_ID') || '', sec = Deno.env.get('B2_APP_KEY') || '', bucket = (Deno.env.get('B2_BUCKET') || '').trim();
  const ep = (Deno.env.get('B2_ENDPOINT') || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const m = /^s3\.([a-z0-9-]+)\.backblazeb2\.com$/.exec(ep);
  if (!id || !sec || !bucket || !m) return { err: 'missing:' + [!id && 'B2_KEY_ID', !sec && 'B2_APP_KEY', !bucket && 'B2_BUCKET', !m && 'B2_ENDPOINT'].filter(Boolean).join(',') };
  return { aws: new AwsClient({ accessKeyId: id, secretAccessKey: sec, service: 's3', region: m[1] }), base: `https://${ep}/${encodeURIComponent(bucket)}/` };
}
async function put(c: { aws: AwsClient; base: string }, path: string, body: Uint8Array, days: number | null) {
  const h: Record<string, string> = { 'Content-MD5': b64(md5(body)), 'Content-Type': 'application/octet-stream' };
  let until: string | null = null;
  if (days) { until = new Date(Date.now() + days * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z'); h['x-amz-object-lock-mode'] = 'GOVERNANCE'; h['x-amz-object-lock-retain-until-date'] = until; }
  const r = await c.aws.fetch(c.base + path.split('/').map(encodeURIComponent).join('/'), { method: 'PUT', headers: h, body: body as unknown as BodyInit });
  const txt = r.ok ? '' : (await r.text()).slice(0, 300);
  return { ok: r.ok, status: r.status, until, txt };
}
Deno.serve(async (req) => {
  if (req.method !== 'POST') return empty();
  const given = req.headers.get('x-pb-push-secret') || '';
  if (given.length < 16 || given.length > 200) return empty();
  const s = await rpc('pb_push_svc_cron_secret', {});
  if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();
  const c = b2();
  if ('err' in c) { console.log(JSON.stringify({ offsite: 'not_set_up', why: c.err })); await rpc('pb_offsite_run', { p_copied: 0, p_failed: 0, p_bytes: 0, p_note: String(c.err) }); return empty(); }
  if (new URL(req.url).searchParams.get('probe') === '1') {
    const body = new TextEncoder().encode('pb-offsite probe ' + new Date().toISOString());
    const a = await put(c, 'probe/probe.txt', body, 1), b = a.ok ? null : await put(c, 'probe/probe.txt', body, null);
    console.log(JSON.stringify({ probe_locked: { ok: a.ok, status: a.status, txt: a.txt }, probe_plain: b && { ok: b.ok, status: b.status, txt: b.txt } }));
    return empty();
  }
  const t0 = Date.now();
  const todo = await rpc('pb_offsite_todo', { p_limit: 60 });
  const list = Array.isArray(todo.data) ? todo.data as { bucket: string; name: string; bytes: number }[] : [];
  let n = 0, fail = 0, bytes = 0, lockOff = false, lastErr = '';
  for (const f of list) {
    if (Date.now() - t0 > 100000 || bytes > 200 * 1048576) break;
    try {
      const r = await fetch(`${url()}/storage/v1/object/${f.bucket}/${f.name.split('/').map(encodeURIComponent).join('/')}`, { headers: hdr() });
      if (!r.ok) { fail++; lastErr = 'read ' + r.status; continue; }
      const body = new Uint8Array(await r.arrayBuffer()), sha = hex(await crypto.subtle.digest('SHA-256', body));
      const path = f.bucket + '/' + f.name;
      let p = await put(c, path, body, lockOff ? null : lockDays(f.bucket, f.name));
      if (!p.ok && !lockOff && p.status === 400 && /lock/i.test(p.txt)) { lockOff = true; p = await put(c, path, body, null); } // the bucket has no Object Lock: copy anyway, say so
      if (!p.ok) { fail++; lastErr = 'put ' + p.status + ' ' + p.txt.replace(/\s+/g, ' ').slice(0, 160); continue; }
      await rpc('pb_offsite_put', { p_bucket: f.bucket, p_name: f.name, p_bytes: body.length, p_sha: sha, p_lock_mode: p.until ? 'GOVERNANCE' : null, p_lock_until: p.until });
      n++; bytes += body.length;
    } catch (e) { fail++; lastErr = String((e as Error).name || 'error').slice(0, 60); }
  }
  const note = [lockOff ? 'object_lock_off' : '', lastErr].filter(Boolean).join('; ');
  await rpc('pb_offsite_run', { p_copied: n, p_failed: fail, p_bytes: bytes, p_note: note || null });
  console.log(JSON.stringify({ offsite_copied: n, failed: fail, bytes, waiting: list.length - n, note }));
  return empty();
});
