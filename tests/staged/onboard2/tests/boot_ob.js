// boot for t130 (onboard2; from t125's): the rig's boot with this folder's fake supabase-js, a shared Node "server", a user agent, and optional
// "Home Screen app" mode (navigator.standalone) and a clipboard stub.
const {chromium}=require('playwright');const fs=require('fs');
module.exports=async function boot(b,url,srv,opts={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:opts.dark?'dark':'light',serviceWorkers:'block',userAgent:opts.ua||undefined});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/fakesb_ob.js','utf8')}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.exposeBinding('__obSrv',(src,op,uid,args)=>srv.call(op,uid,args));
  if(opts.offline)await ctx.setOffline(true);
  await ctx.addInitScript(`(function(){${opts.signedOut?'window.__obStart=null;':''}${opts.user?'window.__obStart='+JSON.stringify(opts.user)+';':''}
    ${opts.standalone?"try{Object.defineProperty(navigator,'standalone',{get:()=>true});}catch(e){}":''}
    window.__clip=${JSON.stringify(opts.clip||'')};try{Object.defineProperty(navigator,'clipboard',{value:{readText:async()=>window.__clip,writeText:async(t)=>{window.__clip=t;}},configurable:true});}catch(e){}
    try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-0000000000f1','3');localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','3');}catch(e){}
    window.__pbAuthQuietMs=0;})();`+(opts.init||''));
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error')(p.cerrs=p.cerrs||[]).push(m.text());});
  if(opts.offline){await ctx.setOffline(false);}await p.goto(url,{waitUntil:'load'});if(opts.offline){await ctx.setOffline(true);}await p.waitForTimeout(opts.wait||3000);return {ctx,p};};
