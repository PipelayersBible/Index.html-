// simplify 01: on a foreman's and a pipelayer's Home, Start work comes before the "Yours" rows. Nothing removed.
const L=require('./_lib');const {ok}=L;
const info=(p)=>p.evaluate(()=>{const y=id=>{const e=document.getElementById(id);return e&&e.checkVisibility()?Math.round(e.getBoundingClientRect().top+scrollY):null;};const bar=document.getElementById('pbTabHome').getBoundingClientRect().top;
 const s=document.getElementById('screen-home');return {newRun:y('homeTileNewRun'),newRunBottom:y('homeTileNewRun')+document.getElementById('homeTileNewRun').offsetHeight,permit:y('homeTileNewPermit'),mine:y('homeMine'),prod:y('homeProdMine'),bar:Math.round(bar),ids:[...s.querySelectorAll('[id]')].map(e=>e.id).sort().join(','),vis:[...s.querySelectorAll('[id]')].filter(e=>e.checkVisibility()).map(e=>e.id).sort().join(','),text:s.innerText.replace(/\s+/g,' ').replace('What you logged and its sync state','What you logged, and what’s sent').split(' ').sort().join(' ')};});
(async()=>{
 for(const [role,init] of [['foreman',L.co],['pipelayer',require(L.R+'co_pl')],['manager',L.co+require(L.R+'mgr')]]){
  let {b,p}=await L.start(L.BASE,init);const before=await info(p);await b.close();
  ({b,p}=await L.start(L.CUR,init));const after=await info(p);
  console.log(role+': New Run top before '+before.newRun+' px, after '+after.newRun+' px (tab bar at '+after.bar+'); My production before '+before.prod+', after '+after.prod);
  ok(before.ids===after.ids,role+': the same element ids on Home');ok(before.vis===after.vis,role+': the same things are showing');ok(before.text===after.text,role+': the same words on Home (only the order changed; My production line reworded by 05)');
  if(role==='manager'){ok(before.newRun===after.newRun&&before.mine===after.mine,'manager (Company Home): nothing moved');}
  else{ok(after.newRun<before.newRun,role+': New Run is higher ('+(before.newRun-after.newRun)+' px)');
   if(before.mine!==null){ok(after.mine>after.permit,role+': the Yours rows are under Start work');ok((role!=='foreman'||before.newRunBottom>before.bar)&&after.newRunBottom<=after.bar,role+': New Run was below the first screen, now on it without scrolling ('+after.newRunBottom+' <= '+after.bar+')');}
   await p.click('#homeTileNewRun');await p.waitForTimeout(1200);ok(await p.evaluate(()=>document.getElementById('screen-input').classList.contains('active')),role+': New Run still opens Run Setup');
   await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(400);
   if(after.prod!==null){await p.click('#homeProdMine');await p.waitForTimeout(800);ok(await p.evaluate(()=>document.getElementById('screen-prodMine').classList.contains('active')),role+': My production still opens');}}
  if(role==='foreman'){await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/../shots/home_foreman_after.png'});}
  ok(p.errs.length===0,role+': no page errors '+p.errs.join('|'));
  if(role==='manager')return L.done(b);await b.close();}
})();
