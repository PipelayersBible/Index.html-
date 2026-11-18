// fails on r16.88, passes on fix.html: manager boxes appear once the access answer arrives while Settings is open
// (first login on a phone: no saved access answer, pb_prod_access answers after 4 s)
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mgr=require('/home/claude/rig/mgr');
const slow=";Object.defineProperty(window,'supabase',{configurable:true,get(){return undefined;},set(v){const cc=v.createClient;v.createClient=function(){const c=cc.apply(this,arguments);const r=c.rpc;c.rpc=(n,a)=>n==='pb_prod_access'?new Promise(x=>setTimeout(x,4000)).then(()=>r(n,a)):r(n,a);return c;};Object.defineProperty(window,'supabase',{value:v,writable:true,configurable:true});}});";
(async()=>{
 const {b,p}=await boot('http://127.0.0.1:8861/'+(process.env.PG||'cur.html'),{init:co+mgr+slow,wait:50});
 await p.evaluate(()=>{window.__mfaApi={listFactors:async()=>({data:{totp:[]}}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'}}),enroll:async()=>({}),challengeAndVerify:async()=>({data:{}}),unenroll:async()=>({data:{}})};});
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(1500);
 const g0=await p.evaluate(()=>[document.getElementById('settingsMfa').innerText.slice(0,40),document.getElementById('settingsAdminLog').innerText.slice(0,40)]);
 await p.waitForTimeout(9000);
 const g=await p.evaluate(()=>[document.getElementById('settingsMfa').innerText.slice(0,40),document.getElementById('settingsAdminLog').innerText.slice(0,40)]);
 console.log('1.5 s:',JSON.stringify(g0),' 10 s:',JSON.stringify(g),'access asked:',await p.evaluate(()=>window.__rpcLog.filter(n=>n==='pb_prod_access').length));const ok=/Two-step/.test(g[0])&&/Admin access log/.test(g[1]);console.log(ok?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
