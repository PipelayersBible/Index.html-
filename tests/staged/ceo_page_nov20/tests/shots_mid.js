// Extra screenshots of the middle of the page (computer and phone). Same rig as t_ceo.js.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'../../..');const co=require(ROOT+'/rig/co');
const DUMP=fs.readFileSync(__dirname+'/../sql/local/dump.json','utf8').trim();const SHOTS=__dirname+'/../shots';
(async()=>{for(const [w,h,tag] of [[1280,900,'desktop'],[390,844,'phone']]){
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:w,height:h},serviceWorkers:'block'});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(ROOT+'/rig/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.addInitScript(co+`;Object.assign(window.__rpcOverride,{pb_support_is_admin:()=>true,pb_owner_dashboard:()=>(${DUMP})});`);
 const p=await ctx.newPage();await p.goto(process.env.PB_URL||'http://127.0.0.1:10255/cur.html');await p.waitForTimeout(3500);
 await p.evaluate(()=>window.pbOpenSettings());await p.waitForTimeout(1200);await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(800);
 await p.screenshot({path:SHOTS+'/ceo_'+tag+'_top.png'});
 for(const [i,y] of [[1,h-60],[2,2*(h-60)],[3,3*(h-60)]]){await p.evaluate((y)=>document.getElementById('pbCeo').scrollTo(0,y),y);await p.waitForTimeout(150);await p.screenshot({path:SHOTS+'/ceo_'+tag+'_'+i+'.png'});}
 await b.close();}})();
