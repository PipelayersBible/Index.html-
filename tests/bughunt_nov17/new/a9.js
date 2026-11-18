const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mgr=require('/home/claude/rig/mgr');
async function run(init,wait,label){const {b,p}=await boot('http://127.0.0.1:8861/cur.html',{init,wait});
 await p.evaluate(()=>{window.__mfaApi={listFactors:async()=>({data:{totp:[]}}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}}),enroll:async()=>({}),challengeAndVerify:async()=>({data:{}}),unenroll:async()=>({data:{}})};});
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1500);
 const g=()=>p.evaluate(()=>[document.getElementById('settingsMfa').innerText.slice(0,60),document.getElementById('settingsAdminLog').innerText.slice(0,40)]);
 console.log(label,'at 1.5s:',JSON.stringify(await g()));await p.waitForTimeout(6000);console.log(label,'at 7.5s:',JSON.stringify(await g()));
 await b.close();}
(async()=>{await run(co+mgr,3000,'mgr warm');await run(co+mgr,50,'mgr cold');
 // slow access RPC
 await run(co+mgr+`;(()=>{const iv=setInterval(()=>{if(window.__rpcOverride){clearInterval(iv);const o=window.__rpcOverride.pb_prod_access;window.__rpcOverride.pb_prod_access=async(a)=>{await new Promise(r=>setTimeout(r,4000));return typeof o==='function'?o(a):o;};}},5);})();`,50,'mgr slow access');
})();
