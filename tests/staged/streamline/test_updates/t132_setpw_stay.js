// (streamline: ticks the Terms on the password screen; the "signed in" words are a note, #pbSayDone, not a box)
// r17.09: after an invite (or reset) link's Save New Password the phone STAYS signed in: Home opens, no log out, no
// Log In screen, the link's marker is gone. A link left open whose password was already saved is kept signed in too.
const {chromium}=require('playwright');const fs=require('fs');
const BASE=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const COUNT="(()=>{const w=()=>{const sb=window.supabase;if(!sb||!sb.createClient||sb.__wrapped){return setTimeout(w,5);}sb.__wrapped=1;const cc=sb.createClient;sb.createClient=function(){const c=cc.apply(this,arguments);const so=c.auth.signOut;c.auth.signOut=function(){sessionStorage.setItem('__signOuts',String(+(sessionStorage.getItem('__signOuts')||0)+1));return so.apply(this,arguments);};const uu=c.auth.updateUser;c.auth.updateUser=function(a){sessionStorage.setItem('__pw',a&&a.password||'');return uu.apply(this,arguments);};return c;};};w();})();";
async function open(q,init=''){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/rig/fakesb.js','utf8')}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.addInitScript(COUNT);if(init)await ctx.addInitScript(init);
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE+q,{waitUntil:'load'});await p.waitForTimeout(2500);return {b,p};}
const shown=(p,id)=>p.evaluate(id=>{const e=document.getElementById(id);return !!e&&getComputedStyle(e).display!=='none';},id);
const modalText=(p)=>p.evaluate(()=>[document.getElementById('pbSayDone')].filter(e=>e&&!e.hidden).concat([...document.querySelectorAll('.pb-modal, .pb-modal-overlay, [role=dialog]')].filter(e=>getComputedStyle(e).display!=='none')).map(e=>e.textContent).join(' | '));
(async()=>{
  for(const type of ['invite','recovery']){
    let {b,p}=await open('?token_hash=pkce_abcDEF0123456789&type='+type);
    await p.click('#pbTapLinkGo');await p.waitForTimeout(3500);
    ok(await shown(p,'screen-setPassword'),type+': Set New Password opens');
    if(await p.$('#pbTermsSheet')){await p.check('#pbTermsBox');await p.click('#pbTermsYes');await p.waitForTimeout(1500);}
    else if(await p.$('#setPwTerms')&&await p.isVisible('#setPwTerms'))await p.check('#setPwTerms'); // streamline 01: the tick is on the screen
    await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');
    await p.click('#setPwBtn');await p.waitForTimeout(3000);
    const st=await p.evaluate(()=>({pw:sessionStorage.getItem('__pw'),outs:+(sessionStorage.getItem('__signOuts')||0),marker:localStorage.getItem('pbLinkSignInOpen'),notice:sessionStorage.getItem('pbLoginNotice')}));
    ok(st.pw==='NewPass1234',type+': the new password was sent');
    ok(st.outs===0,type+': no sign-out after Save ('+st.outs+')');
    ok(!st.marker,type+': link marker removed');
    ok(!st.notice,type+': no "log in with your new password" notice');
    ok(await shown(p,'screen-home')&&!(await shown(p,'screen-login'))&&!(await shown(p,'screen-setPassword')),type+': Home shows, not Log In');
    const m=await modalText(p);
    ok(/signed in/.test(m)&&(type==='invite'?/Password set/.test(m):/Password changed/.test(m)),type+': says you’re signed in: '+m.replace(/\s+/g,' ').slice(0,140));
    // reopen the app: still signed in, nothing logs out
    await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
    ok(!(await shown(p,'screen-login'))&&+(await p.evaluate(()=>sessionStorage.getItem('__signOuts')||0))===0,type+': reopened: still signed in, no sign-out');
    ok(p.errs.length===0,type+': no page errors '+JSON.stringify(p.errs));await b.close();
  }
  // a link whose password was saved but the app closed before it finished: kept signed in, marker cleared
  let {b,p}=await open('',"if(!sessionStorage.getItem('__seeded')){sessionStorage.setItem('__seeded','1');localStorage.setItem('pbLinkSignInOpen',JSON.stringify({uid:'u1',invite:true,set:true,tab:'gone',beat:0}));}");
  await p.waitForTimeout(3000);
  let st=await p.evaluate(()=>({outs:+(sessionStorage.getItem('__signOuts')||0),marker:localStorage.getItem('pbLinkSignInOpen'),notice:sessionStorage.getItem('pbLoginNotice')}));
  const uid=await p.evaluate(()=>{try{return sbUser&&sbUser.id;}catch(e){return null;}});
  ok(st.outs===0&&!st.notice,'left-open link with password saved: not logged out (uid '+uid+')');
  ok(!st.marker||uid!=='u1','left-open link with password saved: marker cleared');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();
  console.log('t132 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
