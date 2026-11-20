// boot for the one-device tests (from tests/boot_ob.js): this folder's fake supabase-js, the shared Node "server"
// (srv1dev.js), a user agent, optional Home Screen app mode and a clipboard stub.
const fs=require('fs');
module.exports=async function boot(b,url,srv,opts={}){
  const ctx=await b.newContext({viewport:opts.wide?{width:1200,height:850}:{width:390,height:844},colorScheme:opts.dark?'dark':'light',serviceWorkers:'block',userAgent:opts.ua||undefined});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/fakesb_1dev.js','utf8')}));
  await ctx.route(/supabase\.co/,async r=>{const u=r.request().url(),m=/\/rest\/v1\/rpc\/(pb_session_take_slot|pb_session_why)$/.exec(u);
    if(m&&!/Bearer /.test(r.request().headers()['authorization']||'')){let a={};try{a=JSON.parse(r.request().postData()||'{}');}catch(e){}const d=srv.call('anon',null,{n:m[1],a});
      return r.fulfill({status:d&&d.__status||200,contentType:'application/json',body:JSON.stringify(d)});} // the app's own key only (no session token)
    return r.fulfill({status:200,contentType:'application/json',body:'null'});});
  await ctx.exposeBinding('__d1',(src,op,sid,args)=>srv.call(op,sid,args));
  await ctx.addInitScript(`(function(){${opts.user?'window.__d1Start='+JSON.stringify(opts.user)+';':''}
    ${opts.standalone?"try{Object.defineProperty(navigator,'standalone',{get:()=>true});}catch(e){}":''}
    window.__clip=${JSON.stringify(opts.clip||'')};try{Object.defineProperty(navigator,'clipboard',{value:{readText:async()=>window.__clip,writeText:async(t)=>{window.__clip=t;}},configurable:true});}catch(e){}
    ${opts.noticeSeen===false?'':"try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-0000000000f1','3');localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','3');}catch(e){}"}
    window.__pbAuthQuietMs=0;})();`+(opts.init||''));
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error')(p.cerrs=p.cerrs||[]).push(m.text());});
  await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(opts.wait||3500);return {ctx,p};};
