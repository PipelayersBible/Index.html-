// legal_nov19 patches 01 + 02 (wording only).
//  A. Trench Sloping and the Trenching lesson no longer call OSHA's Table B-1 "tabulated data"; the Type A vertical
//     lower portion no longer says "no shoring or shielding required"; the numbers are unchanged.
//  B. Crew Hours for Payroll says the hours are daily totals (not start, stop or meal times) before and after it is made.
//  C. Set Password (invite) and the join-by-link screen show the Terms "In short" line (liability, arbitration, opt-out)
//     under the tick; the tick is still required; fits 390 px.
// Run from tests/: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node staged/legal_nov19/tests/t_legal_wording.js
const path=require('path'),fs=require('fs');const T=path.join(__dirname,'../../..');
const {chromium}=require('playwright');
const boot=require(T+'/rig/boot'),co=require(T+'/rig/co');const bootOb=require(T+'/boot_ob'),mkSrv=require(T+'/obsrv');
const BASE=process.env.PB_URL||'http://127.0.0.1:9100/cur.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SHORT=/In short: check every number against the stakes and plans; AI can be wrong; the app never decides if a trench or space is safe; our liability is limited; disputes go to individual arbitration \(you can opt out within 30 days\)\./;
const FAKESB=fs.readFileSync(T+'/rig/fakesb.js','utf8');
(async()=>{
 // ---- A + B: company rig ----
 {const {b,p}=await boot(BASE,{init:co});
  const head=await p.evaluate(()=>{pbGoto('trenchCalc');return document.querySelector('#screen-trenchCalc .pb-warn strong').textContent.trim();});
  ok(head==='OSHA’s table, not a substitute for a competent person','Trench Sloping caution heading: '+head);
  const all=await p.evaluate(()=>document.body.innerHTML);
  ok(!/<strong>Tabulated data/.test(all),'no caution heading calls Table B-1 "Tabulated data"');
  ok(/data-edu-id="caution-tabulated-data-not-a-substitute-for-a-competent">\s*<strong>OSHA’s table, not a substitute for a competent person<\/strong>/.test(all),'the Trenching lesson heading changed too (its id is kept)');
  const r=await p.evaluate(()=>{pbGoto('trenchCalc');const s=document.getElementById('trenchSoil');s.value='A';s.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('trenchVertOpt').checked=true;document.getElementById('trenchDepth').value='10';document.getElementById('trenchBottomW').value='3';pbCalcTrench();const e=document.getElementById('trenchResult');return {t:e.innerText.replace(/\s+/g,' '),v:[...e.querySelectorAll('.pb-answer-val')].map(x=>x.textContent.trim())};});
  ok(!/no shoring or shielding required/.test(r.t)&&/OSHA’s maximum for an unsupported vertical lower portion in Type A soil \(App\. B, Fig\. B-1\.1\)\. Your competent person decides if it applies here/.test(r.t),'Type A vertical portion: says whose maximum it is and who decides');
  ok(r.v[0]==='3.5 ft'&&r.v[1]==='1:1'&&r.v[2]==='6.50 ft'&&r.v[3]==='16.00 ft','numbers unchanged at 10 ft, 3 ft bottom: '+r.v.join(' | '));
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Trench Sloping fits the phone width');
  // B: the wording is in the page's code for the hours spreadsheet (sheet text and done text)
  const src=await p.evaluate(()=>String(window.pbCxExportOpen)+String(window.pbCxExportRun));
  ok(/These are daily totals, not start, stop or meal times\. Check them against your time records before you run payroll\./.test(src),'Crew Hours sheet: says daily totals, check against time records');
  ok(/daily totals, as signed, not start, stop or meal times\. Check them against your time records before you run payroll\. An amended report counts once/.test(src),'Crew Hours done note: same caution');
  ok(/Each person’s daily total from the signed daily reports/.test(all)||/Each person’s daily total from the signed daily reports/.test(await p.evaluate(()=>document.documentElement.outerHTML)),'Spreadsheets row: "daily total"');
  ok(!(p.errs&&p.errs.length),'no page errors'+(p.errs&&p.errs.length?': '+p.errs.join(' / '):''));
  await b.close();}
 const b=await chromium.launch();
 // ---- C1: Set Password from an invite ----
 {const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKESB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.addInitScript(`window.__rpcOverride={pb_terms_accept:()=>({ok:true}),pb_notice_ack:()=>({ok:true})};`);
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(BASE+'?token_hash=pkce_abcDEF0123456789&type=invite',{waitUntil:'load'});await p.waitForTimeout(2500);
  await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);
  const s=await p.evaluate(()=>{const e=document.getElementById('setPwTermsShort');return e&&e.getClientRects().length?e.textContent:'';});
  ok(SHORT.test(s),'Set Password: the "In short" line shows under the tick');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Set Password fits 390 px');
  await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(1500);
  ok(/Tick the box to agree to the Terms first/.test(await p.evaluate(()=>document.getElementById('setPwError').textContent)),'Set Password: Save without the tick is still refused');
  await p.check('#setPwTerms');await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(3000);
  ok(await p.evaluate(()=>(window.__rpcArgs||[]).filter(x=>x[0]==='pb_terms_accept').length)===1,'Set Password: the Terms are recorded once after the tick');
  ok(!errs.length,'no page errors'+(errs.length?': '+errs.join(' / '):''));await ctx.close();}
 // ---- C2: join by text link ----
 {const srv=mkSrv({paid:5,interval:'year'});
  const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Mike',p_pair_foreman:srv.FOREMAN});
  const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const {p}=await bootOb(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:'PBJOIN:'+mk.token,wait:3500});
  await p.click('#loginPasteBtn');await p.waitForTimeout(1500);
  const s=await p.evaluate(()=>{const e=document.getElementById('pbObTermsShort');return e&&e.getClientRects().length?e.textContent:'';});
  ok(SHORT.test(s),'Join screen: the "In short" line shows under the tick');
  ok(await p.evaluate(()=>document.getElementById('pbObJoinBtn').disabled===true),'Join Crew is still off until the tick');
  ok(await p.evaluate(()=>{const e=document.querySelector('#pbObSheet');const r=e.getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&r.right<=innerWidth+0.5;}),'Join screen fits the phone width');
  await p.check('#pbObTerms');
  ok(await p.evaluate(()=>document.getElementById('pbObJoinBtn').disabled===false),'ticking turns Join Crew on');
  await p.click('#pbObJoinBtn');await p.waitForTimeout(3500);
  ok(!(await p.$('#pbObSheet')),'Join Crew still joins (the sheet closes)');}
 await b.close();
 console.log(fails?('FAILED '+fails):'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
