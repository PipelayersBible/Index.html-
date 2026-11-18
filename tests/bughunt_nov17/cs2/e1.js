// cs2 01/02: after EMERGENCY, a call button is on screen; it redials; the Feedback pill is not over the panel
const L=require('./lib2');(async()=>{const {b,p,H}=await L({});let fail=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fail++;};
 await H.lock();await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await p.evaluate(()=>window.scrollTo(0,0));
 await p.click('#screen-confinedActive .pb-emergency-btn:not(.cp-em-again)');await p.waitForTimeout(1500);
 const vis=await p.evaluate(()=>{const h=innerHeight;return [...document.querySelectorAll('button')].filter(b=>b.offsetParent&&/^(EMERGENCY|Call .*again)$/i.test(b.textContent.trim())).map(b=>{const r=b.getBoundingClientRect();return {t:b.textContent.trim(),top:Math.round(r.top),bot:Math.round(r.bottom),inView:r.top>=0&&r.bottom<=h};});});
 console.log(JSON.stringify(vis));
 ok(vis.some(v=>v.inView),'a call button is on screen right after EMERGENCY');
 const pill=await p.evaluate(()=>{const e=document.getElementById('pbFbPill');return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none'&&e.getClientRects().length);});
 ok(!pill,'no Feedback pill over the active permit / emergency panel');
 await p.screenshot({path:'/tmp/claude-0/audit/cs2/t/e1_'+(process.env.FILE||'cur')+(process.env.DARK?'_dark':'')+'.png'});
 const again=vis.find(v=>/again/i.test(v.t));
 if(again){await p.click('#cpEmCallAgain');await p.waitForTimeout(500);}
 const nav=await H.nav();console.log(JSON.stringify(nav.map(x=>x.h)));
 ok(nav.filter(x=>x.h==='tel:911').length===2,'second call placed from the panel');
 const inc=await H.D('[confinedEmergencyIncidents.length,confinedPermit.emergencyDials.length]');ok(inc[0]===1&&inc[1]===2,'same incident, two dials recorded '+JSON.stringify(inc));
 // kept panel label after number change: change number to 112 on a new permit is out of scope; check label
 ok(await p.evaluate(()=>{const e=document.getElementById('cpEmCallAgain');return e?e.textContent:'';})==='Call 911 again','label shows the number dialed');
 // reload: still there
 await H.reload();const r=await p.evaluate(()=>{const e=document.getElementById('cpEmCallAgain');return !!(e&&e.offsetParent);});ok(r,'call-again button shown on the restored panel');
 // resolve: panel hides
 console.log('errs',p.errs);ok(!p.errs.length,'no page errors');console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();})();
