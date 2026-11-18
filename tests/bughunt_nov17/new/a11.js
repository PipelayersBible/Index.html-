const mk=require('./mk');
(async()=>{const {b,p,H}=await mk();
 await p.setViewportSize({width:390,height:800});
 await p.evaluate(async()=>{await window.pbLaidMark(8);});await p.waitForTimeout(900);
 await p.click('#pbBrkBtn');await p.waitForTimeout(1200);
 // a day passes: everything on the run happened 20-21 h ago; the break began 20 h ago and was never ended
 await p.evaluate(async()=>{const e=window.__pbCsEntry();const D=21*3600000;e.runStartTime-=D;e.lockTime=new Date(new Date(e.lockTime).getTime()-D);Object.keys(e.laid.marks).forEach(k=>e.laid.marks[k]-=D);e.laid.log.forEach(l=>l.at-=D);e.onBreak.start-=20*3600000;await window.__save();});
 await p.reload({waitUntil:'load'});await p.waitForTimeout(3500);
 console.log('home bar:',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('[class*=activebar],[id*=ActiveBar]')].map(x=>x.innerText.replace(/\s+/g,' ')).join('|'))));
 await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(2500);
 console.log('screen',await H.screen().catch(()=>null),'ea',JSON.stringify(await p.evaluate(()=>window.__pbEaDebug())),'modal',JSON.stringify(await H.modal()),'cover',await p.evaluate(()=>{const o=document.getElementById('pbBrk');return !!o&&!o.hidden;}));
 await p.screenshot({path:'/tmp/claude-0/bughunt/new/t/a11_1.png'});
 const vis=await p.evaluate(()=>{const els=[...document.querySelectorAll('button')].filter(b=>b.offsetParent&&getComputedStyle(b).visibility==='visible').map(b=>b.textContent.trim()).filter(Boolean);return els.slice(0,30);});console.log('visible buttons:',JSON.stringify(vis));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
