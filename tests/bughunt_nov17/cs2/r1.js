// cs2 04: a comm check reminder over the screen offers the EMERGENCY call
const L=require('./lib2');(async()=>{const {b,p,H}=await L({});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 await H.lock({cpCommInterval:'1'});await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 console.log('waiting for the 1-minute comm check...');await p.waitForTimeout(62000);
 const m=await H.modal(),bt=await H.modalBtns();console.log('MODAL',m,bt);
 ok(m&&/Communication/.test(m),'comm check reminder shown');
 const cover=await p.evaluate(()=>{const e=document.querySelector('#screen-confinedActive .pb-emergency-btn');const r=e.getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,Math.max(1,Math.min(innerHeight-1,r.top+r.height/2)));return top===e||e.contains(top);});
 console.log('EMERGENCY button reachable under the reminder:',cover);
 const em=bt.find(x=>/EMERGENCY/.test(x));ok(!!em,'reminder offers EMERGENCY');
 if(em){await H.modalClick(em);await p.waitForTimeout(800);}
 const nav=await H.nav();ok(nav.some(x=>x.h==='tel:911'),'one tap from the reminder places the call '+JSON.stringify(nav));
 ok(await H.D('confinedEmergencyIncidents.filter(i=>!i.end).length')===1,'emergency declared');
 ok(!(await H.modal()),'no reminder left over the emergency panel');
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
