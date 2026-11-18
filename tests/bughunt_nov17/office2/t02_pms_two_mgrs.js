// Two managers on the same job's PMs & supers. B's page loaded with PM Ann assigned. A then adds Super Bob.
// B adds PM Cal and saves: Bob must stay on the job.
const L=require('./lib');
const extra=`;(function(){const C=[{user_id:'aaaaaaaa-0000-4000-8000-00000000000a',name:'Ann PM',email:'ann@x.co',title:'pm'},{user_id:'bbbbbbbb-0000-4000-8000-00000000000b',name:'Bob Super',email:'bob@x.co',title:'superintendent'},{user_id:'cccccccc-0000-4000-8000-00000000000c',name:'Cal PM',email:'cal@x.co',title:'pm'}];
window.__srvPms=[C[0].user_id];window.__pmsSet=[];
window.__rpcOverride.pb_job_pms_get=()=>({ok:true,is_owner:true,assigned:C.filter(c=>window.__srvPms.includes(c.user_id)).map(c=>Object.assign({current:true,since:'2026-11-01'},c)),candidates:C});
window.__rpcOverride.pb_job_pms_set=(a)=>{window.__pmsSet.push(a.p_user_ids);window.__srvPms=a.p_user_ids.slice();return {ok:true,assigned:C.filter(c=>window.__srvPms.includes(c.user_id)).map(c=>Object.assign({current:true},c))};};})();`;
(async()=>{const {b,p}=await L.open(extra,{w:1280});let fail=0;
 await p.evaluate(()=>pbGoto('prodDashboard'));await p.waitForTimeout(1200);
 await p.evaluate(()=>window.pbCxOpenJob('26014'));await p.waitForTimeout(1500);
 await p.evaluate(()=>window.pbPmJobLoad());await p.waitForTimeout(500);
 await p.evaluate(()=>{window.__srvPms.push('bbbbbbbb-0000-4000-8000-00000000000b');}); // manager A adds Bob
 await p.evaluate(()=>window.pbPmJobEdit());await p.waitForTimeout(300);
 await p.evaluate(()=>{const i=[...document.querySelectorAll('#pjPmSec input[type=checkbox]')].find(x=>x.dataset.uid.startsWith('cccc'));i.checked=true;i.dispatchEvent(new Event('change'));});
 await p.evaluate(()=>window.pbPmJobSave());await p.waitForTimeout(1500);
 const s=await p.evaluate(()=>window.__pmsSet);console.log('sent:',JSON.stringify(s));
 const msg=await p.evaluate(()=>{const e=document.getElementById('pjPmMsg');return e?e.innerText:''});console.log('msg:',msg);
 const last=s[s.length-1]||[];
 if(!last.includes('bbbbbbbb-0000-4000-8000-00000000000b')){console.log('FAIL: Bob (added by manager A) was taken off the job');fail=1;}
 if(!last.includes('cccccccc-0000-4000-8000-00000000000c')){console.log('FAIL: Cal not added');fail=1;}
 if(p.errs.length){console.log('errs',p.errs);fail=1;}
 console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();process.exit(fail);})();
