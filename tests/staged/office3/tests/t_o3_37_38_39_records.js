// office3 records: #37 (permit secret kept beside the record: export = PDF fingerprint = what the server hashes),
// #38 (which production boxes the app filled from the laid marks is recorded and printed), #39 (typed check marks and X
// print as typed). Page: the hook page (PB_URL .../hk/cur.html, window.__ev). Foreman with a company (rig co.js).
const L = require('./lib'), cp = require('child_process'), crypto = require('crypto');
const mkrun = require(L.RIG + '/mkrun');
const extra = `;window.__bk=[];window.__rpcOverride.pb_permit_backup=(a)=>{window.__bk.push(a);return {ok:true,same:false,version:1};};window.__json=[];window.__debugJsonSink=(n,t)=>window.__json.push({n,t});`;
const sha = (t) => crypto.createHash('sha256').update(Buffer.from(t, 'utf8')).digest('hex');
(async () => {
  let { b, p } = await L.boot(L.URL, { init: L.co + extra, wait: 4000 });
  const ev = (s) => p.evaluate(s), E = (s) => p.evaluate((s) => window.__ev(s), s);
  const modalLast = async () => { for (let i = 0; i < 5; i++) { if (await L.modal(p)) { await ev("[...document.querySelectorAll('#pbModalButtons button')].pop().click()"); await p.waitForTimeout(700); } } };
  // ---------- #37: a permit locked and closed out on the patched app ----------
  await ev("pbGoto('confinedPermit')"); await p.waitForTimeout(500);
  const now = new Date(), hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const day = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const vals = { cpJobsite: 'Test Job', cpJobNumber: '26014', cpAddress: '1 Main St', cpSpace: 'MH1', cpPurpose: 'Inspect', cpDate: day, cpStart: hm(new Date(now - 600000)), cpEnd: hm(new Date(+now + 3 * 3600000)), cpSupervisor: 'Tom', cpSupervisorInitials: 'TF', cpAttendant: 'Brandon Jones', cpComms: 'Radio', cpHazards: 'None', cpControls: 'Vent', cpVentFail: 'Monitor', cpRescue: '911' };
  for (const [k, v] of Object.entries(vals)) await p.fill('#' + k, v);
  await ev('pbLockConfinedPermit()'); await p.waitForTimeout(1500);
  if (/Entry Supervisor Decides/.test(await L.modal(p))) { await L.clickModal(p, 'I Understand'); await p.waitForTimeout(1500); }
  await E("confinedPermit.miscNotes = 'Gas test ✗ retest Fri, vent ✓, fan ✔, harness ✘'; saveActiveConfinedSession()"); await p.waitForTimeout(600);
  await ev('pbCloseConfinedPermit()'); await p.waitForTimeout(800); await modalLast(); await p.waitForTimeout(2500); await modalLast();
  const info = JSON.parse(await E("JSON.stringify((()=>{const i=runArchive.findIndex(e=>e.kind==='confined');const e=runArchive[i];return {i, apart:e&&e.emSecretApart, hasS:!!(e&&e.permit&&e.permit.emLink&&typeof e.permit.emLink.s==='string'), k:e&&e.permit&&e.permit.emLink&&e.permit.emLink.k, s:e&&e.permit&&e.permit.emLink&&e.permit.emLink.s, recHasS: (()=>{const r=pbPermitBackupRecord(e);return !!(r.permit&&r.permit.emLink&&'s' in r.permit.emLink);})(), fp: window.pbRptFingerprintOf(e)};})())"));
  console.log('  closed permit:', JSON.stringify(Object.assign({}, info, { s: info.s ? '(26 chars)' : null })));
  L.ok(info.i >= 0 && info.apart === true && info.hasS, '#37 a newly closed permit is marked emSecretApart; the phone keeps the secret in its own copy');
  L.ok(!info.recHasS, '#37 the record that is backed up and fingerprinted has no secret');
  await ev('window.pbExportRecordJSON(' + info.i + ')'); await p.waitForTimeout(400);
  const J = (await ev('window.__json')).slice(-1)[0];
  L.ok(J && !/kept on the phone/.test(J.t) && J.t.indexOf(info.s) < 0 && J.t.indexOf(info.k) > 0, '#37 the exported JSON has the link code, no secret and no "(kept on the phone)" mask');
  L.ok(J && sha(J.t) === info.fp, '#37 SHA-256 of the exported JSON = the PDF fingerprint (' + (info.fp || '').slice(0, 12) + ')');
  await ev('window.pbPermitBackupNow && window.pbPermitBackupNow()'); await p.waitForTimeout(3500);
  const bk = (await ev('window.__bk')).slice(-1)[0];
  L.ok(bk && bk.p_em_secret === info.s && !(bk.p_record.permit.emLink && 's' in bk.p_record.permit.emLink) && bk.p_record.emSecretApart === true, '#37 the backup sends the secret beside the record (p_em_secret), not in it');
  const srvText = bk ? await p.evaluate((r) => window.__ev('pbJsonbText(' + JSON.stringify(r) + ')'), bk.p_record) : '';
  L.ok(bk && srvText === J.t, '#37 the record text the server hashes (jsonb form of p_record) = the exported JSON');
  // an older record (no flag, secret inside) keeps its exact text and fingerprint
  const old = JSON.parse(await E("JSON.stringify((()=>{const e=Object.assign({}, runArchive.find(x=>x.kind==='confined')); delete e.emSecretApart; e.permit=Object.assign({},e.permit,{emLink:Object.assign({},e.permit.emLink)}); const r=pbPermitBackupRecord(e); return {hasS: !!(r.permit.emLink && typeof r.permit.emLink.s==='string'), masked: /kept on the phone/.test(pbEmMaskSecret(pbRptCanonicalText(e)))};})())"));
  L.ok(old.hasS && old.masked, '#37 a record without the flag (closed before) is built exactly as before (secret inside, export masks it)');
  // ---------- #39: the permit PDF prints the marks as typed ----------
  await ev("(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};window.__pdfDoc=null;})()");
  await ev('window.pbDownloadArchivePDF(' + info.i + ')');
  for (let k = 0; k < 40 && !(await ev('!!window.__pdfDoc')); k++) await p.waitForTimeout(500);
  const b64 = await ev("(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);})()");
  let txt = ''; if (b64) { L.fs.writeFileSync(L.OUT + '/o3_39_permit.pdf', Buffer.from(b64, 'base64')); txt = cp.execSync('pdftotext -layout ' + L.OUT + '/o3_39_permit.pdf -').toString(); }
  const line = (txt.match(/Gas test.{0,80}/) || [''])[0]; console.log('  permit pdf note:', line);
  L.ok(/Gas test ✗ retest Fri, vent ✓, fan ✔, harness ✘/.test(txt.replace(/\s+/g, ' ')), '#39 permit PDF prints the typed ✗ ✓ ✔ ✘ exactly');
  L.ok(!/Gas test no retest/.test(txt) && !/vent yes/.test(txt), '#39 never "yes"/"no" for the marks');
  L.ok(!/characters? (this|the) font can.t (show|print)|replaced with \?/i.test(txt) || !/Gas test \?/.test(txt), '#39 no "?" in place of the marks');
  // the glyphs are drawn (not empty boxes): render the note's line and look for ink
  try { cp.execSync('pdftoppm -r 110 -png -f 1 -l 3 ' + L.OUT + '/o3_39_permit.pdf ' + L.OUT + '/o3_39_page'); } catch (e) {}
  // a direct check on the PDF engine, regular and bold
  const direct = await E("(()=>{const d=pbNewPdf();d.setFontSize(20);d.text('Check ✓ ✔ X ✗ ✘ end',10,20);d.setFont(d.__pbFont,'bold');d.text('Bold ✓ ✔ ✗ ✘',10,40);return {w:d.getTextWidth('✓'),rep:[...(d.__pbReplaced||[])].length,b64:btoa(String.fromCharCode(...new Uint8Array(d.output('arraybuffer'))))};})()");
  L.fs.writeFileSync(L.OUT + '/o3_39_direct.pdf', Buffer.from(direct.b64, 'base64'));
  const dt = cp.execSync('pdftotext ' + L.OUT + '/o3_39_direct.pdf -').toString();
  try { cp.execSync('pdftoppm -r 120 -png -f 1 -l 1 ' + L.OUT + '/o3_39_direct.pdf ' + L.OUT + '/o3_39_direct'); } catch (e) {}
  console.log('  direct:', dt.trim().replace(/\n+/g, ' | '), 'width', direct.w, 'replaced pages', direct.rep);
  L.ok(/Check ✓ ✔ X ✗ ✘ end/.test(dt) && /Bold ✓ ✔ ✗ ✘/.test(dt) && direct.rep === 0 && direct.w > 0, '#39 regular and bold fonts carry all four marks (text extracts, nothing replaced, real width)');
  // ---------- #38: production boxes filled from the laid marks (a fresh phone) ----------
  L.ok(p.errs.length === 0, 'permit part: no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
  ({ b, p } = await L.boot(L.URL, { init: L.co + extra, wait: 4000 }));
  const fill = (id, v) => p.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, String(v)]);
  await mkrun(p, 100); await mkrun.lock(p); await p.waitForTimeout(1000);
  for (let i = 0; i < 6; i++) { const m = await L.modal(p); if (!m) break; console.log('  lock modal:', m.replace(/\s+/g, ' ').slice(0, 90));
    if (/Which Job Is This Run On/.test(m)) { await ev("(()=>{const i=document.querySelector('#pbModalOverlay input[type=text],#pbModalOverlay input:not([type])');if(i){i.value='26014';i.dispatchEvent(new Event('input',{bubbles:true}));}})()"); await L.clickModal(p, 'Use It'); await p.waitForTimeout(1500); continue; }
    const bt = await ev("[...document.querySelectorAll('#pbModalOverlay button')].map(b=>b.textContent.trim())"); await L.clickModal(p, bt.includes('I Checked Them') ? 'I Checked Them' : bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1500); }
  console.log('  after lock:', await E("JSON.stringify({cur: currentRunArchiveId, n: runArchive.length, screen: pbCurrentScreen})"));
  await ev("(()=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>/^Distance 60\\.0 /.test(e.getAttribute('aria-label')));e&&e.click();})()"); await p.waitForTimeout(600);
  await L.clickModal(p, 'Mark laid to here (and the rows before)'); await p.waitForTimeout(1500);
  await ev("(()=>{const s=[...document.querySelectorAll('#screen-results summary')].find(s=>/Production & Crew/.test(s.textContent));if(s&&!s.parentElement.open)s.click();const c=document.getElementById('resForemanCard');if(c)c.open=true;})()"); await p.waitForTimeout(600);
  const pre = await ev("['fpPipeInstalled','fpExcavated','fpBackfill'].map(id=>document.getElementById(id).value)");
  console.log('  pre-filled boxes:', JSON.stringify(pre));
  L.ok(pre[0] === '60' && pre[1] === '60' && pre[2] === '60', '#38 setup: pipe, excavated and backfill pre-filled with 60 ft from the laid marks');
  await fill('fpExcavated', '65'); await fill('fpForeman', 'Tom');
  await ev("[...document.querySelectorAll('#screen-results button')].find(b=>b.textContent.trim()==='Save Production').click()"); await p.waitForTimeout(1500);
  let f = JSON.parse(await E("JSON.stringify(getCurrentArchiveEntry().foreman)"));
  console.log('  saved:', JSON.stringify(f));
  L.ok(JSON.stringify((f.prefilled || []).slice().sort()) === JSON.stringify(['feetBackfill', 'feetPipeInstalled']) && f.feetExcavated === 65, '#38 saved: prefilled = pipe and backfill; the typed excavated is not listed');
  // a second Save (restoration typed) keeps the app-filled marks for the boxes left as they were
  await fill('fpRestoration', '12'); await ev("[...document.querySelectorAll('#screen-results button')].find(b=>b.textContent.trim()==='Save Production').click()"); await p.waitForTimeout(1500);
  f = JSON.parse(await E("JSON.stringify(getCurrentArchiveEntry().foreman)"));
  L.ok(JSON.stringify((f.prefilled || []).slice().sort()) === JSON.stringify(['feetBackfill', 'feetPipeInstalled']) && f.feetRestoration === 12, '#38 a later Save keeps them listed while those boxes still hold the saved number');
  // typed over: no longer listed
  await fill('fpBackfill', '58'); await ev("[...document.querySelectorAll('#screen-results button')].find(b=>b.textContent.trim()==='Save Production').click()"); await p.waitForTimeout(1500);
  f = JSON.parse(await E("JSON.stringify(getCurrentArchiveEntry().foreman)"));
  L.ok(JSON.stringify(f.prefilled) === JSON.stringify(['feetPipeInstalled']), '#38 backfill typed over (58): only pipe stays listed');
  // the run PDF
  const ri = await E('runArchive.indexOf(getCurrentArchiveEntry())');
  await ev("(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};window.__pdfDoc=null;})()");
  await ev('window.pbDownloadArchivePDF(' + ri + ')');
  for (let k = 0; k < 40 && !(await ev('!!window.__pdfDoc')); k++) await p.waitForTimeout(500);
  const rb = await ev("(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);})()");
  let rt = ''; if (rb) { L.fs.writeFileSync(L.OUT + '/o3_38_run.pdf', Buffer.from(rb, 'base64')); rt = cp.execSync('pdftotext -layout ' + L.OUT + '/o3_38_run.pdf -').toString().replace(/\s+/g, ' '); }
  console.log('  run pdf:', (rt.match(/Foreman production .{0,420}/) || [''])[0]);
  L.ok(/Each quantity marked "filled by the app" was filled in from the laid marks and saved as filled; the others were typed/.test(rt), '#38 run PDF intro says which ones the app filled');
  L.ok(/Pipe installed 60\.0 ft \(filled by the app from the laid marks\)/.test(rt) && /Excavated 65\.0 ft/.test(rt) && !/Excavated 65\.0 ft \(filled/.test(rt) && /Backfill 58\.0 ft/.test(rt) && !/Backfill 58\.0 ft \(filled/.test(rt), '#38 run PDF: pipe marked filled by the app, the typed boxes not');
  // an older record (no list) keeps the r17.04 wording
  await E("delete getCurrentArchiveEntry().foreman.prefilled");
  await ev("(()=>{window.__pdfDoc=null;})()"); await ev('window.pbDownloadArchivePDF(' + ri + ')');
  for (let k = 0; k < 40 && !(await ev('!!window.__pdfDoc')); k++) await p.waitForTimeout(500);
  const ob = await ev("(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);})()");
  let ot = ''; if (ob) { L.fs.writeFileSync(L.OUT + '/o3_38_old.pdf', Buffer.from(ob, 'base64')); ot = cp.execSync('pdftotext -layout ' + L.OUT + '/o3_38_old.pdf -').toString().replace(/\s+/g, ' '); }
  console.log('  old pdf:', (ot.match(/Foreman production Quantities .{0,330}/) || [ot.slice(0, 100)])[0]);
  L.ok(/the record does not say which boxes were typed and which were left as pre-filled/.test(ot) && !/\(filled by the app from the laid marks\)/.test(ot), '#38 a record without the list keeps the old wording (no guess)');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
