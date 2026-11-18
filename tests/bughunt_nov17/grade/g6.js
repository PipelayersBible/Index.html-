const L=require('./lib');
// flip a run entered high-to-low: rows must mirror exactly
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.photo('start',S('12+45.30',2589.06,3.25,'MH-1','101'));await H.f('startStakeReading','4.36');
 await T.addHub();await T.photo('hub0',S('11+80.05',2586.40,2.33,'AP','102'),'p01');await H.sel('hub0FitAng','22.5°');
 await T.photo('end',S('10+95.30',2581.11,3.5,'MH-2','103'),'p05');
 const a=await T.calc();console.log('before',JSON.stringify({hi:a.hi,pts:a.pts,segs:a.segs,warn:a.warn}).slice(0,900));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 console.log('btns',JSON.stringify((await H.btns()).filter(b=>/flip/i.test(b))));
 await H.click('Flip This Run');await p.waitForTimeout(1500);
 console.log('modal',await H.modal());for(const b of ['Flip','Flip Run','Yes','OK']){await H.modalClick(b).catch(()=>{});}await p.waitForTimeout(1500);
 console.log('screen',await H.screen(),'modal',await H.modal());
 const c=await T.calc();console.log('after',JSON.stringify({hi:c.hi,pts:c.pts,segs:c.segs,warn:c.warn,errors:c.errors}).slice(0,1200));
 console.log('form:',JSON.stringify(await T.form(['startStaTxt','hub0StaTxt','hub0Station','endStaTxt','totalDist','startLabel','endLabel','startStakeReading','endStakeReading','startStakeElev','endStakeElev','startCutFillVal','endCutFillVal'])));
 if(a.rows&&c.rows){const n=a.rows.length;let bad=0;a.rows.forEach((r,i)=>{const m=c.rows.find(x=>Math.abs(x[0]-(a.total-r[0]))<1e-6);if(!m)return;[1,2,3,4,5,6].forEach(k=>{if(Math.abs(m[k]-r[k])>1e-6){bad++;if(bad<6)console.log('MISMATCH at',r[0],'k',k,r[k],m[k]);}});});console.log('rows',n,c.rows.length,'mismatches',bad);}
 console.log('errs',p.errs.slice(0,5));await T.b.close();})();
