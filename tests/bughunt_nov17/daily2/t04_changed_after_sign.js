const L=require('./lib');
(async()=>{const {b,p,H}=await L.boot2('',{time:'2026-11-17T06:00:00-08:00',tz:'America/Los_Angeles'});
 await L.capSubmit(p);
 await L.mkrun(p,{job:'24-017'});await L.crew(p,'Joe Laborer','Laborer');
 await L.prod(p,{by:'Tommy',pipe:100});
 await p.clock.fastForward('08:30:00');await L.endRun(p);
 await L.daily(p,{job:'24-017'});
 console.log('sign',JSON.stringify(await L.sign(p,'Tommy Fontaine','Laid 100 ft.')));
 await L.daily(p,{job:'24-017'});{const t0=(await L.txt(p,'#screen-dailyReport'));console.log(/changed after you signed/.test(t0)?'FAIL warns with nothing changed':'PASS no warning when nothing changed');}
 // later: fix production on the run to 90 ft
 console.log('cur',await L.ev(p,'!!getCurrentArchiveEntry()'));await p.evaluate(()=>pbGoto('results'));
 await p.waitForTimeout(1500);console.log('screen',await H.screen());
 await L.prod(p,{by:'Tommy',pipe:90});
 console.log('modal',await L.modal(p));
 console.log('run fm',JSON.stringify(await L.ev(p,'runArchive[0].foreman.feetPipeInstalled')));
 await L.daily(p,{job:'24-017'});
 const tx=(await L.txt(p,'#screen-dailyReport')).replace(/\s+/g,' ');console.log(tx.slice(0,700));console.log(/changed after you signed/.test(tx)?'PASS signed day says its runs changed':'FAIL signed day silent after the run changed');
 await b.close();})();
