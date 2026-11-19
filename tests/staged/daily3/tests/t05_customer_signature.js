// #49 customer signature on extra work: sign on the phone (pad, name, title, time) with no signal, stored with the entry,
// a record (no Change / Remove; Amend keeps the signed version), the ticket PDF, the daily PDF, the signed snapshot that
// goes when signal is back, an amendment of the daily keeps it, the office list's tag.
const L = require('./lib3');
const draw = async (p) => { const r = await p.evaluate(() => { const b = document.getElementById('xsPad').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  await p.mouse.move(r.x + r.w * 0.1, r.y + r.h * 0.6); await p.mouse.down();
  for (let i = 1; i <= 12; i++) await p.mouse.move(r.x + r.w * (0.1 + i * 0.06), r.y + r.h * (0.6 - 0.3 * Math.sin(i / 2)));
  await p.mouse.up(); };
const modalClick = async (p, t) => { await p.waitForTimeout(400); await L.mclick(p, t); };
(async () => {
  const { b, p } = await L.boot();
  await L.capSubmit(p);
  await L.run(p, { job: '24-017', start: L.T(7), end: L.T(15), pipe: 80 });
  await L.daily(p, { job: '24-017' });
  await L.ev(p, `(async()=>{pbDpFormOpen(-1);pbDpF('kind','extra');pbDpF('reason','owner_extra');pbDpF('detail','Moved hydrant 6 ft at STA 2+10 for the owner');pbDpF('hours','3');pbDpF('crew','3');await pbDpFormSave();return pbDpDraft().events.length;})()`);
  await p.waitForTimeout(800); await L.openAll(p);
  L.ok(!!(await p.$('#dpEvSig_0')) && /Not signed by the customer/.test(await L.txt(p, '#dpEv_0')), 'an Extra work entry shows "Not signed by the customer" and Customer Signs');
  // no signal from here
  await p.context().setOffline(true); await p.waitForTimeout(400);
  await p.click('#dpEvSig_0'); await p.waitForTimeout(600);
  const sum = await L.txt(p, '#xsSum'); console.log('sheet:', sum.replace(/\s+/g, ' '));
  L.ok(/Extra work: Owner-directed/.test(sum) && /Moved hydrant/.test(sum) && /Hours 3/.test(sum) && /24-017/.test(sum), 'the sheet shows what the customer signs');
  await L.both(p, 't05_sheet');
  await p.click('#xsSignBtn'); await p.waitForTimeout(300); L.ok(/signs on the pad first/.test(await L.txt(p, '#xsMsg')), 'Sign needs a drawn signature');
  await draw(p);
  await p.click('#xsSignBtn'); await p.waitForTimeout(300); L.ok(/Type the customer/.test(await L.txt(p, '#xsMsg')), 'Sign needs the customer’s name');
  await p.fill('#xsName', 'Pat Owner'); await p.fill('#xsTitleIn', "Owner's rep");
  await p.click('#xsSignBtn'); await p.waitForTimeout(1200);
  const e1 = await L.ev(p, `(()=>{const e=pbDpDraft().events[0];return {sig:e.cust_sig&&Object.assign({},e.cust_sig,{png:(e.cust_sig.png||'').length}),sha:__pbXs.sha(e,pbDlyView.job,pbDlyView.date)};})()`);
  console.log('cust_sig', JSON.stringify(e1.sig));
  L.ok(!(await p.$('#xsSign')) && e1.sig && e1.sig.name === 'Pat Owner' && e1.sig.title === "Owner's rep" && e1.sig.png > 200 && /^[0-9a-f]{64}$/.test(e1.sig.png_sha) && e1.sig.entry_sha === e1.sha && !isNaN(Date.parse(e1.sig.at)) && e1.sig.tz, 'offline: signature, name, title, time and zone stored with the entry (with the entry’s fingerprint)');
  const kept = await L.ev(p, `(async()=>{const o=JSON.parse(await pbGetFor(pbArchiveOwnerUid,'dailyPlusDraft'));return Object.values(o).some(d=>(d.events||[]).some(e=>e.cust_sig&&e.cust_sig.name==='Pat Owner'));})()`);
  L.ok(kept === true, 'it is saved on this phone (the daily’s stored draft)');
  let row = await L.txt(p, '#dpEv_0'); console.log('row:', row.replace(/\s+/g, ' '));
  L.ok(/Customer signed/.test(row) && /Pat Owner, Owner's rep/.test(row) && !(await p.$('#dpEvEdit_0')) && !(await p.$('#dpEvDel_0')) && !!(await p.$('#dpEvAmend_0')), 'a signed entry: Customer signed, no Change or Remove, Amend instead');
  await L.both(p, 't05_signed_row');
  await L.ev(p, 'pbDpEvRemove(0)'); await p.waitForTimeout(400); const m = await L.modal(p); console.log('remove:', m);
  L.ok(/stays on the report/.test(m || ''), 'Remove is refused for a signed entry'); if (m) await modalClick(p, m.split(' | ').pop().split(',')[0]);
  let pdf = (await L.pdfText(p, 'pbXsPdfDraft(0,true)', 't05_ticket')).replace(/[ \t]+/g, ' ');
  L.ok(/Extra Work Ticket/.test(pdf) && /SIGNED BY THE CUSTOMER: PAT OWNER/.test(pdf) && /Moved hydrant 6 ft/.test(pdf) && /matches this ticket/.test(pdf) && /Owner's rep/.test(pdf), 'the ticket PDF: signed by, title, the work, the fingerprint matches');
  const imgs = require('child_process').execSync('pdfimages -list ' + (process.env.PB_OUT || '/tmp') + '/t05_ticket.pdf | tail -n +3 | wc -l').toString().trim(); console.log('images in ticket PDF:', imgs);
  L.ok(Number(imgs) >= 1, 'the ticket PDF carries the drawn signature image');
  // Amend: the signed version is kept, the change needs a new signature
  await p.click('#dpEvAmend_0'); await p.waitForTimeout(400); await modalClick(p, 'Amend'); await p.waitForTimeout(600);
  L.ok(/Amend this entry/.test(await L.txt(p, '#dpForm')), 'Amend opens the entry as "Amend this entry"');
  await L.ev(p, 'pbDpFormSave()'); await p.waitForTimeout(500); L.ok(/Nothing changed/.test(await L.txt(p, '#dpFormMsg')), 'saving an unchanged amendment is refused (the signed one stays)');
  await L.ev(p, `(async()=>{pbDpF('hours','4');await pbDpFormSave();})()`); await p.waitForTimeout(800);
  const e2 = await L.ev(p, `(()=>{const e=pbDpDraft().events[0];return {sig:!!e.cust_sig,prior:(e.prior||[]).map(x=>({h:x.hours,by:x.cust_sig&&x.cust_sig.name,png:!!(x.cust_sig&&x.cust_sig.png)})),hours:e.hours};})()`); console.log('amended', JSON.stringify(e2));
  L.ok(!e2.sig && e2.hours === 4 && e2.prior.length === 1 && e2.prior[0].h === 3 && e2.prior[0].by === 'Pat Owner' && e2.prior[0].png, 'the amended entry keeps the signed version (3 h, with its signature) and is not signed');
  row = await L.txt(p, '#dpEv_0'); L.ok(/Amends the version Pat Owner, Owner's rep signed \(3 h\)/.test(row) && !!(await p.$('#dpEvSig_0')), 'the row says what it amends; Customer Signs is back');
  await p.click('#dpEvSig_0'); await p.waitForTimeout(500); await draw(p); await p.fill('#xsName', 'Pat Owner'); await p.click('#xsSignBtn'); await p.waitForTimeout(1200);
  L.ok(await L.ev(p, `!!pbDpDraft().events[0].cust_sig && pbDpDraft().events[0].cust_sig.title===null`), 'the customer signs the amended entry (no title this time)');
  // sign the daily with no signal
  let sg = await L.sign(p, 'Tommy Fontaine', 'Laid 80 ft. Extra work for the owner.');
  const chg = await p.evaluate(() => { const c = document.getElementById('drChanged'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; }); console.log('sign', JSON.stringify(sg), chg);
  if (chg) sg = await L.sign(p, 'Tommy Fontaine', 'Laid 80 ft. Extra work for the owner.'); // pre-existing: a report built with signal and signed without it shows "Changed: other crews' production" once
  const rep = await L.ev(p, `(()=>{const r=pbDly.st.reports.slice(-1)[0];const e=r.snapshot.events[0];return {state:r.state,cid:r.cid,sig:!!(e.cust_sig&&e.cust_sig.png),prior:(e.prior||[]).length};})()`); console.log('report', JSON.stringify(rep));
  L.ok(rep.state === 'waiting' && rep.sig && rep.prior === 1, 'offline: the signed daily keeps the signature and the earlier signed version, waiting to send');
  pdf = (await L.pdfText(p, `pbDlyMakePdf(pbDly.st.reports.slice(-1)[0], false, true)`, 't05_daily')).replace(/[ \t]+/g, ' ');
  L.ok(/Customer signatures \(1\)/.test(pdf) && /Customer: signed by Pat Owner/.test(pdf) && /Earlier version 1/.test(pdf) && /matches the entry above/.test(pdf), 'the daily PDF shows who signed, the earlier signed version and the fingerprint check');
  await L.ev(p, 'pbDlyRender()'); await p.waitForTimeout(800);
  const card = await L.txt(p, '#dpSignedXs'); L.ok(/signed by Pat Owner/.test(card) && !!(await p.$('#dpXsPdf_0')), 'the signed daily’s card lists the signed ticket with its PDF');
  pdf = (await L.pdfText(p, `pbXsPdfSigned(${JSON.stringify(rep.cid)},0,true)`, 't05_ticket_signed')).replace(/[ \t]+/g, ' ');
  L.ok(/Earlier signed versions \(1\)/.test(pdf) && /on the daily report signed/.test(pdf), 'the signed ticket’s PDF lists the earlier signed version');
  // signal back: the report goes with the signature
  await p.context().setOffline(false); await p.waitForTimeout(500); await L.ev(p, 'pbDlySyncSoon(100)'); await p.waitForTimeout(4000);
  const sub = await L.lastSub(p); const se = sub && sub.p_snapshot.events[0];
  L.ok(se && se.cust_sig && se.cust_sig.name === 'Pat Owner' && se.cust_sig.png.length > 200 && se.prior.length === 1, 'with signal the report is sent with the signature and the earlier version');
  // an amendment of the daily starts from the signed entry, still signed
  await L.ev(p, 'pbDlyAmendStart()'); await p.waitForTimeout(3000);
  L.ok(await L.ev(p, `(()=>{const e=pbDpDraft().events[0];return !!(e.cust_sig&&e.cust_sig.png)&&(e.prior||[]).length===1;})()`), 'an amendment of the daily keeps the customer’s signature on the entry');
  // the office list
  const t1 = await L.ev(p, `pbDpoRow(pbDpoFor(pbArchiveOwnerUid),{id:'x',kind:'extra',reason:'owner_extra',hours:3,work_date:pbFmToday(),status:'new',customer_signed:{name:'Pat Owner'}},0)`);
  const t2 = await L.ev(p, `pbDpoRow(pbDpoFor(pbArchiveOwnerUid),{id:'y',kind:'extra',reason:'owner_extra',hours:3,work_date:pbFmToday(),status:'new',customer_signed:null},1)`);
  L.ok(/Customer signed · Pat Owner/.test(t1) && /No customer signature/.test(t2), 'the office’s list says who signed (or that nobody did)');
  // a foreman can't open the company's safety search
  await L.ev(p, 'pbSsOpen()'); await p.waitForTimeout(1500); const fm = await L.modal(p); L.ok(/managers and PMs search/.test(fm || ''), 'the safety search is for the office, not a foreman');
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
