const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');
async function run(factors,aal,label){const {b,p}=await boot('http://127.0.0.1:8878/cur.html',{init:co});await p.waitForTimeout(1500);
 await p.evaluate(([fs,aal])=>{window.__mfaApi={listFactors:async()=>({data:{totp:fs}}),getAuthenticatorAssuranceLevel:async()=>({data:aal}),enroll:async()=>({}),challengeAndVerify:async()=>({data:{}}),unenroll:async()=>({data:{}})};},[factors,aal]);
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1500);
 console.log(label,'settings:',JSON.stringify(await p.evaluate(()=>document.getElementById('settingsMfa').innerText)),'code sheet:',await p.evaluate(()=>!!document.getElementById('pbMfaSheet')));
 console.log('errs',p.errs.slice(0,3));await b.close();}
(async()=>{await run([],{currentLevel:'aal1',nextLevel:'aal1'},'foreman, off:');
 await run([{id:'f1',status:'verified'}],{currentLevel:'aal1',nextLevel:'aal2'},'foreman, already on, new login:');})();
