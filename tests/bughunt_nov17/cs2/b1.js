// cs2 06: the office board hears EMERGENCY (and its end) right away, not on the next 60 s tick
const L=require('./lib2');(async()=>{const {b,p,H}=await L({extra:`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_permit_status_put:(a)=>{(window.__st=window.__st||[]).push({t:Date.now(),em:!!(a&&a.p_status&&a.p_status.emergency),inside:a&&a.p_status&&a.p_status.inside});return {ok:true,stale:false,server_at:new Date().toISOString()};}});`});
 let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 await H.lock();await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await p.waitForTimeout(7000); // the first status (account-load hook) goes up
 console.log('before',JSON.stringify(await p.evaluate(()=>window.__st||[])));
 const t0=Date.now();await p.evaluate(()=>pbTriggerEmergency());await p.waitForTimeout(5000);
 const st=await p.evaluate(()=>window.__st||[]);console.log('after',JSON.stringify(st));
 ok(st.some(x=>x.em&&x.t>=t0&&x.t-t0<5000),'board status with EMERGENCY sent within 5 s');
 await p.evaluate(()=>pbDismissEmergencyPanel('resolved'));await p.waitForTimeout(400);const bt=await H.modalBtns();const t1=Date.now();await H.modalClick(bt[bt.length-1]);
 await p.waitForTimeout(5000);const st2=await p.evaluate(()=>window.__st||[]);console.log('dismiss',bt,JSON.stringify(st2),JSON.stringify(await H.D('confinedEmergencyIncidents')));
 ok(st2.some(x=>!x.em&&x.t>=t1),'board status with the emergency ended sent within 5 s');
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
