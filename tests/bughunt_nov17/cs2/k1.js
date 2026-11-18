// cs2 01: a permit closed out with its emergency still open keeps a call button and the rescue line on screen
const L=require('./lib2');(async()=>{let {b,p,H}=await L({});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 await H.lock();await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await p.evaluate(()=>pbTriggerEmergency());await p.waitForTimeout(1500);
 await p.evaluate(()=>{[...document.querySelectorAll('#cpCloseoutReasonToggle button')].find(x=>x.dataset.val==='prohibited').click();pbCloseConfinedPermit();});await p.waitForTimeout(800);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('MODAL',m.slice(0,140));await H.modalClick(bt.find(x=>/Continue|OK/.test(x))||bt[bt.length-1]);await p.waitForTimeout(1500);}
 const st=await p.evaluate(()=>({closed:!confinedPermitPresent(),}) ).catch(()=>null);
 const vis=()=>p.evaluate(()=>({calls:[...document.querySelectorAll('#screen-confinedActive button')].filter(x=>x.getClientRects().length&&x.offsetParent&&/^(EMERGENCY|Call .* again)$/i.test(x.textContent.trim())).map(x=>x.textContent.trim()),rescue:(()=>{const e=document.querySelector('#screen-confinedActive > .pb-rescue');return !!(e&&e.offsetParent);})(),panel:!!document.getElementById('cpEmergencyPanel').offsetParent}));
 let v=await vis();console.log(JSON.stringify(v));
 ok(v.panel,'kept emergency panel shown');ok(v.calls.length>0,'a call button is on screen after closeout with the emergency open');ok(v.rescue,'rescue line shown');
 const btn=await p.$('#cpEmCallAgain')||await p.$('#screen-confinedActive .pb-emergency-btn');
 if(v.calls.length){await p.evaluate(()=>{const b=[...document.querySelectorAll('#screen-confinedActive button')].find(x=>x.offsetParent&&/^(EMERGENCY|Call .* again)$/i.test(x.textContent.trim()));b.click();});await p.waitForTimeout(500);}
 const nav=await H.nav();ok(nav.filter(x=>x.h==='tel:911').length===2,'the call goes out again '+JSON.stringify(nav.map(x=>x.h)));
 // dismiss the kept panel: buttons hide again
 await p.evaluate(()=>pbDismissEmergencyPanel());await p.waitForTimeout(400);const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(600);
 v=await vis();console.log('after dismiss',JSON.stringify(v));ok(!v.panel&&!v.calls.includes('EMERGENCY'),'closed permit screen after dismiss: no live emergency controls');
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
