// firstweek_web_nov22 t_fw_trial: the trial line on Home (patch 02) and the in-use / dead-link / login texts (03-05).
// Run from tests/: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:10820/cur.html node staged/firstweek_web_nov22/tests/t_fw_trial.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const RIG=path.resolve(__dirname,'../../../rig');
const co=require(RIG+'/co'),mgr=require(RIG+'/mgr');
const BASE=process.env.PB_URL||'http://127.0.0.1:10820/cur.html';
const OUT=process.env.PB_OUT||path.resolve(__dirname,'../shots');try{fs.mkdirSync(OUT,{recursive:true});}catch(e){}
let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
async function boot(init,o={}){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',userAgent:o.ua});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(RIG+'/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.addInitScript(init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('crash',()=>console.log('PAGE CRASH'));
 await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(4500);return {b,p};}
const line=(p)=>p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return !l||l.hidden?'(hidden)':l.innerText.replace(/\s+/g,' ').trim();});
const plan=(o)=>`;window.__rpcOverride.pb_my_plan=()=>(${JSON.stringify(o)});window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true};};`;
const COMPANY=co+mgr+`;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:null,companies:{name:'Acme Pipeline',status:'active'}});
 window.__rpcOverride.pb_report_access=()=>({member:false,manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'});})();`;
const ended=new Date(Date.now()-864e5).toISOString(), soon=new Date(Date.now()+9.5*864e5).toISOString();
(async()=>{
 const errs=[];
 // 1. foreman during the trial: no line (countdown is for the office)
 let {b,p}=await boot(co+plan({ok:true,plan:'trial',trial_ends_at:soon,days_left:10,expired:false}));
 let t=await line(p);ok(t==='(hidden)','1 foreman, trial running: no trial line ('+t+')');errs.push(...p.errs);await b.close();
 // 2. company account during the trial: "Trial 10 days left" + price, no "Beta"
 ({b,p}=await boot(COMPANY+plan({ok:true,plan:'trial',trial_ends_at:soon,days_left:10,expired:false})));
 t=await line(p);ok(/^Trial 10 days left After the trial: \$99 a month for your company and 5 people, \$12 a month for each extra person/.test(t)&&!/beta/i.test(t),'2 company account, trial running: Trial chip, days, price ('+t+')');
 await p.screenshot({path:OUT+'/fw_trial_office.png'});errs.push(...p.errs);await b.close();
 // 3. foreman, trial ended, no own plan, nothing asked: only the office line, no buttons, no price
 ({b,p}=await boot(co+plan({ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:false,trial_ends_at:ended,days_left:0})));
 t=await line(p);ok(t==='Trial ended Your company’s trial has ended. Your records are safe. Your office decides what’s next.','3 foreman, trial ended: only the office line ('+t+')');
 ok(await p.evaluate(()=>document.querySelectorAll('#pbBetaLine button').length===0),'3 no buttons on the line');
 await p.screenshot({path:OUT+'/fw_trial_ended_crew.png'});errs.push(...p.errs);await b.close();
 // 4. foreman with his own plan, trial ended: says so
 ({b,p}=await boot(co+plan({ok:true,plan:'trial',expired:true,closed:true,individual:true,requested:false,trial_ends_at:ended,days_left:0})));
 t=await line(p);ok(/^Trial ended .*You have an individual plan\.$/.test(t),'4 foreman with own plan: individual line kept ('+t+')');errs.push(...p.errs);await b.close();
 // 5. foreman who asked before this build: request-sent line kept
 ({b,p}=await boot(co+plan({ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:true,trial_ends_at:ended,days_left:0})+`;try{localStorage.setItem('pbPlanReq:00000000-0000-4000-8000-000000000001','individual:year');}catch(e){}`));
 t=await line(p);ok(/Request sent: yearly/.test(t),'5 foreman who already asked: Request sent kept ('+t.slice(0,90)+')');errs.push(...p.errs);await b.close();
 // 6. company account, trial ended: the company plan offer and its button
 ({b,p}=await boot(COMPANY+plan({ok:true,plan:'trial',expired:true,closed:false,individual:false,requested:false,trial_ends_at:ended,days_left:0})));
 t=await line(p);ok(/^Trial ended .*The company plan is \$99 a month/.test(t)&&await p.evaluate(()=>!!document.querySelector('#pbBetaLine [data-plan="company"]')),'6 company account, trial ended: company offer + Start Company Plan ('+t.slice(0,120)+')');
 await p.click('#pbBetaLine [data-plan="company"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>window.__req&&window.__req.p_kind==='company'),'6 Start Company Plan sends the company request');errs.push(...p.errs);await b.close();
 // 7. no plan and no company: individual offer kept
 ({b,p}=await boot(co+plan({ok:true,plan:null,individual:false,requested:false})));
 t=await line(p);ok(/^No plan yet Your own plan is \$15 a month/.test(t),'7 no company: individual offer kept ('+t.slice(0,80)+')');errs.push(...p.errs);await b.close();
 // 8. Log In: trial link; in-use text; dead join link offers Ask for a New Link
 ({b,p}=await boot(`window.__noSession=1;`));
 const L=await p.evaluate(()=>{const a=document.querySelector('#loginTrialNote a');return a?[document.getElementById('loginTrialNote').innerText,a.href,a.target]:null;});
 ok(L&&L[0]==='No account yet? Start a free 30-day trial'&&L[1]==='https://pipelayersbible.com/#start'&&L[2]==='_blank','8 Log In: "No account yet? Start a free 30-day trial" -> pipelayersbible.com/#start ('+JSON.stringify(L)+')');
 await p.evaluate(()=>window.pbGoto&&window.pbGoto('login'));await p.waitForTimeout(600);await p.screenshot({path:OUT+'/fw_login.png'});
 ok(await p.evaluate(()=>!!document.getElementById('loginTrialNote')),'8 the note is in the Log In screen');
 errs.push(...p.errs);await b.close();
 // 9. a dead join link offers Ask for a New Link (Messages); a sign-in code's error does not
 ({b,p}=await boot(co+`;window.__rpcOverride.pb_onboard_peek=()=>({ok:false,code:'pb:link_expired'});`));
 await p.evaluate(()=>window.pbObStartJoin({token:'A'.repeat(32)}));await p.waitForTimeout(1500);
 const D=await p.evaluate(()=>{const d=document.getElementById('pbObSheet');const a=document.getElementById('pbObAskNew');return d?[d.innerText.replace(/\s+/g,' '),a&&a.getAttribute('href')]:null;});
 ok(D&&/This link has expired\. Links last 24 hours\./.test(D[0])&&/Ask for a New Link/.test(D[0])&&/^sms:\?&body=My%20join%20link/.test(D[1]||''),'9 expired join link: the 24-hour line and Ask for a New Link opening Messages ('+JSON.stringify(D).slice(0,220)+')');
 await p.screenshot({path:OUT+'/fw_link_expired.png'});errs.push(...p.errs);await b.close();
 console.log(fail?'FAILS '+fail:'ALL PASS','| page errors:',JSON.stringify(errs));process.exit(fail||errs.length?1:0);
})();
