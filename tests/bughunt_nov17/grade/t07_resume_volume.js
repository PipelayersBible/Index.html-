// A run resumed from a stop between points keeps its backfill estimate (the app's Left off hub has no stake).
const L=require('./lib');const R=require('/home/claude/rig/resume');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');await T.set('runTrenchWidth','3');
 await T.photo('start',S('1+00',103.40,3.61,'MH-1','3860'));await H.f('startStakeReading','4.36');
 await T.addHub();await T.photo('hub0',S('2+50',104.00,3.61,'AP','3861'),'p01');
 await T.photo('end',S('5+00',105.00,3.61,'MH-2','3863'),'p05');
 await T.set('interval','50');await T.lock();
 const v0=(await T.entry()).volumeYd3;
 await R.endShort(p,200);await p.waitForTimeout(1500);
 const e1=await T.entry();const v1=e1.volumeYd3;
 const i0=await T.E(()=>runArchive.findIndex(x=>x===getCurrentArchiveEntry()));
 await T.E((i)=>{window.pbResumeIncompleteRun(i);},i0);await p.waitForTimeout(2500);await R.modal(p);await p.waitForTimeout(1500);
 const lo=await T.E(()=>getAllHubPrefixes().find(h=>getPointLabel(h,'')==='Left off'));
 await T.set(lo+'ElevReading','6.20');await p.waitForTimeout(1500);
 await T.lock();
 const e2=await T.entry();
 // hand: trench 3 ft x 3.63 ft (cut 3.61 + wall 0.02) x 400 ft, less the pipe (OD 0.7067 ft) = 4199.1 cf = 155.52 cu yd
 console.log('first lock',v0,'| ended at 200',v1,'| resumed',e2.volumeYd3,'incomplete flag',e2.volumeIncomplete,'resumedFrom',e2.resumedFromId!=null);
 // a run whose END has no stake must still be unavailable
 const ok=Math.abs(v0-155.5228)<0.01&&Math.abs(v1-77.7614)<0.01&&e2.resumedFromId!=null&&typeof e2.volumeYd3==='number'&&Math.abs(e2.volumeYd3-155.5228)<0.01;
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
