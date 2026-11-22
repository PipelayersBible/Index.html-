// msg-archive (messaging_nov22, staged, NOT deployed): writes a chat's archive file(s) and, for companies that keep
// messages 13 months, deletes their old photos and archives through the Storage API (live storage refuses SQL deletes).
// Deploy WITHOUT JWT verification (pg_net / pg_cron call it): supabase functions deploy msg-archive --no-verify-jwt
//   files: index.ts, logic.mjs, zip.mjs. Protected by x-pb-push-secret (vault 'push_cron_secret', the same secret
//   pb_push.kick / pb-offsite use). Called by pb_msg.kick_archive() when the office closes a chat or taps Save archive now,
//   and by the daily pb_msg.sweep(). Logs counts only (never names, text or paths).
import { buildArchive, storagePath } from './logic.mjs';
const url = () => Deno.env.get('SUPABASE_URL')!, key = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const hdr = (x: Record<string, string> = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...x });
const empty = () => new Response(null, { status: 204 });
async function rpc(name: string, args: Record<string, unknown>) {
  const r = await fetch(`${url()}/rest/v1/rpc/${name}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify(args) });
  let data: unknown = null; try { data = await r.json(); } catch (_e) { data = null; }
  return { ok: r.ok, status: r.status, data };
}
function same(a: string, b: string) { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');
async function getPhoto(path: string): Promise<Uint8Array | null> {
  const r = await fetch(`${url()}/storage/v1/object/msg-photos/${enc(path)}`, { headers: hdr() });
  if (!r.ok) { try { await r.body?.cancel(); } catch (_e) { /* */ } return null; }
  return new Uint8Array(await r.arrayBuffer());
}
async function put(path: string, body: Uint8Array) {
  const r = await fetch(`${url()}/storage/v1/object/msg-archives/${enc(path)}`, { method: 'POST', headers: hdr({ 'Content-Type': 'application/zip', 'x-upsert': 'false' }), body: body as unknown as BodyInit });
  const t = r.ok ? '' : (await r.text()).slice(0, 200);
  return { ok: r.ok, status: r.status, t };
}
async function remove(bucket: string, names: string[]) {
  if (!names.length) return true;
  const r = await fetch(`${url()}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: names }) });
  try { await r.body?.cancel(); } catch (_e) { /* */ }
  return r.ok;
}
async function oneArchive(): Promise<string> {
  const n = await rpc('pb_msg_svc_archive_next', {});
  const p = n.data as Record<string, any> | null;
  if (!n.ok || !p || !p.ok) return 'next_failed';
  if (!p.archive) return 'none';
  const id = String(p.archive.id), now = new Date(p.server_at || Date.now());
  try {
    const parts = await buildArchive(p, getPhoto, { now });
    const base = storagePath(p, id, now), files: { path: string; bytes: number; sha256: string }[] = [];
    let photos = 0, missing = 0;
    for (const f of parts) {
      const path = `${base}-${f.name}`;
      const u = await put(path, f.bytes);
      if (!u.ok) throw new Error('upload ' + u.status);
      files.push({ path, bytes: f.bytes.length, sha256: f.sha256 }); photos += f.photos; missing += f.missing;
    }
    const msgs = Array.isArray(p.messages) ? p.messages : [];
    await rpc('pb_msg_svc_archive_done', { p_id: id, p_ok: true, p_files: files, p_bytes: files.reduce((s, f) => s + f.bytes, 0), p_messages: msgs.length,
      p_photos: photos, p_upto_seq: msgs.length ? msgs[msgs.length - 1].seq : 0, p_note: missing ? `${missing} photo(s) could not be read` : null });
    console.log(JSON.stringify({ archive: 'done', parts: parts.length, bytes: files.reduce((s, f) => s + f.bytes, 0), messages: msgs.length, photos, missing }));
    return 'done';
  } catch (e) {
    await rpc('pb_msg_svc_archive_done', { p_id: id, p_ok: false, p_files: null, p_bytes: null, p_messages: null, p_photos: null, p_upto_seq: null, p_note: String((e as Error).message || 'error').slice(0, 120) });
    console.log(JSON.stringify({ archive: 'failed', why: String((e as Error).message || 'error').slice(0, 60) }));
    return 'failed';
  }
}
async function purge() {
  const l = await rpc('pb_msg_svc_purge_list', { p_limit: 500 });
  const d = l.data as { ok?: boolean; archives?: { id: string; files: { path: string }[] }[]; photos?: string[] } | null;
  if (!l.ok || !d || !d.ok) return;
  const done: string[] = [];
  for (const a of d.archives || []) if (await remove('msg-archives', (a.files || []).map((f) => f.path))) done.push(a.id);
  if (done.length) await rpc('pb_msg_svc_purged', { p_archive_ids: done });
  const photosOk = await remove('msg-photos', d.photos || []);
  console.log(JSON.stringify({ purge_archives: done.length, purge_photos: (d.photos || []).length, photos_ok: photosOk }));
}
Deno.serve(async (req) => {
  if (req.method !== 'POST') return empty();
  const given = req.headers.get('x-pb-push-secret') || '';
  if (given.length < 16 || given.length > 200) return empty();
  const s = await rpc('pb_push_svc_cron_secret', {});
  if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();
  const job = (async () => {
    const t0 = Date.now();
    for (let i = 0; i < 5 && Date.now() - t0 < 90000; i++) { const r = await oneArchive(); if (r !== 'done' && r !== 'failed') break; }
    await purge();
  })().catch(() => console.log('msg-archive: run failed'));
  // deno-lint-ignore no-explicit-any
  const er = (globalThis as any).EdgeRuntime;
  if (er && typeof er.waitUntil === 'function') { er.waitUntil(job); return empty(); }
  await job; return empty();
});
