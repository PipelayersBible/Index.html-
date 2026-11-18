// CPU profile of one action (CDP Profiler) -> top functions by self time.
// usage: node prof.js <variant> <what: search|laid|newrun|load> [cpu]
const P = require('./perf'); const L = require(__dirname+'/../offline/rig/lib'); const F = require(__dirname+'/../../rig/flow');
const V = process.argv[2] || 'base', WHAT = process.argv[3] || 'search', CPU = +process.argv[4] || 1, URL = P.ORIGIN + '/' + V + (V.endsWith('.html') ? '' : '/');
function top(profile, n = 25) {
  const self = new Map(), byId = new Map(profile.nodes.map((x) => [x.id, x]));
  const dt = profile.timeDeltas; const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of counts) { const nd = byId.get(id); const cf = nd.callFrame; const k = (cf.functionName || '(anon)') + ' @' + (cf.lineNumber + 1); self.set(k, (self.get(k) || 0) + us); }
  return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => Math.round(us / 1000) + ' ms  ' + k);
}
(async () => {
  await P.net(P.NET.fast + '&maxage=600');
  const { b, ctx } = await P.launch({ sw: false });
  const p = await P.page(ctx, CPU); const H = F(p);
  if (WHAT === 'load') { await p.cdp.send('Profiler.enable'); await p.cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await p.cdp.send('Profiler.start'); }
  await P.open(p, URL); await p.waitForTimeout(2500);
  if (WHAT === 'load') { const { profile } = await p.cdp.send('Profiler.stop'); console.log(top(profile, 40).join('\n')); await b.close(); return; }
  await p.cdp.send('Profiler.enable'); await p.cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  if (WHAT === 'newrun') {
    await p.cdp.send('Profiler.start');
    await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1500);
  } else {
    // a Records with photos already stored? (inapp.js leaves none; make 10 entries with 60 photos)
    await L.newRun(p, 450); await L.lock(p);
    await p.evaluate(async () => {
      const uid = '00000000-0000-4000-8000-000000000001', key = uid + ':runArchive';
      const db = await new Promise((ok, no) => { const r = indexedDB.open('pb-big', 1); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
      const arr = JSON.parse(await new Promise((ok) => { const q = db.transaction('kv').objectStore('kv').get(key); q.onsuccess = () => ok(q.result); }));
      const run = arr.find((e) => e.kind === 'run'); const c = document.createElement('canvas'); c.width = 1280; c.height = 960; const g = c.getContext('2d'); const im = g.createImageData(1280, 960); for (let i = 0; i < im.data.length; i++) im.data[i] = (i % 4 === 3) ? 255 : (Math.random() * 255) | 0; g.putImageData(im, 0, 0); const d = c.toDataURL('image/jpeg', 0.3);
      for (let i = 1; i <= 10; i++) { const x = JSON.parse(JSON.stringify(run)); x.id = run.id - i * 18e6; x.lockTime = new Date(x.id).toISOString(); x.completed = true; x.photos = Array.from({ length: 6 }, (_, k) => ({ url: d, name: 'P' + k })); arr.push(x); }
      await new Promise((ok) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(JSON.stringify(arr), key); t.oncomplete = ok; });
    });
    await p.reload(); await p.waitForFunction(() => window.__pf && window.__pf.home, null, { timeout: 60000 }); await p.waitForTimeout(3000);
    if (WHAT === 'laid') { await p.evaluate(() => pbResumeLastRunResults()); await p.waitForTimeout(2500); await p.cdp.send('Profiler.start'); await p.evaluate(() => window.pbLaidMark(5)); await p.waitForTimeout(2000); }
    if (WHAT === 'search') {
      await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(1500); await p.cdp.send('Profiler.start');
      await p.evaluate(async () => { const el = document.getElementById('archiveSearchBox'); for (const w of ['S', 'Se', 'Sew']) { el.value = w; el.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 150)); } });
      await p.waitForTimeout(800);
    }
  }
  const { profile } = await p.cdp.send('Profiler.stop');
  console.log(top(profile).join('\n'));
  console.log('errs', p.errs.slice(0, 3));
  await b.close();
})();
