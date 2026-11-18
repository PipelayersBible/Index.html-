// t124 feat crewview: (A) a foreman locks a run -> the run record send (pb_prod_run_record_put) carries the grade sheet within
// seconds, and again after a laid mark; (B) a linked pipelayer opens Home > Crew runs today, sees the rows and the laid marks
// read-only; offline he sees the last copy with its time (also after the in-memory copy is gone: from storage);
// (C) a non-linked user gets nothing (empty list; a refused get drops the copy); the office has no tile.
const boot=require(__dirname+'/rig/boot');const co=require(__dirname+'/rig/co');const pl=require(__dirname+'/rig/co_pl');const mgr=require(__dirname+'/rig/mgr');const F=require(__dirname+'/rig/flow');
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 // ---------- A: the foreman's phone ----------
 let rec=null;
 {const {b,p}=await boot(URL,{init:co+';window.__pbAuthQuietMs=0;' /* the anonymous-report quiet rule (30-120 s after an anonymous call) is kept; not what is tested here */});const H=F(p);
  let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
  const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
  await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
  await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
  stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
  await H.f('startStakeReading','4.36');
  await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
  stake=S('2+12',103.7,3.69,'AP','3861');await p.setInputFiles('#hub0AiStakePhoto',[H.img('p01')]);await p.waitForTimeout(2500);
  stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
  await H.click('Review & Calculate');await p.waitForTimeout(1500);
  await p.evaluate(()=>{window.__rpcArgs=[];});
  await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them').catch(()=>{});
  const t0=Date.now();
  let put=null;for(let i=0;i<30&&!put;i++){await p.waitForTimeout(500);put=await p.evaluate(()=>{const a=(window.__rpcArgs||[]).filter(x=>x[0]==='pb_prod_run_record_put').pop();return a?a[1]:null;});}
  const secs=(Date.now()-t0)/1000;
  ok(!!put,'A1 the locked run is sent to the company (pb_prod_run_record_put) after Lock ('+secs.toFixed(1)+' s, the old path waited for the minute timer)');
  ok(put&&secs<15,'A2 sent within seconds of Lock, not up to a minute later');
  const rows=put&&put.p_record&&put.p_record.intervalRows||[];
  ok(rows.length>=3&&rows.every(r=>typeof r.stationFt==='number'&&r.station!==undefined)&&rows.some(r=>r.bop&&r.inv),'A3 the send carries the grade sheet: '+rows.length+' rows with stations and BOP/INV ('+(rows[1]?rows[1].station+' BOP '+rows[1].bop+' INV '+rows[1].inv:'')+')');
  ok(!JSON.stringify(put||{}).includes('data:image/'),'A4 no photo data in the send');
  // a laid mark goes up too
  await p.evaluate(()=>{window.__rpcArgs=[];});
  const dists=await p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));
  await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},dists[2]);await p.waitForTimeout(600);
  await H.modalClick('Mark laid to here (and the rows before)');
  const t1=Date.now();let put2=null;
  for(let i=0;i<30&&!put2;i++){await p.waitForTimeout(500);put2=await p.evaluate(()=>{const a=(window.__rpcArgs||[]).filter(x=>x[0]==='pb_prod_run_record_put').pop();return a?a[1]:null;});}
  const marks=put2&&put2.p_record&&put2.p_record.laid&&put2.p_record.laid.marks||{};
  ok(Object.keys(marks).length>=2&&(Date.now()-t1)<15000,'A5 after a laid mark the send carries the laid marks within seconds ('+Object.keys(marks).length+' rows laid, '+((Date.now()-t1)/1000).toFixed(1)+' s)');
  rec=put2?put2.p_record:put&&put.p_record;
  ok(p.errs.length===0,'A7 no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();}
 if(!rec){console.log('no record captured, stopping');process.exit(1);}
 // what the server would serve (sql/01_crew_view.sql: whitelisted fields only)
 const W=['station','stationFt','pointId','label','bop','inv','top','sgDisp','elevation','addedTime','layoutShort','layoutExact','layoutKind'];
 const sheet={id:rec.id,kind:'run',lockTime:rec.lockTime,jobNumber:rec.jobNumber,jobsite:rec.jobsite,startLabel:rec.startLabel,endLabel:rec.endLabel,rodUnit:rec.rodUnit,runStations:rec.runStations,
   intervalRows:rec.intervalRows.map(r=>{const o={};W.forEach(k=>{if(r[k]!==undefined&&r[k]!==null)o[k]=r[k];});return o;}),laid:{marks:rec.laid.marks}};
 const RID='aaaaaaaa-1111-4111-8111-000000000124', UPD=new Date(Date.now()-5*60000).toISOString();
 const nLaid=Object.keys(rec.laid.marks).length, nRows=sheet.intervalRows.length;
 // ---------- B: the linked pipelayer's phone ----------
 const init=pl+`;(function(){window.__cvList={ok:true,runs:[{id:'${RID}',who:'Brandon Jones',job_number:'24-017',jobsite:'Test Sewer',label:'MH-1 to MH-2',locked_at:new Date().toISOString(),updated_at:'${UPD}',ended:false,version:3,distance_ft:301,laid_ft:62}],server_at:new Date().toISOString()};
  window.__cvGet=${JSON.stringify({ok:true,id:RID,who:'Brandon Jones',updated_at:UPD,version:3,ended:false,sheet})};
  Object.assign(window.__rpcOverride,{pb_prod_crew_view_list:()=>window.__cvList,pb_prod_crew_view_get:(a)=>{if(window.__cvRefuse)throw new Error('pb:not_your_crew');return a&&a.p_id===window.__cvGet.id?window.__cvGet:(()=>{throw new Error('pb:not_found');})();}});})();`;
 {const {b,p}=await boot(URL,{init});const H=F(p);
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(1500);
  const tile=await p.evaluate(()=>{const t=document.getElementById('homeCrewView');return !!t&&t.style.display!=='none'&&!!t.offsetParent;});
  ok(tile,'B1 a linked pipelayer has "Crew runs today" on Home');
  await p.click('#homeCrewView');await p.waitForTimeout(1500);
  const list=await p.evaluate(()=>({scr:[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent).id,runs:[...document.querySelectorAll('#cvBody .cv-run')].map(b=>b.innerText.replace(/\s+/g,' ')),h:document.querySelector('#cvRun0')&&document.querySelector('#cvRun0').getBoundingClientRect().height}));
  ok(list.scr==='screen-crewView'&&list.runs.length===1&&/Brandon Jones/.test(list.runs[0]),'B2 the list shows the crew run: '+JSON.stringify(list.runs));
  ok(list.h>=56,'B3 glove-size row ('+list.h+' px)');
  await p.click('#cvRun0');await p.waitForTimeout(1500);
  const sh=await p.evaluate(()=>{const t=document.getElementById('cvTable');const rows=[...t.querySelectorAll('tr.cv-row')];const v=t.querySelector('td.v');
    return {ro:(document.getElementById('cvRo')||{}).innerText,rows:rows.length,laid:rows.filter(r=>r.dataset.cvLaid).length,next:t.querySelectorAll('tr.cv-next').length,laidTag:(t.querySelector('tr.cv-laid .tag')||{}).textContent,
      heads:[...t.querySelectorAll('th')].map(x=>x.textContent),cell1:rows[1]?[...rows[1].children].map(c=>c.innerText.replace(/\s+/g,' ')):[],fs:v?parseFloat(getComputedStyle(v).fontSize):0,
      edit:document.querySelectorAll('#cvBody input, #cvBody textarea, #cvBody select, #cvTable button').length,stale:!!document.getElementById('cvStale'),
      wide:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth};});
  ok(/^Read-only copy from Brandon Jones.s phone, updated /.test(sh.ro||''),'B4 the read-only line: '+JSON.stringify((sh.ro||'').split('\n')[0]));
  ok(sh.rows===nRows,'B5 every grade row is shown ('+sh.rows+' of '+nRows+')');
  ok(sh.laid===nLaid&&sh.laid>0&&/^Laid /.test(sh.laidTag||'')&&sh.next===1,'B6 the laid marks are shown ('+sh.laid+' laid, tag "'+sh.laidTag+'", one Next row)');
  const r1=sheet.intervalRows[1];
  ok(sh.cell1.join('|').includes(String(r1.bop))&&sh.cell1.join('|').includes(String(r1.inv)),'B7 the rod readings match the foreman\'s rows: '+JSON.stringify(sh.heads)+' '+JSON.stringify(sh.cell1));
  ok(sh.fs>=24,'B8 big numbers ('+sh.fs+' px)');
  ok(sh.edit===0,'B9 nothing to edit or mark in the copy');
  ok(!sh.stale,'B10 a fresh copy has no stale line');
  ok(sh.wide<=sh.cw+1,'B11 no sideways page scroll at 390 px ('+sh.wide+' / '+sh.cw+')');
  await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/feat/crewview/tests')+'/cv_light.png'),fullPage:true});
  // offline: the last copy, with its time
  await p.context().setOffline(true);await p.waitForTimeout(500);
  await p.click('#cvBack');await p.waitForTimeout(800);await p.click('#cvRun0');await p.waitForTimeout(1200);
  let off=await p.evaluate(()=>({stale:(document.getElementById('cvStale')||{}).textContent||'',rows:document.querySelectorAll('#cvTable tr.cv-row').length}));
  ok(/^No signal\. Showing the last copy fetched, \d/.test(off.stale)&&off.rows===nRows,'B12 offline: the last copy with its time: "'+off.stale+'" ('+off.rows+' rows)');
  // the copy is on the phone, not just in memory
  await p.evaluate(()=>window.__pbCvDebug.drop());await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(500);
  await p.click('#homeCrewView');await p.waitForTimeout(1200);
  const offList=await p.evaluate(()=>({n:document.querySelectorAll('#cvBody .cv-run').length,st:document.getElementById('cvStatus').textContent}));
  ok(offList.n===1&&/^No signal\. This is the list as of /.test(offList.st),'B13 offline after a restart of the screen: the list from the phone: '+JSON.stringify(offList));
  await p.click('#cvRun0');await p.waitForTimeout(1200);
  off=await p.evaluate(()=>({stale:(document.getElementById('cvStale')||{}).textContent||'',rows:document.querySelectorAll('#cvTable tr.cv-row').length,laid:document.querySelectorAll('#cvTable tr.cv-row[data-cv-laid]').length}));
  ok(off.rows===nRows&&off.laid===nLaid&&/last copy fetched/.test(off.stale),'B14 ...and the sheet from the phone, with laid marks ('+off.rows+' rows, '+off.laid+' laid)');
  await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/feat/crewview/tests')+'/cv_offline.png'),fullPage:true});
  // ---------- C: not (or no longer) linked: the server answers nothing ----------
  await p.context().setOffline(false);await p.waitForTimeout(2500);
  await p.evaluate(()=>{window.__cvRefuse=true;});
  await p.evaluate(()=>pbCvRefresh());await p.waitForTimeout(1200);
  const ref=await p.evaluate(()=>({st:document.getElementById('cvStatus').textContent,table:!!document.getElementById('cvTable'),kept:Object.keys(window.__pbCvDebug.st().sheets).length}));
  ok(/Only the run.s crew, its foreman and the office can open it/.test(ref.st)&&!ref.table&&ref.kept===0,'C1 a refused get shows nothing and drops the copy: '+JSON.stringify(ref));
  await p.evaluate(()=>{window.__cvList={ok:true,runs:[],server_at:new Date().toISOString()};});
  await p.click('#cvBack');await p.waitForTimeout(1500);
  const emp=await p.evaluate(()=>({empty:!!document.getElementById('cvEmpty'),runs:document.querySelectorAll('#cvBody .cv-run').length,st:window.__pbCvDebug.st()}));
  ok(emp.empty&&emp.runs===0&&emp.st.list.length===0&&Object.keys(emp.st.sheets).length===0,'C2 a non-linked user\'s list is empty and nothing is kept');
  ok(p.errs.length===0,'B/C no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();}
 // dark mode screenshot of the sheet
 {process.env.DARK='1';const {b,p}=await boot(URL,{init});delete process.env.DARK;
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(1500);
  await p.click('#homeCrewView');await p.waitForTimeout(1200);await p.click('#cvRun0');await p.waitForTimeout(1200);
  await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/feat/crewview/tests')+'/cv_dark.png'),fullPage:true});
  ok(p.errs.length===0,'D1 dark: no page errors');await b.close();}
 // C3: the office account has no tile (it has Crew runs)
 {const {b,p}=await boot(URL,{init:co+mgr});await p.waitForTimeout(1000);
  ok(!(await p.evaluate(()=>{const t=document.getElementById('homeCrewView');return !!t&&t.style.display!=='none';})),'C3 the office has no Crew runs today tile');await b.close();}
 // C4: a foreman whose access says pipelayer of no company (not a member) has no tile
 {const nm=co.replace("member:true,company_id:'11111111-1111-4111-8111-111111111111'","member:false,company_id:null");const {b,p}=await boot(URL,{init:nm});await p.waitForTimeout(1000);
  ok(!(await p.evaluate(()=>{const t=document.getElementById('homeCrewView');return !!t&&t.style.display!=='none';})),'C4 not in a company: no tile');await b.close();}
 console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
