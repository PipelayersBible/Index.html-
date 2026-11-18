const L=require('./lib');
const init=L.co+L.mgr+`;(function(){const now=new Date().toISOString();
 window.__mats=[{id:'m1',name:'8" SDR-35 PVC',category:'pipe',source:'pipe_footage',unit:'LF',expected:2100,alert_pct:80,footage_cat:'pipe',version:1,fig:{used:1756,waiting:0,ordered:1800},orders:[{id:'o1',qty:1800,unit:'LF',ordered_on:'2026-10-20',ref:'PO 1182'}],uses:[]},
  {id:'m2',name:'Manhole 48"',category:'structures',source:'entered',unit:'EA',expected:6,alert_pct:80,version:1,fig:{used:4,waiting:0,ordered:0},orders:[],uses:[{id:'u1',qty:4,unit:'EA',used_on:'2026-11-01',note:'MH 1-4'}]},
  {id:'m3',name:'3/4" Crushed Rock Bedding with a very long descriptive material name for wrapping',category:'bedding',source:'bedding_calc',unit:'ton',basis:'weight',expected:400,alert_pct:80,trench_width_ft:3,bed_thick_ft:0.5,density_tpy:1.4,extra_pct:10,use_as:'bedding',version:2,fig:{used:310.55,waiting:12,ordered:300,estimate:true},orders:[{id:'o2',qty:300,unit:'ton',ordered_on:'2026-10-22'}],uses:[]}];
 Object.assign(window.__rpcOverride,{pb_report_access:()=>({member:false,manager:true,company_id:null,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'}),
  pb_mat_job:()=>({ok:true,materials:window.__mats,server_at:now}),pb_mat_tickets:()=>({lines:[]}),pb_mat_job_settings:()=>({settings:null}),
  pb_mat_used_add:(a)=>{(window.__calls=window.__calls||[]).push(['used',a]);return {ok:true};},pb_mat_order_add:(a)=>{(window.__calls=window.__calls||[]).push(['order',a]);return {ok:true};},
  pb_mat_save:(a)=>{(window.__calls=window.__calls||[]).push(['save',a]);return {ok:true,material:{id:'m9'}};}});})();try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:5000});
 await p.route('**/functions/v1/ai**',async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,v:2,text:'Takeoff from sheet C-3.',used:1,limit:100,type:'data',sources:[],proposal:{job:'26014',items:[{name:'8" SDR-35 PVC',kind:'pipe',qty:2250.5,unit:'LF',basis:'Sheet C-3 mainline'},{name:'Manhole 48"',kind:'structures',qty:7,unit:'EA',basis:'MH-1..7'},{name:'Class 2 Base',kind:'base',qty:120,unit:'ton',basis:'trench patch'},{name:'Concrete Collar',kind:'concrete',qty:3.5,unit:'CY',basis:'collars'}]}})});});
 await p.evaluate(()=>window.pbCxOpenJob('26014','materials'));await p.waitForTimeout(3000);
 console.log('screen',await L.scr(p),'ovf',JSON.stringify(await L.ovf(p)));
 const sec=()=>L.txt(p,'#pjMatSec');console.log(((await sec())||'(no section)').slice(0,900));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/m1_mat.png',fullPage:true});
 // record use on m2
 await p.evaluate(()=>window.pbMatUsedForm('m2'));await p.waitForTimeout(400);
 console.log('use form:',((await sec())||'').slice(0,300));
 const ids=await p.evaluate(()=>[...document.querySelectorAll('#pjMatSec input, #pjMatSec select, #pjMatSec textarea')].map(e=>e.id+':'+e.type));console.log(ids.join(' '));
 const calls=()=>p.evaluate(()=>JSON.stringify(window.__calls||[]));
 for(const q of ['', '0', 'abc', '1,5', '2.5', '1e3', '-1', ' 3 ']){await p.fill('#pmf_qty',q);await p.evaluate(()=>window.pbMatFormSave());await p.waitForTimeout(500);
  const open=await p.evaluate(()=>!!document.getElementById('pmf_qty'));console.log('qty',JSON.stringify(q),'->',open?'err: '+(await L.txt(p,'#pmfErr')):'saved','| calls',await calls());
  if(!open){await p.evaluate(()=>{window.__calls=[];window.pbMatUsedForm('m2');});await p.waitForTimeout(300);}}
 // future date
 await p.fill('#pmf_qty','1');await p.fill('#pmf_date','2027-01-01');await p.evaluate(()=>window.pbMatFormSave());await p.waitForTimeout(500);console.log('future date ->',await p.evaluate(()=>!!document.getElementById('pmf_qty'))?'err: '+(await L.txt(p,'#pmfErr')):'saved '+await calls());
 await p.evaluate(()=>window.pbMatFormCancel&&window.pbMatFormCancel());
 // takeoff from Ask
 await p.evaluate(()=>window.pbAskFromTab());await p.waitForTimeout(500);
 await p.fill('#aiAskBox','do a material takeoff for job 26014 from the plans');await p.click('#aiAskBtn');await p.waitForTimeout(1500);
 console.log('ask card:',((await L.txt(p,'#aiAskHistory'))||'').slice(0,500));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/m1_ask_prop.png'});
 await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.offsetParent&&x.textContent.trim()==='Review in Job Materials');b&&b.click();});await p.waitForTimeout(2500);
 console.log('takeoff panel:',await L.txt(p,'#pjMatTk'));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/m1_takeoff.png',fullPage:true});
 for(const k of [0,1,2,3]){const id=await p.evaluate((k)=>{const b=document.getElementById('pjMatTkSet'+k)||document.getElementById('pjMatTkAdd'+k);if(!b)return null;b.click();return b.id;},k);await p.waitForTimeout(500);if(!id){console.log(k,'no button');continue;}
  const f=await p.evaluate(()=>{const g=(i)=>{const e=document.getElementById(i);return e?e.value:undefined;};return {name:g('pmf_name'),expected:g('pmf_expected'),unit:g('pmf_unit'),cat:g('pmf_category'),src:g('pmf_source')};});
  await p.evaluate(()=>{window.__calls=[];return window.pbMatFormSave();});await p.waitForTimeout(700);
  console.log(k,id,JSON.stringify(f),'| err:',await L.txt(p,'#pmfErr'),'| sent:',(await calls()).slice(0,420));
  await p.evaluate(()=>{if(document.getElementById('pmf_name'))window.pbMatFormCancel();});await p.waitForTimeout(300);}
 console.log('ovf',JSON.stringify(await L.ovf(p)),'errs',p.errs);
 await b.close();})();
