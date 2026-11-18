const L=require('./lib');
// night shift: clock 19:00 Mon Nov 16, run until 03:30 Tue, open daily at 03:45 Tue
(async()=>{const {b,p,H}=await L.boot2('',{time:'2026-11-16T19:00:00-08:00',tz:'America/Los_Angeles'});
 await L.mkrun(p,{job:'24-017'});
 await L.crew(p,'Joe Laborer','Laborer');await L.crew(p,'CAT 320','Equipment');
 await L.prod(p,{by:'Tommy',pipe:120});
 await p.clock.fastForward('08:30:00');await p.waitForTimeout(500);
 console.log('now',await p.evaluate(()=>new Date().toString()));
 await L.endRun(p,1);
 console.log('run',JSON.stringify(await L.ev(p,`runArchive.map(e=>({st:new Date(e.runStartTime).toString().slice(0,24),end:e.runEndTime&&new Date(e.runEndTime).toString().slice(0,24),crew:e.crewLog.map(c=>c.name+':'+c.log.map(l=>l.action+'@'+new Date(l.time).toTimeString().slice(0,5)).join('/'))}))`)));
 await p.clock.fastForward('00:15:00');
 await L.daily(p);
 const ds=await p.evaluate(()=>document.getElementById("drDate").value);const tx=await L.txt(p,"#screen-dailyReport");console.log(ds==="2026-11-16"&&/120 LF/.test(tx)?"PASS night shift opens on the shift day "+ds:"FAIL night shift opens on "+ds+" ("+(/No runs on this job this day/.test(tx)?"no runs":"runs")+")");console.log("toast",await p.evaluate(()=>{const t=document.querySelector(".dx-toast,#dxToast");return t&&t.textContent;}));
 console.log((await L.txt(p,'#screen-dailyReport')).replace(/\s+/g,' ').slice(0,900));
 await L.shot(p,'w5_night');
 console.log('errs',p.errs.slice(0,5));await b.close();})();
