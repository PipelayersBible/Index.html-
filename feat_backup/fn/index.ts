// pb-backup: the nightly backup of every pb_* schema (+ public, + auth users' ids/emails) to the private Storage bucket
// pb-backups as <YYYY-MM-DD>/<schema>.json. Keeps 30 daily folders. Logs each run in pb_backup.runs and emails the company
// owner(s) a one-line receipt through Resend (RESEND_API_KEY, the same secret the other mail uses). r15.27, Oct 23 2026.
//
// Deployed WITHOUT JWT verification (pg_cron calls it through pb_backup.kick() with no login); protected by the same shared
// secret header as push-send and pm-digest-email (x-pb-push-secret, vault 'push_cron_secret', read through
// pb_push_svc_cron_secret with the service-role key). Any other caller gets an empty 204 and nothing happens.
// The reads happen inside SECURITY DEFINER functions (pb_backup_dump), so the service role needs no table grants.
//
// Shape (after the first live run was cut off by the runtime when the caller hung up at 8 s): the function answers 204 at
// once and does the work in the background (EdgeRuntime.waitUntil). It uploads the schemas missing from today's folder,
// about 80 s at a time, then calls itself again with the same run id (a "hop"; at most 12) until the folder is complete;
// only then prune + receipt. Progress is written to pb_backup.runs after every file, so a stall is visible there.
// Logs: counts, sizes and status codes only. Never a row, an address or a key.

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const BUCKET = 'pb-backups', KEEP_DAYS = 30, DOMAIN = 'pipelayersbible.com', HOP_MS = 80_000, MAX_HOPS = 12;
const FROM = Deno.env.get('DIGEST_FROM') ?? `The Pipelayer's Bible <alerts${String.fromCharCode(64)}${DOMAIN}>`;
const url = () => Deno.env.get('SUPABASE_URL')!, key = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const empty = () => new Response(null, { status: 204 });
const hdr = (extra: Record<string, string> = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...extra });

async function rpc(name: string, args: Record<string, unknown>) {
  try {
    const r = await fetch(`${url()}/rest/v1/rpc/${name}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) });
    const text = await r.text(); let data: unknown = null; try { data = text.length > 4000 ? null : JSON.parse(text); } catch (_e) { data = null; } // a dump is only ever read as text
    return { ok: r.ok, status: r.status, data, text };
  } catch (_e) { return { ok: false, status: 0, data: null, text: '' }; }
}
function secretMatches(given: string | null, want: string | null): boolean {
  if (!given || !want || given.length !== want.length || want.length < 16) return false;
  let d = 0; for (let i = 0; i < want.length; i++) d |= given.charCodeAt(i) ^ want.charCodeAt(i); return d === 0;
}
async function put(path: string, body: string) {
  const r = await fetch(`${url()}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json', 'x-upsert': 'true' }), body });
  return r.ok;
}
async function list(prefix: string): Promise<{ name: string; id: string | null; metadata?: { size?: number } }[]> {
  const r = await fetch(`${url()}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix, limit: 1000, offset: 0 }) });
  if (!r.ok) return [];
  const j = await r.json(); return Array.isArray(j) ? j : [];
}
async function removeFolder(day: string) {
  const files = (await list(day + '/')).filter((f) => f.id).map((f) => `${day}/${f.name}`);
  if (!files.length) return 0;
  const r = await fetch(`${url()}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: files }) });
  return r.ok ? files.length : 0;
}
const fmtBytes = (n: number) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
const report = (run_id: number | null, status: string | null, files: number | null, bytes: number | null, rows: number | null, error: string | null) =>
  rpc('pb_backup_report', { p_run_id: run_id, p_status: status, p_files: files, p_bytes: bytes, p_rows: rows, p_error: error });

async function receipt(day: string, runId: number | null, files: number, bytes: number, rows: number, error: string) {
  const rk = ((Deno.env.get('RESEND_API_KEY') ?? '').match(/re_[A-Za-z0-9_\-]+/) ?? [''])[0];
  const to = await rpc('pb_backup_recipients', {});
  const addrs: string[] = to.ok && Array.isArray(to.data) ? to.data.filter((x) => typeof x === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)) : [];
  if (!rk || !addrs.length) { console.log('pb-backup: no receipt (' + (rk ? 'no recipients' : 'no RESEND_API_KEY') + ')'); return; }
  const subject = error ? `Backup FAILED ${day}` : `Backup done ${day}: ${files} files, ${fmtBytes(bytes)}`;
  const text = error
    ? `The nightly backup of The Pipelayer's Bible did not finish (${day}).\n\nReason: ${error}\n\nIt tries again tomorrow night. Nothing in the app is affected; this is only the copy of the data.`
    : `The nightly backup of The Pipelayer's Bible finished (${day}).\n\n${files} files, ${fmtBytes(bytes)}${rows > 0 ? ', ' + rows.toLocaleString() + ' rows' : ''}, in the private storage bucket "${BUCKET}" under ${day}/. The last ${KEEP_DAYS} days are kept.\n\nNo action needed.`;
  for (const [i, a] of addrs.entries()) {
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rk}`, 'Idempotency-Key': `pb-backup/${day}/${runId ?? 'x'}/${i}` },
        body: JSON.stringify({ from: FROM, to: [a], subject, text }) });
      if (!r.ok) console.log('pb-backup: receipt refused, status', r.status);
    } catch (_e) { console.log('pb-backup: receipt not sent'); }
    await new Promise((ok) => setTimeout(ok, 150));
  }
}

async function work(secret: string, runIn: number | null, hop: number) {
  const t0 = Date.now(), day = new Date().toISOString().slice(0, 10);
  let runId = runIn;
  if (runId === null) { const s = await report(null, null, null, null, null, null); runId = s.ok && s.data && typeof s.data === 'object' ? (s.data as { run_id?: number }).run_id ?? null : null; }
  let files = 0, bytes = 0, rows = 0, error = '', left = 0;
  try {
    const sch = await rpc('pb_backup_schemas', {});
    const schemas: string[] = sch.ok && Array.isArray(sch.data) ? sch.data.filter((x) => typeof x === 'string') : [];
    if (!schemas.length) throw new Error('no schema list (status ' + sch.status + ')');
    // v4: only a later hop of the SAME run skips what is already in the folder; a fresh run rewrites today's folder
    // (an earlier manual run on the same UTC day used to make the 09:00 run a no-op)
    const have = runIn !== null ? new Set((await list(day + '/')).filter((f) => f.id).map((f) => f.name.replace(/\.json$/, ''))) : new Set<string>();
    const todo = schemas.filter((s) => !have.has(s));
    for (const schema of todo) {
      if (Date.now() - t0 > HOP_MS) { left++; continue; }
      const d = await rpc('pb_backup_dump', { p_schema: schema });
      if (!d.ok || !d.text.startsWith('{')) throw new Error('dump ' + schema + ' failed (status ' + d.status + ')');
      if (!(await put(`${day}/${schema}.json`, d.text))) throw new Error('upload ' + schema + ' failed');
      const n = Number((d.text.slice(0, 300).match(/"rows":\s*(\d+)/) ?? [])[1]) || 0;
      files++; bytes += d.text.length; rows += n;
      await report(runId, 'running', 1, d.text.length, n, null);
    }
    if (left) {
      if (hop >= MAX_HOPS) throw new Error(`${left} schemas left after ${hop} hops`);
      console.log(`pb-backup: hop ${hop} did ${files} files, ${fmtBytes(bytes)}; ${left} left, calling again`);
      const r = await fetch(`${url()}/functions/v1/pb-backup`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-pb-push-secret': secret }, body: JSON.stringify({ run_id: runId, hop: hop + 1 }) });
      if (!r.ok) throw new Error('next hop refused (status ' + r.status + ')');
      return;
    }
    // the folder is complete: its real totals go on the run and the receipt (a re-run the same day uploads nothing)
    const folder = (await list(day + '/')).filter((f) => f.id);
    files = folder.length; bytes = folder.reduce((a, f) => a + (Number(f.metadata && f.metadata.size) || 0), 0);
    // keep 30 days (folders are named by day, so anything older sorts before the cutoff)
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    let pruned = 0;
    for (const f of await list('')) { if (!f.id && /^\d{4}-\d{2}-\d{2}$/.test(f.name) && f.name < cutoff) pruned += await removeFolder(f.name); }
    console.log(`pb-backup: ${day} complete after ${hop} hop(s): ${files} files, ${fmtBytes(bytes)}; pruned ${pruned} old files`);
  } catch (e) { error = String((e as Error).message || e).slice(0, 300); console.log('pb-backup: failed:', error); }
  // the final report SETS files/bytes (the folder's totals when complete) and returns the run's summed rows
  const fin = await report(runId, error ? 'failed' : 'done', error ? null : files, error ? null : bytes, null, error || null);
  const tot = fin.ok && fin.data && typeof fin.data === 'object' ? fin.data as { files?: number; bytes?: number; rows?: number } : {};
  await receipt(day, runId, Number(tot.files) || files, Number(tot.bytes) || bytes, Number(tot.rows) || rows, error);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return empty();
  const given = req.headers.get('x-pb-push-secret');
  if (!given || given.length < 16 || given.length > 200) return empty();
  const s = await rpc('pb_push_svc_cron_secret', {});
  if (!s.ok || !secretMatches(given, typeof s.data === 'string' ? s.data : null)) { console.log('pb-backup: refused'); return empty(); }
  let runId: number | null = null, hop = 1;
  try { const b = await req.json(); if (b && Number.isFinite(Number(b.run_id))) runId = Number(b.run_id); if (b && Number.isFinite(Number(b.hop))) hop = Math.max(1, Math.min(MAX_HOPS + 1, Number(b.hop))); } catch (_e) { /* no body: a fresh run */ }
  const job = work(given, runId, hop);
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime) EdgeRuntime.waitUntil(job); else await job;
  return empty();
});
