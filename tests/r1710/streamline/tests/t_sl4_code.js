// streamline 09 (Tommy, Nov 19, #5): every account gets a one-time code for the iPhone Home Screen app instead of typing
// email and password there. Get a Code in the Home Screen step, the Home card and Settings (iPhone Safari); Paste Join
// Code on the Home Screen app's Log In signs in to the same account; two-step login is still asked after it.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_sl4_code.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const boot=require('../../../boot_ob');const mkSrv=require('../../../obsrv');
const BASE=process.env.PB_URL||'http://127.0.0.1:8962/cur.html';
const SHOTS=process.env.PB_OUT||path.join(__dirname,'../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CONTRACTOR=`window.__tableOne={subscriptions:{tier:'contractor',status:'active'}};`;
const OFFICE_U={id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',user_metadata:{full_name:'Test Office'},app_metadata:{}};
const SEEN=`try{localStorage.setItem('pbTermsOk:${OFFICE_U.id}','1.0|1.0');}catch(e){}`;
const MFA=`window.__mfaApi={getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:window.__aal||'aal1',nextLevel:'aal2'},error:null}),listFactors:async()=>({data:{totp:[{id:'f1',status:'verified'}]},error:null}),challengeAndVerify:async()=>{window.__aal='aal2';return {data:{},error:null};}};`;
const sheet=(p)=>p.evaluate(()=>{const d=document.getElementById('pbObSheet');return d?d.innerText.replace(/\s+/g,' '):'';});
const vis=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);return !!e&&!e.hidden&&e.getClientRects().length>0;},id);
const note=(p)=>p.evaluate(()=>{const n=document.getElementById('pbSayDone');return n&&!n.hidden?n.textContent:'';});
async function codeFromStep(b,srv,init){
  const {p}=await boot(b,BASE,srv,{ua:IOS,user:OFFICE_U,init:CONTRACTOR+SEEN+(init||''),wait:4000});
  await p.evaluate(()=>pbObA2hsStepSoon('login'));
  await p.waitForFunction(()=>{const d=document.getElementById('pbObSheet');return !!d&&d.dataset.step==='a2hs';},null,{timeout:15000}).catch(()=>{});
  return p;}
(async()=>{
 const b=await chromium.launch();const srv=mkSrv({paid:5});srv.st.users.set(OFFICE_U.id,OFFICE_U);
 // ===== 1. an email account (the owner) in iPhone Safari: Get a Code in the Home Screen step =====
 const p=await codeFromStep(b,srv);
 let t=await sheet(p);
 ok(/Tap Get a Code below, then Copy Code/.test(t)&&/Open the new icon and tap Paste Join Code/.test(t)&&!/log in\./.test(t),'email account: the step uses a code, not "log in"');
 ok(/no typing your email and password/.test(t)&&await vis(p,'pbObA2hsCodeBtn'),'email account: Get a Code, "no typing your email and password"');
 await p.screenshot({path:SHOTS+'/a2hs_ios_email.png'});
 await p.click('#pbObA2hsCodeBtn');await p.waitForTimeout(1200);
 const code=await p.evaluate(()=>(document.getElementById('pbObHandoffCode')||{}).textContent||'');
 await p.click('#pbObHandoffCopy');await p.waitForTimeout(300);const copied=await p.evaluate(()=>window.__pbObCopied||'');
 ok(/^[A-Z0-9]{3} [A-Z0-9]{3}$/.test(code)&&/^PBCODE:/.test(copied),'the code shows ('+code+') and Copy Code copies it');
 await p.click('#pbObA2hsDone');await p.evaluate(()=>{localStorage.removeItem('pbObA2hs:'+window.__pbObMe().id);pbRenderHome();});await p.waitForTimeout(400);
 ok(await vis(p,'homeA2hsCode'),'the Home card has Get a Code for an email account too');
 await p.evaluate(()=>pbOpenSettings());await p.waitForTimeout(900);
 ok(await vis(p,'settingsHandoffBtn'),'Settings: "Get a Code for the Home Screen App" for an email account in iPhone Safari');
 ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));
 // ===== 2. the Home Screen app: Paste Join Code on Log In signs in to the same account =====
 const H=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:copied,init:CONTRACTOR,wait:3500})).p;
 ok(await vis(H,'loginPasteBtn'),'Home Screen app: Paste Join Code on Log In');
 await H.click('#loginPasteBtn');await H.waitForTimeout(3500);
 const me=await H.evaluate(()=>window.__pbObMe());
 ok(!!me&&me.id===OFFICE_U.id&&me.email==='tester@example.com','one tap: signed in to the owner\'s account, no email or password typed');
 ok(!(await H.$('#pbObSheet'))&&/^Signed in as tester@example\.com\.$/.test(await note(H)),'no "Signed In" box; a note says who');
 ok(H.errs.length===0,'no page errors '+JSON.stringify(H.errs));
 await H.context().close();await p.context().close();
 // ===== 3. two-step login is still asked after a code sign-in =====
 const p3=await codeFromStep(b,srv,MFA.replace("window.__aal||'aal1'","'aal2'"));
 await p3.waitForTimeout(800);
 ok(/Two-step login still asks for its code\./.test(await sheet(p3)),'an account with two-step login is told it still asks');
 await p3.click('#pbObA2hsCodeBtn');await p3.waitForTimeout(1200);await p3.click('#pbObHandoffCopy');await p3.waitForTimeout(300);
 const copied3=await p3.evaluate(()=>window.__pbObCopied||'');await p3.context().close();
 const M=(await boot(b,BASE,srv,{ua:IOS,signedOut:true,standalone:true,clip:copied3,init:CONTRACTOR+MFA,wait:3500})).p;
 await M.click('#loginPasteBtn');await M.waitForTimeout(3500);
 ok((await M.evaluate(()=>(window.__pbObMe()||{}).id))===OFFICE_U.id&&await M.evaluate(()=>!!document.getElementById('pbMfaSheet')&&/Enter Your Code/.test(document.getElementById('pbMfaSheet').innerText)),'after the code sign-in: "Enter Your Code" (two-step login) is asked');
 await M.screenshot({path:SHOTS+'/code_then_mfa.png'});
 await M.fill('#pbMfaIn','123456');await M.click('#pbMfaGo');await M.waitForTimeout(800);
 ok(await M.evaluate(()=>!document.getElementById('pbMfaSheet')),'the code from the authenticator app finishes it');
 ok(M.errs.length===0,'no page errors '+JSON.stringify(M.errs));await M.context().close();
 // ===== 4. where the Settings button shows =====
 {const {p}=await boot(b,BASE,srv,{user:OFFICE_U,init:CONTRACTOR+SEEN,wait:3500});await p.evaluate(()=>pbOpenSettings());await p.waitForTimeout(900);
  ok(!(await vis(p,'settingsHandoffBtn')),'computer, email account: no code button (it can log in normally)');await p.context().close();}
 {const nu={id:'00000000-0000-4000-8000-00000000ae01',email:'m-q@crew.pipelayersbible.com',user_metadata:{full_name:'Q'},app_metadata:{pb_link:true}};
  srv.st.members.set(nu.id,{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pipelayer'});srv.st.users.set(nu.id,nu);
  const {p}=await boot(b,BASE,srv,{user:nu,init:CONTRACTOR+`try{localStorage.setItem('pbCrewNotice:${nu.id}','3');localStorage.setItem('pbTermsOk:${nu.id}','1.0|1.0');}catch(e){}`,wait:3500});
  await p.evaluate(()=>pbOpenSettings());await p.waitForTimeout(900);
  ok(await vis(p,'settingsHandoffBtn'),'no-email account: the code button shows anywhere (as before)');await p.context().close();}
 await b.close();console.log('t_sl4 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
