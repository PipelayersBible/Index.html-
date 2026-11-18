// Plan sheet viewer: with no signal it must say so, and load by itself when signal is back.
const L=require('./lib');
const grid={dpi:150,w:5400,h:3600,cols:4,rows:4,tw:1545,th:1095,ov:260,tiles:['r0c0','r0c1','r1c0','r1c1']};
const init='('+require('/home/claude/rig/pm_plans').toString()+')();'+`window.__rpcOverride.pb_terms_status=()=>({terms:'1.0',privacy:'1.0',at:new Date().toISOString()});try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','1');}catch(e){}
window.__rpcOverride.pb_plans_sheets=()=>({ok:true,set:{id:'S1',title:'Water Sewer',pages:1,state:'ready'},sheets:[{page:1,sheet:'C-1',title:'PLAN AND PROFILE',grid:${JSON.stringify(grid)},state:'done',issues:0}]});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:4500});
 await p.evaluate(()=>window.pbPlanSetOpen('S1'));await p.waitForTimeout(800);
 await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>window.__on!==false,configurable:true});window.__on=false;});
 await p.evaluate(()=>window.pbPlanSheetOpen(0));await p.waitForTimeout(1500);
 const t=await L.txt(p,'#screen-planSheet');console.log('no signal:',t);
 const ok1=/This sheet loads when you.re back online|Couldn.t load this sheet/.test(t||''); // the sheet's own line (the app's general offline banner doesn't count)
 // signal back: the tiles are there now
 await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=c.height=8;const blob=await new Promise(r=>c.toBlob(r,'image/jpeg'));window.__uploads={};['r0c0','r0c1','r1c0','r1c1'].forEach(k=>{window.__uploads['plan-sets/S1/p1/'+k+'.jpg']=blob;});window.__on=true;window.dispatchEvent(new Event('online'));});
 await p.waitForTimeout(3000);
 const n=await p.evaluate(()=>[...document.querySelectorAll('#planCanvas img')].filter(i=>i.naturalWidth>0).length),t2=await L.txt(p,'#screen-planSheet');
 console.log('back online: tiles loaded',n,'|',t2);
 const ok2=n===4&&!/No signal|Couldn.t load/.test(t2||'');
 console.log(ok1&&ok2?'PASS':'FAIL: '+(!ok1?'nothing says why the sheet is empty; ':'')+(!ok2?'the sheet did not load by itself once back online':''),'errs',p.errs);
 await b.close();process.exit(ok1&&ok2?0:1);})();
