// Perf audit server on ONE port (8884): plain HTTP (for the repo regression) and HTTPS (for the service-worker rig,
// reached as https://app.pipelayersbible.com via --host-resolver-rules) on the same socket (first byte 0x16 = TLS).
// Mimics GitHub Pages: gzip, ETag + Last-Modified, Cache-Control: max-age=600, 304 on If-None-Match.
// Server-side network shaping (applies to service-worker fetches too, which CDP throttling does not reliably cover):
//   GET /__net?kbps=400&rtt=400   (kbps=0 -> unthrottled)   GET /__net?hang=1  (accepts, never answers: lie-fi)
//   GET /__log  -> requests served since the last /__log?clear=1
const net = require('net'), http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const PORT = +process.env.PORT || 8884, ROOT = process.env.ROOT || '/tmp/claude-0/audit/perf';
const ST = { kbps: 0, rtt: 0, hang: false, maxage: 600, log: [] };
const gzCache = new Map();
const FAKESB = Buffer.from(fs.readFileSync(__dirname+'/../../rig/fakesb.js', 'utf8') + '\n/*' + crypto.randomBytes(34000).toString('base64') + '*/\n');
const FAKESB_GZ = zlib.gzipSync(FAKESB);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.pdf': 'application/pdf', '.jpg': 'image/jpeg' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function send(res, code, headers, body) {
  if (ST.rtt) await sleep(ST.rtt); // request up + first byte back (one round trip)
  res.writeHead(code, headers);
  if (!body || !body.length) return res.end();
  if (!ST.kbps) return res.end(body);
  const Bps = ST.kbps * 1000 / 8, tick = 50, chunk = Math.max(256, Math.round(Bps * tick / 1000));
  for (let i = 0; i < body.length; i += chunk) {
    if (res.destroyed) return;
    res.write(body.subarray(i, i + chunk));
    await sleep(tick);
  }
  res.end();
}
async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__net') {
    if (u.searchParams.has('kbps')) ST.kbps = +u.searchParams.get('kbps');
    if (u.searchParams.has('rtt')) ST.rtt = +u.searchParams.get('rtt');
    ST.hang = u.searchParams.get('hang') === '1';
    if (u.searchParams.has('maxage')) ST.maxage = +u.searchParams.get('maxage');
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify({ kbps: ST.kbps, rtt: ST.rtt, hang: ST.hang, maxage: ST.maxage }));
  }
  if (u.pathname === '/__log') {
    const out = JSON.stringify(ST.log); if (u.searchParams.get('clear') === '1') ST.log = [];
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(out);
  }
  const host = String(req.headers.host || '').split(':')[0];
  if (host === 'cdn.jsdelivr.net' || /supabase\.co$/.test(host)) {
    const cors = { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
    if (ST.hang) { ST.log.push({ p: host + u.pathname, hang: true }); return; }
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    if (host === 'cdn.jsdelivr.net') {
      const raw = FAKESB, gz = /gzip/.test(req.headers['accept-encoding'] || '');
      const h = Object.assign({ 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=604800', etag: '"fakesb1"' }, cors);
      if (req.headers['if-none-match'] === '"fakesb1"') return send(res, 304, h, null);
      // padded to the real supabase-js@2 UMD size (~45 KB gzipped) so the transfer costs what it would
      const body = gz ? FAKESB_GZ : raw; if (gz) h['content-encoding'] = 'gzip';
      ST.log.push({ p: host + u.pathname, code: 200, bytes: body.length, t: Date.now() });
      return send(res, 200, h, body);
    }
    ST.log.push({ p: host + u.pathname, code: 200 });
    return send(res, 200, Object.assign({ 'content-type': 'application/json' }, cors), Buffer.from('null'));
  }
  if (ST.hang) { ST.log.push({ p: u.pathname, hang: true, t: Date.now() }); return; } // never answers
  let rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { ST.log.push({ p: u.pathname, code: 404 }); return send(res, 404, { 'content-type': 'text/html' }, Buffer.from('404')); }
  const st = fs.statSync(f), key = f + ':' + st.mtimeMs;
  let ent = gzCache.get(f);
  if (!ent || ent.key !== key) {
    const raw = fs.readFileSync(f);
    ent = { key, raw, gz: zlib.gzipSync(raw, { level: 6 }), etag: '"' + crypto.createHash('md5').update(raw).digest('hex').slice(0, 16) + '"' };
    gzCache.set(f, ent);
  }
  const type = TYPES[path.extname(f)] || 'application/octet-stream';
  const h = { 'content-type': type, etag: ent.etag, 'last-modified': st.mtime.toUTCString(), 'cache-control': 'max-age=' + ST.maxage, vary: 'Accept-Encoding', 'access-control-allow-origin': '*' };
  if (req.headers['if-none-match'] === ent.etag) { ST.log.push({ p: u.pathname, code: 304, t: Date.now() }); return send(res, 304, h, null); }
  const gz = /gzip/.test(req.headers['accept-encoding'] || '') && /text|javascript|json|manifest/.test(type);
  const body = gz ? ent.gz : ent.raw; if (gz) h['content-encoding'] = 'gzip';
  h['content-length'] = body.length;
  ST.log.push({ p: u.pathname, code: 200, bytes: body.length, t: Date.now() });
  return send(res, 200, h, req.method === 'HEAD' ? null : body);
}
const H1 = http.createServer((q, s) => handle(q, s).catch(() => {}));
const H2 = https.createServer({ key: fs.readFileSync(__dirname + '/key.pem'), cert: fs.readFileSync(__dirname + '/cert.pem') }, (q, s) => handle(q, s).catch(() => {}));
net.createServer((sock) => {
  sock.once('readable', () => { const buf = sock.read(1); if (!buf) return sock.destroy(); sock.unshift(buf); (buf[0] === 0x16 ? H2 : H1).emit('connection', sock); });
  sock.on('error', () => {});
}).listen(PORT, '127.0.0.1', () => console.log('perf srv on', PORT, 'root', ROOT));
