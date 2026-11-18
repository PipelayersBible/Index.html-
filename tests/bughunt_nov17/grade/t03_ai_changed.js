// Architect's rod: AI-read stake values nobody touched must not be reported as changed by hand.
const L=require('./lib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=true;});/* r16.95: rod is under More settings */await p.click('#rodToggle button[data-val="architect"]');await p.waitForTimeout(400);
 await T.photo('start',S('1+00',2589.06,2.33,'MH-1','101'));
 await H.f('startStakeReading_ft','4');await H.f('startStakeReading_in','3');
 await T.photo('end',S('2+00',2590.11,2.87,'MH-2','103'),'p05');
 await T.lock();
 const e=await T.entry();
 const ch=[].concat(...(e.aiReads||[]).map(x=>x.fields.filter(f=>f.changed).map(f=>x.point+': '+f.name+' '+f.ai+' -> '+f.locked)));
 console.log('reads:',(e.aiReads||[]).length,'flagged changed:',JSON.stringify(ch));
 // a real hand change is still flagged: checked on the form function directly
 const ok=(e.aiReads||[]).length===2&&ch.length===0;
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
