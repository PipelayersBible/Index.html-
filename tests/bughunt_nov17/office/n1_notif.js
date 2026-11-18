const L=require('./lib');
const base=`;window.__rpcOverride.pb_push_prefs_get=()=>({prefs:{runs_waiting:true,mgmt_report:false,material_alert:true,delays:true,schedule:true,safety:true,plan_change:true,locates:true,permit_due:true,permit_closed:true,run_back:true,crew_nudge:true,run_end_ask:true,crew_production:true},kinds:['runs_waiting','mgmt_report','crew_production','run_end_ask','material_alert','crew_nudge','permit_closed','permit_due','locates','schedule','delays','plan_change','safety','run_back'],report_reader:ROLE==='mgr'});
window.__rpcOverride.pb_push_prefs_set=(a)=>{(window.__pp=window.__pp||[]).push(a);return {ok:true};};window.__rpcOverride.pb_report_access=()=>ROLE==='mgr'?({member:false,manager:true,company_id:null,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'}):({member:true,manager:false,company_id:'11111111-1111-4111-8111-111111111111'});`;
(async()=>{for(const role of ['mgr','foreman']){
 const {b,p}=await L.boot(L.URL,{init:`window.ROLE='${role}';`+L.co+(role==='mgr'?L.mgr:'')+base,wait:5000});
 await p.evaluate(()=>window.pbOpenNotifications());await p.waitForTimeout(2500);
 const rows=await p.evaluate(()=>[...document.querySelectorAll('#screen-notifications label, #screen-notifications [id^=notifType]')].filter(e=>e.offsetParent&&e.querySelector&&e.querySelector('input[type=checkbox]')).map(e=>e.innerText.replace(/\s+/g,' ').slice(0,70)+' ['+(e.querySelector('input').checked?'on':'off')+']'));
 console.log('==',role,'\n '+[...new Set(rows)].join('\n '));
 console.log('status:',(await L.txt(p,'#screen-notifications')).slice(0,500));
 console.log('ovf',JSON.stringify(await L.ovf(p)),'errs',p.errs);
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/n1_'+role+'.png',fullPage:true});
 // toggle the first visible type switch
 const id=await p.evaluate(()=>{const i=[...document.querySelectorAll('#screen-notifications input[type=checkbox]')].find(e=>e.offsetParent&&/notifType/.test(e.id));if(!i)return null;i.click();return i.id;});
 await p.waitForTimeout(1200);
 console.log('toggled',id,'sent',JSON.stringify(await p.evaluate(()=>window.__pp)),'| msg:',await L.txt(p,'#notifPrefsMsg'));
 await b.close();}})();
