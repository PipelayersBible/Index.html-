// r16.15: runs come back from the account after a reinstall (Records + Stats)
const boot=require('./boot'),mkrun=require('./mkrun');const {chromium}=require('playwright');
(async()=>{const url=process.argv[2];
let {b,p}=await boot(url);await mkrun(p,100);await mkrun.lock(p);await p.waitForTimeout(800);
const base=await p.evaluate(()=>{const U='00000000-0000-4000-8000-000000000001:';return JSON.parse(localStorage.getItem(U+'runArchive')).find(x=>x.kind==='run');});
await b.close();
console.log('base keys',Object.keys(base).length,base.lockTime,base.id);
const mk=(id,extra)=>Object.assign(JSON.parse(JSON.stringify(base)),{id,lockTime:new Date(id).toISOString(),photos:undefined,pbOffice:{laidFt:extra.laid,who:'Mike Smith',whoRole:'pipelayer',foreman:'Brandon Jones',send:true}},extra.f);
const t0=Date.now()-5*86400000;
const A=mk(t0,{laid:100,f:{statsType:'PVC SDR 35',completed:true,incomplete:false,completedDistance:100,reportSentAt:t0+1000}});
const B1=mk(t0+86400000,{laid:40,f:{statsType:'PVC SDR 35',completed:false,incomplete:true,completedDistance:40,resumedIntoId:t0+2*86400000,reportSentAt:t0+86401000}});
const B2=mk(t0+2*86400000,{laid:100,f:{statsType:'PVC SDR 35',completed:true,incomplete:false,completedDistance:100,resumedFromId:t0+86400000,reportSentAt:t0+2*86401000}});
const rows=[B2,B1,A].map((r,i)=>({row_id:'00000000-0000-4000-8000-00000000000'+(i+2),entry_id:String(r.id),locked_at:r.lockTime,version:1,record:r}));
const init=`window.__rows=${JSON.stringify(rows)};window.__tableOne={subscriptions:{tier:'individual',status:'active'},company_members:{company_id:'c1',role:'pipelayer',title:'Pipelayer',companies:{name:'Test Co',status:'active'}}};
const now=()=>new Date().toISOString();
window.__rpcOverride={pb_prod_access:()=>({member:true,company_id:'c1',manager:false,role:'pipelayer',server_at:now()}),pb_report_access:()=>({member:true,company_id:'c1',manager:false,role:'pipelayer',server_at:now()}),
 pb_run_mine_page:(a)=>{window.__pages=(window.__pages||0)+1;return window.__rows;}, pb_prod_run_record_put:(a)=>{(window.__puts=window.__puts||[]).push(a.p_entry_id);return {ok:true,same:true};}};`;
({b,p}=await boot(url,{init,wait:3000}));
// auto offer after ~9 s
let modal=null;for(let i=0;i<40&&!modal;i++){await p.waitForTimeout(1000);modal=await p.evaluate(()=>{const m=document.getElementById('pbModalMessage');return m&&m.offsetParent?m.innerText:null;});}
console.log('AUTO MODAL:',modal&&modal.replace(/\s+/g,' '));
await p.screenshot({path:'restore_ask.png'});
await p.locator('button',{hasText:'Restore'}).last().click();await p.waitForTimeout(2500);
const done=await p.evaluate(()=>{const m=document.getElementById('pbModalMessage');return m&&m.offsetParent?m.innerText:null;});console.log('DONE MODAL:',done);
const st=await p.evaluate(()=>{const U='00000000-0000-4000-8000-000000000001:';const ra=JSON.parse(localStorage.getItem(U+'runArchive')||'[]');const sl=JSON.parse(localStorage.getItem(U+'statsLog')||'[]');
 return {runs:ra.filter(x=>x.kind==='run').map(x=>[x.id,x.restoredFromCloud,x.restoredLaidFt,!!x.rfWho]),stats:sl.map(s=>[s.entryId,s.type,s.footage,s.durationMin]),asked:localStorage.getItem(U+'runRestoreAsked'),sent:localStorage.getItem(U+'rrSent'),
  copyLaid:window.__pbRrDebug.copy(ra.find(x=>x.kind==='run').id).pbOffice};});
console.log(JSON.stringify(st,null,1));
await p.evaluate(()=>window.__pbRrDebug.send());await p.waitForTimeout(1500);console.log('PUTS after send:',await p.evaluate(()=>window.__puts||[]));
// manual: nothing left
await p.evaluate(()=>{window.pbShowScreen?pbShowScreen('archive'):0;});await p.waitForTimeout(800);
console.log('BOX:',await p.evaluate(()=>{const b=document.getElementById('archiveRunRestore');return b?[b.hidden,b.innerText]:null;}));
await p.evaluate(()=>window.pbRunRestore());await p.waitForTimeout(1500);
console.log('MANUAL:',await p.evaluate(()=>{const m=document.getElementById('pbModalMessage');return m&&m.offsetParent?m.innerText:null;}));
await p.screenshot({path:'restore_after.png'});
console.log('ERRS',p.errs);await b.close();})();
