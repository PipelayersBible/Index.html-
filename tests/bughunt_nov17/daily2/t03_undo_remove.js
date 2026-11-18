const L=require('./lib');
(async()=>{const {b,p,H}=await L.boot2('',{time:'2026-11-17T06:00:00-08:00',tz:'America/Los_Angeles'});
 await L.mkrun(p,{job:'24-017'});await L.crew(p,'Joe Laborer','Laborer');await L.crew(p,'CAT 320','Equipment');
 await p.clock.fastForward('08:30:00');await L.endRun(p);
 await L.daily(p,{job:'24-017'});
 console.log(JSON.stringify(await p.evaluate(()=>{const r=(id)=>{const e=document.querySelector(id);const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right),Math.round(b.top),Math.round(b.bottom)];};return {plus:r('#dpCrew_1 .pb-hs[aria-label^="More"]'),x:r('#dpCrewX_1'),eqX:r('[id^=dpEqX_0],#dpEquip .dp-x')};})));
 // tap X on Joe once
 const before=await L.draftDump(p);await p.click('#dpCrewX_1');await p.waitForTimeout(700);
 console.log('before',JSON.stringify(before),'after one tap on X',JSON.stringify(await L.draftDump(p)),'modal',await L.modal(p));
 const hasUndo=await p.evaluate(()=>!!document.getElementById('dxUndoBtn'));if(hasUndo){await p.click('#dxUndoBtn');await p.waitForTimeout(800);}
 const after=await L.draftDump(p);console.log('after undo',JSON.stringify(after));
 console.log(hasUndo&&after.crew.join()==before.crew.join()?'PASS remove can be undone':'FAIL no undo after removing a crew row (undo bar: '+hasUndo+')');
 await L.ev(p,'pbDlyRebuild()');await p.waitForTimeout(2500);console.log('after Refresh',JSON.stringify(await L.draftDump(p)));
 await b.close();})();
