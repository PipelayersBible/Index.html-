// runsetup 02-04: Run Setup shows what a run needs first; the rest is one line each and opens by itself.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html PB_BASE=http://127.0.0.1:PORT/base.html [PB_SHOTS=dir] node t_rs02_setup_short.js
// (PB_BASE = the r17.11 candidate without these patches; without it the before numbers are the ones saved in before_r1711.json)
const fs = require('fs'); const T = require('path').resolve(__dirname, '../../..'); const boot = require(T + '/rig/boot'); const F = require(T + '/rig/flow');
const CUR = process.env.PB_URL || 'http://127.0.0.1:9650/cur.html', BASE = process.env.PB_BASE || '', SH = process.env.PB_SHOTS || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const rig = require(T + '/rig/co_fm');
const info = (p) => p.evaluate(() => { const s = document.getElementById('screen-input'), vis = e => e.checkVisibility();
  const all = [...s.querySelectorAll('input,select,textarea,button,[role=button],summary')].filter(e => e.type !== 'hidden' && e.type !== 'file' && vis(e) && e.id !== 'pbFbPill' && e.id !== 'pbJumpEnd');
  const rv = [...s.querySelectorAll('button')].find(b => b.textContent.trim() === 'Review & Calculate'), ic = [...s.querySelectorAll('button')].find(b => b.textContent.trim() === 'Import Cutsheet').getBoundingClientRect();
  const firstScreen = all.filter(e => { const r = e.getBoundingClientRect(); return r.top + scrollY < 844 - 62; }).length;
  return { h: s.scrollHeight, controls: all.length, boxes: all.filter(e => /INPUT|TEXTAREA/.test(e.tagName) && e.type !== 'checkbox').length, dropdowns: all.filter(e => e.tagName === 'SELECT').length, checks: all.filter(e => e.type === 'checkbox').length, reviewTop: Math.round(rv.getBoundingClientRect().top + scrollY), importW: Math.round(ic.width), importH: Math.round(ic.height), firstScreen,
    startElevTop: Math.round(document.getElementById('startStakeElev').getBoundingClientRect().top + scrollY), ids: [...s.querySelectorAll('input[id],select[id],textarea[id]')].map(e => e.id) }; });
const newRun = async (p) => { await p.evaluate(() => window.pbOpenNewRun()); await p.waitForTimeout(3600); };
const folds = (p) => p.evaluate(() => { const o = id => { const d = document.getElementById(id); return d ? d.open : null; }, t = id => (document.getElementById(id) || {}).textContent || ''; return { job: o('runJobGroup'), wall: o('runWallGroup'), int: o('runIntGroup'), more: o('runSecMore'), jobSum: t('runJobGroupSum'), wallSum: t('runWallGroupSum'), intSum: t('runIntGroupSum') }; });
const measure = async (url, tag) => {
  const { b, p } = await boot(url, { init: rig }); await p.setViewportSize({ width: 390, height: 844 }); const H = F(p);
  await p.getByText('New Run', { exact: true }).first().click(); await p.waitForTimeout(3600);
  const first = await info(p); if (SH) await p.screenshot({ path: SH + '/' + tag + '_first_run_full.png', fullPage: true });
  await H.f('saJobNumber', '24-017'); await H.f('saJobsite', 'Wildomar Sewer Ph 2'); await newRun(p);
  const job = await info(p); if (SH) { await p.screenshot({ path: SH + '/' + tag + '_job_known_fold.png' }); await p.screenshot({ path: SH + '/' + tag + '_job_known_full.png', fullPage: true }); }
  return { b, p, H, first, job };
};
const line = (n, x) => n + ': ' + x.h + ' px (' + (x.h / 844).toFixed(1) + ' screens), ' + x.controls + ' controls (' + x.boxes + ' boxes, ' + x.dropdowns + ' dropdowns, ' + x.checks + ' tick boxes), first screen shows ' + x.firstScreen + ' controls, first stake box at ' + x.startElevTop + ' px, Review & Calculate at ' + x.reviewTop + ' px, Import Cutsheet ' + x.importW + 'x' + x.importH;
(async () => {
  let before;
  if (BASE) { const m = await measure(BASE, 'before'); before = { first: m.first, job: m.job }; await m.b.close(); if (process.env.PB_SAVE_BEFORE) fs.writeFileSync(__dirname + '/before_r1711.json', JSON.stringify(before)); }
  else before = JSON.parse(fs.readFileSync(__dirname + '/before_r1711.json', 'utf8'));
  const { b, p, H, first, job } = await measure(CUR, 'after');
  console.log(line('BEFORE first-ever run (no job yet)', before.first)); console.log(line('AFTER  first-ever run (no job yet)', first));
  console.log(line('BEFORE job known (current job / last run)', before.job)); console.log(line('AFTER  job known (current job / last run)', job));
  ok(job.h <= before.job.h - 500, 'job known: the form is at least 500 px shorter (' + (before.job.h - job.h) + ' px, ' + Math.round(100 * (before.job.h - job.h) / before.job.h) + '%)');
  ok(first.h <= before.first.h - 200, 'first-ever run: at least 200 px shorter (' + (before.first.h - first.h) + ' px)');
  ok(job.controls <= before.job.controls - 10, 'job known: at least 10 fewer controls showing (' + before.job.controls + ' -> ' + job.controls + ')');
  const cur = new Set(job.ids), gone = before.job.ids.filter(i => !cur.has(i) && !/^pbA11y/.test(i)); ok(gone.length === 0, 'every box and dropdown the form had is still on it (' + before.job.ids.length + ' ids)' + (gone.length ? ' missing ' + gone.join(',') : ''));
  ok(job.importW < 240 && job.importH >= 44 && before.job.importW > 300, 'Import Cutsheet is a compact button (' + before.job.importW + ' -> ' + job.importW + ' px wide, ' + job.importH + ' px tall), still first on the screen');
  ok(job.startElevTop < before.job.startElevTop - 500, 'the first stake box is ' + (before.job.startElevTop - job.startElevTop) + ' px closer to the top');
  // ---- Job details ----
  let f = await folds(p);
  ok(f.job === false && /Job 24-017/.test(f.jobSum) && /Wildomar/.test(f.jobSum) && /no pipelayer yet/.test(f.jobSum), 'job known: Job details is one line: "' + f.jobSum + '"');
  ok(await p.evaluate(() => { const e = document.getElementById('runJobGroupSum'); return e.checkVisibility() && e.scrollWidth <= e.clientWidth + 1; }), 'the Job details line is shown whole');
  await p.click('#runJobGroup > summary'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('saJobNumber').checkVisibility() && document.getElementById('saPipelayer').checkVisibility() && document.getElementById('saNotes').checkVisibility()), 'one tap opens it: job, pipelayer and notes boxes');
  await H.f('saPipelayer', 'Jose Ramirez'); await p.click('#runJobGroup > summary'); await p.waitForTimeout(1800); f = await folds(p);
  ok(/Pipelayer Jose Ramirez/.test(f.jobSum), 'closed line names the pipelayer: "' + f.jobSum + '"');
  // ---- Wall & laying length / Intervals ----
  ok(f.wall === false && f.int === false && /Fills in from the pipe size/.test(f.wallSum) && /Every 10 ft/.test(f.intSum), 'Wall and Intervals are one line each: "' + f.wallSum + '" / "' + f.intSum + '"');
  await H.sel('runIdSel', '8"'); await p.waitForTimeout(1500); f = await folds(p);
  const wt = await p.evaluate(() => document.getElementById('runWT').value);
  ok(f.wall === false && wt !== '' && f.wallSum.indexOf('Wall ' + wt + ' ft (auto)') === 0, 'pipe size 8": wall fills from the table, stays one line showing it: "' + f.wallSum + '"');
  await p.evaluate(() => pbGoToField('runWT')); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('runWallGroup').open && document.activeElement === document.getElementById('runWT')), 'Go to field (wall) opens the line and puts the cursor in the box');
  await H.f('runWT', '0.09'); await p.evaluate(() => { document.getElementById('runWallGroup').open = false; }); await p.waitForTimeout(1500);
  ok(!(await folds(p)).wall && /Wall 0.09 ft$|Wall 0.09 ft /.test((await folds(p)).wallSum) && !/auto/.test((await folds(p)).wallSum), 'a wall typed by hand, closed by the person: stays closed, line says "' + (await folds(p)).wallSum + '" (no "auto")');
  await newRun(p); await H.sel('runIdSel', 'Other'); await p.waitForTimeout(1500); f = await folds(p);
  ok(f.wall === true, 'a custom pipe size (no table wall): the wall box opens by itself (line was "' + f.wallSum + '")');
  await newRun(p); await p.evaluate(() => { document.getElementById('interval').value = '20'; }); await p.waitForTimeout(1500);
  ok((await folds(p)).int === true, 'an interval other than 10 put on the form (draft / resume) opens Intervals');
  await newRun(p); await H.click('Review & Calculate'); await p.waitForTimeout(1200); f = await folds(p);
  const errs = await p.evaluate(() => [...document.querySelectorAll('#screen-input [aria-invalid="true"]')].map(e => e.id));
  ok(errs.length > 0 && await p.evaluate(() => [...document.querySelectorAll('#screen-input [aria-invalid="true"]')].every(e => e.checkVisibility())), 'Review with boxes missing: every flagged box is showing (' + errs.join(', ') + ')');
  // ---- a typical run: what is typed, then Lock, Edit Run Data loads everything ----
  await newRun(p);
  let taps = 0, typed = 0; const tf = async (id, v) => { await H.f(id, v); typed++; }, ts = async (id, l) => { await H.sel(id, l); taps++; };
  await ts('runIdSel', '8"'); await tf('startStakeElev', '100'); await tf('startCutFillVal', '5'); await tf('startStakeReading', '4.8');
  await tf('endSta', '100'); await tf('endStakeElev', '99'); await tf('endCutFillVal', '5'); await tf('endStakeReading', '5.8');
  await p.waitForTimeout(800); f = await folds(p);
  ok(!f.job && !f.wall && !f.int && !f.more, 'a typical run (job known, table pipe, two staked points): no fold had to be opened');
  const snap = () => p.evaluate(() => { const o = {}; document.querySelectorAll('#screen-input input[id], #screen-input select[id], #screen-input textarea[id]').forEach(e => { if (e.type === 'file' || /^pbA11y|^duplicateRunSel$/.test(e.id)) return; o[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); return o; });
  const s0 = await snap();
  await H.click('Review & Calculate'); taps++; await p.waitForTimeout(1800);
  console.log('typical run on the patched page: ' + typed + ' boxes typed + ' + (taps) + ' taps (pipe size, Review & Calculate), then Lock This Run. Before: the same ' + typed + ' boxes and taps, with ' + (before.job.reviewTop - job.reviewTop) + ' px more scrolling.');
  ok((await H.screen()) === 'screen-review' || (await H.screen()) === 'screen-results', 'Review & Calculate goes on (' + (await H.screen()) + ')');
  const warnText = await p.evaluate(() => { const s = [...document.querySelectorAll('[id^=screen-]')].find(x => x.offsetParent); return s.innerText; });
  ok(/Lock This Run/.test(warnText), 'Lock This Run is where it was: at the end of the review, after the checks (not pinned)');
  await p.getByText('Lock This Run', { exact: true }).click(); await p.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) { const btns = await H.modalBtns(); if (!btns.length) break; const pick = ['Lock Without It', 'Lock Anyway', 'Lock', 'Continue', 'OK', 'Got It'].find(x => btns.includes(x)) || btns[btns.length - 1]; console.log('  modal: ' + String(await H.modal()).slice(0, 110) + ' -> ' + pick); await H.modalClick(pick); await p.waitForTimeout(900); }
  await p.waitForTimeout(1500);
  await p.evaluate(() => pbEditRunData()); await p.waitForTimeout(2500); await H.modalClick('Edit').catch(() => {}); await p.waitForTimeout(2500);
  const s1 = await snap(); const diff = Object.keys(s0).filter(k => String(s0[k]) !== String(s1[k]));
  ok((await H.screen()) === 'screen-input' && diff.length === 0, 'Edit Run Data: every box, dropdown and tick box holds what the run was locked with (' + Object.keys(s0).length + ' fields)' + (diff.length ? ' differs: ' + diff.map(k => k + ' ' + s0[k] + ' -> ' + s1[k]).join('; ') : ''));
  f = await folds(p); ok(/Job 24-017/.test(f.jobSum) && /Wall 0.02 ft \(auto\)/.test(f.wallSum) && /Every 10 ft/.test(f.intSum), 'Edit Run Data: the lines show the run\'s job, wall and interval: "' + f.jobSum + '" / "' + f.wallSum + '" / "' + f.intSum + '"');
  // ---- same pipe as the last run on this job ----
  await newRun(p);
  let chip = await p.evaluate(() => { const b = document.getElementById('runSamePipeBtn'); return b && !b.hidden && b.checkVisibility() ? b.textContent : ''; });
  ok(/^Same as the last run on this job: 8″/.test(chip), 'New Run on the same job offers: "' + chip + '"');
  ok(await p.evaluate(() => document.getElementById('runIdSel').value === ''), 'nothing is filled until it is tapped');
  await p.click('#runSamePipeBtn'); await p.waitForTimeout(800); const m = await H.modal(); await H.modalClick('OK').catch(() => H.modalClick('Got It').catch(() => {})); await p.waitForTimeout(1200);
  const pv = await p.evaluate(() => ({ id: document.getElementById('runIdSel').selectedOptions[0].text, wt: document.getElementById('runWT').value, chip: !document.getElementById('runSamePipeBtn').hidden }));
  ok(/8/.test(pv.id) && pv.wt === s0.runWT && !pv.chip && /Pipe settings copied/.test(String(m)), 'one tap: 8" and wall ' + pv.wt + ' are on the form, with the app\'s own message ("' + String(m).slice(0, 60) + '…")');
  await newRun(p); await p.evaluate(() => pbGoToField('saJobNumber')); await H.f('saJobNumber', '99-999'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => { const b = document.getElementById('runSamePipeBtn'); return !b || b.hidden; }), 'a different job number: not offered');
  // ---- Import Cutsheet still opens ----
  await newRun(p); await H.click('Import Cutsheet'); await p.waitForTimeout(800);
  ok((await H.screen()) === 'screen-cutsheetImport', 'Import Cutsheet opens the import screen');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'no sideways scroll at 390 px');
  ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close(); console.log(fails ? 'RS02 FAILED: ' + fails : 'RS02 ALL PASS'); process.exit(fails ? 1 : 0);
})();
