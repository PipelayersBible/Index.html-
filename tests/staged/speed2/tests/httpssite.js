// speed2 test helper: a real HTTPS server for https://app.pipelayersbible.com (Chromium maps the name to 127.0.0.1 and
// trusts this test certificate by its key pin), so the service worker's own update checks reach it too (Playwright
// routes don't cover a worker script update). Serves a site folder; supabase-js and *.supabase.co are faked.
// Optional shaping per request: S.delay (ms before index.html answers), S.hang (index.html never answers),
// S.kbps (bandwidth for index.html and pbx/*, after the delay).
'use strict';
const https = require('https'), fs = require('fs'), path = require('path');
const RIG = path.resolve(__dirname, '../../../bughunt_nov17/offline/rig');
const FAKE = fs.readFileSync(RIG + '/fakesb2.js', 'utf8');
const SPKI = 'coLUDdYP7UvBwb8Nbdy3Rut8dtM0+q8TvIYI77qrTbU=';
function start(site, port) {
  const S = { site, delay: 0, hang: false, kbps: 0, hits: [] };
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
  S.srv = https.createServer({ key: fs.readFileSync(__dirname + '/key.pem'), cert: fs.readFileSync(__dirname + '/cert.pem') }, async (q, r) => {
    const host = String(q.headers.host || ''), u = new URL(q.url, 'https://x'); let p = decodeURIComponent(u.pathname);
    if (/supabase-js/.test(p)) { r.writeHead(200, { 'content-type': 'application/javascript', 'access-control-allow-origin': '*', 'cache-control': 'no-cache' }); return r.end(FAKE); }
    if (/supabase\.co/.test(host)) { r.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); return r.end('null'); }
    if (p.endsWith('/')) p += 'index.html';
    S.hits.push(p);
    const f = path.join(S.site, path.normalize(p));
    if (!f.startsWith(S.site) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404, { 'content-type': 'text/plain' }); return r.end('nf'); }
    const big = /\/index\.html$|\/pbx\//.test(p);
    if (big && p.endsWith('index.html') && S.hang) return; // lie-fi
    if (big && S.delay) await new Promise((x) => setTimeout(x, S.delay));
    const body = fs.readFileSync(f);
    r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache', 'content-length': body.length });
    if (!big || !S.kbps) return r.end(body);
    const per = Math.max(1024, Math.round(S.kbps * 1024 / 8 / 10)); let i = 0; // 10 chunks a second
    const tick = () => { if (i >= body.length) return r.end(); r.write(body.subarray(i, i + per)); i += per; setTimeout(tick, 100); }; tick();
  });
  return new Promise((ok) => S.srv.listen(port, '127.0.0.1', () => ok(S)));
}
const chromeArgs = (port) => ['--host-resolver-rules=MAP app.pipelayersbible.com 127.0.0.1:' + port + ', MAP cdn.jsdelivr.net 127.0.0.1:' + port + ', MAP *.supabase.co 127.0.0.1:' + port + ', MAP * ~NOTFOUND', '--ignore-certificate-errors-spki-list=' + SPKI];
module.exports = { start, chromeArgs, SPKI };
