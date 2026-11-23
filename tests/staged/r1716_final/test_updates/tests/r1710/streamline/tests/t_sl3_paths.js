// streamline 02-07: Join Crew goes straight to Home (no "You're In" + Start); the Home Screen app's Log In has
// "Paste Join Code" (one tap); Getting Started texts a join link right from Home; a foreman's "Add to your crew" has
// "Text a Join Link"; Forgot password? puts the cursor in place; shorter words on Crew members and the link sheet.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_sl3_paths.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const boot=require('../../../boot_ob');const mkSrv=require('../../../obsrv');
const BASE=process.env.PB_URL||'http://127.0.0.1:8961/cur.html';
const SHOTS=process.env.PB_OUT||path.join(__dirname,'../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CONTRACTOR=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
const EMPTY_DASH=`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_company_dashboard:()=>({jobs:[],today:[],holidays:[],checkpoints:[],server_at:new Date().toISOString(),can_set_company:true})});`;
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const note=(p)=>p.evaluate(()=>{const n=document.getElementById('pbSayDone');return n&&!n.hidden?n.textContent:'';});
const vis=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&e.getClientRects().length>0;},id);
const fits=(p,sel)=>p.evaluate((sel)=>{const e=document.querySelector(sel);const r=e?e.getBoundingClientRect():{left:0,right:0};return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth+0.5;},sel);
(async()=>{
 const b=await chromium.launch();const srv=mkSrv({paid:5,interval:'year'});
 // ===== 1. the Home Screen app: Paste Join Code on Log In, then Join Crew straight to Home =====
 {const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Mike',p_pair_foreman:srv.FOREMAN});
  const {p}=await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:'PBJOIN:'+mk.token,wait:3500});
  ok(await vis(p,'screen-login')&&await vis(p,'loginPasteBtn')&&await vis(p,'loginJoinBtn'),'Home Screen app, signed out: Log In shows "Paste Join Code" (and still "Join a Crew or Use a Code")');
  await p.screenshot({path:SHOTS+'/login_paste.png'});
  await p.click('#loginPasteBtn');await p.waitForTimeout(1500);
  let t=await sheet(p);
  ok(/Join DIG Civil Construction/.test(t)&&/You’ll be on Ray’s crew/.test(t),'one tap: the join screen, from the copied join code');
  await p.check('#pbObTerms');await p.click('#pbObJoinBtn');await p.waitForTimeout(3500);
  const n=await note(p);
  ok(!(await p.$('#pbObSheet'))&&await vis(p,'screen-home'),'Join Crew: straight to Home, no "You’re In" sheet');
  ok(/^You joined DIG Civil Construction as Pipelayer\. You’re on Ray’s crew\.$/.test(n),'a note says: '+n);
  ok(await p.evaluate(()=>!document.getElementById('pbTermsSheet')),'no Terms sheet after joining');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 {const {p}=await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:'',wait:3500});
  await p.click('#loginPasteBtn');await p.waitForTimeout(800);
  ok(/Nothing to paste\. Type the 6-letter code instead\./.test(await sheet(p))&&await vis(p,'pbObCodeIn'),'nothing copied: the code screen opens with "Nothing to paste. Type the 6-letter code instead."');
  await p.context().close();}
 {const {p}=await boot(b,BASE,srv,{ua:IOS,signedOut:true,wait:3500});await p.evaluate(()=>pbOpenLogin());await p.waitForTimeout(300);
  ok(!(await vis(p,'loginPasteBtn'))&&await vis(p,'loginJoinBtn'),'Safari (not the Home Screen app): no Paste Join Code button on Log In');await p.context().close();}
 {const {p}=await boot(b,BASE,srv,{signedOut:true,wait:3500});await p.evaluate(()=>pbOpenLogin());await p.waitForTimeout(300);
  ok(!(await vis(p,'loginPasteBtn')),'computer: no Paste Join Code button');
  // Forgot password?: cursor in the email box, or on Send when Log In had the email
  await p.click('#forgotPwLink');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='forgotEmail'),'Forgot password? with no email: the cursor is in the email box');
  await p.click('#forgotPwLink');await p.fill('#loginEmail','pat@example.com');await p.click('#forgotPwLink');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.getElementById('forgotEmail').value==='pat@example.com'&&document.activeElement.id==='forgotPwBtn'),'Forgot password? with the email typed: filled in, Send Reset Link ready');
  ok(await p.evaluate(()=>{const r=document.getElementById('forgotPwBtn').getBoundingClientRect();return r.bottom<=innerHeight&&r.top>=0;}),'the Send button is on screen');
  await p.context().close();}
 // ===== 2. a new company's Home: Getting Started texts a join link right there =====
 {const s2=mkSrv({empty:true});
  const {p}=await boot(b,BASE,s2,{init:CONTRACTOR+EMPTY_DASH,wait:4500});
  await p.evaluate(()=>{window.__pbObStartAgain();pbObStartRender();});await p.waitForTimeout(1200);
  const t=await p.evaluate(()=>document.getElementById('homeObStart').innerText.replace(/\s+/g,' '));
  ok(!/Three steps/.test(t)&&/Text each person a join link\. No email needed\./.test(t)&&/They tap the link you text them\. Checks off when someone signs in\./.test(t),'Getting Started: short words: '+t.slice(0,220));
  ok(await vis(p,'homeObCrewBtn')&&await p.evaluate(()=>document.getElementById('homeObCrewBtn').textContent==='Text a Join Link')&&await vis(p,'homeObEmailBtn'),'"Text a Join Link" and "Add by Email"');
  ok(await fits(p,'#homeObStart'),'fits 390 px');await p.evaluate(()=>document.getElementById('homeObStart').scrollIntoView());await p.screenshot({path:SHOTS+'/start.png'});
  await p.click('#homeObCrewBtn');await p.waitForTimeout(1500);
  ok(await vis(p,'screen-home')&&/Text a Join Link/.test(await sheet(p))&&await vis(p,'pbObMakeBtn'),'one tap: the link sheet opens over Home');
  ok(/One link, one person\. They tap it and they’re in DIG Civil Construction\. Works once, for 72 hours\./.test(await sheet(p)),'the sheet says it in one line');
  await p.fill('#pbObInvName','Ray');await p.click('[data-role=foreman]');await p.click('#pbObMakeBtn');await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>/sms:/.test((document.getElementById('pbObTextIt')||{}).getAttribute&&document.getElementById('pbObTextIt').getAttribute('href')||'')),'the link is made, ready to text');
  await p.click('#pbObInvClose');await p.waitForTimeout(300);
  await p.click('#homeObEmailBtn');await p.waitForTimeout(1500);
  ok(await vis(p,'screen-crewMembers')&&await p.evaluate(()=>document.getElementById('crAddHead').textContent==='Or invite by email'),'Add by Email: Crew members, "Or invite by email"');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // the foreman picker loads behind the sheet opened from Home (Ray is a foreman in this company)
 {const {p}=await boot(b,BASE,srv,{init:CONTRACTOR+EMPTY_DASH,wait:4500});
  await p.evaluate(()=>pbObStartText());await p.waitForTimeout(2500);
  ok(await p.evaluate(()=>{const s=document.getElementById('pbObPair');return !!s&&[...s.options].some(o=>/Ray/.test(o.textContent));}),'from Home, a pipelayer link can still go on a foreman\'s crew (Ray offered)');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 // ===== 3. a foreman: "On my crew" -> Add to your crew -> Text a Join Link =====
 {const {p}=await boot(b,BASE,srv,{user:{id:srv.FOREMAN,email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}},init:CONTRACTOR,wait:4500});
  await p.evaluate(()=>pbFmCrewOpen());await p.waitForTimeout(1500);if(!(await vis(p,'pmCrewPick'))){await p.evaluate(()=>pbCrewPickOpen('addcrew'));await p.waitForTimeout(1500);} /* the rig has no crew count, so the tile doesn't open the picker by itself */
  ok(await vis(p,'pmCrewPick')&&await vis(p,'pmTextJoinBtn')&&/Not in the list\? Text them a join link\./.test(await p.evaluate(()=>document.getElementById('pmCrewPick').innerText)),'foreman: "Add to your crew" offers "Text a Join Link"');
  await p.evaluate(()=>document.getElementById('pmCrewPick').scrollIntoView());await p.screenshot({path:SHOTS+'/foreman_pick.png'});
  await p.click('#pmTextJoinBtn');await p.waitForTimeout(1200);
  const t=await sheet(p);
  ok(/Add a Pipelayer by Text/.test(t)&&/They go on your crew/.test(t)&&await vis(p,'pbObMakeBtn'),'one tap: the foreman\'s link sheet (pipelayers, on his crew)');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await p.context().close();}
 {const nu={id:'00000000-0000-4000-8000-00000000ad01',email:'pl@example.com',user_metadata:{full_name:'Pl'},app_metadata:{}};
  srv.st.members.set(nu.id,{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pipelayer'});
  const {p}=await boot(b,BASE,srv,{user:nu,init:CONTRACTOR+`try{localStorage.setItem('pbCrewNotice:${nu.id}','3');localStorage.setItem('pbTermsOk:${nu.id}','1.0|1.0');}catch(e){}`,wait:4500});
  ok(await p.evaluate(()=>!pbObCanFmLink()),'a pipelayer can\'t make links (no button for him)');await p.context().close();}
 // ===== 4. Crew members words =====
 {const {p}=await boot(b,BASE,srv,{init:CONTRACTOR,wait:3500});
  await p.evaluate(()=>pbOpenCrewMembers());await p.waitForTimeout(1500);
  ok(/No email needed\. They tap the link and they’re in\.$/.test(await p.evaluate(()=>document.querySelector('#crJoinLinkWrap .pbc-dim').textContent)),'Crew members: one line under Text a Join Link');
  await p.screenshot({path:SHOTS+'/crew.png'});await p.context().close();}
 await b.close();console.log('t_sl3 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
