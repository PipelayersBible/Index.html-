#!/usr/bin/env node
// One-command test run for The Pipelayer's Bible. See tests/README_RUN.md.
//   node tests/runner/run_all.js [--build path/to/index.html] [--base path/to/before.html] [--only REGEX] [--suite a,b]
//        [--jobs N] [--timeout SECS] [--update-golden] [--keep] [--list] [--out DIR]
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), cp = require('child_process');
const { normalize } = require('./normalize');
const { addHooks, noticeVersion, buildStamp } = require('./hooks');
const M = require('./suites');

const TESTS = path.resolve(__dirname, '..');
const REPO = path.resolve(TESTS, '..');
const EXPECT = path.join(TESTS, 'expect');

// ---------- args ----------
function parseArgs(argv) {
  const o = { build: path.join(REPO, 'index.html'), base: null, only: null, suite: null, jobs: 0, timeout: 300, update: false, keep: false, list: false, out: path.join(TESTS, '.results') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = () => { if (i + 1 >= argv.length) die('missing value for ' + a); return argv[++i]; };
    if (a === '--build') o.build = path.resolve(v());
    else if (a === '--base') o.base = path.resolve(v());
    else if (a === '--only') o.only = new RegExp(v());
    else if (a === '--suite') o.suite = v().split(',');
    else if (a === '--jobs' || a === '-j') o.jobs = +v();
    else if (a === '--timeout') o.timeout = +v();
    else if (a === '--update-golden' || a === '--accept') o.update = true;
    else if (a === '--keep') o.keep = true;
    else if (a === '--list') o.list = true;
    else if (a === '--out') o.out = path.resolve(v());
    else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 5).join('\n')); process.exit(0); }
    else die('unknown option ' + a);
  }
  return o;
}
function die(m) { console.error('run_all: ' + m); process.exit(2); }

// ---------- test list ----------
function allTests() {
  const out = [];
  for (const s of M.suites) for (const t of s.tests) {
    const o = typeof t === 'string' ? { file: t } : Object.assign({}, t);
    o.file = path.normalize(o.file);
    o.id = o.id || o.file;
    o.suite = s.name; o.variant = s.variant;
    out.push(o);
  }
  return out;
}
function judgeOf(t) {
  if (M.JUDGE[t.id]) return M.JUDGE[t.id];
  const seen = new Set();
  const src = (f) => {
    if (seen.has(f) || !fs.existsSync(f)) return '';
    seen.add(f);
    let s = fs.readFileSync(f, 'utf8');
    let more = '';
    for (const m of s.matchAll(/require\(\s*['"]\.\/([\w.\-]+)['"]\s*\)/g)) more += src(path.join(path.dirname(f), m[1].endsWith('.js') ? m[1] : m[1] + '.js'));
    return s + more;
  };
  const s = src(path.join(TESTS, t.file));
  return /['"`(]\s*(PASS|FAIL)\b|\bFAIL[ :'"]|process\.exit\s*\(|process\.exitCode/.test(s) ? 'verdict' : 'golden';
}
const goldenPath = (t) => path.join(EXPECT, t.id.replace(/[\/\\]/g, '__').replace(/[^\w.\-\[\]]/g, '_') + '.txt');

// ---------- site ----------
function prepareSite(o, tmp) {
  const site = path.join(tmp, 'site');
  const srcDir = path.dirname(o.build);
  fs.mkdirSync(site, { recursive: true });
  for (const n of fs.readdirSync(srcDir)) {
    if (n === 'tests' || n.startsWith('.') || n === 'node_modules') continue;
    const p = path.join(srcDir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) fs.cpSync(p, path.join(site, n), { recursive: true });
    else if (!/\.html$/.test(n) || /^(privacy|terms)\.html$/.test(n)) fs.copyFileSync(p, path.join(site, n));
  }
  const html = fs.readFileSync(o.build, 'utf8');
  fs.writeFileSync(path.join(site, 'cur.html'), html);
  fs.writeFileSync(path.join(site, 'index.html'), html);
  let baseHtml = null;
  if (o.base) { baseHtml = fs.readFileSync(o.base, 'utf8'); fs.writeFileSync(path.join(site, 'base.html'), baseHtml); }
  // hooked variant: same files under hk/, cur.html and curT.html carry the test hooks
  const hk = path.join(site, 'hk');
  fs.mkdirSync(hk);
  for (const n of fs.readdirSync(site)) {
    if (n === 'hk') continue;
    fs.symlinkSync(path.join('..', n), path.join(hk, n));
  }
  fs.unlinkSync(path.join(hk, 'cur.html'));
  const h = addHooks(html);
  fs.writeFileSync(path.join(hk, 'cur.html'), h.html);
  fs.writeFileSync(path.join(hk, 'curT.html'), h.html);
  return { site, warnings: h.warnings, notice: noticeVersion(html), stamp: buildStamp(html), baseNotice: baseHtml ? noticeVersion(baseHtml) : null, baseStamp: baseHtml ? buildStamp(baseHtml) : null };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/plain' };
function startServer(site) {
  return new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(site, path.normalize(p));
      if (!f.startsWith(site)) { res.writeHead(403); return res.end(); }
      fs.stat(f, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
        res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'content-length': st.size, 'cache-control': 'no-store' });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(f).pipe(res);
      });
    });
    srv.keepAliveTimeout = 5000;
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// ---------- running ----------
function runOne(t, ctx, attempt) {
  return new Promise((resolve) => {
    const outDir = path.join(ctx.tmp, 'out', t.id.replace(/[\/\\\[\]]/g, '_') + (attempt > 1 ? '.try' + attempt : ''));
    fs.mkdirSync(outDir, { recursive: true });
    const root = `http://127.0.0.1:${ctx.port}/` + (t.variant === 'hook' ? 'hk/' : '');
    const env = Object.assign({}, process.env, {
      NODE_PATH: process.env.NODE_PATH || ctx.nodePath,
      PB_ROOT: root, PB_URL: root + 'cur.html', PB_OUT: outDir, PB_SITE: path.join(ctx.site, t.variant === 'hook' ? 'hk' : ''),
      PB_NOTICE_VER: ctx.notice || '3', PB_BUILD_FILE: path.join(ctx.site, 'cur.html'),
    });
    env.TZ = process.env.PB_TZ || 'America/Los_Angeles'; // the crews' time zone; day boundaries in the app depend on it
    if (t.judge === 'golden' && !M.REAL_CLOCK[t.id]) env.PB_FAKE_NOW = M.FAKE_NOW; else delete env.PB_FAKE_NOW;
    if (ctx.base) { env.PB_BASE = `http://127.0.0.1:${ctx.port}/base.html`; if (ctx.baseNotice) env.PB_BASE_NOTICE_VER = ctx.baseNotice; }
    else delete env.PB_BASE;
    const file = path.join(TESTS, t.file);
    const t0 = Date.now();
    const cmd = file.endsWith('.py') ? 'python3' : process.execPath;
    const ch = cp.spawn(cmd, [file].concat(t.args || []), { cwd: outDir /* files a test writes to a relative path land in its scratch folder, not the repo */, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    const add = (d) => { buf += d.toString(); if (buf.length > 4e6) buf = buf.slice(-4e6); };
    ch.stdout.on('data', add); ch.stderr.on('data', add);
    let timedOut = false;
    const lim = (t.timeout || ctx.timeout) * 1000;
    const timer = setTimeout(() => { timedOut = true; try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} }, lim);
    ch.on('close', (code, sig) => {
      clearTimeout(timer);
      try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} // stray browsers
      resolve({ code: timedOut ? null : code, sig, timedOut, out: buf, ms: Date.now() - t0, outDir });
    });
  });
}

function judge(t, r, o) {
  const mode = t.judge;
  if (r.timedOut) return { status: 'fail', note: `timed out after ${(t.timeout || o.timeout)} s` };
  const lines = r.out.split('\n');
  if (mode === 'verdict') {
    const bad = lines.filter((l) => /^\s*(FAIL|BUG)\b/.test(l));
    if (r.code !== 0) return { status: 'fail', note: `exit ${r.code}` + (bad[0] ? ': ' + bad[0].trim().slice(0, 140) : lastLine(lines)) };
    if (bad.length) return { status: 'fail', note: bad.length + ' FAIL line(s): ' + bad[0].trim().slice(0, 140) };
    return { status: 'pass', note: lines.filter((l) => /^\s*PASS\b/.test(l)).length + ' PASS' };
  }
  // golden
  const norm = normalize(r.out + `\n[exit ${r.code}]\n`, M.NORMALIZE[t.id]);
  const gp = goldenPath(t);
  try { fs.writeFileSync(path.join(o.out, 'logs', path.basename(gp, '.txt') + '.norm.txt'), norm); } catch (e) {} // diff it against expect/
  if (o.update) {
    if (r.code === 0) { fs.mkdirSync(EXPECT, { recursive: true }); fs.writeFileSync(gp, norm); return { status: 'pass', note: 'golden written' }; }
    return { status: 'fail', note: `exit ${r.code}, golden not written` + lastLine(lines) };
  }
  if (r.code !== 0) return { status: 'fail', note: `exit ${r.code}` + lastLine(lines) };
  if (!fs.existsSync(gp)) return { status: 'fail', note: 'no golden output yet (run with --update-golden after checking the output)' };
  const exp = fs.readFileSync(gp, 'utf8');
  if (exp === norm) return { status: 'pass', note: 'output matches golden' };
  const d = firstDiff(exp, norm);
  return { status: 'fail', note: 'output differs from golden: ' + d, diff: d };
}
function lastLine(lines) { const l = lines.filter((x) => x.trim() && !/^\s+at |^Node\.js|^\s*\^|^\s*}$/.test(x)).pop(); return l ? ': ' + l.trim().slice(0, 140) : ''; }
function firstDiff(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) {
    const e = A[i] || '', g = B[i] || ''; let k = 0; while (k < e.length && e[k] === g[k]) k++;
    const s = Math.max(0, k - 30), cut = (x) => (s ? '…' : '') + x.slice(s, s + 90);
    return `line ${i + 1}: expected "${cut(e)}" got "${cut(g)}"`;
  }
  return '';
}

async function pool(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, n) }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } });
  await Promise.all(workers);
}

function defaultJobs() {
  // Measured on the 2-core / 8 GB box, r17.01, 194 tests (~73 min of test time): 4 workers 18.5 min, 5 workers 15 min,
  // 8 workers 10 min but load ~6 and timing-sensitive output starts to wobble. The tests mostly wait inside the page, so
  // 2.5 per core is the default (5 here), capped by memory (~1.2 GB per browser + node at peak) and at 8.
  const cores = os.cpus().length, memGb = os.totalmem() / 2 ** 30;
  return Math.max(1, Math.min(Math.round(cores * 2.5), Math.floor(memGb / 1.2), 8));
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }

(async () => {
  const o = parseArgs(process.argv.slice(2));
  let tests = allTests();
  if (o.suite) tests = tests.filter((t) => o.suite.includes(t.suite));
  if (o.only) tests = tests.filter((t) => o.only.test(t.id));
  for (const t of tests) t.judge = judgeOf(t);
  if (o.list) { for (const t of tests) console.log(pad(t.suite, 11), pad(t.judge, 8), M.SKIP[t.id] ? 'SKIP ' : M.XFAIL[t.id] ? 'XFAIL' : '     ', t.id); return; }
  if (!tests.length) die('no tests match');
  if (!fs.existsSync(o.build)) die('build not found: ' + o.build);
  if (o.base && !fs.existsSync(o.base)) die('base not found: ' + o.base);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbtest-'));
  const S = prepareSite(o, tmp);
  const srv = await startServer(S.site);
  const port = srv.address().port;
  const nodePath = ['/opt/npm-tools/node_modules', path.join(REPO, 'node_modules')].filter((p) => fs.existsSync(p)).join(':');
  const jobs = o.jobs || defaultJobs();
  const ctx = { tmp, site: S.site, port, nodePath, timeout: o.timeout, base: !!o.base, notice: S.notice, baseNotice: S.baseNotice };
  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; try { srv.close(); } catch (e) {} if (!o.keep) try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  const resDir = o.out;
  fs.rmSync(path.join(resDir, 'logs'), { recursive: true, force: true });
  fs.mkdirSync(path.join(resDir, 'logs'), { recursive: true });
  console.log(`build ${o.build} (${S.stamp || '?'}, crew notice v${S.notice || '?'})` + (o.base ? `\nbase  ${o.base} (${S.baseStamp || '?'})` : ''));
  console.log(`serving ${S.site} on http://127.0.0.1:${port}/  (hooked pages under /hk/)`);
  for (const w of S.warnings) console.log('WARNING ' + w);
  console.log(`${tests.length} tests, ${jobs} at a time, timeout ${o.timeout} s each (one retry for a timeout)\n`);

  const results = [];
  const t0 = Date.now();
  let done = 0;
  const run = tests.filter((t) => !M.SKIP[t.id]);
  for (const t of tests) if (M.SKIP[t.id]) results.push({ t, status: 'skip', note: M.SKIP[t.id], ms: 0, attempts: 0 });
  // longest first, so a slow test does not start last
  const weight = (t) => (t.timeout || 0) + (/export|pdf|seal|clock|crewview|ref\//.test(t.id) ? 100 : 0);
  run.sort((a, b) => weight(b) - weight(a));
  await pool(run, jobs, async (t) => {
    let r = await runOne(t, ctx, 1), attempts = 1, flaky = false;
    if (r.timedOut) { r = await runOne(t, ctx, 2); attempts = 2; flaky = !r.timedOut; }
    let j = judge(t, r, o);
    let status = j.status;
    if (status === 'pass' && flaky) status = 'flaky';
    if (M.XFAIL[t.id]) status = status === 'fail' ? 'xfail' : 'XPASS';
    fs.writeFileSync(path.join(resDir, 'logs', t.id.replace(/[\/\\]/g, '__') + '.txt'), r.out + `\n[exit ${r.code}${r.timedOut ? ' TIMEOUT' : ''}] ${(r.ms / 1000).toFixed(1)} s\n`);
    results.push({ t, status, note: status === 'xfail' ? M.XFAIL[t.id] + ' [' + j.note + ']' : j.note, ms: r.ms, attempts });
    done++;
    console.log(`[${pad(done + '/' + run.length, 7)}] ${pad(status.toUpperCase(), 6)} ${pad((r.ms / 1000).toFixed(0) + 's', 5)} ${t.id}` + (status !== 'pass' ? '  -- ' + String(j.note).slice(0, 160) : ''));
  });
  const wall = (Date.now() - t0) / 1000;
  cleanup();

  // ---------- summary ----------
  const order = { fail: 0, XPASS: 1, flaky: 2, xfail: 3, skip: 4, pass: 5 };
  results.sort((a, b) => (order[a.status] - order[b.status]) || a.t.id.localeCompare(b.t.id));
  const lines = [];
  lines.push(`Summary: build ${S.stamp || o.build}` + (o.base ? `, base ${S.baseStamp}` : '') + `, ${jobs} workers, wall ${Math.floor(wall / 60)} min ${Math.round(wall % 60)} s`);
  lines.push(pad('status', 7) + pad('time', 7) + pad('suite', 11) + pad('judge', 8) + pad('test', 52) + 'note');
  for (const r of results) lines.push(pad(r.status, 7) + pad(r.ms ? (r.ms / 1000).toFixed(0) + 's' : '-', 7) + pad(r.t.suite, 11) + pad(r.t.judge, 8) + pad(r.t.id, 52) + String(r.note || '').slice(0, 200) + (r.attempts > 1 ? ' (2 tries)' : ''));
  const count = (s) => results.filter((r) => r.status === s).length;
  lines.push(`\npass ${count('pass')}, flaky ${count('flaky')}, FAIL ${count('fail')}, xfail ${count('xfail')}, XPASS ${count('XPASS')}, skip ${count('skip')}  (of ${results.length})`);
  const text = lines.join('\n');
  console.log('\n' + text);
  fs.writeFileSync(path.join(resDir, 'summary.txt'), text + '\n');
  fs.writeFileSync(path.join(resDir, 'results.json'), JSON.stringify(results.map((r) => ({ id: r.t.id, suite: r.t.suite, judge: r.t.judge, status: r.status, ms: r.ms, attempts: r.attempts, note: r.note })), null, 1));
  console.log(`logs: ${path.join(resDir, 'logs')}`);
  process.exit(count('fail') ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
