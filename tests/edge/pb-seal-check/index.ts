// pb-seal-check (r16.80, Nov 17 2026): the server's own check of each sealed run original.
// Called every 10 minutes by pg_cron (pb_prod.seal_check_kick) only while a seal has no check yet.
// For each new seal it downloads the PDF from run-seals, computes its SHA-256 itself, asks two outside time-stamp
// authorities (RFC 3161: DigiCert and FreeTSA) to stamp that SHA-256, and records the result in pb_prod.run_seal_checks
// (insert-only); r16.85: also time-stamps each finished day of the admin access log (pb_audit.log_days). A time-stamp token proves the file's fingerprint existed at that time, independent of this server.
// Protected by the shared secret header x-pb-push-secret (vault push_cron_secret), like pb-backup. Logs counts only.
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
// TimeStampReq { version 1, messageImprint { sha256, hash }, nonce, certReq TRUE }
function tsq(hash: Uint8Array): Uint8Array {
  const nonce = crypto.getRandomValues(new Uint8Array(8)); nonce[0] &= 0x7f; if (nonce[0] === 0) nonce[0] = 1;
  const mi = [0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20, ...hash];
  const body = [0x02, 0x01, 0x01, ...mi, 0x02, 0x08, ...nonce, 0x01, 0x01, 0xff];
  return new Uint8Array([0x30, body.length, ...body]);
}
// PKIStatus from a TimeStampResp: 0 granted, 1 granted with mods, else refused
function tsStatus(u: Uint8Array): number | null {
  try {
    let i = 0; const len = () => { let l = u[i++]; if (l & 0x80) { const n = l & 0x7f; l = 0; for (let k = 0; k < n; k++) l = (l << 8) | u[i++]; } return l; };
    if (u[i++] !== 0x30) return null; len();
    if (u[i++] !== 0x30) return null; len();
    if (u[i++] !== 0x02) return null; const n = len(); let v = 0; for (let k = 0; k < n; k++) v = (v << 8) | u[i++]; return v;
  } catch (_e) { return null; }
}
const TSAS = [{ name: 'DigiCert', url: 'http://timestamp.digicert.com' }, { name: 'FreeTSA', url: 'https://freetsa.org/tsr' }];
async function stamp(hash: Uint8Array) {
  const out: Record<string, unknown>[] = [];
  for (const t of TSAS) {
    try {
      const r = await fetch(t.url, { method: 'POST', headers: { 'Content-Type': 'application/timestamp-query' }, body: tsq(hash), signal: AbortSignal.timeout(15000) });
      const u = new Uint8Array(await r.arrayBuffer()), st = r.ok ? tsStatus(u) : null;
      out.push({ name: t.name, url: t.url, http: r.status, status: st, ok: st === 0 || st === 1, token: (st === 0 || st === 1) && u.length < 20000 ? b64(u) : null, at: new Date().toISOString() });
    } catch (e) { out.push({ name: t.name, url: t.url, ok: false, error: String((e as Error).name || 'error').slice(0, 40), at: new Date().toISOString() }); }
  }
  return out;
}
Deno.serve(async (req) => {
  if (req.method !== 'POST') return empty();
  const given = req.headers.get('x-pb-push-secret') || '';
  if (given.length < 16 || given.length > 200) return empty();
  const s = await rpc('pb_push_svc_cron_secret', {});
  if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();
  if (new URL(req.url).searchParams.get('probe') === '1') { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pb-seal-check probe')); const t = await stamp(new Uint8Array(h)); console.log(JSON.stringify({ probe: t.map((x) => ({ name: x.name, http: x.http, status: x.status, ok: x.ok, len: x.token ? String(x.token).length : 0, error: x.error })) })); return empty(); }
  const todo = await rpc('pb_seal_check_todo', { p_limit: 5 });
  const list = Array.isArray(todo.data) ? todo.data as { id: string; path: string; sha256: string; bytes: number }[] : [];
  let n = 0, bad = 0;
  for (const sl of list) {
    let sha: string | null = null, bytes: number | null = null, tsa: unknown = [];
    try {
      const r = await fetch(`${url()}/storage/v1/object/run-seals/${sl.path.split('/').map(encodeURIComponent).join('/')}`, { headers: hdr() });
      if (r.ok) { const buf = await r.arrayBuffer(); bytes = buf.byteLength; const h = await crypto.subtle.digest('SHA-256', buf); sha = hex(h); tsa = await stamp(new Uint8Array(h)); }
    } catch (_e) { sha = null; }
    if (sha === null) continue; // the file couldn't be read: tried again next time
    await rpc('pb_seal_check_put', { p_seal: sl.id, p_sha: sha, p_bytes: bytes, p_tsa: tsa });
    n++; if (sha !== sl.sha256) bad++;
  }
  const pt = await rpc('pb_photo_check_todo', { p_limit: 20 });
  const photos = Array.isArray(pt.data) ? pt.data as { name: string; at: string }[] : [];
  let pn = 0, pbad = 0;
  for (const ph of photos) {
    try {
      const r = await fetch(`${url()}/storage/v1/object/run-photos/${ph.name.split('/').map(encodeURIComponent).join('/')}`, { headers: hdr() });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer(), sha = hex(await crypto.subtle.digest('SHA-256', buf));
      await rpc('pb_photo_check_put', { p_name: ph.name, p_sha: sha, p_bytes: buf.byteLength, p_at: ph.at });
      pn++; if (!ph.name.endsWith(sha + '.jpg')) pbad++;
    } catch (_e) { /* tried again next time */ }
  }
  // r16.85: each finished day of the admin access log: the database's fingerprint of that day's entries, time-stamped outside
  const dt = await rpc('pb_audit_day_todo', {});
  const days = Array.isArray(dt.data) ? dt.data as { day: string; n: number; sha: string }[] : [];
  let dn = 0;
  for (const d of days) {
    if (!/^[0-9a-f]{64}$/.test(String(d.sha || ''))) continue;
    const bytes = new Uint8Array(32); for (let i = 0; i < 32; i++) bytes[i] = parseInt(d.sha.slice(i * 2, i * 2 + 2), 16);
    const tsa = await stamp(bytes);
    if (!tsa.some((t) => t.ok)) continue; // no outside stamp: tried again next hour
    const put = await rpc('pb_audit_day_put', { p_day: d.day, p_sha: d.sha, p_tsa: tsa });
    if (put.ok && (put.data as { ok?: boolean })?.ok) dn++;
  }
  console.log(JSON.stringify({ seal_check: n, mismatched: bad, waiting: list.length - n, photos_checked: pn, photos_mismatched: pbad, log_days_stamped: dn, log_days_due: days.length }));
  return empty();
});
