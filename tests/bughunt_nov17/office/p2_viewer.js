const L=require('./lib');
const init='('+require('/home/claude/rig/pm_plans').toString()+')();'+`window.__rpcOverride.pb_terms_status=()=>({terms:'1.0',privacy:'1.0',at:new Date().toISOString()});try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','1');}catch(e){}
window.__rpcOverride.pb_plans_uploaded=(a)=>{window.__planCalls.push(['uploaded',a]);window.__planSets=[{id:'S1',title:'plan2',pages:2,state:'parked',read:0,uploaded:2,failed:0,mine:true}];return {ok:true,parked:true};};
window.__rpcOverride.pb_plans_sheets=()=>({ok:true,set:{id:'S1',title:'plan2 with a rather long plan set title for wrapping on a phone',pages:2,state:'parked'},sheets:(window.__planCalls.filter(c=>c[0]==='ready').map(c=>({page:c[1],sheet:null,title:null,grid:c[2],state:'uploaded',issues:0})))});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:4500});
 await p.evaluate(()=>window.pbOpenProdJob(0));await p.waitForTimeout(2000);
 await p.evaluate(()=>window.pbPlansOpenFromJob());await p.waitForTimeout(1000);
 await p.setInputFiles('#plansFile',__dirname+'/plan2.pdf');
 for(let i=0;i<80;i++){await p.waitForTimeout(500);if(await p.evaluate(()=>document.getElementById('plansWait').hidden)&&i>2)break;}
 console.log('line:',await L.txt(p,'#plansLine'),'| list:',await L.txt(p,'#plansList'));
 await p.evaluate(()=>window.pbPlanSetOpen('S1'));await p.waitForTimeout(1000);
 console.log('set screen:',await L.scr(p),'|',await L.txt(p,'#screen-planSet'),'ovf',JSON.stringify(await L.ovf(p)));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/p2_set.png'});
 await p.evaluate(()=>window.pbPlanSheetOpen(0));await p.waitForTimeout(2500);
 console.log('sheet screen:',await L.scr(p),'|',(await L.txt(p,'#screen-planSheet')).slice(0,200),'ovf',JSON.stringify(await L.ovf(p)));
 console.log('tiles:',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#planCanvas img')].map(i=>[i.dataset.path,!!i.src,i.naturalWidth,i.style.left,i.style.width]))));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/p2_sheet.png'});
 await p.evaluate(()=>{window.pbPlanZoom(1);window.pbPlanZoom(1);});await p.waitForTimeout(1500);
 console.log('zoom:',await L.txt(p,'#planZoomT'),'loaded tiles:',await p.evaluate(()=>[...document.querySelectorAll('#planCanvas img')].filter(i=>i.naturalWidth>0).length));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/p2_zoom.png'});
 await p.evaluate(()=>window.pbPlanSheetStep(1));await p.waitForTimeout(1500);console.log('next:',await L.txt(p,'#planSheetTitle'),'prev disabled',await p.evaluate(()=>document.getElementById('planPrevBtn').disabled),'next disabled',await p.evaluate(()=>document.getElementById('planNextBtn').disabled));
 // offline: open sheet
 await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true});window.__uploads={};});
 await p.evaluate(()=>window.pbPlanSheetStep(-1));await p.waitForTimeout(1500);
 console.log('offline sheet text:',(await L.txt(p,'#screen-planSheet')).slice(0,200),'| tiles loaded:',await p.evaluate(()=>[...document.querySelectorAll('#planCanvas img')].filter(i=>i.naturalWidth>0).length));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/p2_offline.png'});
 console.log('errs',p.errs);await b.close();})();
