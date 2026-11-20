// hunt2 02: a run has two stake photos; the phone's photo store loses them; the app is reopened.
// The person must be told: a Records banner (count + which record), a line on the run's Results, and a plain
// "Photo missing" picture instead of a broken image. A healthy phone shows none of it.
// Needs a hook page. Run: PB_URL=http://127.0.0.1:<port>/<hook page> node t_p02_missing_photo_notice.js
const L = require('../../hunt_nov19/tests/hlib');
const STAKE = { is_stake: true, stake_number: { value: '3860', conf: 'high' }, station: { value: '1+50', conf: 'high' }, offset: { value: '10/SD', conf: 'high' }, line_label: { value: 'MH-1', conf: 'high' }, cut_fill: { direction: 'cut', feet: 5, as_written: 'C-5', to: 'IE', conf: 'high' }, stake_elevation: { feet: 100, as_written: '100', conf: 'high' }, other_text: '', uncertain: [] };
(async () => {
  const { b, p, H } = await L.open({ url: process.env.PB_URL });
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
  const look = async () => {
    await p.evaluate(() => pbGoto('archive')); await p.waitForTimeout(900);
    const banner = await p.evaluate(() => { const x = document.getElementById('archivePhLostBtn'); return x && !x.hidden && x.offsetParent ? x.innerText.trim() : null; });
    let modal = null; if (banner) { await p.click('#archivePhLostBtn'); await p.waitForTimeout(500); modal = await H.modal(); if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + '_modal.png' }); if (modal) await H.modalClick('OK'); }
    // open the run from Records
    const id = await EV("runArchive.find(x=>x.kind==='run').id");
    await EV("(function(){currentRunArchiveId=" + JSON.stringify(id) + ";})()"); await p.evaluate(() => pbGoto('results')); await p.waitForTimeout(900);
    const line = await p.evaluate(() => { const x = document.getElementById('phLostRunBanner'); return x && x.offsetParent ? x.innerText.trim() : null; });
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT + '_run.png' });
    // an <img> given the record's first photo value
    const img = await p.evaluate(async (src) => { const i = new Image(); i.id = 'h2probe'; document.body.appendChild(i); i.src = src; await new Promise(r => setTimeout(r, 700)); const o = { lost: i.getAttribute('data-pb-ph-lost'), alt: i.alt, w: i.naturalWidth, svg: /^data:image\/svg/.test(i.src) }; i.remove(); return o; }, await EV("(function(){let v=null;JSON.stringify(runArchive.find(x=>x.kind==='run'),function(k,x){if(v===null&&typeof x==='string'&&(/^data:image/.test(x)||/^pbph:1:/.test(x)))v=x;return x;});return v;})()"));
    return { banner, modal, line, img };
  };
  const good = await look(); console.log('healthy', JSON.stringify(good).slice(0, 300));
  L.ok(good.banner === null && good.line === null && !good.img.lost && good.img.w > 0, 'a healthy phone: no banner, no line on the run, the photo draws');
  await p.waitForTimeout(5000);
  const n = await p.evaluate(async () => { const ks = await window.__pbPhDebug.keys(); await new Promise((ok) => { const r = indexedDB.open('pb-photos', 1); r.onsuccess = () => { const t = r.result.transaction('ph', 'readwrite'); ks.forEach((k) => t.objectStore('ph').delete(k)); t.oncomplete = () => { r.result.close(); ok(); }; }; }); return ks.length; });
  L.ok(n === 2, 'both photos were in the photo store (' + n + ')');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(4000);
  const bad = await look(); console.log('photos lost', JSON.stringify(bad));
  L.ok(!!bad.banner && /2 photos are missing from this phone/.test(bad.banner), 'Records shows a banner: "' + bad.banner + '"');
  L.ok(!!bad.modal && /24-017/.test(bad.modal) && /2 photos/.test(bad.modal) && /still with your company/.test(bad.modal), 'tapping it says which record and that sent photos are still with the company');
  L.ok(!!bad.line && /2 photos of this run are missing from this phone/.test(bad.line), 'the run’s Results says so: "' + bad.line + '"');
  L.ok(bad.img.lost === '1' && bad.img.svg && bad.img.w > 0 && /missing/i.test(bad.img.alt), 'a missing photo draws as a "Photo missing" picture, not a broken image');
  const rec = await EV("JSON.stringify(runArchive.find(x=>x.kind==='run')).match(/pbph:1:[0-9a-f]{64}/g).length");
  L.ok(rec >= 2, 'the record still keeps the photo references (nothing was changed by the notice)');
  L.ok(!p.errs.length, 'no page errors ' + p.errs.slice(0, 2).join(' | '));
  await L.done(b);
})().catch((e) => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
