const L=require('./lib');
// post-lock: add interval, correct distance, correct a hub; check the math each time
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.photo('start',S('1+50.25',103.40,3.61,'MH-1','3860'));await H.f('startStakeReading','4.36');
 await T.addHub();await T.photo('hub0',S('2+12.75',103.7,3.66,'AP','3861'),'p01');
 await T.photo('end',S('6+00.25',104.26,2.67,'MH-2','3863'),'p05');
 await T.set('interval','50');
 await T.lock();
 const rows=async(tag)=>{const e=await T.entry();console.log(tag,'dist',e.distance,JSON.stringify(e.intervalRows.map(r=>[r.station,r.pointId||'',r.bop,r.inv,r.top,r.elevation])));console.log('  segs',JSON.stringify(e.segments.map(s=>[s.distFt,+s.slopePct.toFixed(4)])),'sum',JSON.stringify(e.summary&&{s:e.summary.overallSlopePct,a:e.summary.startInv,b:e.summary.endInv,ae:e.summary.startInvElevFt,be:e.summary.endInvElevFt}),'hi',e.hi,'stations',JSON.stringify(e.runStations));};
 await rows('locked');
 // add interval at 86.37
 await T.E(()=>{pbToggleAddInterval();});await T.set('newIntervalStation','86.37');await T.E(()=>{pbAddInterval();});await p.waitForTimeout(1500);
 console.log('modal',await H.modal());await rows('added 86.37');
 // correct distance to 455
 await T.E(()=>{pbToggleCorrectDistance();});await p.waitForTimeout(400);
 console.log('sel:',JSON.stringify(await T.E(()=>[...document.getElementById('correctDistanceRunSel').options].map(o=>o.value+'|'+o.text))));
 await T.set('correctDistanceVal','455');await T.E(()=>{pbApplyCorrectDistance();});await p.waitForTimeout(2500);
 console.log('modal',await H.modal());for(const b of ['OK','Apply','Yes','Continue']){await H.modalClick(b).catch(()=>{});}await p.waitForTimeout(1500);console.log('modal',await H.modal());await H.modalClick('OK').catch(()=>{});
 await rows('dist 455');
 console.log('table:\n'+(await T.table()).split('\n').filter(l=>/¦/.test(l)).join('\n'));
 // correct hub
 await T.E(()=>{const pnl=document.getElementById('correctDistancePanel');if(pnl.style.display==='none')pbToggleCorrectDistance();});await p.waitForTimeout(400);
 const opts=await T.E(()=>[...document.getElementById('correctDistanceRunSel').options].map(o=>o.value+'|'+o.text));console.log('sel:',JSON.stringify(opts));
 const hubOpt=opts.find(o=>/hub/i.test(o)||/AP|Angle/i.test(o));if(hubOpt){await T.set('correctDistanceRunSel',hubOpt.split('|')[0]);await p.waitForTimeout(400);
  console.log('hub fields:',JSON.stringify(await T.E(()=>[...document.querySelectorAll('#correctDistanceHubFields input,#correctDistanceHubFields select')].map(e=>e.id+'='+e.value))));
  await T.set('correctHubStation','70');
  const eid=await T.E(()=>{const e=[...document.querySelectorAll('#correctHubElevWrap input')][0];return e?e.id:null;});console.log('elev id',eid);
  if(eid)await T.set(eid,'100.10');
  await T.E(()=>{pbApplyCorrectDistance();});await p.waitForTimeout(2500);console.log('modal',await H.modal());for(const b of ['OK','Apply','Yes','Continue']){await H.modalClick(b).catch(()=>{});}await p.waitForTimeout(1500);console.log('modal',await H.modal());await H.modalClick('OK').catch(()=>{});
  await rows('hub corrected');
  console.log('table:\n'+(await T.table()).split('\n').filter(l=>/¦|Stake|Shot/.test(l)).join('\n'));}
 const txt=await L.pdf(T,'/tmp/claude-0/bughunt/grade/tests/g4.pdf')||'';require('fs').writeFileSync('/tmp/claude-0/bughunt/grade/tests/g4.txt',txt);
 console.log('errs',p.errs.slice(0,5));await T.b.close();})();
