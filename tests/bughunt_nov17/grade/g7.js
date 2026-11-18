const L=require('./lib');const R=require(__dirname+'/../../rig/resume');
// end a run short at 200 ft, check volume clip, then resume and check the continued sheet
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');await T.set('runBedding','0.5');await T.set('runTrenchWidth','3');
 await T.photo('start',S('1+00',103.40,3.61,'MH-1','3860'));await H.f('startStakeReading','4.36');
 await T.addHub();await T.photo('hub0',S('2+50',104.00,3.61,'AP','3861'),'p01');
 await T.photo('end',S('5+00',105.00,3.61,'MH-2','3863'),'p05');
 await T.set('interval','50');
 await T.lock();
 let e=await T.entry();console.log('locked vol',e.volumeYd3,'bed',e.beddingVolumeYd3,'dist',e.distance);
 // hand: depth to BOP const 3.63, tw 3, L 400 -> 4356 cf; pipe OD .7067 area .39223*400=156.89 -> 4199.1/27=155.52 ; bedding 3*400*.5/27=22.22
 const idx=await T.E(()=>getCurrentArchiveEntry().intervalRows.findIndex(r=>r.stationFt===200));
 await T.E((i)=>{pbLaidApply(currentRunArchiveId,i,true,true,'test');},idx);await p.waitForTimeout(1500);
 await R.endShort(p,200);await p.waitForTimeout(1500);
 e=await T.entry();console.log('ended: incomplete',e.incomplete,'completedDistance',e.completedDistance,'stopped',e.stoppedAtStation,'vol',e.volumeYd3,e.volumeIncomplete,'bed',e.beddingVolumeYd3,'net',e.netCutFill);
 // hand: 200 ft -> 77.76 yd3, bedding 11.11
 const S1=await T.E(()=>{const s=pbLaidSummary(getCurrentArchiveEntry());return {n:s.n,laidFt:s.laidFt,total:s.total,far:s.far,laidTo:s.laidTo,next:s.next};});console.log('laid',JSON.stringify(S1));
 console.log('screen',await H.screen());
 const i0=await T.E(()=>runArchive.findIndex(x=>x===getCurrentArchiveEntry()));
 await T.E((i)=>{window.pbResumeIncompleteRun(i);},i0);await p.waitForTimeout(2500);await R.modal(p);await p.waitForTimeout(1500);
 console.log('screen',await H.screen());
 console.log('form:',JSON.stringify(await T.form(['startStaTxt','startLabel','hub0StaTxt','hub0Station','hub0Label','endStaTxt','totalDist','interval','startStakeElev','startCutFillVal','startStakeReading','startElev','startElevReading','hub0StakeElev','hub0StakeReading','endStakeElev','endCutFillVal','runBedding','runTrenchWidth'])));
 console.log('modes',JSON.stringify(await T.E(()=>['start','hub0','hub1','end'].filter(x=>document.getElementById(x+'ModeToggle')).map(x=>x+':'+activeVal(x+'ModeToggle')+':'+getPointLabel(x,'')))));
 const hubs=await T.E(()=>getAllHubPrefixes().map(h=>h+':'+activeVal(h+'ModeToggle')+':'+getPointLabel(h,'')+':'+numVal(h+'Station')+':'+getElevVal(h+'Elev')));console.log('hubs',JSON.stringify(hubs));
 const lo=hubs.find(h=>/Left off/.test(h)).split(':')[0];
 await T.set(lo+'ElevReading','6.20');await p.waitForTimeout(1500);
 const c=await T.calc();console.log(JSON.stringify({hi:c.hi,hiLay:c.hiLay,pts:c.pts,errors:c.errors,warn:c.warn,notes:c.notes,rows:(c.rows||[]).map(r=>[r[0],+r[1].toFixed(3),+r[4].toFixed(3)])}).slice(0,1800));
 await T.lock();console.log('screen',await H.screen(),'modal',await H.modal());
 const e2=await T.entry();console.log('resumed entry: dist',e2.distance,'resumedFrom',e2.resumedFromId,'vol',e2.volumeYd3,'rows',JSON.stringify(e2.intervalRows.map(r=>[r.station,r.pointId||'',r.inv,r.elevation])));
 const S2=await T.E(()=>{const s=pbLaidSummary(getCurrentArchiveEntry());return {n:s.n,laidFt:s.laidFt,earlierFt:s.earlierFt,sessionFt:s.sessionFt,total:s.total,far:s.far,next:s.next,early:s.early};});console.log('laid2',JSON.stringify(S2));
 const txt=await L.pdf(T,((process.env.PB_OUT||'/tmp/claude-0/bughunt/grade/tests')+'/g7.pdf'))||'';require('fs').writeFileSync(((process.env.PB_OUT||'/tmp/claude-0/bughunt/grade/tests')+'/g7.txt'),txt);
 console.log('errs',p.errs.slice(0,5));await T.b.close();})();
