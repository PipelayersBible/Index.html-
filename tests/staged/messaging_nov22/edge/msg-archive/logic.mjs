// msg-archive: turns one chat (pb_msg_svc_archive_next) into the archive file(s). No network here: photos come from getPhoto(path).
// Output per part: README.txt, manifest.json; part 1 also transcript.txt, transcript.html, chat.json; photos/NNNN-<seq>-<n>.jpg.
import { makeZip } from './zip.mjs';
export const PART_LIMIT = 60 * 1048576; // photos per part (an edge function has about 256 MB to work in)
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function sha256(b) { const h = await crypto.subtle.digest('SHA-256', b); return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join(''); }
export function fmtTime(iso, tz) {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return String(iso);
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
  } catch (_e) { return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; }
}
export function safeName(s) { return String(s || 'chat').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'chat'; }
export function archiveBase(p, now = new Date()) {
  const c = p.chat || {};
  const what = c.kind === 'job' ? 'Job-' + safeName(c.job_number || c.job_key) : 'Direct-message';
  return `${what}-chat-${now.toISOString().slice(0, 10)}`;
}
export function storagePath(p, archiveId, now = new Date()) {
  const keep = p.retention === '13m' ? '13m' : 'keep';
  const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15); // 20261122T140301
  return `${p.company.id}/${keep}/${p.chat.id}/${stamp}-${String(archiveId).slice(0, 8)}`;
}
// the photo file names, in message order
export function photoList(p) {
  const out = []; let i = 0;
  for (const m of p.messages || []) (m.photos || []).forEach((ph, k) => { i++; out.push({ path: ph.path, bytes: Number(ph.bytes) || 0, seq: m.seq, file: `photos/${String(i).padStart(4, '0')}-${m.seq}-${k + 1}.jpg` }); });
  return out;
}
export function transcriptText(p, photos) {
  const tz = p.tz || 'UTC', c = p.chat || {}, L = [];
  const byPath = new Map(photos.map((x) => [x.path, x.file]));
  const vers = new Map(); for (const v of p.versions || []) { if (!vers.has(v.message_id)) vers.set(v.message_id, []); vers.get(v.message_id).push(v); }
  L.push("The Pipelayer's Bible - company messages (archive)");
  L.push(`Company: ${p.company?.name || ''}`);
  L.push(`Chat: ${c.title || ''}${c.kind === 'job' ? ' (job chat)' : ' (direct message)'}`);
  L.push(`Started: ${fmtTime(c.created_at, tz)}${c.closed_at ? '   Closed: ' + fmtTime(c.closed_at, tz) : ''}`);
  L.push(`Saved: ${fmtTime(p.server_at, tz)}   Why: ${p.archive?.reason || ''}   Times are ${tz} (the company's time zone)`);
  L.push(`Messages: ${(p.messages || []).length}   Photos: ${photos.length}`);
  if (c.kind === 'job') L.push(`Pipelayers included: ${c.include_pipelayers ? 'yes' : 'no'}   Pipelayers see: ${c.pipelayer_history === 'all' ? 'whole chat' : 'from when added'}`);
  L.push('Deleted and edited messages are shown with their earlier text: this file is the company record.');
  L.push(''.padEnd(72, '-'));
  for (const m of p.messages || []) {
    const head = `[${fmtTime(m.at, tz)}] #${m.seq} ${m.author_name || 'Someone'}:`;
    if (m.deleted_at) {
      const orig = (vers.get(m.id) || []).find((v) => v.action === 'delete');
      L.push(`${head} (MESSAGE DELETED by ${m.deleted_by || 'someone'} at ${fmtTime(m.deleted_at, tz)})`);
      if (orig) L.push(`    text before it was deleted: ${orig.body == null ? '(photo only)' : orig.body}`);
    } else {
      L.push(`${head} ${m.body == null ? '' : m.body}`);
    }
    for (const v of (vers.get(m.id) || []).filter((x) => x.action === 'edit')) L.push(`    (edited; version ${v.version} said: ${v.body == null ? '' : v.body})`);
    for (const ph of m.photos || []) L.push(`    [photo: ${byPath.get(ph.path) || ph.path}]`);
    if (m.phone_at && Math.abs(Date.parse(m.phone_at) - Date.parse(m.at)) > 120000) L.push(`    (typed on the phone at ${fmtTime(m.phone_at, tz)}, sent when it had signal)`);
  }
  L.push(''.padEnd(72, '-'));
  L.push('Changes to this chat:');
  for (const l of p.log || []) L.push(`[${fmtTime(l.at, tz)}] ${l.by || 'The app'}: ${l.what}${l.target ? ' ' + l.target : ''}${l.new != null ? ' -> ' + JSON.stringify(l.new) : ''}`);
  L.push('People on the chat:');
  for (const x of p.people || []) L.push(`  ${x.name} (${x.state}, added ${fmtTime(x.since, tz)})`);
  return L.join('\n') + '\n';
}
export function transcriptHtml(p, photos) {
  const tz = p.tz || 'UTC', c = p.chat || {};
  const byPath = new Map(photos.map((x) => [x.path, x.file]));
  const vers = new Map(); for (const v of p.versions || []) { if (!vers.has(v.message_id)) vers.set(v.message_id, []); vers.get(v.message_id).push(v); }
  const rows = (p.messages || []).map((m) => {
    const del = m.deleted_at ? (vers.get(m.id) || []).find((v) => v.action === 'delete') : null;
    const body = m.deleted_at ? `<p class="d">Message deleted by ${esc(m.deleted_by || 'someone')} at ${esc(fmtTime(m.deleted_at, tz))}.${del ? ' Text before: ' + esc(del.body == null ? '(photo only)' : del.body) : ''}</p>` : `<p>${esc(m.body || '')}</p>`;
    const eds = (vers.get(m.id) || []).filter((x) => x.action === 'edit').map((v) => `<p class="e">Edited. Version ${v.version} said: ${esc(v.body || '')}</p>`).join('');
    const imgs = (m.photos || []).map((ph) => { const f = byPath.get(ph.path); return f ? `<a href="${esc(f)}"><img src="${esc(f)}" alt="Photo" loading="lazy" width="280"></a>` : ''; }).join('');
    return `<div class="m"><div class="h"><b>${esc(m.author_name || 'Someone')}</b> <span>${esc(fmtTime(m.at, tz))} · #${m.seq}</span></div>${body}${eds}${imgs}</div>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(c.title || 'Chat')} - messages</title>
<style>body{font:15px/1.45 system-ui,Arial,sans-serif;margin:16px;max-width:760px;color:#111}h1{font-size:20px}.m{border-bottom:1px solid #ccc;padding:8px 0}.h span{color:#555}.d{color:#8a1c1c}.e{color:#555;font-size:13px}img{margin:4px 4px 0 0;max-width:100%;height:auto;border:1px solid #999}</style></head><body>
<h1>${esc(c.title || 'Chat')}</h1><p>${esc(p.company?.name || '')} · saved ${esc(fmtTime(p.server_at, tz))} · times are ${esc(tz)} · ${(p.messages || []).length} messages, ${photos.length} photos. Deleted and edited messages show their earlier text: this file is the company record.</p>
${rows}
</body></html>
`;
}
function readme(p, part, parts, list) {
  return [
    "The Pipelayer's Bible - chat archive",
    `${p.chat?.title || ''} - ${p.company?.name || ''}`,
    parts > 1 ? `Part ${part} of ${parts}. Keep all parts together.` : 'One file holds the whole chat.',
    '',
    'How to open: unzip it (double-click on a computer). transcript.txt opens in any text editor; transcript.html opens in any',
    'web browser with the photos shown (no internet needed). chat.json has everything, including every earlier version.',
    '',
    'SHA-256 of each file (to show nothing was changed):',
    ...list.map((x) => `${x.sha256}  ${x.name}`),
    '',
  ].join('\n');
}
// -> [{ name: '<base>.zip' | '<base>-part1of2.zip', bytes: Uint8Array, sha256, photos }]
export async function buildArchive(p, getPhoto, opts = {}) {
  const now = opts.now || new Date(p.server_at || Date.now());
  const photos = photoList(p);
  const limit = opts.partLimit || PART_LIMIT;
  const groups = [[]]; let size = 0;
  for (const ph of photos) { if (size + ph.bytes > limit && groups[groups.length - 1].length) { groups.push([]); size = 0; } groups[groups.length - 1].push(ph); size += ph.bytes; }
  const base = archiveBase(p, now), out = [];
  const json = JSON.stringify({ format: 'pb-chat-archive/1', saved_at: p.server_at, tz: p.tz, company: p.company, chat: p.chat, archive: p.archive, retention: p.retention,
    messages: p.messages, versions: p.versions, people: p.people, log: p.log, photos: photos.map((x) => ({ file: x.file, path: x.path, seq: x.seq, bytes: x.bytes })) }, null, 1);
  for (let g = 0; g < groups.length; g++) {
    const files = [];
    if (g === 0) {
      files.push({ name: 'transcript.txt', data: transcriptText(p, photos), compress: true, date: now });
      files.push({ name: 'transcript.html', data: transcriptHtml(p, photos), compress: true, date: now });
      files.push({ name: 'chat.json', data: json, compress: true, date: now });
    }
    let missing = 0;
    for (const ph of groups[g]) {
      const b = await getPhoto(ph.path);
      if (!b) { missing++; files.push({ name: ph.file.replace(/\.jpg$/, '.MISSING.txt'), data: `The photo ${ph.path} could not be read when this archive was made.\n`, compress: true, date: now }); continue; }
      files.push({ name: ph.file, data: b, compress: false, date: now });
    }
    const list = [];
    for (const f of files) list.push({ name: f.name, sha256: await sha256(typeof f.data === 'string' ? new TextEncoder().encode(f.data) : f.data) });
    files.unshift({ name: 'manifest.json', data: JSON.stringify({ part: g + 1, parts: groups.length, files: list }, null, 1), compress: true, date: now });
    files.unshift({ name: 'README.txt', data: readme(p, g + 1, groups.length, list), compress: true, date: now });
    const zip = await makeZip(files, opts);
    out.push({ name: groups.length > 1 ? `${base}-part${g + 1}of${groups.length}.zip` : `${base}.zip`, bytes: zip, sha256: await sha256(zip), photos: groups[g].length - missing, missing });
  }
  return out;
}
