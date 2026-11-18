// The laid log's station must be the row's own station (hub at 65.25 ft), not its 1-decimal label (65.3).
const L=require('./lib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.set('totalDist','150');
 await T.E(()=>{document.querySelector('#startModeToggle button[data-val="elev"]').click();document.querySelector('#endModeToggle button[data-val="elev"]').click();document.querySelector('#rodToggle button[data-val="lenker"]').click();});await p.waitForTimeout(500);
 await T.set('startElev','100');await T.set('endElev','101.5');
 await T.addHub();await T.E(()=>{document.querySelector('#hub0ModeToggle button[data-val="elev"]').click();});await T.set('hub0Station','65.25');await T.set('hub0Elev','100.65');
 const c=await T.calc();if(c.errors){console.log('calc errors',c.errors);}
 await T.lock();console.log('screen',await H.screen(),await H.modal());
 const idx=await T.E(()=>getCurrentArchiveEntry().intervalRows.findIndex(r=>r.pointId==='hub0'));
 await T.E((i)=>{pbLaidApply(currentRunArchiveId,i,true,true,'test');},idx);await p.waitForTimeout(1500);
 // an older log entry (no ft) must still resolve to the row
 const txt=await L.pdf(T,((process.env.PB_OUT||'/tmp/claude-0/bughunt/grade/tests')+'/t06.pdf'))||'';
 const ls=txt.split('\n').filter(l=>/laid to|Laid to/.test(l)).map(l=>l.replace(/\s+/g,' ').trim());console.log(ls.join('\n'));
 const ok=ls.length>=3&&ls.every(l=>/0\+65\.25/.test(l));
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
