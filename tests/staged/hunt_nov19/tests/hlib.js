// hunt_nov19 helpers: the repo rig (fake Supabase, signed-in foreman), a locked 100 ft run on job 24-017, and "an iPhone":
// iPhone Safari and the iPhone Home Screen app never show the page's own beforeunload question.
const path = require('path'); const RIGD = path.resolve(__dirname, '../../../rig');
const boot = require(RIGD + '/boot.js'), co = require(RIGD + '/co.js'), mkrun = require(RIGD + '/mkrun.js'), F = require(RIGD + '/flow.js');
const URL = process.env.PB_URL || 'http://127.0.0.1:9000/cur.html';
const IOS = "(()=>{const a=window.addEventListener;window.addEventListener=function(t){if(t==='beforeunload')return;return a.apply(this,arguments);};})();";
async function open(opts = {}) { const r = await boot(opts.url || URL, { init: co + (opts.init || ''), wait: opts.wait || 3000 }); await r.p.setViewportSize({ width: 390, height: 844 }); r.H = F(r.p); return r; }
async function lockRun(p, H, dist) {
  await mkrun(p, dist || 100); await p.getByText('Lock This Run', { exact: true }).click(); await p.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) { const m = await H.modal(); if (!m) break;
    if (/Which Job/.test(m)) { await p.evaluate(() => { const d = [...document.querySelectorAll('.pb-modal-overlay,[role=dialog]')].find(x => x.offsetParent); const i = d.querySelector('input'); i.value = '24-017'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await H.modalClick('Use It'); }
    else { const bs = await H.modalBtns(); await H.modalClick(bs[bs.length - 1]); }
    await p.waitForTimeout(900); }
}
async function lockedRun(opts = {}) { const r = await open(opts); await lockRun(r.p, r.H, opts.dist); return r; }
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const done = async (b) => { console.log(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); try { await b.close(); } catch (e) {} process.exit(fails ? 1 : 0); };
module.exports = { open, lockRun, lockedRun, IOS, ok, done, F, co, RIGD, URL };
