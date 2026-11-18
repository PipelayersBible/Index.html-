// fails on r16.88 (dbg.html), passes on fix.html: a break left running ends with the run
const mk=require('./mk');
(async()=>{const {b,p,H}=await mk();
 let ok=true;const say=(n,c,x)=>{console.log((c?'ok   ':'FAIL ')+n+(x!==undefined?' :: '+x:''));if(!c)ok=false;};
 await p.setViewportSize({width:390,height:800});
 await p.evaluate(async()=>{await window.pbLaidMark(8);});await p.waitForTimeout(900);
 await p.click('#pbBrkBtn');await p.waitForTimeout(1200);
 await p.evaluate(async()=>{const e=window.__pbCsEntry();const D=21*3600000;e.runStartTime-=D;e.lockTime=new Date(new Date(e.lockTime).getTime()-D);Object.keys(e.laid.marks).forEach(k=>e.laid.marks[k]-=D);e.laid.log.forEach(l=>l.at-=D);e.onBreak.start-=20*3600000;await window.__save();});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(3500);
 await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);
 const hhmm=(min)=>p.evaluate((min)=>{const e=window.__pbCsEntry();const d=new Date(e.runStartTime+min*60000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');},min);
 const st=()=>p.evaluate(()=>{const e=window.__ra().find(x=>x.kind==='run');const o=document.getElementById('pbBrk');return {ended:!!(e.completed||e.incomplete),runEnd:e.runEndTime,onBreak:e.onBreak||null,breaks:e.breaks||[],cover:!!o&&!o.hidden,bar:[...document.querySelectorAll('[class*=activebar],[id*=ActiveBar]')].map(x=>x.innerText.replace(/\s+/g,' ')).join('|')};});
 // 1. an end time before the break began (30 min after the start; the break began at 60 min) is refused
 await p.fill('#pbEaTime',await hhmm(30));await H.click('Save End');await p.waitForTimeout(2000);
 let s=await st();say('an end before the break began is refused',!s.ended,JSON.stringify(await H.modal()).slice(0,140));
 for(let i=0;i<3;i++){const bs=await H.modalBtns();if(!bs.length||bs.includes('Save End'))break;await H.modalClick(bs.find(x=>/OK|Close/.test(x))||bs[bs.length-1]).catch(()=>{});await p.waitForTimeout(800);}
 if(!(await H.modalBtns()).includes('Save End')){await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);}
 // 2. an end 30 min into the break is saved, and the break ends with the run
 await p.fill('#pbEaTime',await hhmm(90));await H.click('Save End');await p.waitForTimeout(2500);
 for(let i=0;i<3;i++){const bs=await H.modalBtns();if(!bs.length)break;await H.modalClick(bs.find(x=>/Not Today|OK|Close/.test(x))||bs[bs.length-1]).catch(()=>{});await p.waitForTimeout(1000);}
 s=await st();
 say('the run is ended',s.ended);
 say('no break is left running',!s.onBreak,JSON.stringify(s.onBreak));
 say('the break ended at the run end',s.breaks.length===1&&s.breaks[0].end===s.runEnd&&Math.round((s.breaks[0].end-s.breaks[0].start)/60000)<=31,JSON.stringify(s.breaks.map(b=>Math.round((b.end-b.start)/60000)+' min')));
 say('Home does not say On break',!/On break/.test(s.bar),s.bar);
 await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);s=await st();
 say('the ended run is not covered',!s.cover);
 console.log('errs',p.errs.slice(0,3));console.log(ok?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
