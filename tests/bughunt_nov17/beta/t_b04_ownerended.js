// beta audit 04: the company account's ended-beta line speaks to the company (one Start Company Plan button), crew unchanged
const boot=require(__dirname+'/../../rig/boot');const ci=require('./coinit');
const co=require(__dirname+'/../../rig/co');const f=process.argv[2]||'cur.html';
const plan=`;window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',trial_ends_at:new Date(Date.now()-864e5).toISOString(),expired:true,closed:false,individual:false,requested:false,days_left:0});window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true};};`;
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 {const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+f,{init:ci()+plan,wait:6500});
  const t=await p.evaluate(()=>document.getElementById('pbBetaLine').innerText.replace(/\s+/g,' '));
  const btns=await p.evaluate(()=>[...document.querySelectorAll('#pbBetaLine button')].map(b=>b.textContent));
  ok(/stop reaching you in 2 days unless you start a plan/.test(t)&&btns.join()==='Start Company Plan','owner: '+t+' ['+btns+']');
  await p.click('#pbBetaLine [data-plan="company"]');await p.waitForTimeout(500);
  ok((await p.evaluate(()=>window.__req&&window.__req.p_kind))==='company'&&/Request sent/.test(await p.evaluate(()=>document.getElementById('pbBetaLine').innerText)),'owner tap sends a company plan request');
  ok(!p.errs.length,'no errors '+p.errs);await b.close();}
 {const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+f,{init:co+plan,wait:6500});
  const btns=await p.evaluate(()=>[...document.querySelectorAll('#pbBetaLine button')].map(b=>b.textContent));
  ok(btns.join()==='Company Plan,My Own Plan','crew unchanged ['+btns+']');await b.close();}
 process.exit(fails?1:0);})();
