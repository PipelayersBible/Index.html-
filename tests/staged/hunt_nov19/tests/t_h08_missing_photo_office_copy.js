// hunt_nov19 06: a run has two stake photos; the phone's photo store loses them (r17.08 keeps photos apart from
// Records). After the app reopens, the copy of the run that goes to the company must not carry the photo references
// as text, and must count the photos as left out (it said "0 left out" and sent "pbph:1:..." strings).
// A healthy run is unchanged: its photos are listed for the company and counted.
// Needs a page with the runner hooks (node mkhk.js in.html hk.html).
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/hk.html node t_h08_missing_photo_office_copy.js
const L = require('./hlib');
const STAKE = { is_stake: true, stake_number: { value: '3860', conf: 'high' }, station: { value: '1+50', conf: 'high' }, offset: { value: '10/SD', conf: 'high' }, line_label: { value: 'MH-1', conf: 'high' }, cut_fill: { direction: 'cut', feet: 5, as_written: 'C-5', to: 'IE', conf: 'high' }, stake_elevation: { feet: 100, as_written: '100', conf: 'high' }, other_text: '', uncertain: [] };
(async () => {
  const { b, p, H } = await L.open({ url: process.env.PB_URL || 'http://127.0.0.1:9000/hk.html' });
  const EV = (code) => p.evaluate((c) => window.__dEval(c), code);
  await p.route('**/functions/v1/ai**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, text: JSON.stringify(STAKE), used: 1, limit: 60 }) }));
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
  await p.evaluate(() => { const lr = [...document.querySelectorAll('#screen-input button')].find((x) => x.textContent.trim() === "Engineer's Rod"); lr && lr.click(); });
  await p.setInputFiles('#startAiStakePhoto', [H.img('p12'), H.img('p13')]); await p.waitForTimeout(2500);
  const f = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, String(v)]);
  await f('saJobNumber', '24-017'); await f('runBedding', 0.5); await f('runTrenchWidth', 3); await f('runWT', 0.08);
  await p.evaluate(() => { const e = document.getElementById('runIdSel'); e.value = [...e.options].find((o) => o.text.trim() === '8"').value; e.dispatchEvent(new Event('change', { bubbles: true })); });
  await f('startStakeElev', 100); await f('startCutFillVal', 5); await f('startStakeReading', 4.8); await f('endStakeElev', 99); await f('endCutFillVal', 5); await f('endStakeReading', 5.8); await f('totalDist', 100); await f('interval', 10);
  await p.waitForTimeout(500); await p.getByText('Review & Calculate', { exact: true }).click(); await p.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { const m = await H.modal(); if (!m) break; const bs = await H.modalBtns(); await H.modalClick(bs[bs.length - 1]); await p.waitForTimeout(800); }
  { await p.getByText('Lock This Run', { exact: true }).click(); await p.waitForTimeout(1200);
    for (let i = 0; i < 6; i++) { const m = await H.modal(); if (!m) break; if (/Which Job/.test(m)) { await p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog]')].find((x) => x.offsetParent); const i = d.querySelector('input'); i.value = '24-017'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await H.modalClick('Use It'); } else { const bs = await H.modalBtns(); await H.modalClick(bs[bs.length - 1]); } await p.waitForTimeout(900); } }
  const copy = () => EV(`(()=>{const e=runArchive.find(x=>x.kind==='run');const rec=pbRrOfficeCopy(e);const t=JSON.stringify(rec);return {listed:(rec.pbOffice.photos||[]).length,left:rec.pbOffice.photosLeftOut,asText:(t.match(/pbph:1:/g)||[]).length,inMemory:(JSON.stringify(e.intervalRows).match(/data:image/g)||[]).length,lost:(JSON.stringify(e.intervalRows).match(/pbph:1:/g)||[]).length};})()`);
  const good = await copy(); console.log('healthy', JSON.stringify(good));
  L.ok(good.inMemory === 2 && good.listed === 2 && good.left === 2 && good.asText === 0, 'a healthy run: 2 photos listed for the company, counted as left out of the text, none as text');
  // the photo store loses both photos; the app is reopened
  await p.waitForTimeout(6000);
  const n = await p.evaluate(async () => { const ks = await window.__pbPhDebug.keys(); await new Promise((ok) => { const r = indexedDB.open('pb-photos', 1); r.onsuccess = () => { const t = r.result.transaction('ph', 'readwrite'); ks.forEach((k) => t.objectStore('ph').delete(k)); t.oncomplete = () => { r.result.close(); ok(); }; }; }); return ks.length; });
  L.ok(n === 2, 'both photos were in the photo store (' + n + ')');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(4000);
  const bad = await copy(); console.log('photos lost', JSON.stringify(bad));
  L.ok(bad.lost === 2 && bad.inMemory === 0, 'after reopening, the record holds 2 references to photos the store no longer has');
  L.ok(bad.asText === 0, 'the company copy does not carry the references as text (' + bad.asText + ')');
  L.ok(bad.left === 2, 'the company copy counts them: photos left out = 2 (' + bad.left + ')');
  await L.done(b);
})().catch((e) => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
