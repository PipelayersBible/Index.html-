// One device per login (staged Nov 20, on r17.11). Two or three browser contexts share one Node "server" (srv1dev.js).
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:10100/cur.html node t_1dev.js [section numbers]
const {chromium}=require('playwright');const boot=require('./boot_1dev');const fs=require('fs');
const BASE=process.env.PB_URL||'http://127.0.0.1:10100/cur.html';
const SHOTS=process.env.PB_OUT||(__dirname+'/../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const ONLY=process.argv.slice(2);const run=(n)=>!ONLY.length||ONLY.includes(String(n));
let fails=0,passes=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(c)passes++;else fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const WIN='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MSG='Your account was signed in on another phone, so this phone was signed out. Your saved work is kept and will send when you sign in again.';
const scr=(p)=>p.evaluate(()=>{const s=document.querySelector('.pb-screen.active');return s?s.id.replace('screen-',''):'';});
const modal=(p)=>p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return d&&getComputedStyle(d).display!=='none'?d.innerText.replace(/\s+/g,' ').trim():'';});
const modalClick=(p,label)=>p.evaluate((label)=>{const d=document.getElementById('pbModalOverlay');const bt=d&&[...d.querySelectorAll('button')].find(x=>x.textContent.trim()===label);if(bt)bt.click();return !!bt;},label);
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const who=(p)=>p.evaluate(()=>{try{const v=JSON.parse(localStorage.getItem('fake-sb-session')||'null');return v&&window.__fakeSid()?v.user.id:null;}catch(e){return 'n/a';}}); // the account this browser holds a session for
const fits=(p,sel)=>p.evaluate((sel)=>{const e=sel?document.querySelector(sel):null;const r=e?e.getBoundingClientRect():{left:0,right:0};return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth+0.5;},sel);
const login=async(p,email)=>{await p.evaluate(()=>{try{pbObClose();}catch(e){}pbGoto('login');});await p.waitForTimeout(400);await p.fill('#loginEmail',email);await p.fill('#loginPassword','pw123456');await p.click('#loginSubmitBtn');await p.waitForTimeout(5500);};
const reach=async(p)=>{await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForTimeout(4500);}; // "the next time it reaches the server"
const offline=async(p,off)=>{await p.context().setOffline(off);await p.evaluate((off)=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>!off});},off);};
const setFix=(p,lat,lng)=>p.evaluate(([lat,lng])=>{window.pbCam._g.fix={lat,lng,acc:8,at:Date.now()};},[lat,lng]);
const EMPTY_DASH=`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_company_dashboard:()=>({jobs:[],today:[],holidays:[],checkpoints:[],server_at:new Date().toISOString(),can_set_company:true}),pb_owner_overview:()=>({ok:true,companies:[],totals:null})});`;
(async()=>{
 const b=await chromium.launch();const errs=[];const track=(p,n)=>{p.__n=n;errs.push(p);return p;};
 const close=async(...ps)=>{for(const p of ps){if(p.errs.length)console.log('  page errors ['+p.__n+']:',p.errs.slice(0,3));await p.context().close();}};
 const noErr=(...ps)=>ps.every(p=>!p.errs.length);

 // ===== 1. two phones, one login: the second sign-in signs the first out, said once; the flag is recorded =====
 if(run(1)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const P1=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7500})).p,'1:P1');
  ok(await scr(P1)==='home'&&srv.live(F)===1,'1: phone 1 is signed in as Ray (1 session on the server)');
  const d1=await P1.evaluate(()=>localStorage.getItem('pbDeviceId'));
  ok(/^d[0-9a-f]{24}$/.test(d1||'')&&[...srv.D.devices.values()].some(d=>d.device===d1&&d.kind==='phone'),'1: phone 1 checked in with its own device id, kind phone');
  ok(srv.D.calls.filter(c=>c[0]==='pb_device_seen').length===1,'1: one check-in at start-up, not several ('+srv.D.calls.filter(c=>c[0]==='pb_device_seen').length+')');
  ok(srv.D.calls.filter(c=>c[0]==='pb_device_seen').every(c=>c[2].p_lat===null&&c[2].p_lng===null),'1: no location is sent when the photo stamp has none');
  await setFix(P1,40.0012,-83.0049);await P1.evaluate(()=>window.pb1dSeen(true));await P1.waitForTimeout(800);
  const P2=track((await boot(b,BASE,srv,{ua:AND,wait:3500})).p,'1:P2');
  ok(await scr(P2)==='login','1: phone 2 starts signed out');
  await login(P2,'ray@example.com');
  ok(await scr(P2)==='home'&&await who(P2)===F,'1: phone 2 logs in with the same email and password and lands on Home');
  ok(srv.live(F)===1,'1: SERVER: still exactly one live session for the login ('+srv.live(F)+')');
  const old=[...srv.D.sess.values()].find(s=>s.device===d1);
  ok(old&&!old.alive&&old.reason==='other_device','1: SERVER: phone 1\'s session was ended, reason other_device');
  ok(await who(P1)===F&&!(await modal(P1)),'1: phone 1 says nothing until it next reaches the server');
  await reach(P1);
  const m1=await modal(P1);
  ok(m1==='Signed Out '+MSG+' OK','1: phone 1, next time it reaches the server: "'+m1.slice(0,60)+'…"');
  ok(await scr(P1)==='login'&&await who(P1)===null,'1: phone 1 is on Log In, signed out');
  ok(JSON.stringify(await P1.evaluate(()=>window.__signOuts))==='["local"]','1: phone 1 signed out on this phone only (it did not sign phone 2 out)');
  ok(srv.live(F)===1&&await who(P2)===F,'1: phone 2 is still signed in');
  ok(srv.D.refused.length>0&&srv.D.refused.every(c=>c[1]===F),'1: SERVER: phone 1\'s requests after the takeover were refused ('+srv.D.refused.length+': '+[...new Set(srv.D.refused.map(c=>c[0]))].slice(0,3).join(', ')+')');
  ok(await fits(P1,'#pbModalOverlay'),'1: the message fits 390 px');await P1.screenshot({path:SHOTS+'/signed_out_light.png'});
  await modalClick(P1,'OK');await P1.reload({waitUntil:'load'});await P1.waitForTimeout(7000);await reach(P1);
  ok(!(await modal(P1))&&await scr(P1)==='login','1: after OK and a restart the message is not shown again');
  // the flags: phone 2 checks in with a GPS fix 35 miles away
  await setFix(P2,40.5,-83.0);await P2.evaluate(()=>window.pb1dSeen(true));await P2.waitForTimeout(800);
  const kinds=srv.D.flags.map(f=>f.kind+(f.miles?':'+f.miles:'')).sort().join(',');
  ok(kinds==='far_apart:34,minutes_apart'||kinds==='far_apart:35,minutes_apart','1: SERVER: flags recorded: '+kinds);
  ok(srv.live(F)===1&&await who(P2)===F,'1: nothing was blocked by the flag');
  ok(noErr(P1,P2),'1: no page errors');await close(P1,P2);
  // the notes: the company account (its own login, on a computer) and the app owner
  const O=track((await boot(b,BASE,srv,{user:srv.USERS[srv.OFFICE],ua:WIN,wide:true,init:EMPTY_DASH,wait:6000})).p,'1:O');
  ok(srv.live(F)===1&&srv.live(srv.OFFICE)===1,'1: the company account on a computer is its own login: Ray\'s phone stays signed in');
  await O.evaluate(()=>window.pbOpenCrewMembers());await O.waitForTimeout(3500);
  const note=await O.evaluate(()=>{const e=document.getElementById('crShare');return e&&!e.hidden?e.innerText.replace(/\s+/g,' ').trim():'';});
  ok(/^Ray’s login was used on two phones 3[45] miles apart at \d{1,2}:\d\d\s?[AP]M on [A-Z][a-z]{2} \d{1,2}\. Each person needs their own login\. Nothing was blocked\.$/.test(note),'1: Crew members (company account) shows the quiet note: "'+note+'"');
  await O.screenshot({path:SHOTS+'/crew_note_computer.png'});
  srv.D.admins.add(srv.OFFICE);
  await O.evaluate(()=>window.pbOwnerOpen());await O.waitForTimeout(2500);
  const adm=await O.evaluate(()=>{const e=document.getElementById('pbOwnShare');return e?e.innerText.replace(/\s+/g,' ').trim():'';});
  ok(/^Logins used in two places Ray’s login was used on two phones 3[45] miles apart at .* \(DIG Civil Construction\) Nothing was blocked\.$/.test(adm),'1: Beta Accounts (app owner) shows it with the company: "'+adm.slice(0,120)+'"');
  ok(noErr(O),'1: no page errors (office)');await close(O);
  // a crew member never sees the note box
  const P3=track((await boot(b,BASE,srv,{ua:IOS,wait:3000})).p,'1:P3');await login(P3,'ray@example.com');
  ok(await P3.evaluate(()=>{const e=document.getElementById('crShare');return !!e&&e.hidden;}),'1: a crew member sees no note');
  // 390 px, dark: the note on a phone
  await close(P3);
  const O2=track((await boot(b,BASE,srv,{user:srv.USERS[srv.OFFICE],ua:IOS,dark:true,init:EMPTY_DASH,wait:6000})).p,'1:O2');
  ok(srv.live(srv.OFFICE)===1,'1: the company account signing in on a phone ends its computer session (same rule for the company account)');
  await O2.evaluate(()=>window.pbOpenCrewMembers());await O2.waitForTimeout(3500);
  ok(await fits(O2,'#crShare'),'1: the note fits 390 px (dark)');await O2.evaluate(()=>document.getElementById('crShare').scrollIntoView());await O2.screenshot({path:SHOTS+'/crew_note_dark.png'});await close(O2);
 }

 // ===== 2. the old phone learns it from a refused token refresh (no request of its own first) =====
 if(run(2)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const P1=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,dark:true,wait:7500})).p,'2:P1');
  const P2=track((await boot(b,BASE,srv,{ua:IOS,wait:3500})).p,'2:P2');await login(P2,'ray@example.com');
  const r=await P1.evaluate(()=>window.__fakeRefresh());await P1.waitForTimeout(4500);
  ok(r==='signed_out'&&await scr(P1)==='login','2: the refresh is refused and the phone goes to Log In');
  ok(await modal(P1)==='Signed Out '+MSG+' OK','2: it asks the server why and says it: "'+(await modal(P1)).slice(0,50)+'…"');
  ok(srv.D.calls.some(c=>c[0]==='pb_session_why'&&c[1]===null),'2: the question is asked with no account (the session is gone)');
  await P1.screenshot({path:SHOTS+'/signed_out_dark.png'});
  await modalClick(P1,'OK');await P1.evaluate(()=>{window.pb1dWhy();pbGoto('settings');pbGoto('login');});await P1.waitForTimeout(1500);
  ok(!(await modal(P1))&&srv.D.calls.filter(c=>c[0]==='pb_session_why').length===1,'2: said once, asked once');
  // a plain Log Out says nothing
  await P2.evaluate(()=>{window.pbLogout();});await P2.waitForTimeout(800);const asked=await modal(P2);await modalClick(P2,'Continue')||await modalClick(P2,'Log Out')||await modalClick(P2,'Yes');await P2.waitForTimeout(6000);
  ok(srv.live(F)===0,'2: a plain Log Out ends the session ('+asked.slice(0,40)+')');
  ok(!/signed in on another phone/.test(await modal(P2)),'2: and shows no "another phone" message');
  ok(noErr(P1,P2),'2: no page errors');await close(P1,P2);
 }

 // ===== 3. no signal: the phone keeps working and keeps its unsent work; it sends after the person signs in again =====
 if(run(3)){const srv=require('./srv1dev')();const F=srv.FOREMAN;const K='pbCrewNoticeAck:'+F;
  const P1=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,noticeSeen:false,wait:7500})).p,'3:P1');
  await P1.evaluate(()=>{pbGoto('settings');pbGoto('home');});await P1.waitForTimeout(2500);
  const n0=await modal(P1);ok(/What Your Company Sees|company/i.test(n0),'3: phone 1 has something to record (the crew notice): "'+n0.slice(0,40)+'…"');
  await offline(P1,true);
  await modalClick(P1,'Got It');await P1.waitForTimeout(800);
  ok(!!(await P1.evaluate((K)=>localStorage.getItem(K),K))&&srv.st.notices.length===0,'3: with no signal, the record waits on the phone');
  const P2=track((await boot(b,BASE,srv,{ua:AND,wait:3500})).p,'3:P2');await login(P2,'ray@example.com');
  ok(srv.live(F)===1&&await who(P2)===F,'3: meanwhile phone 2 signs in to the same login');
  await P1.evaluate(()=>{window.pb1dSeen(true);pbGoto('settings');pbGoto('home');});await P1.waitForTimeout(2500);
  ok(await who(P1)===F&&!(await modal(P1))&&await scr(P1)==='home','3: phone 1, still without signal, keeps working: signed in on the phone, no message');
  await offline(P1,false);await reach(P1);
  ok(await modal(P1)==='Signed Out '+MSG+' OK'&&await scr(P1)==='login','3: signal back: phone 1 is signed out and told why');
  ok(!!(await P1.evaluate((K)=>localStorage.getItem(K),K)),'3: the unsent record is still on phone 1');
  ok(srv.st.notices.length===0&&!srv.D.calls.some(c=>c[0]==='pb_notice_ack'),'3: SERVER: nothing from the ended session was filed');
  await modalClick(P1,'OK');await login(P1,'ray@example.com');
  await P1.evaluate(()=>{try{pbObClose();}catch(e){}pbGoto('settings');pbGoto('home');});await P1.waitForTimeout(3500);
  const acks=srv.D.calls.filter(c=>c[0]==='pb_notice_ack');
  ok(acks.length===1&&acks[0][1]===F&&acks[0][2].p_notice==='crew_notice','3: after signing in again the record is sent once, under Ray\'s account ('+acks.length+')');
  ok(!(await P1.evaluate((K)=>localStorage.getItem(K),K)),'3: and nothing is left waiting');
  ok(srv.live(F)===1,'3: SERVER: one live session (phone 1 now)');
  await reach(P2);
  ok(await modal(P2)==='Signed Out '+MSG+' OK','3: phone 2 is now the one signed out and told');
  await P1.evaluate(()=>window.pb1dSeen(true));await P1.waitForTimeout(800);
  const bf=srv.D.flags.find(f=>f.kind==='back_and_forth');
  ok(bf&&bf.n===2,'3: SERVER: back-and-forth flag recorded (2 switches today)');
  await close(P2);
  const O=track((await boot(b,BASE,srv,{user:srv.USERS[srv.OFFICE],ua:WIN,wide:true,init:EMPTY_DASH,wait:6000})).p,'3:O');
  await O.evaluate(()=>window.pbOpenCrewMembers());await O.waitForTimeout(3500);
  const note=await O.evaluate(()=>{const e=document.getElementById('crShare');return e&&!e.hidden?e.innerText.replace(/\s+/g,' ').trim():'';});
  ok(/^Ray’s login went back and forth between two phones 2 times on [A-Z][a-z]{2} \d{1,2}\. Each person/.test(note),'3: the company account\'s note: "'+note.slice(0,90)+'"');
  ok(noErr(P1,O),'3: no page errors');await close(P1,O);
 }

 // ===== 4. the Home Screen code moves the session (iPhone Safari -> the Home Screen app) =====
 if(run(4)){const srv=require('./srv1dev')();const OF=srv.OFFICE;
  const SA=track((await boot(b,BASE,srv,{user:srv.USERS[OF],ua:IOS,init:EMPTY_DASH,wait:7500})).p,'4:Safari');
  await SA.evaluate(()=>{window.pbUnsentSentence=async()=>'Not sent yet: 1 run report. It sends when this account logs in here again.';});
  await SA.evaluate(()=>window.pbObHandoff());await SA.waitForTimeout(2500);
  const sh=await sheet(SA);
  ok(/This page is signed out when you sign in there\./.test(sh),'4: Get a Code says the page is signed out by it');
  const warn=await SA.evaluate(()=>{const e=document.getElementById('pb1dUnsentA');return e&&!e.hidden?e.textContent:'';});
  ok(warn===''||/^Let this send before you switch\. Not sent yet: 1 run report\./.test(warn),'4: unsent work is named first'+(warn?': "'+warn.slice(0,60)+'…"':' (not testable here: the sentence function could not be stubbed)'));
  ok(await fits(SA,'#pbObSheet .pbob-card'),'4: the code sheet fits 390 px');await SA.screenshot({path:SHOTS+'/handoff_code.png'});
  await SA.evaluate(()=>window.pbObHandoffCopy());const code=await SA.evaluate(()=>window.__pbObCopied);
  const HS=track((await boot(b,BASE,srv,{ua:IOS,standalone:true,clip:code,init:EMPTY_DASH,wait:3500})).p,'4:HomeScreen');
  await HS.evaluate(()=>window.pbObPasteNow());await HS.waitForTimeout(6500);
  ok(await who(HS)===OF&&await scr(HS)==='home','4: the Home Screen app signs in with the code');
  const olds=[...srv.D.sess.values()].filter(s=>s.uid===OF&&!s.alive);
  ok(srv.live(OF)===1&&olds.length===1&&olds[0].reason==='moved','4: SERVER: one live session; Safari\'s was ended as "moved", not left behind');
  await reach(SA);const mm=await modal(SA);
  ok(mm==='Signed Out Your account is now signed in in the Home Screen app, so this page was signed out. Open the app from its icon. Your saved work is kept. OK'&&await scr(SA)==='login','4: Safari, next time it reaches the server: "'+mm.slice(11,80)+'…"');
  await HS.evaluate(()=>window.pb1dSeen(true));await HS.waitForTimeout(800);
  ok(srv.D.flags.length===0,'4: a Home Screen move records no sharing flag');
  ok(await who(HS)===OF&&srv.live(OF)===1,'4: the Home Screen app stays signed in');
  ok(noErr(SA,HS),'4: no page errors');await close(SA,HS);
 }

 // ===== 5. the server part not installed yet (app released first): nothing changes, nothing is shown =====
 if(run(5)){const srv=require('./srv1dev')({installed:false});const F=srv.FOREMAN;
  const P1=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7500})).p,'5:P1');
  const P2=track((await boot(b,BASE,srv,{ua:IOS,wait:3500})).p,'5:P2');await login(P2,'ray@example.com');
  await reach(P1);
  ok(srv.live(F)===2&&await who(P1)===F&&await who(P2)===F&&!(await modal(P1)),'5: both phones stay signed in, no message (as today)');
  await P1.evaluate(()=>window.__fakeRefresh());
  ok(noErr(P1,P2),'5: no page errors');await close(P1,P2);
 }
 console.log(fails?('FAILED '+fails+' (passed '+passes+')'):('ALL PASS ('+passes+')'));await b.close();process.exit(fails?1:0);
})();
