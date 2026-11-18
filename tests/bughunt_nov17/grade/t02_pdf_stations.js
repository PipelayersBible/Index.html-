// A run with real stations: the PDF must not caption photos / laid-to with distance-as-station, nor say stationing is not recorded.
const L=require('./lib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.photo('start',S('12+45.30',2589.06,1.25,'MH-1','101'));await H.f('startStakeReading','4.36');
 await T.addHub();await T.photo('hub0',S('11+80.05',2586.40,2.33,'AP','102'),'p01');
 await T.photo('end',S('10+95.30',2581.115,3.5,'MH-2','103'),'p05');
 await T.lock();
 // mark laid to the hub row
 const idx=await T.E(()=>getCurrentArchiveEntry().intervalRows.findIndex(r=>r.pointId==='hub0'));
 await T.E((i)=>{pbLaidApply(currentRunArchiveId,i,true,true,'test');},idx);await p.waitForTimeout(1500);
 const txt=await L.pdf(T,'/tmp/claude-0/bughunt/grade/tests/t02.pdf')||'';
 const bad=[/Sta 0\+65\.25/,/Sta 1\+50\.00/,/Sta 0\+00\.00/,/stationing is not recorded/].filter(r=>r.test(txt)).map(String);
 const good=[/Angle point · Sta 11\+80\.05/,/to Sta 11\+80\.05/,/12\+45\.30/].filter(r=>!r.test(txt)).map(String);
 console.log('wrong text present:',bad,'expected text missing:',good);
 const ok=!bad.length&&!good.length;
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
