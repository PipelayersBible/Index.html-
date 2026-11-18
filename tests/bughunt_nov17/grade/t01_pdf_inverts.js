// PDF at-a-glance strip must show invert ELEVATIONS, not rod readings. PG=cur.html fails, PG=<patched>.html passes.
const L=require('./lib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.photo('start',S('1+50.25',103.40,3.61,'MH-1','3860'));await H.f('startStakeReading','4.36');
 await T.photo('end',S('6+00.25',104.26,2.67,'MH-2','3863'),'p05');
 await T.lock();
 const txt=await L.pdf(T,((process.env.PB_OUT||'/tmp/claude-0/bughunt/grade/tests')+'/t01.pdf'))||'';
 const ls=txt.split('\n'),i=ls.findIndex(l=>/Slope \(\+ = rising\)/.test(l)),strip=ls.slice(i,i+2).join('\n');
 console.log(strip);
 const ok=/99\.79 \/ 101\.59/.test(strip)&&!/7\.97 \/ 6\.17/.test(strip);
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
