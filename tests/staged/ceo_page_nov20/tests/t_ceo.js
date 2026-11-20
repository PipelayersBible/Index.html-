// Owner Dashboard (staged Nov 20, on r17.11): Settings row for the app owner only, the page from pb_owner_dashboard
// (fixture = the real function's output on the local test data, sql/local/dump.json), Needs-your-attention order, money,
// sharing "not live yet" and live, Show Events, missing function, refused, days switch, phone width, and the two new usage counts.
// Usage: PB_URL=http://127.0.0.1:10255/cur.html node t_ceo.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const ROOT=path.resolve(__dirname,'../../..');const co=require(ROOT+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:10255/cur.html';
const SHOTS=__dirname+'/../shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const DUMP=fs.readFileSync(__dirname+'/../sql/local/dump.json','utf8').trim();
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('PASS',m);}else{fail++;console.log('FAIL',m);}};
// fakesb, plus: an override may return {__err:{...}} to answer with an error
const FAKE=fs.readFileSync(ROOT+'/rig/fakesb.js','utf8').replace("return res(typeof o==='function'?o(a):o===undefined?null:o);",
  "const v=typeof o==='function'?o(a):o===undefined?null:o;return v&&v.__err?Promise.resolve({data:null,error:v.__err}):res(v);");
if(FAKE.indexOf('v.__err')<0)throw new Error('fakesb patch did not apply');
const SERVER=(admin,mode)=>`;(function(){const D=${DUMP};
 if(${JSON.stringify(mode)}==='share'){D.security.share={live:true,by_kind_7:{tried_in_use:2,far_apart:1},by_kind_30:{tried_in_use:3,far_apart:1,tried_full:1},
   top:[{who:'Jake (foreman)',email:'jake@x.test',company:'Beta Pipe',n:4,kinds:['tried_in_use','far_apart'],last:new Date().toISOString()}]};}
 Object.assign(window.__rpcOverride,{
  pb_support_is_admin:()=>${admin?'true':'false'},
  pb_owner_dashboard:(a)=>{const m=${JSON.stringify(mode)};
    if(m==='missing')return {__err:{code:'PGRST202',message:'Could not find the function public.pb_owner_dashboard(p_days) in the schema cache'}};
    if(m==='refused')return {__err:{code:'P0001',message:'pb:not_allowed'}};
    const x=JSON.parse(JSON.stringify(D));x.days=a.p_days;x.growth.by_day=x.growth.by_day.slice(-a.p_days);return x;},
  pb_owner_share_events:()=>({ok:true,events:[{id:1,at:new Date().toISOString(),kind:'far_apart',who:'Jake (foreman)',company:'Beta Pipe',miles:212,minutes:35,n:1},
    {id:2,at:new Date().toISOString(),kind:'tried_in_use',who:'Jake (foreman)',company:'Beta Pipe',n:1}]}),
 });})();`;
async function boot(o){const b=await chromium.launch();const ctx=await b.newContext({viewport:o.vp||{width:1280,height:900},colorScheme:'dark',serviceWorkers:'block'});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKE}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.route(/sentry\.io/,r=>{(ctx.__sentry=(ctx.__sentry||0)+1);r.fulfill({status:200,body:'{}'});});
 await ctx.addInitScript(co+SERVER(o.admin!==false,o.mode||'')+(o.init||''));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);return {b,p,ctx};}
const txt=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():'';},sel);
const overflow=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('#pbCeo *').forEach(e=>{if(!e.offsetParent&&e.tagName!=='I')return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.right));});return bad.slice(0,5);});
const rpcArgs=(p,n)=>p.evaluate((n)=>(window.__rpcArgs||[]).filter(x=>x[0]===n).map(x=>x[1]),n);
async function openSettings(p){await p.evaluate(()=>window.pbOpenSettings());await p.waitForTimeout(1500);}

(async()=>{
 // A: the app owner on a computer
 let {b,p}=await boot({});
 await openSettings(p);
 ok(await p.evaluate(()=>{const r=document.getElementById('settingsCeoBtn');return !!r&&!r.hidden&&r.offsetParent!==null;}),'Settings shows Owner Dashboard to the app owner');
 ok(await p.evaluate(()=>document.getElementById('settingsCeoBtn').compareDocumentPosition(document.getElementById('settingsBetaBtn'))&Node.DOCUMENT_POSITION_PRECEDING),'it sits right after Beta Accounts');
 await p.click('#settingsCeoBtn');await p.waitForTimeout(800);
 ok(await p.evaluate(()=>!!document.getElementById('pbCeo')),'page opens');
 const args=await rpcArgs(p,'pb_owner_dashboard');ok(args.length===1&&args[0].p_days===30,'one call, 30 days by default');
 const attn=await p.evaluate(()=>[...document.querySelectorAll('#pbCeo .cx-attn li')].map(l=>l.className+'|'+l.innerText.replace(/\s+/g,' ')));
 console.log('  attention:',attn.length,attn.slice(0,4));
 ok(attn.length===6&&/^red\|Now /.test(attn[0])&&/Needs your attention \(17\)/.test(await txt(p,'#cxAttnH')),'attention: worst 6 shown of 17, Now first (words, not only color)');
 await p.click('#cxAttnMore');await p.waitForTimeout(300);
 const attnAll=await p.evaluate(()=>[...document.querySelectorAll('#pbCeo .cx-attn li')].map(l=>l.className+'|'+l.innerText.replace(/\s+/g,' ')));
 ok(attnAll.length===17&&/^info\|FYI/.test(attnAll[16])&&/Show Fewer/.test(await txt(p,'#cxAttnMore')),'Show All 17: FYI last');
 attn.splice(0,attn.length,...attnAll);
 ok(attn.some(a=>/Confined space permit open 9 hours: Beta Pipe · MH-4/.test(a))&&attn.some(a=>/AI is stopped for them/.test(a))&&attn.some(a=>/811 ticket T-99/.test(a)),'attention: permit, AI stop, 811');
 const kp=await txt(p,'#pbCeo .cx-kpis');console.log('  kpis:',kp);
 ok(/Monthly revenue \(MRR\) \$217\.50 \$2,610 a year/.test(kp),'MRR $217.50 = $123 + $82.50 (yearly / 12) + $12 individual; ARR');
 ok(/Companies 3 2 paid · 1 in beta/.test(kp)&&/AI cost this month \$0\.80/.test(kp),'companies and AI cost headline');
 const money=await txt(p,'#cxMoneyH + .cx-grid');
 ok(/Beta Pipe Beta · 5 days left/.test(money)&&/Year Co Past due/.test(money)&&/Paid Pipe Paid 7 people · \$123\/mo/.test(money),'company list with plain status');
 ok(/Sales tax is not added by the app/.test(money)&&/Stripe not connected/.test(money),'payments and sales tax note');
 const cost=await txt(p,'#cxCostH + .cx-grid');
 ok(/solo@ind\.test \$2\.60 of \$2\.50 · 104%/.test(cost)&&/Beta Pipe \$25\.00 of \$30 · 83%/.test(cost),'AI money meter per company/individual');
 ok(await p.evaluate(()=>document.querySelectorAll('#pbCeo .cx-bars').length>=6),'small bar charts drawn (no library)');
 const sec=await txt(p,'#cxSecH + .cx-grid');ok(/Not live yet/.test(sec)&&/Users never see this/.test(sec),'sharing: not live yet');
 ok(/Signed in on 3\+ devices now boss@beta\.test/.test(sec)&&/Two-step login on 1 of 6/.test(sec),'sessions and two-step');
 const rel=await txt(p,'#cxRelH + .cx-grid');ok(/r17\.11 newest 2 people/.test(rel)&&/1 changed/.test(rel),'builds in use, seal mismatch');
 const safe=await txt(p,'#cxSafeH + .cx-grid');ok(/open 9/.test(safe)&&/Counts only/.test(safe)&&!/anonymous report text|secret body/.test(await txt(p,'#pbCeo')),'safety card; no report or feedback text anywhere');
 ok((await overflow(p)).length===0,'no sideways overflow at 1280');
 await p.screenshot({path:SHOTS+'/ceo_desktop.png',fullPage:false});
 await p.evaluate(()=>document.querySelector('#pbCeo').scrollTo(0,99999));await p.waitForTimeout(200);await p.screenshot({path:SHOTS+'/ceo_desktop_bottom.png'});
 // days switch
 await p.click('#pbCeo .cx-seg button[data-d="7"]');await p.waitForTimeout(600);
 const a2=await rpcArgs(p,'pb_owner_dashboard');ok(a2.length===2&&a2[1].p_days===7&&/last 7 days/.test(await txt(p,'#pbCeo .cx-as')),'7 days: asks again, says so');
 ok(await p.evaluate(()=>localStorage.getItem('pbCeoDays'))==='7','days remembered on this computer');
 await p.keyboard.press('Escape');await p.waitForTimeout(300);ok(await p.evaluate(()=>!document.getElementById('pbCeo')),'Escape closes');
 // the two usage counts
 const use=await p.evaluate(()=>JSON.parse(localStorage.getItem('pbUse1')||'{}'));
 ok(Object.keys(use).some(k=>/\|build:r17\.\d+$/.test(k)),'build:<this build> counted for the dashboard');
 ok(p.errs.length===0,'no page errors: '+p.errs.join(' | '));await b.close();

 // B: phone width
 ({b,p}=await boot({vp:{width:390,height:844}}));
 await openSettings(p);await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(800);
 ok(await p.evaluate(()=>{const t=document.getElementById('cxTitle').getBoundingClientRect(),x=document.getElementById('cxX').getBoundingClientRect();return Math.abs(t.top-x.top)<16;}),'phone: title and close on one line');
 ok(await p.evaluate(()=>!!document.getElementById('pbCeo'))&&(await overflow(p)).length===0,'no sideways overflow at 390: '+JSON.stringify(await overflow(p)));
 await p.screenshot({path:SHOTS+'/ceo_phone.png'});
 await p.evaluate(()=>document.querySelector('#pbCeo').scrollTo(0,1400));await p.waitForTimeout(200);await p.screenshot({path:SHOTS+'/ceo_phone_2.png'});
 ok(p.errs.length===0,'no page errors (phone)');await b.close();

 // C: sharing live + Show Events
 ({b,p}=await boot({mode:'share'}));
 await openSettings(p);await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(800);
 let s2=await txt(p,'#cxSecH + .cx-grid');
 ok(/Tried to sign in while in use elsewhere 2 \/ 3 in 30 days/.test(s2)&&/Jake \(foreman\) Beta Pipe 4/.test(s2),'sharing live: counts by kind and top logins');
 await p.click('#cxShareMore');await p.waitForTimeout(600);s2=await txt(p,'#cxSecH + .cx-grid');
 ok(/Used too far apart to drive · 212 miles in 35 minutes/.test(s2)&&(await rpcArgs(p,'pb_owner_share_events'))[0].p_days===90,'Show Events reads pb_owner_share_events');
 await p.screenshot({path:SHOTS+'/ceo_share_live.png'});
 ok(p.errs.length===0,'no page errors (share)');await b.close();

 // D: server part not applied yet / E: refused
 ({b,p}=await boot({mode:'missing'}));await openSettings(p);await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(800);
 ok(/isn’t set up on the server yet/.test(await txt(p,'#pbCeo .cx-body')),'missing function: plain message');await b.close();
 ({b,p}=await boot({mode:'refused'}));await openSettings(p);await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(800);
 ok(/only for the app’s owner/.test(await txt(p,'#pbCeo .cx-body')),'refused by the server: plain message');await b.close();

 // F: not the app owner
 ({b,p}=await boot({admin:false}));await openSettings(p);
 ok(await p.evaluate(()=>document.getElementById('settingsCeoBtn').hidden),'row hidden for everyone else');
 await p.evaluate(()=>window.pbCeoOpen());await p.waitForTimeout(500);
 ok(await p.evaluate(()=>!document.getElementById('pbCeo')&&/only for the app’s owner/.test(document.getElementById('pbModalOverlay').innerText)),'opening it anyway: alert, no page');
 ok((await rpcArgs(p,'pb_owner_dashboard')).length===0,'and no server call');await b.close();

 // G: a crash report is counted (crash reporter on, test send allowed); Sentry is faked
 let ctx;({b,p,ctx}=await boot({init:";try{localStorage.setItem('pbCrashTestSend','1');}catch(e){}"}));
 await p.evaluate(()=>{setTimeout(()=>{throw new TypeError('owner dashboard test crash');},0);});await p.waitForTimeout(800);
 const u2=await p.evaluate(()=>JSON.parse(localStorage.getItem('pbUse1')||'{}'));
 const crashN=Object.entries(u2).filter(([k])=>/\|crash$/.test(k)).reduce((a,[,v])=>a+v,0);
 ok(crashN===1,'one crash counted ('+crashN+')');
 await p.evaluate(()=>{setTimeout(()=>{throw new TypeError('owner dashboard test crash');},0);});await p.waitForTimeout(500);
 const u3=await p.evaluate(()=>JSON.parse(localStorage.getItem('pbUse1')||'{}'));
 ok(Object.entries(u3).filter(([k])=>/\|crash$/.test(k)).reduce((a,[,v])=>a+v,0)===1,'the same crash again is not counted twice');
 await b.close();
 ({b,p}=await boot({init:";try{localStorage.setItem('pbCrashTestSend','1');localStorage.setItem('pbCrashReports','0');}catch(e){}"}));
 await p.evaluate(()=>{setTimeout(()=>{throw new TypeError('owner dashboard test crash');},0);});await p.waitForTimeout(800);
 const u4=await p.evaluate(()=>JSON.parse(localStorage.getItem('pbUse1')||'{}'));
 ok(!Object.keys(u4).some(k=>/\|crash$/.test(k)),'"Send crash reports" off: not counted either');
 await b.close();
 console.log('\n'+pass+' pass, '+fail+' fail');process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
