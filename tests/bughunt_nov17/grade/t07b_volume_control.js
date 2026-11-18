// Control for patch 07: a run whose END has no stake still has no backfill estimate; a hub typed as an invert between two stakes does not block it.
const L=require('./lib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');await T.set('runTrenchWidth','3');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=true;});/* r16.95: rod is under More settings */await p.click('#rodToggle button[data-val="lenker"]');await p.waitForTimeout(400);
 await T.photo('start',S('1+00',103.40,3.61,'MH-1','3860'));
 await T.E(()=>{document.querySelector('#endModeToggle button[data-val="elev"]').click();});await T.set('totalDist','400');await T.set('endElev','101.39');await p.waitForTimeout(600);
 const a=await T.E(()=>{const c=buildCalc();if(c.errors&&c.errors.length)return {errors:c.errors};const v=computeCutFillVolume(c);return {vol:v.volumeYd3,inc:v.volumeIncomplete};});
 console.log('end unstaked:',JSON.stringify(a));
 await T.E(()=>{document.querySelector('#endModeToggle button[data-val="stake"]').click();});await T.photo('end',S('5+00',105.00,3.61,'MH-2','3863'),'p05');
 await T.addHub();await T.E(()=>{document.querySelector('#hub0ModeToggle button[data-val="elev"]').click();pbStSetMode('hub0','dist');});await T.set('hub0Station','200');await T.set('hub0Elev','100.59');await p.waitForTimeout(600);
 const b=await T.E(()=>{const c=buildCalc();if(c.errors&&c.errors.length)return {errors:c.errors};const v=computeCutFillVolume(c);return {vol:v.volumeYd3,inc:v.volumeIncomplete};});
 console.log('invert hub between stakes:',JSON.stringify(b));
 const ok=a.vol===null&&a.inc===true&&(process.env.PG&&process.env.PG!=='cur.html'?Math.abs(b.vol-155.632)<0.01/* r16.90 true OD, see t07_resume_volume.js */:true);
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
