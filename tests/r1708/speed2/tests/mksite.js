// speed2 helper: a served site folder for one build, like run_all.sh makes it (cur.html/index.html = the build,
// hk/cur.html = the build + the runner's test hooks), and a static server for it.
// node mksite.js <build.html> <outdir> [port]   (port given: serves it until killed)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const REPO = path.resolve(__dirname, '../../../..');
const { addHooks } = require(path.join(REPO, 'tests/runner/hooks.js'));
const [build, outDir, port] = process.argv.slice(2);
const site = path.resolve(outDir);
fs.rmSync(site, { recursive: true, force: true }); fs.mkdirSync(site, { recursive: true });
const srcDir = path.dirname(path.resolve(build));
for (const n of fs.readdirSync(REPO)) {
  if (n === 'tests' || n.startsWith('.') || n === 'node_modules') continue;
  const p = path.join(REPO, n), st = fs.statSync(p);
  if (st.isDirectory()) fs.cpSync(p, path.join(site, n), { recursive: true });
  else if (!/\.html$/.test(n) || /^(privacy|terms)\.html$/.test(n)) fs.copyFileSync(p, path.join(site, n));
}
// the build's own sw.js and lazily loaded parts (pbx/), when its folder has them; SW=file overrides sw.js
if (fs.existsSync(path.join(srcDir, 'pbx'))) fs.cpSync(path.join(srcDir, 'pbx'), path.join(site, 'pbx'), { recursive: true });
if (process.env.SW) fs.copyFileSync(process.env.SW, path.join(site, 'sw.js'));
else if (fs.existsSync(path.join(srcDir, 'sw.js')) && srcDir !== REPO) fs.copyFileSync(path.join(srcDir, 'sw.js'), path.join(site, 'sw.js'));
const html = fs.readFileSync(build, 'utf8');
fs.writeFileSync(path.join(site, 'cur.html'), html); fs.writeFileSync(path.join(site, 'index.html'), html);
const hk = path.join(site, 'hk'); fs.mkdirSync(hk);
for (const n of fs.readdirSync(site)) if (n !== 'hk') fs.symlinkSync(path.join('..', n), path.join(hk, n));
fs.unlinkSync(path.join(hk, 'cur.html'));
const h = addHooks(html); h.warnings.forEach((w) => console.log('WARNING', w));
fs.writeFileSync(path.join(hk, 'cur.html'), h.html); fs.writeFileSync(path.join(hk, 'curT.html'), h.html);
if (process.env.BASE) { // a "before" build on the same origin (same phone storage): base.html, hk/base.html with the hooks
  const bh = fs.readFileSync(process.env.BASE, 'utf8'); fs.writeFileSync(path.join(site, 'base.html'), bh);
  const hb = addHooks(bh); fs.writeFileSync(path.join(hk, 'base.html'), hb.html);
}
console.log('site', site);
if (port) {
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(site, path.normalize(p));
    fs.stat(f, (e, st) => { if (e || !st.isFile()) { res.writeHead(404); return res.end('nf'); }
      res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res); });
  }).listen(+port, '127.0.0.1', () => console.log('serving on', port));
}
