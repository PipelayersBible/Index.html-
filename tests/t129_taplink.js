// r17.04: scanner-proof email links (?token_hash=...&type=invite|recovery). Opening the link must redeem nothing
// (a mail scanner opens it); only the Continue tap calls verifyOtp, then the existing link path opens Set New Password.
const {chromium}=require('playwright');const fs=require('fs');
const BASE=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
async function open(q,{init='',dark=false}={}){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:dark?'dark':'light',serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/rig/fakesb.js','utf8')}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  if(init)await ctx.addInitScript(init);
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE+q,{waitUntil:'load'});await p.waitForTimeout(2500);return {b,p};}
const calls=(p)=>p.evaluate(()=>+(sessionStorage.getItem('__verifyCalls')||0));
(async()=>{
  // 1) a scanner opens the invite link: nothing is redeemed, the address bar is clean, the tap screen shows
  let {b,p}=await open('?token_hash=pkce_abcDEF0123456789&type=invite');
  let st=await p.evaluate(()=>{const w=document.getElementById('pbTapLink');return {shown:!!w&&w.offsetParent!==null||!!w&&getComputedStyle(w).display!=='none',title:document.getElementById('pbTapLinkTitle')?.textContent,url:location.href};});
  ok(st.shown&&st.title==='Set Up Your Account','invite link shows "Set Up Your Account" ('+st.title+')');
  ok(!/token_hash|type=/.test(st.url),'token_hash taken out of the address bar ('+st.url.replace(/^.*\//,'/')+')');
  await p.waitForTimeout(3000);
  ok(await calls(p)===0,'opening the link (no tap) redeems nothing: verifyOtp not called');
  const fit=await p.evaluate(()=>{const c=document.querySelector('#pbTapLink > div').getBoundingClientRect();return c.left>=0&&c.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;});
  ok(fit,'fits 390 px');
  // 2) Continue: verifyOtp once with the link's hash, then Set New Password opens through the existing link path
  await p.click('#pbTapLinkGo');await p.waitForTimeout(3500);
  const arg=await p.evaluate(()=>sessionStorage.getItem('__verifyArg'));
  ok(await calls(p)===1&&/pkce_abcDEF0123456789/.test(arg)&&/"invite"/.test(arg),'Continue calls verifyOtp once with the token hash and type '+arg);
  st=await p.evaluate(()=>({tap:!!document.getElementById('pbTapLink'),setpw:!!document.querySelector('#screen-setPassword.active')||getComputedStyle(document.getElementById('screen-setPassword')).display!=='none',url:location.href}));
  ok(!st.tap,'tap screen gone after the page reopened');
  ok(st.setpw,'Set New Password opens');
  ok(!/access_token|refresh_token/.test(st.url),'session tokens not left in the address bar');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();
  // 3) reset link wording
  ({b,p}=await open('?token_hash=abcdefghijklmnop&type=recovery'));
  ok(await p.evaluate(()=>document.getElementById('pbTapLinkTitle')?.textContent)==='Reset Your Password','reset link shows "Reset Your Password"');await b.close();
  // 4) a link already used (or expired): plain message, Go to Log In closes the screen
  ({b,p}=await open('?token_hash=abcdefghijklmnop&type=invite',{init:"window.__verifyOtp=()=>({data:{session:null,user:null},error:{status:403,code:'otp_expired',message:'Email link is invalid or has expired'}});"}));
  await p.click('#pbTapLinkGo');await p.waitForTimeout(800);
  st=await p.evaluate(()=>({msg:document.getElementById('pbTapLinkMsg').textContent,goHidden:getComputedStyle(document.getElementById('pbTapLinkGo')).display==='none',login:getComputedStyle(document.getElementById('pbTapLinkLogin')).display!=='none'}));
  ok(/expired or was already used/.test(st.msg)&&st.goHidden&&st.login,'used link: "expired or was already used", Go to Log In shown');
  await p.click('#pbTapLinkLogin');await p.waitForTimeout(300);
  ok(!(await p.evaluate(()=>!!document.getElementById('pbTapLink'))),'Go to Log In closes the screen');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();
  // 5) no signal: the link is kept, Continue can be tapped again
  ({b,p}=await open('?token_hash=abcdefghijklmnop&type=invite',{init:"window.__verifyOtp=()=>{throw new TypeError('Failed to fetch');};",dark:true}));
  await p.click('#pbTapLinkGo');await p.waitForTimeout(800);
  st=await p.evaluate(()=>({msg:document.getElementById('pbTapLinkMsg').textContent,go:getComputedStyle(document.getElementById('pbTapLinkGo')).display!=='none'&&!document.getElementById('pbTapLinkGo').disabled,bg:getComputedStyle(document.querySelector('#pbTapLink > div')).backgroundColor}));
  ok(/No signal/.test(st.msg)&&st.go,'no signal: says so, Continue still there');
  ok(st.bg!=='rgb(255, 255, 255)','dark mode card is dark ('+st.bg+')');await b.close();
  // 6) bad input and ordinary opens: no tap screen
  for(const q of ['','?type=invite','?token_hash=short&type=invite','?token_hash=abcdefghijklmnop&type=signup']){
    ({b,p}=await open(q));ok(!(await p.evaluate(()=>!!document.getElementById('pbTapLink'))),'no tap screen for "'+q+'"');await b.close();}
  console.log('t129 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
