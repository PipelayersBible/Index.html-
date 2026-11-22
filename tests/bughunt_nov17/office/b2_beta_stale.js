// Home's beta line must not show an old "N days left" after the beta ended, and must follow the server when the app comes back to the front.
const L=require('./lib');
const UID='00000000-0000-4000-8000-000000000001';
const line=(p)=>p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return !l?'(none)':l.hidden?'(hidden)':l.innerText.replace(/\s+/g,' ');});
(async()=>{let ok=true;const now=Date.now(),iso=(d)=>new Date(now+d*864e5).toISOString();
 // 1. kept copy says 3 days left, but the beta ended 7 days ago and the server can't be reached
 {const cached={ok:true,plan:'trial',expired:false,closed:false,days_left:3,trial_ends_at:iso(-7)};
  const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbPlan:${UID}',${JSON.stringify(JSON.stringify(cached))});}catch(e){};window.__rpcOverride.pb_my_plan=()=>null;`,wait:6000});
  const t=await line(p);console.log('1 stale copy, no server:',t);if(/days? left/.test(t)||!/(Beta|Trial) ended/.test(t)){ok=false;console.log('  FAIL: still counts days after the end');}
  await b.close();}
 // 2. kept copy says 9 days left as of 4 days ago (ends in 5): shows 5
 {const cached={ok:true,plan:'trial',expired:false,closed:false,days_left:9,trial_ends_at:iso(4.6)};
  const {b,p}=await L.boot(L.URL,{init:L.co+`;try{localStorage.setItem('pbPlan:${UID}',${JSON.stringify(JSON.stringify(cached))});}catch(e){};window.__rpcOverride.pb_my_plan=()=>null;`,wait:6000});
  const t=await line(p);console.log('2 old count:',t);if(t!=='(hidden)'){ok=false;console.log('  FAIL: a crew member sees no trial countdown (firstweek Nov 22: only the office does)');}
  await b.close();}
 // 3. beta ended; the owner makes the company paid; the app comes back to the front later: the line goes
 {const ended={ok:true,plan:'trial',expired:true,closed:true,individual:false,requested:true,days_left:0,trial_ends_at:iso(-5)};
  const {b,p}=await L.boot(L.URL,{init:L.co+`;window.__plan=${JSON.stringify(ended)};window.__rpcOverride.pb_my_plan=()=>window.__plan;`,wait:6000});
  console.log('3 before:',await line(p));
  await p.evaluate(()=>{window.__plan={ok:true,plan:'paid',expired:false,closed:false,individual:false,requested:false};
   const RealNow=Date.now;Date.now=()=>RealNow()+20*60000; // 20 minutes later
   document.dispatchEvent(new Event('visibilitychange'));});
  await p.waitForTimeout(2500);
  const t=await line(p);console.log('3 after the company paid and the app came back to the front:',t);if(t!=='(hidden)'){ok=false;console.log('  FAIL: still shows the ended beta');}
  await b.close();}
 console.log(ok?'PASS':'FAIL');process.exit(ok?0:1);})();
