// After a beta closes (3 days past its end) the server answers pb_daily_submit with { ok:false, code:'pb:beta_ended' }.
// Home says "New runs and reports wait on this phone and send once your company starts a plan", so a signed daily
// report must stay waiting (and go by itself later), not turn into "Not accepted".
const L=require('./lib');
const UID='00000000-0000-4000-8000-000000000001';
const rep={cid:'dr-test-1',jobNumber:'24-017',jobsite:'Test Sewer',workDate:'2026-11-16',snapshot:{v:1,job_number:'24-017',work_date:'2026-11-16',sections:{}},sha:'a'.repeat(64),signedName:'Test Foreman',signedAt:Date.now()-3600e3,tz:'America/Los_Angeles',signature:null,state:'waiting',why:'',clockOk:true,co:'11111111-1111-4111-8111-111111111111',version:1};
const init=L.co+`;try{localStorage.setItem('${UID}:foremanDaily',JSON.stringify({v:1,checks:[],reports:[${JSON.stringify(rep)}],items:{},weather:{},co:'11111111-1111-4111-8111-111111111111'}));}catch(e){}
window.__subs=0;window.__closed=true;
window.__rpcOverride.pb_daily_submit=(a)=>{window.__subs++;return window.__closed?{ok:false,code:'pb:beta_ended',detail:'pb:beta_ended',sqlstate:'P0001'}:{ok:true,id:'srv1',version:1,received_at:new Date().toISOString()};};
window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',expired:true,closed:true,individual:false,requested:false,trial_ends_at:new Date(Date.now()-5*864e5).toISOString(),days_left:0});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});
 const state=()=>p.evaluate((k)=>{try{const o=JSON.parse(localStorage.getItem(k));return o.reports.map(r=>r.state+' | '+(r.why||'')).join(' ; ');}catch(e){return 'ERR '+e.message;}},UID+':foremanDaily');
 await p.evaluate(()=>window.pbOpenDailyReport());await p.waitForTimeout(4000);
 const s1=await state();console.log('submits:',await p.evaluate(()=>window.__subs),'| state after a closed-beta answer:',s1);
 console.log('home line:',await p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l?l.innerText.replace(/\s+/g,' '):'';}));
 console.log('screen text:',((await L.txt(p,'#screen-dailyReport'))||'').slice(0,400));
 const ok1=/^waiting/.test(s1);
 // the company starts a plan: the next pass must send it without anyone tapping anything
 await p.evaluate(()=>{window.__closed=false;});
 await p.evaluate(()=>{window.dispatchEvent(new Event('online'));});await p.waitForTimeout(6000);
 await p.evaluate(()=>window.pbGotoTab('home'));await p.waitForTimeout(500);await p.evaluate(()=>window.pbOpenDailyReport());await p.waitForTimeout(4000);
 const s2=await state();console.log('after the company pays:',s2,'| submits:',await p.evaluate(()=>window.__subs));
 const ok2=/^sent/.test(s2);
 console.log(ok1&&ok2?'PASS':'FAIL: '+(!ok1?'the report was marked refused instead of waiting; ':'')+(!ok2?'it did not send by itself once the plan started':''),'errs',p.errs);
 await b.close();process.exit(ok1&&ok2?0:1);})();
