// DATA (incomplete fix, lifecycle), review A of pass 12 (m16). The new "Notes Not Saved" question
// (pbNewRunNeedsAnswer) asks before New Run leaves a run's typed note text and DRAFT photos behind. A note
// photo that was selected but is still being decoded (a big phone photo takes a moment) is not a draft yet:
// it sits only in pbPendingCaptures. New Run then asks nothing, and pbOpenNewRun -> pbResetRunForm bumps
// _pbPhotoContextGen, so when the decode finishes pbAddPhoto discards the photo as "context moved on".
// The photo is lost with no question and no message.
// Steps: lock run A; on plain row 30.0 select a photo (decode held); Home -> New Run; release the decode.
// Expected: New Run asks (or waits for the decode and then asks) - the photo is never silently dropped.
// Control: the same photo, fully decoded before New Run -> "Notes Not Saved" is asked.
const L = require('/home/claude/test/lib.js');
const idxPlain = (page, st) => page.evaluate((st) => (window._pbRowContexts || []).findIndex(c => c && !c.pointId && Math.abs(c.station - st) < 1e-6), st);
const modal = (page) => page.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? document.getElementById('pbModalTitle').textContent : '');
const screen = (page) => page.evaluate(() => (document.querySelector('.pb-screen.active') || {}).id);
const tapNewRun = async (page) => { await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(200); await page.click('#homeTileNewRun'); await page.waitForTimeout(600); };
const notePhotosAnywhere = (page, id) => page.evaluate((id) => {
  const inSlots = Object.keys(window._pbPhotos || {}).filter(k => /^note\d+$/.test(k)).reduce((a, k) => a + (window._pbPhotos[k] || []).filter(p => !p.displayOnly).length, 0);
  const e = window.__debugGetArchive().find(x => x.id === id);
  const saved = (e.fieldNotes || []).reduce((a, n) => a + (n.photoCount || 0), 0);
  return inSlots + saved;
}, id);
const delayDecode = (page) => page.evaluate(() => {
  const Native = window.Image; window.__pendingDecodes = [];
  window.__releaseDecode = () => { const q = window.__pendingDecodes; window.__pendingDecodes = []; q.forEach(f => f()); return q.length; };
  window.Image = function() { const img = new Native(); const setSrc = Object.getOwnPropertyDescriptor(Native.prototype, 'src').set;
    Object.defineProperty(img, 'src', { set(v) { const on = img.onload; img.onload = null; setSrc.call(img, v); const w = () => { if (img.complete && img.naturalWidth) window.__pendingDecodes.push(() => on && on.call(img)); else setTimeout(w, 10); }; w(); } }); return img; };
});
(async () => {
  const browser = await L.chromium.launch();
  // ---- Control: photo decoded before New Run -> asked
  const pc = await L.newPage(browser, 'rvA1c'); await L.dismiss(pc);
  await L.lockRun(pc);
  await (await pc.$('#note' + (await idxPlain(pc, 30)) + 'Photo')).setInputFiles('/home/claude/test/imgA_red.jpg'); await pc.waitForTimeout(1500); await L.dismiss(pc);
  await tapNewRun(pc);
  L.check('control: a decoded, unsaved note photo -> New Run asks "Notes Not Saved"', (await modal(pc)) === 'Notes Not Saved');
  // ---- Photo still decoding when New Run is tapped
  const p = await L.newPage(browser, 'rvA1'); await L.dismiss(p);
  const A = await L.lockRun(p);
  await delayDecode(p);
  await (await p.$('#note' + (await idxPlain(p, 30)) + 'Photo')).setInputFiles('/home/claude/test/imgA_red.jpg'); await p.waitForTimeout(300);
  await tapNewRun(p);
  const m = await modal(p), scr = await screen(p);
  const released = await p.evaluate(() => window.__releaseDecode()); await p.waitForTimeout(800);
  const kept = await notePhotosAnywhere(p, A);
  const m2 = await modal(p);
  console.log('modal at New Run:', JSON.stringify(m), 'screen:', scr, '| decodes released:', released, '| modal after:', JSON.stringify(m2), '| A note photos (draft or saved):', kept);
  L.check('setup: one note-photo decode was held', released === 1);
  L.check('a note photo still decoding at New Run is asked about, or still kept for run A once decoded (not silently discarded)', m === 'Notes Not Saved' || kept === 1);
  L.check('no JS errors', [pc, p].every(x => x._errors.length === 0)); console.log(pc._errors, p._errors);
  await browser.close();
})();
