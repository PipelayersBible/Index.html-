// r16.72: someone removed from a company sees "My Own Plan / Not Now" on Home
const boot=require(__dirname+'/rig/boot');
const init=require(__dirname+'/rig/co')+`;window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:null,removed:{company:'Acme Pipeline',at:new Date().toISOString()},individual:false,requested:false});
 window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true};};window.__rpcOverride.pb_removed_dismiss=()=>{window.__dis=1;return {ok:true};};`;
(async()=>{const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init});await p.waitForTimeout(4500);
 const txt=()=>p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l.hidden?'(hidden)':l.innerText.replace(/\s+/g,' ')});
 console.log('card:',await txt(),'| pill:',await p.evaluate(()=>!!document.getElementById('pbFbPill')));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0')+'/t99.png')});
 await p.click('#pbBetaLine [data-own="individual:month"]');await p.waitForTimeout(500);
 console.log('after My Own Plan:',JSON.stringify(await p.evaluate(()=>window.__req)),'|',await txt());
 await p.evaluate(()=>{window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:null,removed:{company:'Acme Pipeline'},individual:false,requested:false});});
 console.log('errs',p.errs);await b.close();
 const r2=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init});await r2.p.waitForTimeout(4500);
 await r2.p.click('#pbBetaLine [data-own="0"]');await r2.p.waitForTimeout(500);
 console.log('after Not Now: dismissed=',await r2.p.evaluate(()=>window.__dis),'line hidden=',await r2.p.evaluate(()=>document.getElementById('pbBetaLine').hidden),'errs',r2.p.errs);await r2.b.close();})();
