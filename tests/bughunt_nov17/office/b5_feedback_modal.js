// The beta Feedback sheet must stay BELOW the app's dialogs (the same rule as the help sheet: "an alarm or EVACUATE
// dialog still shows on top"). Any app alert raised while the sheet is open has to be on top of it.
const L=require('./lib');
const init=L.co+`;window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',days_left:20,expired:false,trial_ends_at:new Date(Date.now()+20*864e5).toISOString()});window.__rpcOverride.pb_support_is_admin=()=>false;`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:6000});
 await p.click('#pbFbPill');await p.waitForTimeout(400);
 console.log('feedback sheet open:',await p.evaluate(()=>!!document.getElementById('pbFbSheet')));
 await p.evaluate(()=>window.pbOpenAppProblems());await p.waitForTimeout(600); // any app alert (stands in for a timer-driven permit alert)
 const h=await p.evaluate(()=>{const m=document.getElementById('pbModalOverlay'),btn=[...m.querySelectorAll('button')].find(b=>b.offsetParent);if(!btn)return {found:false};const r=btn.getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {found:true,text:m.innerText.replace(/\s+/g,' ').slice(0,80),onTop:el===btn||btn.contains(el),zModal:getComputedStyle(m).zIndex,zSheet:getComputedStyle(document.getElementById('pbFbSheet')).zIndex};});
 console.log(JSON.stringify(h));await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/b5_feedback_modal.png'});
 const ok=h.found&&h.onTop;console.log(ok?'PASS':'FAIL: an app dialog raised while the Feedback sheet is open is hidden behind it');
 await b.close();process.exit(ok?0:1);})();
