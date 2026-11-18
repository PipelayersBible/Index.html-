const mk=require('./mk');
(async()=>{const {b,p,H}=await mk();
 await p.setViewportSize({width:390,height:800});
 await p.evaluate(async()=>{await window.pbLaidMark(8);});await p.waitForTimeout(900);
 await p.click('#pbBrkBtn');await p.waitForTimeout(1200);
 await p.evaluate(async()=>{const e=window.__pbCsEntry();const D=21*3600000;e.runStartTime-=D;e.lockTime=new Date(new Date(e.lockTime).getTime()-D);Object.keys(e.laid.marks).forEach(k=>e.laid.marks[k]-=D);e.laid.log.forEach(l=>l.at-=D);e.onBreak.start-=20*3600000;await window.__save();});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(3500);
 await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);
 // time: 90 minutes after the run start (30 min into the break), on the start day
 const t=await p.evaluate(()=>{const e=window.__pbCsEntry();const d=new Date(e.runStartTime+90*60000);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');});
 const dlg=await p.evaluate(()=>{const d=[...document.querySelectorAll('[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&/Where Did This Run End/.test(x.innerText));return d?[...d.querySelectorAll('input,select')].map(i=>i.id+':'+i.type):null;});console.log('inputs',JSON.stringify(dlg));
 const tid=dlg.find(x=>/:time$/.test(x)).split(':')[0];await p.fill('#'+tid,t);await p.waitForTimeout(200);
 await H.click('Save End');await p.waitForTimeout(2500);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bs=await H.modalBtns();console.log('MODAL',JSON.stringify(m.slice(0,240)),JSON.stringify(bs));if(!bs.length)break;await H.modalClick(bs.find(x=>/Not Now|OK|Close|Done|No/.test(x))||bs[bs.length-1]).catch(()=>{});await p.waitForTimeout(1200);}
 const st=()=>p.evaluate(()=>{const e=window.__ra().find(x=>x.kind==='run');const o=document.getElementById('pbBrk');return {screen:[...document.querySelectorAll('.pb-screen.active')].map(s=>s.id).join(','),ended:!!(e.completed||e.incomplete),runEnd:e.runEndTime?new Date(e.runEndTime).toLocaleString():null,onBreak:e.onBreak?new Date(e.onBreak.start).toLocaleString():null,breaks:(e.breaks||[]).map(b=>[new Date(b.start).toLocaleString(),new Date(b.end).toLocaleString()]),cover:!!o&&!o.hidden,bar:[...document.querySelectorAll('[class*=activebar],[id*=ActiveBar]')].map(x=>x.innerText.replace(/\s+/g,' ')).join('|')};});
 console.log('after Save End:',JSON.stringify(await st()));
 // open the ended run's Results
 await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);
 console.log('results of the ended run:',JSON.stringify(await st()));
 await p.screenshot({path:'/tmp/claude-0/bughunt/new/t/a12.png'});
 if(await p.evaluate(()=>{const o=document.getElementById('pbBrk');return !!o&&!o.hidden;})){await p.click('#pbBrkEnd');await p.waitForTimeout(1200);console.log('after End Break:',JSON.stringify(await st()));}
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};});await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 const b64=await p.evaluate(()=>{const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});require('fs').writeFileSync('/tmp/claude-0/bughunt/new/t/a12.pdf',Buffer.from(b64,'base64'));
 console.log(require('child_process').execSync('pdftotext -layout /tmp/claude-0/bughunt/new/t/a12.pdf - | grep -A6 "^ *Breaks (" | tail -8; pdftotext -layout /tmp/claude-0/bughunt/new/t/a12.pdf - | grep -i -m3 "ended\\b.*202"').toString());
 console.log('errs',p.errs.slice(0,5));await b.close();})();
