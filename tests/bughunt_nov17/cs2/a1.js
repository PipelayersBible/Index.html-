// cs2 05: EMERGENCY from the Ask sheet on another screen opens the emergency panel
const L=require('./lib2');(async()=>{const {b,p,H}=await L({});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 await H.lock();await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(800);
 await p.evaluate(()=>pbAiAskEmergency());await p.waitForTimeout(1500);
 const scr=await H.screen();const panel=await p.evaluate(()=>{const e=document.getElementById('cpEmergencyPanel');const r=e.getBoundingClientRect();return !!e.offsetParent&&r.top<innerHeight&&r.bottom>0;});
 console.log('screen',scr,'panel in view',panel,'nav',JSON.stringify(await H.nav()));
 ok((await H.nav()).some(x=>x.h==='tel:911'),'call placed');
 ok(scr==='screen-confinedActive'&&panel,'emergency panel (dispatcher script, Text 911) is on screen');
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
