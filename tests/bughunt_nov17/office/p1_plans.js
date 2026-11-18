// Plans: a beta company's set is parked by the server; the app must not say "Ask can use each sheet as soon as it's read"
const L=require('./lib');
const init='('+require(__dirname+'/../../rig/pm_plans').toString()+')();'+`window.__rpcOverride.pb_plans_uploaded=(a)=>{window.__planCalls.push(['uploaded',a]);window.__planSets=[{id:'S1',title:'plan1',pages:1,state:'parked',read:0,uploaded:1,failed:0,mine:true}];return {ok:true,parked:true};};
window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',days_left:20,expired:false});window.__rpcOverride.pb_terms_status=()=>({terms:'1.0',privacy:'1.0',at:new Date().toISOString()});try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','${require(__dirname+'/../../rig/env').NOTICE}');}catch(e){}`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:4500});
 await p.evaluate(()=>window.pbOpenProdJob(0));await p.waitForTimeout(2000);
 await p.evaluate(()=>window.pbPlansOpenFromJob());await p.waitForTimeout(1000);
 console.log('screen',await L.scr(p),'add shown:',await p.evaluate(()=>!document.getElementById('plansAddWrap').hidden));
 await p.setInputFiles('#plansFile',__dirname+'/plan1.pdf');
 for(let i=0;i<60;i++){await p.waitForTimeout(500);if(await p.evaluate(()=>document.getElementById('plansWait').hidden)&&i>2)break;}
 const line=await L.txt(p,'#plansLine'),list=await L.txt(p,'#plansList');
 console.log('line:',line,'| list:',list,'| calls:',await p.evaluate(()=>window.__planCalls.map(c=>c[0]).join(' ')));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/office/shots')+'/p1_plans.png'),fullPage:true});
 console.log('ovf',JSON.stringify(await L.ovf(p)),'errs',p.errs);
 const bad=/Ask can use each sheet as soon as it.s read/.test(line||'');
 console.log(bad?'FAIL: says Ask can use the sheets although the set is parked until a paid plan':'PASS');
 await b.close();process.exit(bad?1:0);})();
