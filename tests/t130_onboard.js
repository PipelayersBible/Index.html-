// (streamline: Join Crew goes to Home with a note, #pbSayDone, instead of the You're In sheet and its Start button)
// t130 onboard2 (on r17.04): join by text link, scanner-proof; Terms on the join screen; auto-pair; office switch;
// lost phone; getting-started card; one-time iPhone Home Screen card. 390 px, light and dark, offline.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:8931/cur.html node t130_onboard.js
const {chromium}=require('playwright');const boot=require('./boot_ob');const fs=require('fs');const http=require('http');
const BASE=(process.env.PB_URL||'http://127.0.0.1:8931/cur.html');
const SHOTS=process.env.PB_OUT||(__dirname+'/../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const said=(p)=>p.evaluate(()=>{const n=document.getElementById('pbSayDone');return n&&!n.hidden?n.textContent:'';}); // streamline 02: the join is said in a note on Home
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const toLocal=(url)=>BASE+url.slice(url.indexOf('#'));
const fits=(p,sel)=>p.evaluate((sel)=>{const e=sel?document.querySelector(sel):null;const r=e?e.getBoundingClientRect():{left:0,right:0};return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth+0.5;},sel);
const urlOf=async(p)=>(/https:\/\/app\.pipelayersbible\.com\/#join=[A-Za-z0-9_-]{32}/.exec(decodeURIComponent(await p.evaluate(()=>document.getElementById('pbObTextIt').getAttribute('href'))))||[])[0];
const tokOf=(u)=>u.split('#join=')[1];
const linkOf=(srv,u)=>{const h=require('crypto').createHash('sha256').update(tokOf(u)).digest('hex');return srv.st.links.find(l=>l.hash===h);};
const modalClick=(p,label)=>p.evaluate((label)=>{const d=document.getElementById('pbModalOverlay');const bt=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()===label);if(bt)bt.click();return !!bt;},label);
const EMPTY_DASH=`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_company_dashboard:()=>({jobs:[],today:[],holidays:[],checkpoints:[],server_at:new Date().toISOString(),can_set_company:true})});`;
const CONTRACTOR=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
(async()=>{
 const b=await chromium.launch();const pages=[];
 // ================= 1. #2 Getting started on a new company's Home =================
 {const srvA=require('./obsrv')({empty:true});
  const O=(await boot(b,BASE,srvA,{init:CONTRACTOR+EMPTY_DASH,wait:4500})).p;pages.push(O);
  await O.evaluate(()=>{window.__pbObStartAgain();pbObStartRender();});await O.waitForTimeout(1200);
  let st=await O.evaluate(()=>{const e=document.getElementById('homeObStart');return e&&!e.hidden?[...e.querySelectorAll('li')].map(l=>l.id+':'+l.dataset.done).join(','):'hidden';});
  ok(st==='homeObStep1:0,homeObStep2:0,homeObStep3:0','1: a new company\'s Home shows Getting Started with 3 steps to do ('+st+')');
  ok(await O.evaluate(()=>!!document.getElementById('homeObCrewBtn')&&!!document.getElementById('homeObJobBtn')),'1: Add Crew and New Job buttons are there');
  ok(await fits(O,'#homeObStart'),'1: the card fits 390 px (light)');
  await O.evaluate(()=>document.getElementById('homeObStart').scrollIntoView());await O.screenshot({path:SHOTS+'/start_light.png'});
  // someone joins with a link and signs in: crew and install check off from the server's numbers
  const mk=srvA.call('pb_onboard_link_make',srvA.OFFICE,{p_role:'foreman',p_name:'Ray'});srvA.call('pb_onboard_join','00000000-0000-4000-8000-0000000000f2',{p_token:mk.token,p_name:'Ray'});
  await O.evaluate(()=>{window.__pbObStartAgain();pbObStartRender();});await O.waitForTimeout(1200);
  st=await O.evaluate(()=>[...document.querySelectorAll('#homeObStart li')].map(l=>l.id+':'+l.dataset.done).join(','));
  ok(st==='homeObStep1:1,homeObStep2:0,homeObStep3:1','1: after a join: crew and install checked off, job still to do ('+st+')');
  // offline: the card still shows from the copy on the phone
  await O.context().setOffline(true);await O.evaluate(()=>{const e=document.getElementById('homeObStart');e.innerHTML='';pbObStartRender();});
  ok(await O.evaluate(()=>document.querySelectorAll('#homeObStart li.done').length===2),'1: offline, the card shows from the copy on this phone');
  await O.context().setOffline(false);
  await O.click('#homeObHide');await O.waitForTimeout(300);
  ok(await O.evaluate(()=>document.getElementById('homeObStart').hidden),'1: Hide This hides it');
  await O.reload({waitUntil:'load'});await O.waitForTimeout(4000);await O.evaluate(()=>pbObStartRender());
  ok(await O.evaluate(()=>document.getElementById('homeObStart').hidden),'1: still hidden after the app reopens');
  // dark
  const OD=(await boot(b,BASE,require('./obsrv')({empty:true}),{init:CONTRACTOR+EMPTY_DASH,dark:true,wait:4500})).p;pages.push(OD);
  await OD.evaluate(()=>{window.__pbObStartAgain();pbObStartRender();});await OD.waitForTimeout(1200);
  ok(await OD.evaluate(()=>{const e=document.getElementById('homeObStart');return !e.hidden&&getComputedStyle(e.querySelector('.pbob-start')).color!=='rgb(21, 24, 29)';})&&await fits(OD,'#homeObStart'),'1: dark mode: the card shows with light text and fits 390 px');
  await OD.evaluate(()=>document.getElementById('homeObStart').scrollIntoView());await OD.screenshot({path:SHOTS+'/start_dark.png'});
  // a foreman never sees it
  const FX=(await boot(b,BASE,srvA,{user:{id:'00000000-0000-4000-8000-0000000000f2',email:'ray2@example.com',user_metadata:{},app_metadata:{}},init:CONTRACTOR})).p;pages.push(FX);
  ok(await FX.evaluate(()=>{pbObStartRender();const e=document.getElementById('homeObStart');return !e||e.hidden;}),'1: a foreman\'s Home has no Getting Started card');
 }
 const srv=require('./obsrv')({paid:5,interval:'year'});
 // ================= 2. the office makes a link (paired with Ray), sees seats =================
 const O=(await boot(b,BASE,srv,{init:CONTRACTOR})).p;pages.push(O);
 await O.evaluate(()=>pbOpenCrewMembers());await O.waitForTimeout(1500);
 ok(await O.evaluate(()=>{const x=document.getElementById('crJoinLinkBtn');return !!x&&x.offsetParent!==null;}),'2: Crew members shows Text a Join Link');
 await O.click('#crJoinLinkBtn');await O.waitForTimeout(900);
 let t=await sheet(O);
 ok(/Pipelayer/.test(t)&&/Foreman/.test(t)&&/DIG Civil Construction/.test(t),'2: the office can pick Pipelayer or Foreman; the company is named');
 ok(/Paid seats: 5 · people now: 1/.test(t),'2: the office sees paid seats and people now');
 ok(await O.evaluate(()=>{const s=document.getElementById('pbObPair');return !!s&&[...s.options].some(o=>/Ray/.test(o.textContent));}),'2: Pipelayer links can go on a foreman\'s crew (Ray is offered)');
 ok(await O.evaluate(()=>{const c=document.getElementById('pbObFmLinks');return !!c&&c.checked;}),'2: the office\'s switch "Foremen can add pipelayers by link" is on');
 await O.fill('#pbObInvName','Mike');await O.selectOption('#pbObPair',srv.FOREMAN);await O.click('#pbObMakeBtn');await O.waitForTimeout(900);
 const sms=await O.evaluate(()=>document.getElementById('pbObTextIt').getAttribute('href'));const body=decodeURIComponent(sms.replace(/^sms:\?&body=/,''));
 const url=(/https:\/\/app\.pipelayersbible\.com\/#join=[A-Za-z0-9_-]{32}/.exec(body)||[])[0];
 ok(/^sms:\?&body=/.test(sms)&&!!url&&/as Pipelayer/.test(body)&&/works once, for 72 hours/.test(body),'2: Text It opens Messages with the link, the role and "works once, for 72 hours"');
 t=await sheet(O);const code=(/Code to read out: ([A-Z0-9]{3} [A-Z0-9]{3})/.exec(t)||[])[1];
 ok(!!code&&/Goes on Ray’s crew/.test(t)&&/Mike · Pipelayer Not used yet/.test(t),'2: code shown, "Goes on Ray\'s crew", list says "Mike · Pipelayer, not used yet"');
 ok(await fits(O,'#pbObSheet .pbob-card'),'2: the link sheet fits 390 px');await O.screenshot({path:SHOTS+'/invite_light.png'});
 // ================= 3. a scanner or a preview opens the link: nothing is used =================
 const L1=linkOf(srv,url);
 const raw=await new Promise((res)=>{http.get(toLocal(url).replace('#','?preview=1#'),(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({code:r.statusCode,len:d.length}));}).on('error',e=>res({code:0}));});
 ok(raw.code===200&&srv.st.peeks===0&&!L1.used_at,'3: a link preview / scanner fetch (no script) gets the page and touches nothing on the server');
 const SC=(await boot(b,toLocal(url),srv,{ua:AND,signedOut:true,wait:5000})).p;
 const scSheet=await sheet(SC);const scFn=await SC.evaluate(()=>window.__fnLog||[]);
 await SC.context().close();
 ok(srv.st.peeks>0&&!L1.used_at&&!L1.claimed&&scFn.length===0&&/Join Crew/.test(scSheet),'3: a scanner that runs the page (no tap) only looks the link up: not used, no join call');
 await O.evaluate(()=>pbObInvLoad());await O.waitForTimeout(600);
 ok(/Mike · Pipelayer Not used yet/.test(await sheet(O)),'3: the office still sees the link as not used');
 // dark mode of the office sheet
 const ODK=(await boot(b,BASE,srv,{init:CONTRACTOR,dark:true})).p;pages.push(ODK);
 await ODK.evaluate(()=>pbObOpenInvite());await ODK.waitForTimeout(900);
 ok(await fits(ODK,'#pbObSheet .pbob-card')&&await ODK.evaluate(()=>getComputedStyle(document.querySelector('#pbObSheet .pbob-card')).backgroundColor!=='rgb(255, 255, 255)'),'3: the link sheet in dark mode: dark card, fits 390 px');
 await ODK.screenshot({path:SHOTS+'/invite_dark.png'});await ODK.evaluate(()=>pbObClose());
 // ================= 4. iPhone Safari -> Home Screen app -> join =================
 const S=(await boot(b,toLocal(url),srv,{ua:IOS,signedOut:true,wait:4500})).p;pages.push(S);
 ok(await S.evaluate(()=>!/join=/.test(location.href)),'4: the token is gone from the address bar');
 t=await sheet(S);
 ok(/Step 1 of 2/i.test(t)&&/Tommy invited you to join DIG Civil Construction as Pipelayer/.test(t)&&t.includes(code),'4: Step 1 of 2 asks for Add to Home Screen first, with the code to type');
 await S.click('#pbObCopyBtn');await S.waitForTimeout(300);const copied=await S.evaluate(()=>window.__pbObCopied);
 ok(copied==='PBJOIN:'+tokOf(url),'4: Copy Join Code puts the join token on the clipboard');
 const H=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:copied,wait:3500})).p;pages.push(H);
 await H.evaluate(()=>pbOpenLogin());await H.waitForTimeout(500);await H.click('#loginJoinBtn');await H.waitForTimeout(300);await H.click('#pbObPasteBtn');await H.waitForTimeout(1200);
 t=await sheet(H);
 ok(/Join DIG Civil Construction/.test(t)&&/You’ll be on Ray’s crew/.test(t)&&/No email or password needed/.test(t)&&/linked to the same foreman/.test(t),'4: join sheet: company, Ray\'s crew, no email or password, the crew notice (version 3 words)');
 ok(await H.evaluate(()=>document.getElementById('pbObName').value)==='Mike'&&await H.evaluate(()=>document.getElementById('pbObJoinBtn').disabled),'4: name filled in; Join Crew waits for the Terms box');
 ok(await fits(H,'#pbObSheet .pbob-card'),'4: the join sheet fits 390 px');await H.screenshot({path:SHOTS+'/join_light.png'});
 ok(!L1.used_at,'4: still not used before the tap');
 await H.fill('#pbObName','Mike Rivera');await H.check('#pbObTerms');await H.click('#pbObJoinBtn');await H.waitForTimeout(3500);
 t=await said(H);const me=await H.evaluate(()=>window.__pbObMe());
 ok(/You joined DIG Civil Construction as Pipelayer\. You’re on Ray’s crew\./.test(t)&&!(await H.$('#pbObSheet')),'4: Home, with a note "You joined ... You\'re on Ray\'s crew" (no You\'re In sheet)');
 ok(!!me&&me.link&&/@crew\.pipelayersbible\.com$/.test(me.email),'4: signed in with a new no-email account');
 const fn=await H.evaluate(()=>window.__fnLog);
 ok(fn.length===1&&fn[0][1].action==='join'&&fn[0][1].token===tokOf(url)&&fn[0][1].terms.t==='1.0'&&fn[0][1].notice==='3','4: one crew-join call with the token, Terms 1.0 and notice 3');
 ok(srv.st.members.get(me.id)&&srv.st.members.get(me.id).role==='pipelayer'&&srv.st.crew.some(x=>x[0]===srv.FOREMAN&&x[1]===me.id),'4: server: member as Pipelayer, on Ray\'s crew (#15)');
 ok(srv.st.terms.some(x=>x[0]===me.id&&x[1]==='1.0'&&x[3]==='join')&&srv.st.notices.some(x=>x[0]===me.id&&x[2]==='3'&&x[3]==='join'),'4: Terms and crew notice recorded with the join (#17)');
 await H.waitForTimeout(3000);
 ok(await H.evaluate(()=>!document.getElementById('pbTermsSheet')),'4: the Terms sheet does not pop up');
 ok(await H.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return !o||getComputedStyle(o).display==='none'||!/What Your Company Sees/.test(o.innerText);}),'4: the crew notice does not pop up');
 ok(!srv.st.terms.some(x=>x[0]===me.id&&x[3]==='sheet'),'4: no second Terms record from the phone');
 ok(await H.evaluate(()=>!/crew\.pipelayersbible\.com/.test((document.getElementById('loggedInAs')||{}).textContent||'')),'4: the hidden address is never shown');
 // ================= 5. used up =================
 const X=(await boot(b,toLocal(url),srv,{ua:AND,signedOut:true,wait:4000})).p;pages.push(X);
 ok(/already used/.test(await sheet(X)),'5: the same link on another phone: "already used"');
 // ================= 6. offline: opening and tapping use nothing =================
 await O.evaluate(()=>pbObClose());await O.evaluate(()=>pbObOpenInvite());await O.waitForTimeout(700);await O.click('#pbObMakeBtn');await O.waitForTimeout(800);
 const url6=await urlOf(O);const L6=linkOf(srv,url6);
 const F6=(await boot(b,toLocal(url6),srv,{ua:AND,signedOut:true,offline:true,wait:4500})).p;pages.push(F6);
 await F6.waitForFunction(()=>/No Signal/.test((document.getElementById('pbObSheet')||{}).innerText||''),null,{timeout:25000}).catch(()=>{});
 t=await sheet(F6);
 ok(/No Signal/.test(t)&&/Nothing was used up/.test(t)&&!L6.used_at,'6: opened with no signal: "No Signal ... Nothing was used up", link unused');
 ok(await fits(F6,'#pbObSheet .pbob-card'),'6: the No Signal sheet fits 390 px');
 await F6.context().setOffline(false);await F6.click('#pbObRetry');await F6.waitForTimeout(1200);
 ok(/Join DIG Civil Construction/.test(await sheet(F6)),'6: Try Again with signal opens the join sheet');
 await F6.fill('#pbObName','Ana');await F6.check('#pbObTerms');await F6.context().setOffline(true);await F6.click('#pbObJoinBtn');await F6.waitForTimeout(800);
 ok(/Nothing was used up: the link still works/.test(await sheet(F6))&&!L6.used_at,'6: Join Crew with no signal: "Nothing was used up", link unused');
 await F6.context().setOffline(false);await F6.click('#pbObJoinBtn');await F6.waitForTimeout(3500);
 ok(/You joined DIG Civil Construction/.test(await said(F6))&&!!L6.used_at,'6: with signal, Join Crew works');
 // ================= 7. a foreman: Pipelayer only, on his crew =================
 const FM=(await boot(b,BASE,srv,{user:{id:srv.FOREMAN,email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}},init:CONTRACTOR})).p;pages.push(FM);
 await FM.evaluate(()=>pbOpenSettings());await FM.waitForTimeout(800);
 ok(await FM.evaluate(()=>{const w=document.getElementById('settingsJoinLinkWrap');return !!w&&!w.hidden;}),'7: a foreman has Settings > Add a Pipelayer by Text');
 await FM.click('#settingsJoinLinkBtn');await FM.waitForTimeout(800);
 t=await sheet(FM);
 ok(await FM.evaluate(()=>!document.querySelector('#pbObSheet [data-role=foreman]'))&&/They go on your crew/.test(t)&&!/Paid seats/.test(t),'7: Pipelayer only, "They go on your crew", no seat or billing lines');
 ok(await FM.evaluate(()=>!document.getElementById('pbObFmLinks')&&!document.getElementById('pbObPair')),'7: no office switch and no foreman picker for a foreman');
 await FM.click('#pbObMakeBtn');await FM.waitForTimeout(800);const url7=await urlOf(FM);
 const A7=(await boot(b,toLocal(url7),srv,{ua:AND,signedOut:true,wait:4500})).p;pages.push(A7);
 t=await sheet(A7);
 ok(/Ray invited you to join as Pipelayer\. You’ll be on Ray’s crew\./.test(t)&&!/Step 1 of 2/.test(t),'7: Android goes straight to the join sheet, on Ray\'s crew');
 await A7.fill('#pbObName','Dave');await A7.check('#pbObTerms');await A7.click('#pbObJoinBtn');await A7.waitForTimeout(3500);
 const dave=(await A7.evaluate(()=>window.__pbObMe())).id;
 ok(srv.st.crew.some(x=>x[0]===srv.FOREMAN&&x[1]===dave),'7: Dave is on Ray\'s crew');
 // ================= 8. the office turns foreman links off =================
 await FM.evaluate(()=>pbObClose());await FM.evaluate(()=>pbObOpenInvite());await FM.waitForTimeout(700);await FM.click('#pbObMakeBtn');await FM.waitForTimeout(800);const L8=linkOf(srv,await urlOf(FM));
 await O.evaluate(()=>pbObClose());await O.evaluate(()=>pbObOpenInvite());await O.waitForTimeout(900);
 await O.click('#pbObFmLinks');await O.waitForTimeout(900);
 ok(srv.st.fmLinks===false&&!!L8.revoked_at,'8: switch off: foremen can\'t make links, and Ray\'s unused link is cancelled');
 await FM.evaluate(()=>pbObClose());await FM.evaluate(()=>pbObOpenInvite());await FM.waitForTimeout(900);
 t=await sheet(FM);
 ok(/turned off join links from foremen/.test(t)&&await FM.evaluate(()=>!document.getElementById('pbObMakeBtn')),'8: the foreman\'s sheet says links are turned off, no Make button');
 await O.click('#pbObFmLinks');await O.waitForTimeout(700);ok(srv.st.fmLinks===true,'8: switch back on');
 // ================= 9. #11 lost phone =================
 await O.evaluate(()=>pbObClose());await O.evaluate(()=>pbOpenCrewMembers());await O.waitForTimeout(1500);
 const rows=await O.evaluate(()=>[...document.querySelectorAll('#crList .pbc-row')].map(r=>({uid:r.dataset.uid,lost:!!r.querySelector('[data-crew-act=lostphone]'),txt:r.innerText.replace(/\s+/g,' ')})));
 const mr=rows.find(r=>r.uid===me.id),rr=rows.find(r=>r.uid===srv.FOREMAN);
 ok(!!mr&&mr.lost&&/Joined by text link \(no email\)/.test(mr.txt)&&!/crew\.pipelayersbible/.test(mr.txt),'9: Mike (joined by link) has "Lost Phone: New Link"; his row says "Joined by text link (no email)"');
 ok(!!rr&&!rr.lost,'9: Ray (has an email) has no Lost Phone button');
 await O.evaluate((u)=>document.querySelector('.pbc-row[data-uid="'+u+'"] [data-crew-act=lostphone]').click(),me.id);await O.waitForTimeout(500);
 ok(/taken out of the company and signed out/.test(await O.evaluate(()=>document.getElementById('pbModalOverlay').innerText)),'9: the confirm says the old account is taken out and signed out');
 await modalClick(O,'Remove and Make Link');await O.waitForTimeout(1500);
 t=await sheet(O);
 ok(/New-phone link for Mike/.test(t)&&/old account was taken out of the company and signed out/.test(t)&&/Goes on Ray’s crew/.test(t)&&!!(await urlOf(O)),'9: a new-phone link for Mike, back on Ray\'s crew, ready to text');
 ok(!srv.st.members.has(me.id)&&srv.st.removed.includes(me.id),'9: server: the old account is out of the company');
 ok(await fits(O,'#pbObSheet .pbob-card'),'9: fits 390 px');await O.screenshot({path:SHOTS+'/lostphone_light.png'});
 // ================= 10. #3 iPhone Home Screen card =================
 const nu={id:'00000000-0000-4000-8000-00000000aa01',email:'m-abc@crew.pipelayersbible.com',user_metadata:{full_name:'Sam'},app_metadata:{pb_link:true}};
 srv.st.members.set(nu.id,{company_id:srv.C,role:'pipelayer'});srv.st.users.set(nu.id,nu);srv.st.terms.push([nu.id,'1.0','1.0','join']);
 const I=(await boot(b,BASE,srv,{ua:IOS,user:nu,init:CONTRACTOR+`try{localStorage.setItem('pbCrewNotice:${nu.id}','3');localStorage.setItem('pbTermsOk:${nu.id}','1.0|1.0');}catch(e){}`,wait:4000})).p;pages.push(I);
 await I.evaluate(()=>pbRenderHome());await I.waitForTimeout(500);
 t=await I.evaluate(()=>{const e=document.getElementById('homeAttention_a2hs');return e?e.innerText.replace(/\s+/g,' '):'';});
 ok(/Put the App on Your Home Screen/.test(t)&&/Add to Home Screen/.test(t)&&/Get a Code/.test(t),'10: iPhone Safari: the Home Screen card with the steps and Get a Code (no-email account)');
 ok(await fits(I,'#homeAttention_a2hs'),'10: the card fits 390 px');await I.evaluate(()=>document.getElementById('homeAttention_a2hs').scrollIntoView());await I.screenshot({path:SHOTS+'/a2hs_light.png'});
 await I.click('#homeA2hsOk');await I.waitForTimeout(400);await I.evaluate(()=>pbRenderHome());await I.waitForTimeout(400);
 ok(await I.evaluate(()=>!document.getElementById('homeAttention_a2hs')&&!document.getElementById('homeAttention_pushCard')),'10: Got It: gone for good, and the notifications card\'s iPhone line rests too');
 const ID=(await boot(b,BASE,srv,{ua:IOS,user:nu,dark:true,init:CONTRACTOR+`try{localStorage.setItem('pbCrewNotice:${nu.id}','3');localStorage.setItem('pbTermsOk:${nu.id}','1.0|1.0');}catch(e){}`,wait:4000})).p;pages.push(ID);
 await ID.evaluate(()=>pbRenderHome());await ID.waitForTimeout(400);
 ok(await ID.evaluate(()=>!!document.getElementById('homeAttention_a2hs'))&&await fits(ID,'#homeAttention_a2hs'),'10: dark mode: the card shows and fits');
 await ID.evaluate(()=>document.getElementById('homeAttention_a2hs').scrollIntoView());await ID.screenshot({path:SHOTS+'/a2hs_dark.png'});
 const IS=(await boot(b,BASE,srv,{ua:IOS,user:nu,standalone:true,init:CONTRACTOR,wait:3500})).p;pages.push(IS);
 await IS.evaluate(()=>pbRenderHome());ok(await IS.evaluate(()=>!document.getElementById('homeAttention_a2hs')),'10: not shown in the Home Screen app');
 const IA=(await boot(b,BASE,srv,{ua:AND,user:nu,init:CONTRACTOR,wait:3500})).p;pages.push(IA);
 await IA.evaluate(()=>pbRenderHome());ok(await IA.evaluate(()=>!document.getElementById('homeAttention_a2hs')),'10: not shown on Android');
 // ================= 11. handoff, Log Out warning, cancelled link =================
 await I.evaluate(()=>pbOpenSettings());await I.waitForTimeout(800);
 ok(await I.evaluate(()=>{const x=document.getElementById('settingsHandoffBtn');return !!x&&!x.hidden;}),'11: Settings offers "Get a Code for the Home Screen App" to a no-email account');
 await I.click('#settingsHandoffBtn');await I.waitForTimeout(800);
 const hcode=(/([A-Z0-9]{3} [A-Z0-9]{3})/.exec((await sheet(I)).split('Code for the Home Screen App')[1]||'')||[])[1];
 ok(!!hcode&&/works once, for 15 minutes/.test(await sheet(I)),'11: a one-time code (15 minutes)');
 await I.evaluate(()=>pbObClose());
 const H2=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,wait:3500})).p;pages.push(H2);
 await H2.evaluate(()=>pbObOpenCode());await H2.waitForTimeout(300);await H2.fill('#pbObCodeIn',hcode.toLowerCase());await H2.click('#pbObCodeGo');await H2.waitForTimeout(3500);
 ok((await H2.evaluate(()=>(window.__pbObMe()||{}).id))===nu.id&&/^Signed in as /.test(await said(H2)),'11: the typed code signs the Home Screen app in to the same account (a note, no Signed In box)');
 await H2.evaluate(()=>pbObClose());await H2.evaluate(()=>pbLogout());await H2.waitForTimeout(500);
 ok(/No Email or Password/.test(await H2.evaluate(()=>document.getElementById('pbModalOverlay').innerText)),'11: Log Out on a no-email account warns first');
 await O.evaluate(()=>pbObClose());await O.evaluate(()=>pbObOpenInvite());await O.waitForTimeout(700);await O.click('#pbObMakeBtn');await O.waitForTimeout(800);
 const url11=await urlOf(O);const id11=linkOf(srv,url11).id;
 await O.evaluate((id)=>document.querySelector('#pbObSheet .pbob-item[data-link="'+id+'"] [data-act=revoke]').click(),id11);await O.waitForTimeout(500);
 await modalClick(O,'Cancel Link');await O.waitForTimeout(1000);
 const G=(await boot(b,toLocal(url11),srv,{ua:AND,signedOut:true,wait:4000})).p;pages.push(G);
 ok(/cancelled/.test(await sheet(G)),'11: a cancelled link is refused');
 const errs=pages.flatMap(p=>p.errs||[]);ok(!errs.length,'no page errors'+(errs.length?': '+errs.join(' | ').slice(0,400):''));
 await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
