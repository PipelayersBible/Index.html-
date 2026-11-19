// askgrade tests: the grade2 page helpers (boot + driver) plus Review/Lock with the modals answered.
// Runs from tests/staged/askgrade/tests or, once moved, from tests/bughunt_nov17/grade2/tests.
const fs = require('fs'), path = require('path');
const libPath = fs.existsSync(path.join(__dirname, 'lib.js')) ? path.join(__dirname, 'lib.js') : path.join(__dirname, '../../../bughunt_nov17/grade2/tests/lib.js');
const L = require(libPath);
const G2 = path.join(path.dirname(libPath), '..'); // tests/bughunt_nov17/grade2
const PREF = ['I Checked Them', 'Lock Without It', 'Lock Anyway', 'Lock It Anyway', 'Replace', 'Continue', 'OK', 'Got It', 'Close'];
async function modals(p) {
  for (let i = 0; i < 8; i++) {
    const t = await p.evaluate((P) => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x => x.offsetParent && x.innerText.trim()); if (!d) return null; const bs = [...d.querySelectorAll('button')].filter(b => b.offsetParent); const b = bs.find(b => P.includes(b.textContent.trim())) || bs[bs.length - 1]; if (!b) return null; b.click(); return b.textContent.trim(); }, PREF);
    if (!t) return; await p.waitForTimeout(650);
  }
}
async function lock(p) {
  await p.evaluate(() => window.__g2review()); await p.waitForTimeout(900); await modals(p);
  await p.evaluate(() => window.__g2lock()); await p.waitForTimeout(1500); await modals(p); await p.waitForTimeout(1200); await modals(p);
  return p.evaluate(() => window.__g2rec());
}
module.exports = { L, S: L.S, lock, modals, G2, gen: require(path.join(G2, 'ref', 'gen.js')).gen };
