const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 await p.waitForTimeout(1500);
 // mock the MFA API on the app's client
 await p.evaluate(()=>{window.__mfa={factors:[],aal:{currentLevel:'aal1',nextLevel:'aal1'},verified:[]};const M=window.__mfa;
   const c=window.sbClient||null;});
 await p.evaluate(()=>{const M=window.__mfa;window.__mfaApi={
   listFactors:async()=>({data:{totp:M.factors}}),
   getAuthenticatorAssuranceLevel:async()=>({data:M.aal}),
   enroll:async()=>{const f={id:'f1',status:'unverified'};M.factors.push(f);return {data:{id:'f1',totp:{qr_code:'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22></svg>',secret:'ABCDEF123456'}}};},
   challengeAndVerify:async({factorId,code})=>{if(code!=='123456')return {error:{message:'Invalid TOTP code entered'}};M.factors.forEach(f=>{if(f.id===factorId)f.status='verified';});M.aal={currentLevel:'aal2',nextLevel:'aal2'};return {data:{}};},
   unenroll:async({factorId})=>{M.factors=M.factors.filter(f=>f.id!==factorId);return {data:{}};}};});
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1200);
 console.log('settings:',await p.evaluate(()=>document.getElementById('settingsMfa').innerText));
 await p.click('#pbMfaOn');await p.waitForTimeout(600);
 console.log('enroll sheet:',await p.evaluate(()=>{const d=document.getElementById('pbMfaSheet');return d?d.innerText.slice(0,120):null;}));
 await p.fill('#pbMfaNew','111111');await p.click('#pbMfaSave');await p.waitForTimeout(400);
 console.log('wrong code:',await p.evaluate(()=>document.getElementById('pbMfaNewErr').textContent));
 await p.fill('#pbMfaNew','123456');await p.click('#pbMfaSave');await p.waitForTimeout(800);
 console.log('after right code:',JSON.stringify(await H.modal()));await H.modalClick('OK').catch(()=>{});await p.waitForTimeout(800);
 console.log('settings now:',await p.evaluate(()=>document.getElementById('settingsMfa').innerText));
 // a new login: aal1 with a verified factor -> code sheet
 await p.evaluate(()=>{window.__mfa.aal={currentLevel:'aal1',nextLevel:'aal2'};});
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(1200);
 console.log('login sheet:',await p.evaluate(()=>{const d=document.getElementById('pbMfaSheet');return d?d.innerText.slice(0,80):null;}));
 await p.fill('#pbMfaIn','123456');await p.click('#pbMfaGo');await p.waitForTimeout(600);
 console.log('sheet gone:',await p.evaluate(()=>!document.getElementById('pbMfaSheet')));
 await p.screenshot({path:'/tmp/claude-0/mfa.png'});
 console.log('errs',p.errs.slice(0,3));await b.close();})();
