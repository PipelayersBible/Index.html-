// cs2 03: record-only wording: Reference page, entered-anyway dialog
const L=require('./lib2');(async()=>{const {b,p,H}=await L({});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 const ref=await p.evaluate(()=>document.body.innerHTML.includes('automatic evacuation alarm'));ok(!ref,'no "automatic evacuation alarm" in the page');
 await H.lock();await H.read(20.9,0,0,0);const r=await H.read(19.0,0,0,0);console.log(JSON.stringify(r).slice(0,200));
 await H.addPerson('Ed Entrant');const c=await H.checkin('Ed Entrant');console.log('CHECKIN',JSON.stringify(c));
 ok(c.m&&/Permit Does Not Allow Entry/.test(c.m),'check-in warns (record wording)');
 await H.modalClick(c.bt.find(x=>/Yes/.test(x)));await p.waitForTimeout(1200);
 const title=await p.evaluate(()=>document.getElementById('pbModalTitle').textContent),msg=await H.modal();console.log('AFTER YES',title,'|',msg);
 ok(!/Block/i.test(title),'title has no "block": '+title);
 ok(msg&&!/Get them out as soon as it is safe/.test(msg)&&/do not go in after them/.test(msg),'reading case: permit wording + rescue line');
 await H.closeModals();
 // attendant goes in anyway: strong wording kept
 const c2=await H.checkin('Al Att','Attendant');console.log('ATT',JSON.stringify(c2).slice(0,200));
 ok(c2.m&&/DO NOT ENTER/.test(c2.m),'attendant rule keeps DO NOT ENTER');
 await H.modalClick(c2.bt.find(x=>/Yes/.test(x)));await p.waitForTimeout(1200);const m2=await H.modal();console.log('ATT YES',m2);
 ok(m2&&/Get them out as soon as it is safe/.test(m2),'attendant case keeps the strong wording');
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
