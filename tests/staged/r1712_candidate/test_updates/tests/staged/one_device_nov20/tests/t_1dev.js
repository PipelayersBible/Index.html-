// One device IN USE per login, two signed in (v3, staged Nov 20, on r17.11). Browser contexts share one Node "server"
// (srv1dev.js, which mirrors sql/01_one_device.sql).
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:10200/cur.html node t_1dev.js [section numbers]
const {chromium}=require('playwright');const boot=require('./boot_1dev');const fs=require('fs');
const BASE=process.env.PB_URL||'http://127.0.0.1:10200/cur.html';
const SHOTS=process.env.PB_OUT||(__dirname+'/../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
const ONLY=process.argv.slice(2);const run=(n)=>!ONLY.length||ONLY.includes(String(n));
let fails=0,passes=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(c)passes++;else fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD='Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const WIN='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const INUSE='Account In Use This account is in use on another device right now. Try again in 5 minutes. OK';
const MSG='Your account was signed in on another device, so this one was signed out. Your saved work is kept and will send when you sign in again.';
const LOCKP='In use on your other device (phone). You can use this one when that one has been idle for 5 minutes.';
const scr=(p)=>p.evaluate(()=>{const s=document.querySelector('.pb-screen.active');return s?s.id.replace('screen-',''):'';});
const modal=(p)=>p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return d&&getComputedStyle(d).display!=='none'?d.innerText.replace(/\s+/g,' ').trim():'';});
const modalClick=(p,label)=>p.evaluate((label)=>{const d=document.getElementById('pbModalOverlay');const bt=d&&[...d.querySelectorAll('button')].find(x=>x.textContent.trim()===label||x.textContent.trim().startsWith(label));if(bt)bt.click();return !!bt;},label);
const modalBtns=(p)=>p.evaluate(()=>[...document.querySelectorAll('#pbModalButtons button')].map(b=>b.textContent.trim()));
const lock=(p)=>p.evaluate(()=>{const e=document.getElementById('pb1dLock');return e?e.innerText.replace(/\s+/g,' ').trim():'';});
const bar=(p)=>p.evaluate(()=>{const e=document.getElementById('pb1dBar');return e?e.innerText.replace(/\s+/g,' ').trim():'';});
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const who=(p)=>p.evaluate(()=>{try{const v=JSON.parse(localStorage.getItem('fake-sb-session')||'null');return v&&window.__fakeSid()?v.user.id:null;}catch(e){return 'n/a';}});
const sidOf=(p)=>p.evaluate(()=>window.__fakeSid());
const fits=(p,sel)=>p.evaluate((sel)=>{const e=sel?document.querySelector(sel):null;const r=e?e.getBoundingClientRect():{left:0,right:0};return document.documentElement.scrollWidth<=innerWidth&&r.left>=0&&r.right<=innerWidth+0.5;},sel);
const login=async(p,email)=>{await p.evaluate(()=>{try{pbObClose();}catch(e){}pbGoto('login');});await p.waitForTimeout(400);await p.fill('#loginEmail',email);await p.fill('#loginPassword','pw123456');await p.click('#loginSubmitBtn');await p.waitForTimeout(5500);};
const check=async(p,ms)=>{await p.evaluate(()=>window.pb1dSeen(true));await p.waitForTimeout(ms||900);};
const offline=async(p,off)=>{await p.context().setOffline(off);await p.evaluate((off)=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>!off});window.dispatchEvent(new Event(off?'offline':'online'));},off);};
const seen=(srv,sid)=>srv.D.calls.filter(c=>c[0]==='pb_device_seen'&&(!sid||c[3]===sid)).length;
const almostIdle=(srv,uid,s)=>{const h=srv.D.holder.get(uid);h.last=Date.now()+srv.D.clock-5*60000+s*1000;}; // the device in use was last used 5 min minus s seconds ago
const EMPTY_DASH=`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_company_dashboard:()=>({jobs:[],today:[],holidays:[],checkpoints:[],server_at:new Date().toISOString(),can_set_company:true}),pb_owner_overview:()=>({ok:true,companies:[],totals:null})});`;
(async()=>{
 const b=await chromium.launch();const track=(p,n)=>{p.__n=n;return p;};
 const close=async(...ps)=>{for(const p of ps){if(p.errs.length)console.log('  page errors ['+p.__n+']:',p.errs.slice(0,3));await p.context().close();}};
 const noErr=(...ps)=>ps.every(p=>!p.errs.length);

 // ===== 1. phone A in use, tablet B signed in too: B locked; A idle 5 min: B unlocks by itself (no sign-in); a new sign-in while in use is refused =====
 if(run(1)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7500})).p,'1:A');
  ok(await scr(A)==='home'&&srv.live(F)===1&&srv.holderOf(F)===await sidOf(A),'1: phone A signed in and in use');
  ok(seen(srv)===1,'1: one check-in at start-up ('+seen(srv)+')');
  const B=track((await boot(b,BASE,srv,{ua:IPAD,wait:3500})).p,'1:B');
  await login(B,'ray@example.com');
  ok(await modal(B)===INUSE&&await who(B)===null&&await scr(B)==='login','1: tablet B signs in while A is in use: refused, "Try again in 5 minutes"');
  ok(srv.live(F)===1&&[...srv.D.sess.values()].some(s=>s.reason==='in_use'&&s.removed),'1: SERVER: still one session; the refused one was removed');
  ok(await who(A)===F&&!(await lock(A))&&!(await modal(A)),'1: phone A untouched');
  await B.screenshot({path:SHOTS+'/in_use_refused.png'});await modalClick(B,'OK');
  srv.idle(6);await login(B,'ray@example.com');
  ok(await scr(B)==='home'&&await who(B)===F&&!(await lock(B))&&!(await modal(B)),'1: A idle 6 minutes: B signs in and is in use');
  ok(srv.live(F)===2&&srv.holderOf(F)===await sidOf(B),'1: SERVER: two devices signed in, B holds the login');
  await check(A);
  const la=await lock(A);
  ok(la.startsWith('In Use on Your Other Device In use on your other device (tablet). You can use this one when that one has been idle for 5 minutes. Unlocks by itself in 4:5')||la.startsWith('In Use on Your Other Device In use on your other device (tablet). You can use this one when that one has been idle for 5 minutes. Unlocks by itself in 5:00'),'1: phone A, back on: lock screen "'+la.slice(0,170)+'"');
  ok(await who(A)===F,'1: A is still signed in (locked, not signed out)');
  const c1=await A.evaluate(()=>document.getElementById('pb1dLockCd').textContent);await A.waitForTimeout(2100);const c2=await A.evaluate(()=>document.getElementById('pb1dLockCd').textContent);
  ok(c1!==c2&&/^Unlocks by itself in \d:\d\d$/.test(c2),'1: the countdown runs ('+c1+' → '+c2+')');
  ok(await fits(A,'#pb1dLock > div'),'1: the lock screen fits 390 px');await A.screenshot({path:SHOTS+'/locked_light.png'});
  ok(await A.evaluate(()=>{const e=document.getElementById('pb1dLock');const r=e.getBoundingClientRect();const x=document.elementFromPoint(195,400);return r.width>=innerWidth&&r.height>=innerHeight&&e.contains(x);}),'1: it covers the app');
  // a third device while B is in use: refused (in use), not offered a place
  const C=track((await boot(b,BASE,srv,{ua:AND,wait:3000})).p,'1:C');await login(C,'ray@example.com');
  ok(await modal(C)===INUSE&&srv.live(F)===2,'1: a third device while B is in use: refused as in use');await close(C);
  // B goes quiet: A unlocks by itself when the countdown ends
  almostIdle(srv,F,4);await check(A,600);
  ok(/Unlocks by itself in 0:0[1-4]/.test(await lock(A)),'1: B was last used 4 min 56 s ago: A shows the last seconds ('+(await lock(A)).slice(-30)+')');
  await A.waitForTimeout(7000);
  ok(!(await lock(A))&&await who(A)===F&&srv.holderOf(F)===await sidOf(A),'1: countdown over: A unlocked by itself, still signed in (no sign-in), holds the login');
  ok(!(await modal(A))&&await scr(A)==='home','1: no message, the app is as it was');
  await check(B);
  ok((await lock(B)).includes('In use on your other device (phone).'),'1: and now B is the locked one');
  ok(noErr(A,B),'1: no page errors');await close(A,B);
 }

 // ===== 2. queued work on the locked device: kept, sent once it is the one in use; offline: keeps working =====
 if(run(2)){const srv=require('./srv1dev')();const F=srv.FOREMAN;const K='pbCrewNoticeAck:'+F;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'2:A');
  srv.idle(6);
  const B=track((await boot(b,BASE,srv,{ua:AND,noticeSeen:false,wait:3500})).p,'2:B');await login(B,'ray@example.com');
  await check(A); // A takes the login back (B's sign-in check-in was 0 s ago? no: B holds it) -> A locked
  ok(srv.holderOf(F)===await sidOf(B)&&(await lock(A)).length>0,'2: B in use, A locked');
  // swap: B goes idle, A uses it; B is locked and has a record to send
  srv.idle(6);await check(A);await check(B);
  ok(srv.holderOf(F)===await sidOf(A)&&(await lock(B)).startsWith('In Use on Your Other Device '+LOCKP),'2: A in use again, B locked: "'+(await lock(B)).slice(28,110)+'"');
  // B goes without signal: the lock goes away, B keeps working; its record waits
  await offline(B,true);await B.waitForTimeout(500);
  ok(!(await lock(B))&&await who(B)===F,'2: B without signal: no lock screen, still signed in, keeps working');
  await B.evaluate(()=>{pbGoto('settings');pbGoto('home');});await B.waitForTimeout(2500);
  const n0=await modal(B);ok(/company/i.test(n0),'2: B has something to record (the crew notice): "'+n0.slice(0,40)+'"');
  await modalClick(B,'Got It');await B.waitForTimeout(800);
  ok(!!(await B.evaluate((K)=>localStorage.getItem(K),K))&&srv.st.notices.length===0,'2: no signal: it waits on B');
  await offline(B,false);await B.waitForTimeout(5000);
  ok((await lock(B)).length>0,'2: signal back, A still in use: B locked again');
  ok(!!(await B.evaluate((K)=>localStorage.getItem(K),K))&&srv.st.notices.length===0&&!srv.D.calls.some(c=>c[0]==='pb_notice_ack'),'2: the record is kept and nothing was filed (refused as locked: '+srv.D.refused.filter(r=>r[2]==='locked').length+')');
  // A idle: B unlocks by itself and the record is sent at once
  almostIdle(srv,F,2);await check(B,500);await B.waitForTimeout(9000);
  ok(!(await lock(B))&&srv.holderOf(F)===await sidOf(B),'2: A idle: B unlocked by itself');
  const acks=srv.D.calls.filter(c=>c[0]==='pb_notice_ack');
  ok(acks.length===1&&acks[0][1]===F,'2: the waiting record was sent once, under Ray ('+acks.length+')');
  ok(!(await B.evaluate((K)=>localStorage.getItem(K),K)),'2: nothing left waiting on B');
  ok(noErr(A,B),'2: no page errors');await close(A,B);
 }

 // ===== 3. already signed in on two devices: a third one signs one out and takes its place; Cancel =====
 if(run(3)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'3:A');
  srv.idle(30);const B=track((await boot(b,BASE,srv,{ua:IPAD,wait:3000})).p,'3:B');await login(B,'ray@example.com');
  srv.idle(6);
  ok(srv.live(F)===2,'3: A (phone, used 36 min ago) and B (tablet, used 6 min ago) signed in, both idle');
  const C=track((await boot(b,BASE,srv,{ua:AND,wait:3000})).p,'3:C');await login(C,'ray@example.com');
  const m=await modal(C),bt=await modalBtns(C);
  ok(m.startsWith('Signed In on Two Devices This account is already signed in on two devices. To use it here, sign one of them out.'),'3: C: "'+m.slice(0,110)+'…"');
  ok(JSON.stringify(bt)==='["Sign Out the Tablet (used 6 min ago)","Sign Out the Phone (used 36 min ago)","Cancel"]','3: one button per device, last used first: '+JSON.stringify(bt));
  ok(await fits(C,'#pbModalOverlay'),'3: fits 390 px');await C.screenshot({path:SHOTS+'/two_devices.png'});
  // Cancel: nothing changes
  await modalClick(C,'Cancel');await C.waitForTimeout(2500);
  ok(await who(C)===null&&srv.live(F)===2&&!(await modal(C)),'3: Cancel: C signed out quietly, A and B stay signed in');
  ok([...srv.D.sess.values()].filter(s=>s.reason==='full').every(s=>!s.exists),'3: SERVER: the refused sign-in is gone');
  // again, and take the phone's place
  await login(C,'ray@example.com');
  ok(await modalClick(C,'Sign Out the Phone'),'3: C taps "Sign Out the Phone"');await C.waitForTimeout(8000);
  ok(srv.D.anon.some(x=>x[0]==='pb_session_take_slot'&&x[1].p_pick===2),'3: asked with the app\'s own key, pick 2');
  ok(await who(C)===F&&await scr(C)==='home'&&!(await modal(C))&&!(await lock(C)),'3: C reloads signed in, on Home, in use');
  ok(srv.live(F)===2&&srv.holderOf(F)===await sidOf(C),'3: SERVER: still two signed in (C and B); C holds the login');
  const gone=[...srv.D.sess.values()].find(s=>s.reason==='other_device');ok(gone&&srv.D.flags.some(f=>f.kind==='took_place'),'3: SERVER: the phone\'s session ended as other_device; took_place recorded (owner only)');
  await check(A,3000);
  ok(await modal(A)==='Signed Out '+MSG+' OK'&&await who(A)===null&&await scr(A)==='login','3: phone A next time it reaches the server: "'+(await modal(A)).slice(11,70)+'…"');
  ok(JSON.stringify(await A.evaluate(()=>window.__signOuts))==='["local"]','3: A signed out on this device only');
  ok(await who(B)===F,'3: tablet B still signed in');
  // a 4th while C is in use: refused as in use (no offer)
  const E=track((await boot(b,BASE,srv,{ua:WIN,wait:3000})).p,'3:E');await login(E,'ray@example.com');
  ok(await modal(E)===INUSE,'3: a 4th device while C is in use: refused as in use');
  ok(srv.D.flags.filter(f=>/^tried_/.test(f.kind)).map(f=>f.kind).join(',')==='tried_full,tried_full,tried_in_use','3: SERVER: refused tries recorded: '+srv.D.flags.filter(f=>/^tried_/.test(f.kind)).map(f=>f.kind).join(','));
  ok(noErr(A,B,C,E),'3: no page errors');await close(A,B,C,E);
 }

 // ===== 4. permit priority =====
 if(run(4)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'4:A');
  srv.idle(6);const B=track((await boot(b,BASE,srv,{ua:IPAD,dark:true,wait:3000})).p,'4:B');
  srv.D.permit.add(F);srv.D.holder.get(F).last=Date.now()+srv.D.clock-6*60000;
  await login(B,'ray@example.com');
  ok(await modal(B)===INUSE,'4: a permit open on A (quiet 6 min): a new sign-in is refused');await modalClick(B,'OK');
  srv.D.permit.delete(F);await login(B,'ray@example.com');srv.D.permit.add(F);
  ok(srv.holderOf(F)===await sidOf(B),'4: (permit closed, B signed in and took the login; then A opens a permit again but B holds it)');
  srv.idle(6);srv.D.holder.get(F).sid=await sidOf(A);srv.D.holder.get(F).device=await A.evaluate(()=>localStorage.getItem('pbDeviceId')); // A holds the login with its permit, idle
  await check(B);
  const lb=await lock(B);
  ok(lb.startsWith('In Use on Your Other Device In use on your other device (phone): a confined space permit is open there. You can use this one when that permit is closed.')&&!/Unlocks by itself/.test(lb),'4: B locked by the permit, no countdown: "'+lb.slice(28,150)+'"');
  await B.screenshot({path:SHOTS+'/locked_permit_dark.png'});
  await check(B);ok((await lock(B)).length>0,'4: permit still open: still locked after the countdown would have ended');
  srv.D.permit.delete(F);await check(B);
  ok(!(await lock(B))&&srv.holderOf(F)===await sidOf(B),'4: permit closed (A idle): B unlocks');
  // a permit open on THIS device: never covered
  srv.D.holder.get(F).sid=await sidOf(A);srv.D.holder.get(F).last=Date.now()+srv.D.clock;srv.D.holder.get(F).device=await A.evaluate(()=>localStorage.getItem('pbDeviceId'));
  const local=await B.evaluate(()=>{window.__pb1dPermitHere=true;return true;}); // (script-scoped permit state isn't reachable from the rig)
  await check(B);
  await B.screenshot({path:SHOTS+'/permit_here_bar_dark.png'});ok(local===true&&!(await lock(B))&&/^In use on your other device \(phone\)\. .*This permit keeps working here/.test(await bar(B)),'4: a permit open on B itself: no lock screen, a slim note: "'+(await bar(B)).slice(0,90)+'…"');
  await B.evaluate(()=>{window.__pb1dPermitHere=false;});
  ok(noErr(A,B),'4: no page errors');await close(A,B);
 }

 // ===== 5. Log Out on the device in use frees the login at once; Log Out on the locked one doesn't touch the other =====
 if(run(5)){const srv=require('./srv1dev')();const F=srv.FOREMAN;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'5:A');
  srv.idle(6);const B=track((await boot(b,BASE,srv,{ua:AND,wait:3000})).p,'5:B');await login(B,'ray@example.com');
  await check(A);ok((await lock(A)).length>0,'5: B in use, A locked');
  // Log Out from the lock screen: its question shows above the lock
  await A.click('#pb1dOut');await A.waitForTimeout(1200);const q=await modal(A);
  ok(/Log out\?/.test(q),'5: Log Out on the lock screen asks first, above it: "'+q.slice(0,40)+'"');
  await modalClick(A,'Cancel')||await modalClick(A,'No');await A.waitForTimeout(500);
  ok((await lock(A)).length>0&&await who(A)===F,'5: Cancel: still locked, still signed in');
  // Log Out on B (in use)
  await B.evaluate(()=>window.pbLogout());await B.waitForTimeout(900);await modalClick(B,'Log Out')||await modalClick(B,'Continue')||await modalClick(B,'Yes');await B.waitForTimeout(6000);
  ok(await who(B)===null&&srv.live(F)===1,'5: B logged out (this device only): one session left');
  ok(JSON.stringify(await B.evaluate(()=>window.__signOuts||[]))!=='["global"]','5: not an all-devices sign-out');
  await A.click('#pb1dTry');await A.waitForTimeout(1500);
  ok(!(await lock(A))&&await who(A)===F&&srv.holderOf(F)===await sidOf(A),'5: A: Try Now unlocks at once, no wait, no sign-in');
  ok(!(await modal(A)),'5: and A shows no message');
  ok(noErr(A,B),'5: no page errors');await close(A,B);
 }

 // ===== 6. the Home Screen code replaces the Safari page (never refused, not a 3rd device) =====
 if(run(6)){const srv=require('./srv1dev')();const OF=srv.OFFICE;
  const SA=track((await boot(b,BASE,srv,{user:srv.USERS[OF],ua:IOS,init:EMPTY_DASH,wait:7500})).p,'6:Safari');
  await SA.evaluate(()=>{window.__pb1dUnsent=async()=>'Not sent yet: 1 run report. It sends when this account logs in here again.';});
  await SA.evaluate(()=>window.pbObHandoff());await SA.waitForTimeout(2500);
  ok(/This page is signed out when you sign in there\./.test(await sheet(SA)),'6: Get a Code says the page is signed out by it');
  const warn=await SA.evaluate(()=>{const e=document.getElementById('pb1dUnsentA');return e&&!e.hidden?e.textContent:'';});
  ok(/^Let this send before you switch\. Not sent yet: 1 run report\./.test(warn),'6: unsent work named first');
  await SA.evaluate(()=>window.pbObHandoffCopy());const code=await SA.evaluate(()=>window.__pbObCopied);
  const HS=track((await boot(b,BASE,srv,{ua:IOS,standalone:true,clip:code,init:EMPTY_DASH,wait:3500})).p,'6:HomeScreen');
  await HS.evaluate(()=>window.pbObPasteNow());await HS.waitForTimeout(6500);
  ok(await who(HS)===OF&&await scr(HS)==='home'&&!(await lock(HS))&&!(await modal(HS)),'6: the Home Screen app signs in with the code although Safari was in use seconds ago, not locked');
  ok(srv.live(OF)===1&&[...srv.D.sess.values()].some(s=>s.uid===OF&&s.reason==='moved')&&srv.holderOf(OF)===await sidOf(HS),'6: SERVER: Safari\'s session ended as moved; the app holds the login');
  await check(SA,3000);
  ok(await modal(SA)==='Signed Out Your account is now signed in in the Home Screen app, so this page was signed out. Open the app from its icon. Your saved work is kept. OK'&&await scr(SA)==='login','6: Safari is told once and signed out');
  ok(srv.D.flags.length===0,'6: nothing recorded for a Home Screen move');
  ok(noErr(SA,HS),'6: no page errors');await close(SA,HS);
 }

 // ===== 7. gate not on yet (trigger + functions only), then nothing installed: still sensible / silent =====
 if(run(7)){let srv=require('./srv1dev')({gate:false});let F=srv.FOREMAN;
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'7:A');
  const B=track((await boot(b,BASE,srv,{ua:AND,wait:3000})).p,'7:B');await login(B,'ray@example.com');
  ok(await modal(B)===INUSE&&await who(B)===null,'7: gate off: a refused sign-in is still said (asked why)');await modalClick(B,'OK');
  srv.idle(6);await login(B,'ray@example.com');await check(A);
  ok((await lock(A)).startsWith('In Use on Your Other Device In use on your other device (phone).'),'7: gate off: the lock comes from the check-in answer');
  await close(A,B);
  srv=require('./srv1dev')({installed:false});F=srv.FOREMAN;
  const P1=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'7:P1');
  const P2=track((await boot(b,BASE,srv,{ua:IOS,wait:3000})).p,'7:P2');await login(P2,'ray@example.com');
  await check(P1);await check(P2);
  ok(srv.live(F)===2&&await who(P1)===F&&await who(P2)===F&&!(await modal(P1))&&!(await modal(P2))&&!(await lock(P1))&&!(await lock(P2)),'7: not installed: both signed in, nothing shown (as today)');
  ok(noErr(A,B,P1,P2),'7: no page errors');await close(P1,P2);
 }

 // ===== 8. the override (DIG Civil, Tommy): several devices usable at once =====
 if(run(8)){const srv=require('./srv1dev')();const F=srv.FOREMAN;srv.D.allow.set(F,{devices:5,one:false});
  const A=track((await boot(b,BASE,srv,{user:srv.USERS[F],ua:IOS,wait:7000})).p,'8:A');
  const B=track((await boot(b,BASE,srv,{ua:IPAD,wait:3000})).p,'8:B');await login(B,'ray@example.com');
  const C=track((await boot(b,BASE,srv,{ua:WIN,wait:3000})).p,'8:C');await login(C,'ray@example.com');
  await check(A);await check(B);await check(C);
  ok(srv.live(F)===3&&!(await lock(A))&&!(await lock(B))&&!(await lock(C))&&!(await modal(B))&&!(await modal(C)),'8: override: 3 devices signed in and usable at once, no lock, no refusal');
  ok(srv.D.refused.length===0,'8: SERVER: nothing refused');
  ok(noErr(A,B,C),'8: no page errors');await close(A,B,C);
 }

 // ===== 9. nothing about sharing is shown to anyone; the check-in runs every ~90 s on screen =====
 if(run(9)){const srv=require('./srv1dev')();const OF=srv.OFFICE;
  const O=track((await boot(b,BASE,srv,{user:srv.USERS[OF],ua:WIN,wide:true,init:EMPTY_DASH,wait:6000})).p,'9:O');
  await O.evaluate(()=>window.pbOpenCrewMembers());await O.waitForTimeout(2500);
  const html=await O.evaluate(()=>document.documentElement.outerHTML);
  ok(!/crShare|pbOwnShare|pb_share_notes|pb_owner_share_notes|used in two places|Each person needs their own login/.test(html),'9: no crew note, no Beta Accounts block, no sharing words in the page');
  const n0=seen(srv);await O.evaluate(()=>{window.__pb1d.at=Date.now()-91000;});await O.waitForTimeout(16000);
  ok(seen(srv)===n0+1,'9: a check-in ~90 s after the last one while on screen ('+(seen(srv)-n0)+')');
  await O.evaluate(()=>{window.__pb1d.at=Date.now()-30000;});await O.waitForTimeout(16000);
  ok(seen(srv)===n0+1,'9: not more often');
  await O.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'));});await O.waitForTimeout(2000);
  ok(seen(srv)===n0+2,'9: on resume, at once');
  ok(noErr(O),'9: no page errors');await close(O);
 }
 console.log(fails?('FAILED '+fails+' (passed '+passes+')'):('ALL PASS ('+passes+')'));await b.close();process.exit(fails?1:0);
})();
