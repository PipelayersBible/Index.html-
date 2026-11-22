// records_nov22 PHASE A checks. PASS/FAIL per item; exit 1 on any FAIL.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_records_a.js   (a --hooks build: window.__ev)
const R = __dirname + '/../../../rig/';
const boot = require(R + 'boot'), co = require(R + 'co'), F = require(R + 'flow'), mk = require(R + 'mkrun');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10790/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, p } = await boot(URL0, { init: co }); const H = F(p);
  const ctx = p.context();
  const ev = (s) => p.evaluate(s => window.__ev(s), s);
  const evA = (s) => p.evaluate(s => window.__ev('(async () => {' + s + '})()'), s);
  const modalOff = async () => { for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) return; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Cancel') ? 'Cancel' : bt.includes('Keep It') ? 'Keep It' : bt[bt.length - 1]).catch(() => {}); await p.waitForTimeout(300); } };
  const groups = () => evA("await pbUnsentSentence(pbArchiveOwnerUid); return pbUnsentGroups(pbArchiveOwnerUid, true).map(g => g.key + ':' + g.n);");
  const has = (g, k) => (g.find(x => x.startsWith(k + ':')) || '').split(':')[1] || '0';
  await p.evaluate(() => { window.__rpcOverride.pb_prod_run_record_put = (a) => ({ ok: true, same: false, version: 1 }); window.__rpcOverride.pb_prod_run_clock = { ok: true }; });

  // ---- A1 / A2: a run locked with no signal ----
  await ctx.setOffline(true);
  await mk(p, 100);
  await H.click('Lock This Run'); await p.waitForTimeout(1000);
  for (let i = 0; i < 5; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns();
    if (/Which Job/.test(m)) { await p.evaluate(() => { const i = document.querySelector('#pbModalDialog input'); i.value = '24-017'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await H.modalClick('Use It'); await p.waitForTimeout(900); continue; }
    await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(900); }
  await p.waitForTimeout(800);
  const nRuns = await ev("runArchive.filter(e => e.kind === 'run').length");
  ok(nRuns === 1, 'setup: one run locked offline (' + nRuns + ')');
  let g = await groups();
  ok(has(g, 'runs') === '1', 'A1 Not sent counts the run record the company hasn\'t got (' + g.join(',') + ')');
  const sentence = await ev("pbUnsentSentence(pbArchiveOwnerUid)").catch(() => '');
  const st = await evA("return await pbUnsentSentence(pbArchiveOwnerUid);");
  ok(/1 run record/.test(st), 'A1 Log Out sentence says "1 run record" ("' + st + '")');
  await p.evaluate(() => pbGotoTab('home')); await p.waitForTimeout(1500); await ev("window.pbRenderHome()"); await p.waitForTimeout(800);
  const homeTxt = await p.evaluate(() => document.getElementById('screen-home').innerText);
  ok(/Not sent[\s\S]{0,40}1 run record/.test(homeTxt), 'A1 Home "Not sent" line shows the run record');
  // A6: phone didn't keep storage -> one more sentence on that line
  await p.evaluate(() => { window.pbStoreKept = false; }); await ev("window.pbRenderHome()"); await p.waitForTimeout(500);
  ok(/Add to Home Screen so this phone keeps your work/.test(await p.evaluate(() => document.getElementById('screen-home').innerText)), 'A6 not kept + Not sent: "Add to Home Screen so this phone keeps your work."');
  ok(await p.evaluate(() => !!document.getElementById('settingsKeepWork') && /Don’t delete the app icon while anything shows Not sent/.test(document.getElementById('settingsKeepWork').textContent)), 'A6 Settings line about the app icon');
  // A2: delete asks twice
  await ev("pbDeleteArchiveEntry(runArchive.findIndex(e => e.kind === 'run'))"); await p.waitForTimeout(400);
  let m = await H.modal();
  ok(/Not at Your Company/.test(m || '') && /This run has NOT reached your company\. Deleting it deletes the only copy\./.test(m || ''), 'A2 first ask: "' + (m || '').slice(0, 120) + '"');
  await H.modalClick('Delete Anyway'); await p.waitForTimeout(400); m = await H.modal();
  ok(/It has NOT reached your company: this deletes the only copy\./.test(m || ''), 'A2 second ask repeats it');
  await modalOff();
  ok((await ev("runArchive.filter(e => e.kind === 'run').length")) === 1, 'A2 Cancel keeps the run');
  // A5: no-email account can't log out while something is Not sent
  await ev("sbUser.app_metadata = Object.assign({}, sbUser.app_metadata, { pb_link: true })");
  await ev("window.pbLogout()"); await p.waitForTimeout(2200); m = await H.modal(); const lb = await H.modalBtns();
  ok(/Not Sent Yet/.test(m || '') && /1 run record/.test(m || '') && !lb.includes('Log Out'), 'A5 link account: Log Out blocked while Not sent (' + lb.join('|') + ')');
  await modalOff();
  await ev("window.pbLockThisPhone()"); await p.waitForTimeout(2200); m = await H.modal();
  ok(/Not Sent Yet/.test(m || '') && /lock the phone/.test(m || ''), 'A5 link account: Lock This Phone blocked too');
  await modalOff(); await ev("sbUser.app_metadata = Object.assign({}, sbUser.app_metadata, { pb_link: false })");
  // A3: no signal is not a failed try
  ok((await evA("return await pbSyncRunToSupabase(runArchive.find(e => e.kind === 'run'));")) === 'offline', 'A3 legacy copy with no signal -> offline (no try used)');

  // ---- signal back: it goes, and the counts clear ----
  await ctx.setOffline(false); await p.waitForTimeout(500);
  await evA("await pbRrSend();"); await p.waitForTimeout(2500);
  const puts = await p.evaluate(() => (window.__rpcArgs || []).filter(x => x[0] === 'pb_prod_run_record_put').length);
  ok(puts >= 1, 'setup: with signal the run record went (' + puts + ' puts)');
  g = await groups();
  ok(has(g, 'runs') === '0', 'A1 accepted: no run record counted (' + g.join(',') + ')');
  ok((await ev("window.pbRrRunState(runArchive.find(e => e.kind === 'run')).k")) === 'ok', 'A2 state of the accepted run is ok');
  await ev("pbDeleteArchiveEntry(runArchive.findIndex(e => e.kind === 'run'))"); await p.waitForTimeout(400); m = await H.modal();
  ok(!/Not at Your Company|NOT reached/.test(m || '') && /This can.t be undone/.test(m || ''), 'A2 accepted run: the plain confirm only');
  await modalOff();
  ok((await evA("return await pbSyncRunToSupabase(runArchive.find(e => e.kind === 'run'));")) === 'failed', 'A3 a server refusal (with signal) still counts as a failed try');

  // ---- A4: an old run the company already has, changed later, still goes ----
  const r4 = await evA("const e = runArchive.find(x => x.kind === 'run'); e.lockTime = new Date(Date.now() - 40 * 86400000); await saveRunArchive(); window.__rpcArgs = []; pbRr.pauseUntil = 0; pbRr.asked = {}; await pbRrSend(); await new Promise(r => setTimeout(r, 1500)); const st1 = window.pbRrRunState(e).k; e.note40 = 'changed'; await saveRunArchive(); window.__rpcArgs = []; const st2 = window.pbRrRunState(e).k; await pbRrSend(); await new Promise(r => setTimeout(r, 1500)); return [st1, st2, (window.__rpcArgs || []).filter(x => x[0] === 'pb_prod_run_record_put').length, window.pbRrRunState(e).k];");
  ok(r4[0] === 'ok' && r4[1] === 'unsent' && r4[2] >= 1 && r4[3] === 'ok', 'A4 a 40-day-old run the company has, changed: counted, sent, accepted (' + r4.join(',') + ')');
  const r4b = await evA("const e = runArchive.find(x => x.kind === 'run'); const id = String(e.id); delete pbRr.sig[id]; delete pbRr.sent[id]; pbRrHC.gen++; const acc = pbProdAccMem.get(pbArchiveOwnerUid); const j = acc.joinedAt; acc.joinedAt = Date.now() - 5 * 86400000; const a = pbRrWants(e, acc); acc.joinedAt = Date.now() - 60 * 86400000; const b2 = pbRrWants(e, acc); acc.joinedAt = j; return [a, b2];");
  ok(r4b[0] === false && r4b[1] === true, 'A4 an old run locked before he joined this company does not go; one after he joined does (' + r4b.join(',') + ')');

  // ---- A1 / A2: a closed permit not backed up ----
  const pm = await evA("await pbPermitBkLoad(pbArchiveOwnerUid); runArchive.push({ kind: 'confined', id: Date.now(), lockTime: new Date(Date.now() - 86400000), space: 'MH-4 test', permitSessionId: 'tst-' + Date.now(), permit: { space: 'MH-4 test' }, photos: [] }); await saveRunArchive(); const e = runArchive[runArchive.length - 1]; return pbPermitBkStateOf(e).k;");
  ok(pm === 'pending' || pm === 'failing', 'setup: closed permit not backed up (' + pm + ')');
  g = await groups();
  ok(has(g, 'permits') === '1', 'A1 Not sent counts the permit (' + g.join(',') + ')');
  await ev("pbDeleteArchiveEntry(runArchive.length - 1)"); await p.waitForTimeout(400); m = await H.modal();
  ok(/Back It Up First/.test(m || '') && /OSHA 1926\.1205\(f\)/.test(m || ''), 'A2 permit not backed up, under 1 year: blocked ("' + (m || '').slice(0, 90) + '")');
  await modalOff();
  await evA("runArchive[runArchive.length - 1].lockTime = new Date(Date.now() - 400 * 86400000); await saveRunArchive();");
  await ev("pbDeleteArchiveEntry(runArchive.length - 1)"); await p.waitForTimeout(400); m = await H.modal();
  ok(!/Back It Up First/.test(m || '') && /NOT backed up/.test(m || ''), 'A2 a permit over a year old: the strong warning, not blocked');
  await modalOff();

  // ---- A7 storage advice ----
  const adv = await ev("(pbStoreFailInfo = { kind: 'room', big: false, ref: 'PB-R-T', at: Date.now() }, [pbSaveAdvice(), pbSaveAdvice(true), (pbStoreFailInfo.big = true, pbSaveAdvice())])");
  ok(/small storage/.test(adv[0]) && !/delete old runs/i.test(adv[0] + adv[1]) && /Deleting runs/.test(adv[1]), 'A7 small store full: photos on unsent reports/tickets/permits, not "delete old runs"');
  ok(/Free up space on the phone/.test(adv[2]), 'A7 Records store full: free up space on the phone');
  await ev("pbStoreFailInfo = null");

  // ---- A9 run removal reason ----
  await p.evaluate(() => { window.__rpcOverride.pb_prod_run_remove = { ok: true, again: false, entries_voided: 0 }; window.__rpcArgs = []; });
  await ev("(pbRoFor(pbArchiveOwnerUid).open = { id: '7d0a0000-0000-4000-8000-000000000009', label: 'MH-1 to MH-2', job_number: '24-017', who: 'Mike' }, window.pbRrDelete())"); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.getElementById('rrDelReason')), 'A9 Delete Run asks why (reason box)');
  await H.modalClick('Delete Run'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.getElementById('rrDelReasonErr')) && (await p.evaluate(() => (window.__rpcArgs || []).filter(x => x[0] === 'pb_prod_run_remove').length)) === 0, 'A9 empty reason: not sent, says why');
  await p.fill('#rrDelReason', 'Entered twice'); await H.modalClick('Delete Run'); await p.waitForTimeout(800);
  const rr = await p.evaluate(() => (window.__rpcArgs || []).filter(x => x[0] === 'pb_prod_run_remove').map(x => x[1].p_reason));
  ok(rr.length === 1 && rr[0] === 'Entered twice', 'A9 the reason goes to the server (' + JSON.stringify(rr) + ')');
  await modalOff();

  // ---- A10 exhibit dates ----
  const ex = await ev("[pbExhibit('2026-11-01T08:00:00', '2026-11-10T17:00:00'), pbExhibit('2026-11-15T08:00:00', '2026-11-20T17:00:00'), pbExhibit('2026-11-20T08:00:00', '2026-11-21T17:00:00')]");
  ok((ex[0].match(/This did not apply to these Records/g) || []).length === 5, 'A10 records before Nov 16: 5 dated parts say they did not apply (' + (ex[0].match(/This did not apply/g) || []).length + ')');
  ok(/not for the Records made before that date/.test(ex[1]) && !/This did not apply/.test(ex[1]), 'A10 records spanning Nov 17: dated parts say since when');
  ok(!/did not apply|not for the Records made before/.test(ex[2]) && /Since November 17, 2026: the server re-reads each run photograph/.test(ex[2]), 'A10 records after Nov 17: plain, with start dates');
  const p9src = await p.evaluate(() => document.documentElement.innerHTML.includes('reached the server more than once (for example during entry and at close-out)'));
  ok(!p9src, 'A10 permit paragraph 9 no longer says "reached the server more than once"');

  // ---- A8 office-filled daily PDF (banner, rows and statement through a recording stand-in for the PDF kit) ----
  const a8 = await ev(`(() => {
    const out = [], doc = new Proxy({}, { get(t, k) { if (k === 'splitTextToSize') return (x) => [String(x)]; if (k === 'internal') return { pageSize: { getWidth: () => 612, getHeight: () => 792, width: 612, height: 792 }, getNumberOfPages: () => 1 }; if (k === 'getNumberOfPages') return () => 1; return () => 0; } });
    const R = new Proxy({ final: false, y: 0, doc }, { get(t, k) { if (k in t) return t[k]; return (...a) => { if (['banner', 'para', 'kv', 'section'].includes(k)) out.push([k, JSON.stringify(a)]); return R; }; } });
    const S = { job: { number: '24-017', site: 'Test' }, work_date: '2026-11-20', tz: 'America/Los_Angeles', built_at: new Date().toISOString(), foreman: { uid: 'u', account: 'pm@example.com' },
      office_fill: { for_uid: 'f', for_name: 'Brandon Jones', by_name: 'Pat Manager', by_account: 'pm@example.com', by_uid: 'u' },
      signed: { name: 'Pat Manager', at: new Date().toISOString(), tz: 'America/Los_Angeles', drawn: false },
      inspections: { items: [] }, runs: { items: [], totals: {} }, crew: { totals: { laborer_h: 0, operator_h: 0, equipment_h: 0 }, open_check_ins: 0, people: [], equipment: [] }, permits: { items: [] }, weather: { available: false, label: 'n/a' }, delays: { available: true, items: [], totals: [] }, narrative: 'x', materials: { items: [], delivered: [], used: [] }, safety_events: { items: [] }, talks: { items: [] } };
    try { pbDlyPdfInto(R, { cid: 'c1', snapshot: S, sha: 'ab'.repeat(32) }); } catch (e) { out.push(['err', String(e && e.message)]); }
    return out; })()`);
  const a8s = JSON.stringify(a8);
  ok(/FILLED IN BY THE OFFICE \(PAT MANAGER, PM@EXAMPLE\.COM\) FOR FOREMAN BRANDON JONES\. NOT SIGNED BY THE FOREMAN\./.test(a8s), 'A8 banner: filled in by the office, not signed by the foreman');
  ok(!/SIGNED BY PAT/.test(a8s) && /who did not sign it/.test(a8s) && !/By signing, the foreman states/.test(a8s), 'A8 no "SIGNED BY", the statement is the office\'s' + (/\["err"/.test(a8s) ? ' (stand-in stopped: ' + a8.find(x => x[0] === 'err')[1] + ')' : ''));

  ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 3).join(' | ') + ')');
  await b.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); process.exit(1); });
