// critic walk: viewport shots at a real iPhone Safari visible size (390x664) of the screens judged in NOTES.md
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');const co_pl=require(R+'/co_pl');const F=require(R+'/flow');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/cur.html';const SH=__dirname+'/../shots/';
const BETA=`;(function(){window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_my_plan:()=>({ok:true,plan:'trial',days_left:23,expired:false})});})();`;
const ENDED=`;(function(){window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_my_plan:()=>({ok:true,plan:'trial',days_left:0,expired:true,trial_ends_at:new Date(Date.now()-864e5).toISOString()})});})();`;
const txt=(p,n=1500)=>p.evaluate((n)=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s?s.id+' :: '+s.innerText.replace(/\n+/g,' | ').slice(0,n):'none'},n);
const fold=(p)=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);const v=[...s.querySelectorAll('button,a,input,select,textarea')].filter(e=>e.offsetParent);const first=v.filter(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight-56&&r.bottom>0}).length;return {controlsAboveFold:first,controls:v.length,height:s.scrollHeight,words:s.innerText.split(/\s+/).length}});
(async()=>{
 const which=process.argv[2]||'all';
 const run=async(name,init,fn)=>{if(which!=='all'&&which!==name)return;const {b,p}=await boot(URL,{init,wait:3500});const H=F(p);await p.setViewportSize({width:390,height:664});await p.waitForTimeout(400);try{await fn(p,H);}catch(e){console.log(name,'ERR',e.message.slice(0,300));}console.log(name,'errs',p.errs.slice(0,3));await b.close();};
 await run('fm',co+BETA,async(p,H)=>{
  await p.screenshot({path:SH+'c_fm_home_fold.png'});console.log('HOME',JSON.stringify(await fold(p)));
  console.log('BETA LINE',await p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l&&!l.hidden?l.innerText:'(hidden)'}));
  await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);await p.screenshot({path:SH+'c_newrun_fold.png'});console.log('NEWRUN',JSON.stringify(await fold(p)));
  await p.evaluate(()=>pbGoto('quickrun'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_quick_fold.png'});console.log('QUICK',JSON.stringify(await fold(p)),await txt(p,900));
  await p.evaluate(()=>pbGoto('trenchCalc'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_trench_fold.png'});console.log('TRENCH',await txt(p,2500));
  console.log('TRENCH ids',await p.evaluate(()=>[...document.querySelectorAll('#screen-trenchCalc input,#screen-trenchCalc select')].map(e=>e.id+':'+e.type).join(' ')));
  await p.evaluate(()=>pbGoto('confinedHub'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_cshub.png'});console.log('CSHUB',await txt(p,1500));
  await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_permit_fold.png'});
  await p.evaluate(()=>pbGoto('aiAsk'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_ask.png'});
  await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(600);await p.screenshot({path:SH+'c_more.png'});
  await p.evaluate(()=>pbGoto('dailyReport'));await p.waitForTimeout(900);await p.screenshot({path:SH+'c_daily_fold.png'});
  await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_settings_fold.png'});
  await p.evaluate(()=>{const d=document.getElementById('settingsPlanMore');if(d)d.open=true;d.scrollIntoView();});await p.screenshot({path:SH+'c_settings_plan.png'});
  await p.evaluate(()=>pbGoto('jobs'));await p.waitForTimeout(800);console.log('JOBS',await txt(p,800));
  await p.evaluate(()=>pbGoto('stats'));await p.waitForTimeout(800);console.log('STATS',await txt(p,800));
 });
 await run('ended',co+mgr+ENDED,async(p,H)=>{await p.waitForTimeout(1500);await p.screenshot({path:SH+'c_owner_beta_ended.png'});console.log('ENDED LINE',await p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l&&!l.hidden?l.innerText:'(hidden)'}));
  await p.evaluate(()=>{const b=document.querySelector('#pbBetaLine [data-plan]');if(b)b.click();});await p.waitForTimeout(1200);console.log('AFTER START PLAN',await p.evaluate(()=>document.getElementById('pbBetaLine').innerText),'| modal',await H.modal());await p.screenshot({path:SH+'c_owner_plan_requested.png'});});
 await run('owner',co+mgr+BETA,async(p,H)=>{await p.screenshot({path:SH+'c_owner_home_fold.png'});console.log('OWNER',JSON.stringify(await fold(p)));
  await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(900);await p.screenshot({path:SH+'c_owner_desktop.png'});
  await p.evaluate(()=>pbGoto('prodDashboard'));await p.waitForTimeout(1500);await p.screenshot({path:SH+'c_owner_desktop_prod.png'});
  await p.evaluate(()=>pbGoto('archive'));await p.waitForTimeout(1500);await p.screenshot({path:SH+'c_owner_desktop_records.png'});
  await p.evaluate(()=>pbGoto('crewMembers'));await p.waitForTimeout(1200);await p.screenshot({path:SH+'c_owner_desktop_crew.png'});});
 await run('pl',co_pl+BETA,async(p,H)=>{await p.screenshot({path:SH+'c_pl_home_fold.png'});console.log('PL',JSON.stringify(await fold(p)));});
})();
