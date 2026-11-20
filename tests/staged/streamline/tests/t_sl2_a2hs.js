// streamline 08 (Tommy's priority, Nov 19): adding the app to the Home Screen is a step at the end of set-up.
// iPhone Safari: after Save Password (invite/reset) and after a Log In; Android Chrome: after Join Crew and Log In, with
// "Install App" when Chrome offers it. Never in the Home Screen app, never on a computer. After the Terms and the crew
// notice. Done ends it for good (pbObA2hs:<uid>, shared with the Home card). A no-email account gets its code there.
// (09: an email account gets Get a Code in the step too)
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_sl2_a2hs.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const boot=require('../../../boot_ob');const mkSrv=require('../../../obsrv');
const BASE=process.env.PB_URL||'http://127.0.0.1:8961/cur.html';
const SHOTS=process.env.PB_OUT||path.join(__dirname,'../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const FAKESB=fs.readFileSync(path.join(__dirname,'../../../rig/fakesb.js'),'utf8');
const CONTRACTOR=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const step=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return !!d&&d.dataset.step==='a2hs';});
const fits=(p)=>p.evaluate(()=>{const c=document.querySelector('#pbObSheet .pbob-card');const r=c?c.getBoundingClientRect():{left:0,right:0};return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth+0.5;});
const waitStep=async(p,ms)=>{try{await p.waitForFunction(()=>{const d=document.getElementById('pbObSheet');return !!d&&d.dataset.step==='a2hs';},null,{timeout:ms||15000});return true;}catch(e){return false;}};
// the email-invite path on the plain rig (signed in by the link, Save Password)
async function invite(b,ua,opts={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',userAgent:ua,colorScheme:opts.dark?'dark':'light'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKESB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.addInitScript(`window.__rpcOverride={pb_terms_accept:()=>({ok:true}),pb_notice_ack:()=>({ok:true})};`+(opts.standalone?"try{Object.defineProperty(navigator,'standalone',{get:()=>true});}catch(e){}":''));
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE+'?token_hash=pkce_abcDEF0123456789&type=invite',{waitUntil:'load'});await p.waitForTimeout(2500);
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);
  if(await p.$('#setPwTerms')&&await p.isVisible('#setPwTerms'))await p.check('#setPwTerms');
  await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(2500);
  return p;}
(async()=>{
 const b=await chromium.launch();
 // ===== 1. iPhone Safari, email invite: right after Save Password =====
 for(const dark of [false,true]){const L=dark?'dark':'light';
  const p=await invite(b,IOS,{dark});
  ok(await waitStep(p),L+': iPhone Safari: the Home Screen step opens after Save Password');
  const t=await sheet(p);
  ok(/Add the App to Your Home Screen/.test(t)&&/Tap Share at the bottom of Safari/.test(t)&&/Add to Home Screen, then Add/.test(t)&&/Open the new icon and tap Paste Join Code/.test(t),L+': the Share steps: '+t.slice(0,200));
  ok(await p.evaluate(()=>!!document.querySelector('#pbObA2hsSteps svg[aria-label="the Share button"]')),L+': a picture of the Share button');
  ok(await p.evaluate(()=>!!document.getElementById('pbObA2hsCodeBtn')&&document.querySelectorAll('#pbObSheet button').length===2&&document.getElementById('pbObA2hsDone').textContent==='Done'),L+': an email account: Get a Code (09) and one "Done" button');
  ok(await fits(p),L+': fits 390 px');await p.screenshot({path:SHOTS+'/a2hs_ios_'+L+'.png'});
  if(!dark){
   await p.click('#pbObA2hsDone');await p.waitForTimeout(500);
   ok(!(await step(p))&&await p.evaluate(()=>!!localStorage.getItem('pbObA2hs:00000000-0000-4000-8000-000000000001')),'Done: closed, remembered with the Home card\'s key');
   await p.evaluate(()=>pbRenderHome());await p.waitForTimeout(300);
   ok(await p.evaluate(()=>!document.getElementById('homeAttention_a2hs')),'Done: the Home card is gone too');
   await p.evaluate(()=>pbObA2hsStepSoon('login'));await p.waitForTimeout(1500);
   ok(!(await step(p)),'not asked again');
  }
  ok(p.errs.length===0,L+': no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 2. the Home Screen app and a computer: never =====
 {const p=await invite(b,IOS,{standalone:true});await p.waitForTimeout(3000);
  ok(!(await step(p))&&await p.evaluate(()=>!!document.getElementById('screen-home').offsetParent),'iPhone Home Screen app: no step');await p.context().close();}
 {const p=await invite(b,undefined);await p.waitForTimeout(3000);
  ok(!(await step(p)),'computer: no step');await p.context().close();}
 // ===== 3. Android, join by text link: after Join Crew; menu steps =====
 const srv=mkSrv({paid:5,interval:'year'});
 {const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Mike',p_pair_foreman:srv.FOREMAN});
  const {p}=await boot(b,BASE+'#join='+mk.token,srv,{ua:AND,signedOut:true,wait:4500});
  await p.check('#pbObTerms');await p.click('#pbObJoinBtn');
  ok(await waitStep(p),'Android: the step opens after Join Crew');
  const t=await sheet(p);
  ok(/Tap the menu ⋮ at the top right of Chrome/.test(t)&&/Add to Home screen \(or Install app\), then Install/.test(t)&&!/Install App/.test(t),'Android, no install offer: the Chrome menu steps');
  ok(!/Get a Code/.test(t),'Android: no code (the installed app shares the sign-in)');
  await p.screenshot({path:SHOTS+'/a2hs_android_menu.png'});
  ok(p.errs.length===0,'Android: no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 4. Android with Chrome's install offer: one tap "Install App" =====
 {const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Ana'});
  const BIP="window.addEventListener('load',()=>setTimeout(()=>{const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{window.__bipPrompted=(window.__bipPrompted||0)+1;return Promise.resolve();};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);window.__bipDefaultPrevented=()=>e.defaultPrevented;},300));";
  const {p}=await boot(b,BASE+'#join='+mk.token,srv,{ua:AND,signedOut:true,wait:4500,init:BIP});
  ok(await p.evaluate(()=>window.__bipDefaultPrevented&&window.__bipDefaultPrevented()),'Android: Chrome\'s own install bar is held back for the step');
  await p.check('#pbObTerms');await p.click('#pbObJoinBtn');
  ok(await waitStep(p)&&await p.evaluate(()=>!!document.getElementById('pbObInstallBtn')),'Android with the offer: "Install App"');
  await p.screenshot({path:SHOTS+'/a2hs_android_install.png'});
  await p.click('#pbObInstallBtn');await p.waitForTimeout(800);
  const me=await p.evaluate(()=>window.__pbObMe().id);
  ok(await p.evaluate(()=>window.__bipPrompted===1)&&!(await step(p))&&await p.evaluate((u)=>!!localStorage.getItem('pbObA2hs:'+u),me),'one tap: Chrome\'s install asked, accepted, the step is done for good');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 5. iPhone Safari, a no-email (link) account: Get a Code in the step =====
 {const nu={id:'00000000-0000-4000-8000-00000000ab01',email:'m-xyz@crew.pipelayersbible.com',user_metadata:{full_name:'Sam'},app_metadata:{pb_link:true}};
  srv.st.members.set(nu.id,{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pipelayer'});srv.st.users.set(nu.id,nu);srv.st.terms.push([nu.id,'1.0','1.0','join']);
  const {p}=await boot(b,BASE,srv,{ua:IOS,user:nu,init:CONTRACTOR+`try{localStorage.setItem('pbCrewNotice:${nu.id}','3');localStorage.setItem('pbTermsOk:${nu.id}','1.0|1.0');}catch(e){}`,wait:4000});
  await p.evaluate(()=>pbObA2hsStepSoon('login'));
  ok(await waitStep(p),'link account on iPhone Safari: the step opens');
  let t=await sheet(p);
  ok(/Tap Get a Code below, then Copy Code/.test(t)&&/Open the new icon and tap Paste Join Code/.test(t)&&await p.evaluate(()=>!!document.getElementById('pbObA2hsCodeBtn')),'link account: Get a Code is in the steps');
  await p.screenshot({path:SHOTS+'/a2hs_ios_link.png'});
  await p.click('#pbObA2hsCodeBtn');await p.waitForTimeout(1200);
  const code=await p.evaluate(()=>(document.getElementById('pbObHandoffCode')||{}).textContent||'');
  ok(/^[A-Z0-9]{3} [A-Z0-9]{3}$/.test(code),'the code shows in the step ('+code+')');
  await p.click('#pbObHandoffCopy');await p.waitForTimeout(300);
  ok(/^PBCODE:/.test(await p.evaluate(()=>window.__pbObCopied||'')),'Copy Code puts the sign-in code on the clipboard');
  ok(await step(p),'still the same step (Done ends it)');
  await p.click('#pbObA2hsDone');await p.waitForTimeout(300);ok(!(await step(p)),'Done closes it');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 6. the order: the Terms and the crew notice come first =====
 {const nu={id:'00000000-0000-4000-8000-00000000ac01',email:'pat@example.com',user_metadata:{full_name:'Pat'},app_metadata:{}};
  srv.st.members.set(nu.id,{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pipelayer'});srv.st.users.set(nu.id,nu);
  const {p}=await boot(b,BASE,srv,{ua:IOS,user:nu,init:CONTRACTOR,wait:4500});
  await p.evaluate(()=>pbObA2hsStepSoon('login'));await p.waitForTimeout(2500);
  ok(await p.evaluate(()=>!!document.getElementById('pbTermsSheet'))&&!(await step(p)),'order: the Terms sheet first, no step under it');
  await p.check('#pbTermsBox');await p.click('#pbTermsYes');await p.waitForTimeout(500);
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return o&&getComputedStyle(o).display!=='none'?o.innerText:'';});
  ok(/Your company can see/.test(m)&&!(await step(p)),'order: then the crew notice, still no step');
  await p.evaluate(()=>{const b=[...document.querySelectorAll('#pbModalOverlay button')].find(x=>/Got It/.test(x.textContent));b&&b.click();});
  ok(await waitStep(p),'order: then the Home Screen step');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 7. iPhone: "Skip: Join Here in Safari" then Join Crew: not asked again right away; the Home card stays =====
 {const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Lee'});
  const {p}=await boot(b,BASE+'#join='+mk.token,srv,{ua:IOS,signedOut:true,wait:4500});
  await p.click('#pbObHereBtn');await p.waitForTimeout(400);await p.check('#pbObTerms');await p.click('#pbObJoinBtn');await p.waitForTimeout(6000);
  ok(!(await step(p)),'skipped a moment ago: no step after Join Crew');
  await p.evaluate(()=>pbRenderHome());await p.waitForTimeout(300);
  ok(await p.evaluate(()=>!!document.getElementById('homeAttention_a2hs')),'the Home card still offers it');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 8. Android Log In (the owner on a new phone): after the login =====
 {const {p}=await boot(b,BASE,mkSrv({paid:5}),{ua:AND,signedOut:true,init:CONTRACTOR,wait:3500});
  await p.evaluate(()=>pbOpenLogin());await p.fill('#loginEmail','tester@example.com');await p.fill('#loginPassword','pw12345678');await p.click('#loginSubmitBtn');
  await p.waitForSelector('#pbTermsSheet',{timeout:15000}).catch(()=>{});
  if(await p.$('#pbTermsSheet')){ok(!(await step(p)),'Android Log In: (the rig asks the Terms first) no step under the Terms sheet');await p.check('#pbTermsBox');await p.click('#pbTermsYes');}
  ok(await waitStep(p,20000),'Android Log In: the step opens after the login');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 await b.close();console.log('t_sl2 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
