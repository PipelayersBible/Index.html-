// streamline 01: Set Password is one screen. The Terms tick (and, for a crew member, "What your company sees") are on
// the password screen, not a sheet over it; Save Password records them; a short note says it's done (no OK tap).
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_sl1_setpw.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const BASE=process.env.PB_URL||'http://127.0.0.1:8961/cur.html';
const SHOTS=process.env.PB_OUT||path.join(__dirname,'../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const FAKESB=fs.readFileSync(path.join(__dirname,'../../../rig/fakesb.js'),'utf8');
const SA=()=>new Date().toISOString();
async function open(b,q,init='',opts={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',colorScheme:opts.dark?'dark':'light'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKESB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.addInitScript(`window.__rpcOverride={pb_terms_accept:()=>({ok:true}),pb_notice_ack:()=>({ok:true})};`+init);
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE+q,{waitUntil:'load'});await p.waitForTimeout(2500);return p;}
const shown=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;},id);
const modals=(p)=>p.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return o&&getComputedStyle(o).display!=='none'?o.innerText.replace(/\s+/g,' '):'';});
const rpcs=(p,n)=>p.evaluate(n=>(window.__rpcArgs||[]).filter(x=>x[0]===n).length,n);
const fits=(p)=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
const CREW="window.__rpcOverride.pb_prod_access=()=>({member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',manager:false,role:'pipelayer',server_at:new Date().toISOString()});";
(async()=>{
 const b=await chromium.launch();
 // 1. invite link, company account (not crew): tick on the screen, no sheet, Save records the Terms
 for(const dark of [false,true]){
  const p=await open(b,'?token_hash=pkce_abcDEF0123456789&type=invite','',{dark});
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);
  const L=dark?'dark':'light';
  ok(await shown(p,'screen-setPassword'),L+': invite: the password screen opens');
  ok(await p.evaluate(()=>document.getElementById('setPwTitle').textContent)==='Choose Your Password','invite: titled "Choose Your Password"');
  ok(!(await p.$('#pbTermsSheet')),L+': no Terms sheet over the password screen');
  ok(await shown(p,'setPwTermsWrap')&&!(await shown(p,'setPwNoticeWrap')),L+': the Terms tick is on the screen; no crew notice for a company account');
  ok(await fits(p),L+': fits 390 px');await p.screenshot({path:SHOTS+'/setpw_'+L+'.png'});
  await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(1500);
  ok(/Tick the box to agree to the Terms first/.test(await p.evaluate(()=>document.getElementById('setPwError').textContent))&&await shown(p,'screen-setPassword'),L+': Save without the tick: "Tick the box..." and nothing is saved');
  await p.check('#setPwTerms');await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(3000);
  ok(await shown(p,'screen-home')&&!(await shown(p,'screen-setPassword')),L+': Save Password: Home');
  ok(await rpcs(p,'pb_terms_accept')===1,L+': the Terms were recorded once (pb_terms_accept)');
  ok(await p.evaluate(()=>!document.getElementById('pbTermsSheet')),L+': no Terms sheet afterwards');
  const note=await p.evaluate(()=>{const n=document.getElementById('pbSayDone');return n&&!n.hidden?n.textContent:'';});
  ok(/^Password set\. You’re signed in as tester@example\.com\.$/.test(note)&&!(await modals(p)),L+': a note says "'+note+'", no OK box');
  await p.screenshot({path:SHOTS+'/setpw_done_'+L+'.png'});
  ok(p.errs.length===0,L+': no page errors '+JSON.stringify(p.errs));await p.context().close();
 }
 // 2. invite link, a crew member: "What your company sees" on the screen too; Save counts as seen (no Got It later)
 {const p=await open(b,'?token_hash=pkce_abcDEF0123456789&type=invite',CREW);
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4500);
  ok(await shown(p,'setPwNoticeWrap')&&/Your company can see the work you record/.test(await p.evaluate(()=>document.getElementById('setPwNotice').textContent)),'crew: the notice is on the password screen');
  await p.screenshot({path:SHOTS+'/setpw_crew.png',fullPage:true});
  await p.check('#setPwTerms');await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(4000);
  const st=await p.evaluate(()=>({seen:localStorage.getItem('pbCrewNotice:00000000-0000-4000-8000-000000000001')}));
  ok(st.seen==='3'&&await rpcs(p,'pb_notice_ack')>=1,'crew: Save marks the notice seen and records it (pb_notice_ack)');
  ok(!/What Your Company Sees/.test(await modals(p)),'crew: no "What Your Company Sees" box on Home afterwards');
  ok(p.errs.length===0,'crew: no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // 3. reset link, Terms already agreed (server says so): no tick, plain Save
 {const p=await open(b,'?token_hash=pkce_abcDEF0123456789&type=recovery',"window.__rpcOverride.pb_terms_status=()=>({terms:'1.0',privacy:'1.0'});");
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);
  ok(await p.evaluate(()=>document.getElementById('setPwTitle').textContent)==='Set New Password'&&!(await shown(p,'setPwTermsWrap')),'reset, Terms agreed: "Set New Password", no tick');
  await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(3000);
  const note=await p.evaluate(()=>{const n=document.getElementById('pbSayDone');return n&&!n.hidden?n.textContent:'';});
  ok(await shown(p,'screen-home')&&/^Password changed\. You’re signed in/.test(note)&&await rpcs(p,'pb_terms_accept')===0,'reset: Home, "Password changed..." note, no new Terms record');
  ok(p.errs.length===0,'reset: no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // 4. a Terms sheet already up when the password screen opens is folded into the screen
 {const p=await open(b,'?token_hash=pkce_abcDEF0123456789&type=invite');
  ok(await p.evaluate(()=>!!document.getElementById('pbTermsSheet')),'(rig: the Terms sheet is up under the Continue screen)');
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);
  ok(await p.evaluate(()=>!document.getElementById('pbTermsSheet'))&&await shown(p,'setPwTermsWrap'),'the sheet is gone; the tick is on the password screen');
  // Cancel leaves the Terms unrecorded (the link ends signed out, as before)
  ok(await rpcs(p,'pb_terms_accept')===0,'nothing recorded before Save');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 await b.close();console.log('t_sl1 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
