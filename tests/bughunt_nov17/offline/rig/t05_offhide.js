// the no-signal tidy must leave a Save answer and the crew viewer's copy time visible (fails on r16.95)
const {launch}=require('./srv');const co=require('./co_ok');
const init=co+`;(()=>{const now=Date.now();const sheet={jobNumber:'24-017',jobsite:'Test',startLabel:'MH-1',endLabel:'MH-2',rodUnit:'ft',intervalRows:[{station:'0.0',stationFt:0,pointId:'start',bop:'4.80',inv:'5.47'},{station:'10.0',stationFt:10,bop:'4.90',inv:'5.57'}],laid:{marks:{'p:start':now-600000}}};
 window.__rpcOverride.pb_prod_crew_view_list=()=>({runs:[{id:'aaaaaaaa-0000-4000-8000-000000000001',who:'Brandon Jones',job_number:'24-017',label:'MH-1 to MH-2',laid_ft:10,distance_ft:100,ended:false,updated_at:new Date(now-300000).toISOString()}]});
 window.__rpcOverride.pb_prod_crew_view_get=()=>({who:'Brandon Jones',updated_at:new Date(now-300000).toISOString(),ended:false,sheet});})();`;
(async()=>{const {b,ctx,p,page}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init});let fail=0;
 await p.evaluate(()=>window.pbCvOpen());await p.waitForTimeout(1500);await p.evaluate(()=>window.pbCvOpenRun(0));await p.waitForTimeout(1500);
 await ctx.setOffline(true);await p.close({runBeforeUnload:false});const p2=await page();
 await p2.evaluate(()=>window.pbCvOpen());await p2.waitForTimeout(1500);
 const vis=(pg,re)=>pg.evaluate(src=>{const re=new RegExp(src);const el=[...document.querySelectorAll('#pbApp .pb-screen.active p')].find(e=>re.test(e.textContent));return el?{text:el.textContent,shown:el.offsetParent!==null}:null;},re);
 let a=await vis(p2,'fetched|as of');console.log('list copy time:',JSON.stringify(a));if(!a||!a.shown)fail++;
 await p2.evaluate(()=>window.pbCvOpenRun(0));await p2.waitForTimeout(1500);
 a=await vis(p2,'fetched');console.log('sheet copy time:',JSON.stringify(a));if(!a||!a.shown)fail++;
 // a Save answer shown on the screen with no signal
 await p2.evaluate(()=>{const d=document.createElement('p');d.id='tAns';d.textContent='No signal. Nothing was saved; what you typed is still here.';document.querySelector('#pbApp .pb-screen.active').appendChild(d);});await p2.waitForTimeout(400);
 a=await vis(p2,'Nothing was saved');console.log('save answer:',JSON.stringify(a));if(!a||!a.shown)fail++;
 // a pure placeholder is still folded into the one line
 await p2.evaluate(()=>{const d=document.createElement('p');d.textContent='No signal. Live now loads with signal.';document.querySelector('#pbApp .pb-screen.active').appendChild(d);});await p2.waitForTimeout(400);
 a=await vis(p2,'Live now loads');console.log('placeholder (should be hidden):',JSON.stringify(a));if(!a||a.shown)fail++;
 console.log(fail?'FAIL '+fail:'PASS');await b.close();process.exit(fail?1:0);})();
