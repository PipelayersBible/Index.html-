// node edge/msg-archive/test.mjs [outdir]: builds archives from made-up chats, checks them with python's zipfile and
// measures sizes for the cost table. PASS/FAIL lines; exit 1 on any FAIL.
import { buildArchive, photoList, transcriptText, storagePath, PART_LIMIT } from './logic.mjs';
import { makeZip, crc32 } from './zip.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const OUT = process.argv[2] || '/tmp/msgarch'; fs.mkdirSync(OUT, { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// a real-looking JPEG body: the fixtures' run photos if present, else random bytes (JPEG data does not compress)
const FIX = '/home/claude/index.html-/tests/fixtures/evimg';
let jpgs = []; try { jpgs = fs.readdirSync(FIX).filter((f) => /\.jpe?g$/i.test(f)).map((f) => fs.readFileSync(path.join(FIX, f))); } catch (e) {}
const rnd = (n) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = (Math.random() * 256) | 0; b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; return new Uint8Array(b); };
const PHOTO = 120000;
const words = 'pipe truck here loader grade low high manhole MH4 MH5 invert shot stake laser rock trench box shoring locate ticket call me inspector sewer water main bedding stone backfill compaction test passed failed bring slings tomorrow 7am rain delay utility conflict gas line marked depth ok fittings tee bend 45 22 sleeve gasket lube'.split(' ');
function sentence() { const n = 4 + ((Math.random() * 14) | 0); const w = []; for (let i = 0; i < n; i++) w.push(words[(Math.random() * words.length) | 0]); const s = w.join(' '); return s.charAt(0).toUpperCase() + s.slice(1) + (Math.random() < 0.3 ? '?' : '.'); }
const people = ['Mike Ruiz', 'Brandon Jones', 'Tommy Fontaine', 'Luis Ortega', 'Dave Kowalski', 'Jesse Hart', 'Sam Patel', 'Ray Delgado'];
function chat(nMsg, nPhoto) {
  const co = '11111111-1111-4111-8111-111111111111', ch = '22222222-2222-4222-8222-222222222222';
  const t0 = Date.parse('2026-05-01T12:00:00Z'), msgs = [], vers = [];
  const photoEvery = nPhoto ? Math.max(1, Math.floor(nMsg / nPhoto)) : 0; let ph = 0;
  for (let i = 1; i <= nMsg; i++) {
    const a = people[i % people.length];
    const m = { id: 'm' + i, seq: i, author: 'u' + (i % people.length), author_name: a, at: new Date(t0 + i * 2900000).toISOString(), phone_at: null, body: sentence(), photos: [], edited_at: null, deleted_at: null, deleted_by: null, version: 1 };
    if (photoEvery && i % photoEvery === 0 && ph < nPhoto) { ph++; m.photos.push({ path: `${co}/${ch}/u/cli${i}x-1.jpg`, bytes: PHOTO }); if (Math.random() < 0.5) m.body = null; }
    if (i % 97 === 0) { vers.push({ message_id: m.id, version: 1, body: 'first try ' + m.body, action: 'edit', by: a, at: m.at }); m.version = 2; m.edited_at = m.at; }
    if (i % 211 === 0) { vers.push({ message_id: m.id, version: m.version, body: m.body, action: 'delete', by: 'Tommy Fontaine', at: m.at }); m.deleted_at = m.at; m.deleted_by = 'Tommy Fontaine'; m.body = null; m.version++; }
    msgs.push(m);
  }
  return { ok: true, archive: { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', reason: 'closed' }, retention: 'forever', tz: 'America/Chicago',
    company: { id: co, name: 'Fontaine Underground' }, chat: { id: ch, kind: 'job', job_number: '1234', job_key: '1234', title: 'Job 1234', created_at: msgs[0]?.at, closed_at: msgs[msgs.length - 1]?.at, include_pipelayers: true, pipelayer_history: 'from_added' },
    messages: msgs, versions: vers, people: people.map((n) => ({ name: n, state: 'in', how: 'auto', since: msgs[0]?.at })),
    log: [{ at: msgs[0]?.at, by: 'Tommy Fontaine', what: 'include_pipelayers', old: false, new: true }], server_at: '2026-11-22T14:03:01Z' };
}
const getPhoto = async (p) => { const n = parseInt(p.match(/cli(\d+)/)[1], 10); return jpgs.length ? new Uint8Array(jpgs[n % jpgs.length]) : rnd(PHOTO); };
const pyCheck = (f) => execFileSync('python3', ['-I', '-c', 'import sys,zipfile,json\nz=zipfile.ZipFile(sys.argv[1])\nbad=z.testzip()\nprint(json.dumps({"bad":bad,"n":len(z.namelist()),"names":z.namelist()[:6],"txt":z.read("transcript.txt").decode()[:400] if "transcript.txt" in z.namelist() else ""}))', f]).toString();

(async () => {
  // 1) zip writer alone: python reads it, CRCs right, deflate used for text, UTF-8 names
  const z = await makeZip([{ name: 'a.txt', data: 'hello '.repeat(1000), compress: true }, { name: 'ñ/b.bin', data: new Uint8Array([1, 2, 3]) }]);
  fs.writeFileSync(OUT + '/t.zip', z);
  const r1 = JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys,zipfile,json\nz=zipfile.ZipFile(sys.argv[1])\nprint(json.dumps({"bad":z.testzip(),"names":z.namelist(),"a":len(z.read("a.txt")),"ci":[i.compress_type for i in z.infolist()]}))', OUT + '/t.zip']).toString());
  ok(r1.bad === null && r1.a === 6000 && r1.names[1] === 'ñ/b.bin' && r1.ci[0] === 8 && r1.ci[1] === 0, 'zip: python reads it, CRCs check, text deflated, photos stored, UTF-8 names ' + JSON.stringify(r1));
  ok(crc32(new TextEncoder().encode('123456789')) === 0xcbf43926, 'crc32 standard check value');
  // 2) a small chat: every file there, text right, deleted/edited shown with earlier text
  const small = chat(450, 6); small.messages[9].phone_at = new Date(Date.parse(small.messages[9].at) - 3600000).toISOString();
  const s1 = await buildArchive(small, getPhoto);
  fs.writeFileSync(OUT + '/small.zip', s1[0].bytes);
  const r2 = JSON.parse(pyCheck(OUT + '/small.zip'));
  ok(s1.length === 1 && r2.bad === null && r2.n === 5 + 6 && /README.txt/.test(r2.names.join()) && /transcript.html/.test(r2.names.join()), 'small chat: one file, testzip clean, README + manifest + 3 transcripts + 6 photos (' + r2.n + ' files)');
  const txt = transcriptText(small, photoList(small));
  ok(/MESSAGE DELETED by Tommy Fontaine/.test(txt) && /text before it was deleted:/.test(txt) && /\(edited; version 1 said: first try/.test(txt), 'transcript keeps deleted and edited text (the record)');
  ok(/typed on the phone at .* sent when it had signal/.test(txt), 'transcript says when a message was typed offline and sent later');
  ok(/Times are America\/Chicago/.test(txt) && /\[2026-05-01 07:48\] #1 Brandon Jones:/.test(txt), 'times in the company time zone (' + txt.split('\n').find((l) => l.startsWith('[2026')) + ')');
  execFileSync('python3', ['-I', '-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);h=z.read("transcript.html").decode();assert "<script" not in h.lower() and "photos/0001-" in h, "html"', OUT + '/small.zip']);
  ok(true, 'transcript.html: no <script>, photos linked inline');
  ok(storagePath(small, small.archive.id, new Date('2026-11-22T14:03:01Z')) === '11111111-1111-4111-8111-111111111111/keep/22222222-2222-4222-8222-222222222222/20261122T140301-aaaaaaaa', 'storage path: company/keep|13m/chat/time-id');
  // 3) a missing photo does not stop the archive
  const s2 = await buildArchive(chat(40, 2), async (p) => /cli20x/.test(p) ? null : rnd(1000));
  ok(s2[0].missing === 1 && s2[0].photos === 1, 'a photo that cannot be read is noted (photo.MISSING.txt), the archive is still made');
  // 4) the busy job: 5,400 messages, 300 photos at 120 KB -> sizes for the cost table
  const busy = chat(5400, 300);
  const t0 = Date.now(); const b = await buildArchive(busy, async () => rnd(PHOTO)); const ms = Date.now() - t0;
  const txtB = transcriptText(busy, photoList(busy)), jsonRaw = JSON.stringify(busy).length;
  const textZ = zlib.deflateRawSync(Buffer.from(txtB)).length, jsonZ = zlib.deflateRawSync(Buffer.from(JSON.stringify(busy, null, 1))).length;
  const total = b.reduce((n, x) => n + x.bytes.length, 0);
  console.log('INFO busy job: messages 5400, photos 300 x ' + PHOTO + ' B; transcript.txt ' + txtB.length + ' B -> ' + textZ + ' B zipped; chat.json raw ' + jsonRaw + ' B -> ~' + jsonZ + ' B zipped; archive ' + total + ' B (' + (total / 1048576).toFixed(1) + ' MB) in ' + b.length + ' file(s), built in ' + ms + ' ms');
  ok(b.length === 1 && total < 40 * 1048576, 'busy job archive is one file under 40 MB (' + (total / 1048576).toFixed(1) + ' MB)');
  const textOnly = await buildArchive(chat(5400, 0), getPhoto);
  console.log('INFO the same chat with no photos: ' + textOnly[0].bytes.length + ' B (' + (textOnly[0].bytes.length / 1048576).toFixed(2) + ' MB)');
  fs.writeFileSync(OUT + '/sizes.json', JSON.stringify({ busy_total: total, text_only: textOnly[0].bytes.length, transcript_txt: txtB.length, transcript_zipped: textZ, json_raw: jsonRaw, json_zipped: jsonZ, photos: 300, photo_bytes: PHOTO }));
  // 5) a chat with more photos than one part holds is split into numbered parts, each a valid zip
  const big = chat(1200, 40); const parts = await buildArchive(big, async () => rnd(PHOTO), { partLimit: 1500000 });
  let allOk = parts.length > 1; for (let i = 0; i < parts.length; i++) { fs.writeFileSync(OUT + '/part' + i + '.zip', parts[i].bytes); const r = JSON.parse(execFileSync('python3', ['-I', '-c', 'import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);print(json.dumps({"bad":z.testzip()}))', OUT + '/part' + i + '.zip']).toString()); if (r.bad !== null) allOk = false; }
  ok(allOk && /part1of\d+\.zip$/.test(parts[0].name) && parts.reduce((n, p) => n + p.photos, 0) === 40, 'over the part size: split into ' + parts.length + ' numbered files, all valid, all 40 photos kept (' + parts.map((p) => p.name).join(', ') + ')');
  ok(PART_LIMIT === 60 * 1048576, 'part size 60 MB');
  console.log(fails ? 'RESULT: FAIL ' + fails : 'RESULT: all pass');
  process.exit(fails ? 1 : 0);
})();
