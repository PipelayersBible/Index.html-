// Crew runs today: offline after a reload, and after the foreman's run is removed
const {launch}=require('./srv');const co=require('./co_ok');const F=require('./flow');
const init=co+`;(()=>{const now=Date.now();const sheet={jobNumber:'24-017',jobsite:'Test',startLabel:'MH-1',endLabel:'MH-2',rodUnit:'ft',intervalRows:[{station:'0.0',stationFt:0,pointId:'start',bop:'4.80',inv:'5.47'},{station:'10.0',stationFt:10,bop:'4.90',inv:'5.57'}],laid:{marks:{'p:start':now-600000}}};
 window.__rpcOverride.pb_prod_crew_view_list=()=>window.__cvGone?{runs:[]}:{runs:[{id:'aaaaaaaa-0000-4000-8000-000000000001',who:'Brandon Jones',job_number:'24-017',label:'MH-1 to MH-2',laid_ft:10,distance_ft:100,ended:false,updated_at:new Date(now-300000).toISOString()}]};
 window.__rpcOverride.pb_prod_crew_view_get=()=>window.__cvGone?{__err:'pb:removed'}:{who:'Brandon Jones',updated_at:new Date(now-300000).toISOString(),ended:false,sheet};})();`;
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/'+(process.env.PG||'cur.html'),{init});
 const txt=async(pg)=>(await pg.evaluate(()=>{const s=document.getElementById('screen-crewView');return s&&s.offsetParent?s.innerText:'(crew view not shown)';})).replace(/\s+/g,' ').slice(0,700);
 console.log('home btn shown online:',await p.evaluate(()=>{const e=document.getElementById('homeCrewView');return !!e&&e.style.display!=='none';}));
 await p.evaluate(()=>window.pbCvOpen());await p.waitForTimeout(1500);await p.evaluate(()=>window.pbCvOpenRun(0));await p.waitForTimeout(1500);
 console.log('online sheet:',await txt(p));
 await ctx.setOffline(true);await p.close({runBeforeUnload:false});
 const p2=await page();
 console.log('home btn shown offline after restart:',await p2.evaluate(()=>{const e=document.getElementById('homeCrewView');return !!e&&e.style.display!=='none';}));
 await p2.evaluate(()=>window.pbCvOpen());await p2.waitForTimeout(1500);console.log('offline list:',await txt(p2));console.log('cvStatus:',await p2.evaluate(()=>{const e=document.getElementById('cvStatus');return e?[e.textContent,e.offsetParent!==null,e.outerHTML.slice(0,200)]:null;}));
 await p2.evaluate(()=>window.pbCvOpenRun(0));await p2.waitForTimeout(1500);console.log('offline sheet:',await txt(p2));
 // the foreman's run is removed; signal back
 await p2.evaluate(()=>{window.__cvGone=true;});await ctx.setOffline(false);await p2.waitForTimeout(4000);
 console.log('after removal (sheet open):',await txt(p2));
 await p2.evaluate(()=>window.pbCvBack());await p2.waitForTimeout(2500);console.log('after removal (list):',await txt(p2));
 console.log(p2.errs.slice(0,4));await b.close();})();
