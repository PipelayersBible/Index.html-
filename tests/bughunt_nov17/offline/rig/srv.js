// Offline-aware rig: a node-side fake Supabase server that survives page reloads / closes,
// respects context.setOffline, and can delay, lose responses, or refuse.
const {chromium}=require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),crypto=require('crypto');
const FAKE=fs.readFileSync(__dirname+'/fakesb2.js','utf8');
function mkServer(){
 const S={calls:[],records:{},versions:[],status:{},clock:[],uploads:{},opts:{delay:0,lose:new Set(),refuse:{},quota:600},handlers:{}};
 const md5=x=>crypto.createHash('md5').update(JSON.stringify(x)).digest('hex');
 S.handlers.pb_prod_run_record_put=(a)=>{const id=a.p_entry_id,m=md5(a.p_record);const old=S.records[id];
  const po=a.p_record.pbOffice||{},ended=!!(a.p_record.completed||a.p_record.incomplete);
  if(old&&old.md5===m)return {ok:true,same:true,version:old.version,sent_at:old.sent_at||null,sent_how:old.sent_at?'pipelayer':null,foreman_id:null,foreman_name:null};
  const n=S.versions.filter(v=>Date.now()-v.at<86400000).length; if(n>=S.opts.quota)return {error:'pb:quota'};
  const v=old?old.version+1:1;const sent_at=(old&&old.sent_at)||(po.send&&ended?new Date().toISOString():null);S.records[id]={md5:m,version:v,record:a.p_record,sent_at};S.versions.push({id,v,at:Date.now(),record:a.p_record});return {ok:true,same:false,version:v,sent_at,sent_how:sent_at?'pipelayer':null,foreman_id:null,foreman_name:null};};
 S.handlers.pb_prod_run_status_put=(a)=>{const r=a.p_status.sessionRef,o=S.status[r];if(o&&o.seq>=a.p_status.seq)return {ok:true,stale:true};S.status[r]=a.p_status;return {ok:true,stale:false};};
 S.handlers.pb_prod_run_clock=(a)=>{S.clock.push(a);return {ok:true};};
 S.count=(n)=>S.calls.filter(c=>c.n===n&&c.done).length;
 return S;
}
async function launch(url,opts={}){
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:400,height:850},serviceWorkers:opts.sw?'allow':'block'});await require(__dirname+'/../../../rig/env').applyClock(ctx);
 const S=opts.server||mkServer();
 await ctx.exposeBinding('__srvRpc',async(src,n,a,ov)=>{
  const c={n,a,t:Date.now(),done:false};S.calls.push(c);
  if(S.opts.delay)await new Promise(r=>setTimeout(r,S.opts.delay));
  if(S.opts.refuse[n]){c.refused=true;return {data:null,error:{message:S.opts.refuse[n]}};}
  let out;
  if(S.handlers[n]){const r=S.handlers[n](a);out=r&&r.error?{data:null,error:{message:r.error}}:{data:r,error:null};}
  else out={data:ov===undefined?null:ov,error:null};
  c.done=!out.error;c.res=out;
  if(S.opts.lose.has(n)){c.lost=true;return {data:null,error:{message:'TypeError: Failed to fetch'}};}
  return out;});
 await ctx.exposeBinding('__srvUp',async(src,bucket,path,size)=>{if(S.opts.delay)await new Promise(r=>setTimeout(r,S.opts.delay));const k=bucket+'/'+path;if(S.uploads[k])return {error:'The resource already exists'};S.uploads[k]={size,at:Date.now()};return {ok:true};});
 if(!opts.sw)await ctx.route(new RegExp((process.env.PB_ROOT||'http://127.0.0.1:8877/').replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')+'[A-Za-z0-9_]+\\.html'),r=>{const n=new URL(r.request().url()).pathname.split('/').pop();r.fulfill({contentType:'text/html; charset=utf-8',body:fs.readFileSync((process.env.PB_SITE||'/tmp/claude-0/audit/offline')+'/'+n)});}); // the SW's kept copy, offline too
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 if(opts.init)await ctx.addInitScript(opts.init);
 const page=async()=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::ERR/.test(m.text()))p.errs.push('console: '+m.text().slice(0,200));});await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(opts.wait||3500);return p;};
 const p=await page();
 return {b,ctx,p,S,page};
}
module.exports={launch,mkServer};
