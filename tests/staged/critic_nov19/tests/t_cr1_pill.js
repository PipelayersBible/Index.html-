// critic_nov19 01 + 02. Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:9150/fixed.html node t_cr1_pill.js
// 01: the Feedback pill is not shown on Choose Your Password, Run Setup, Review, Run Results, Entry Permit; still shown on
//     Home, Records, Settings, Calculators; still hidden on the active permit; bottom-right on a computer.
// 03: the sheets' height cap uses the visible height (dvh), rule present in the page.
// 02: the Home Screen card's steps start with Get a Code and end with Paste Join Code (source check).
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');const fs=require('fs');const http=require('http');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/fixed.html';
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('PASS',m);}else{fail++;console.log('FAIL',m);}};
const pill=(p)=>p.evaluate(()=>{const x=document.getElementById('pbFbPill');if(!x||x.hidden||getComputedStyle(x).display==='none')return null;const r=x.getBoundingClientRect();return {l:Math.round(r.left),r:Math.round(innerWidth-r.right)};});
const get=(u)=>new Promise((res,rej)=>http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej));
(async()=>{
 const {b,p}=await boot(URL,{init:co,wait:3500});await p.setViewportSize({width:390,height:664});await p.waitForTimeout(300);
 ok(!!(await pill(p)),'Home: Feedback pill shown');
 for(const s of ['archive','settings','calcHub','tools']){await p.evaluate(s=>pbGoto(s),s);await p.waitForTimeout(500);ok(!!(await pill(p)),s+': pill shown');}
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(400);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1300);ok(!(await pill(p)),'Run Setup: no pill');
 for(const [id,v] of [['saJobNumber','24-017'],['startStaTxt','1+50'],['startStakeElev','103.40'],['startCutFillVal','3.61'],['startStakeReading','4.36'],['endStaTxt','4+51'],['endStakeElev','104.26'],['endCutFillVal','3.83'],['endStakeReading','3.50']]){await p.click('#'+id);await p.fill('#'+id,v);await p.keyboard.press('Tab');await p.waitForTimeout(120);}
 await p.selectOption('#runIdSel',{label:'8"'});await p.waitForTimeout(200);
 await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Review & Calculate').click();});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>!!document.getElementById('screen-review').offsetParent),'on Review');ok(!(await pill(p)),'Review: no pill');
 await p.evaluate(()=>pbLock());await p.waitForTimeout(900);
 for(let i=0;i<3;i++){const had=await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');if(!d||d.style.display!=='flex')return false;const bs=[...d.querySelectorAll('button')].filter(x=>x.offsetParent);bs[bs.length-1].click();return true;});if(!had)break;await p.waitForTimeout(800);}
 await p.waitForTimeout(1200);ok(await p.evaluate(()=>!!document.getElementById('screen-results').offsetParent),'on Run Results');ok(!(await pill(p)),'Run Results: no pill over the grade rows');
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(600);ok(!!(await pill(p)),'back on Home: pill shown again');
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(600);ok(!(await pill(p)),'Entry Permit form: no pill');
 await p.evaluate(()=>pbGoto('setPassword'));await p.waitForTimeout(600);ok(!(await pill(p)),'Choose Your Password: no pill over the Terms line');
 // 03: a sheet (Settings > Add a Pipelayer by Text) is capped to the height you can see, and scrolls
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(500);await p.getByText('Add a Pipelayer by Text',{exact:true}).click();await p.waitForTimeout(900);
 const sh=await p.evaluate(()=>{const c=document.querySelector('.pbob-card');if(!c||!c.offsetParent)return null;const cs=getComputedStyle(c);const r=c.getBoundingClientRect();return {mh:cs.maxHeight,ov:cs.overflowY,bottom:Math.round(r.bottom),ih:innerHeight};});
 ok(sh&&sh.mh===(664-32)+'px'&&sh.ov==='auto'&&sh.bottom<=sh.ih,'03: sheet max-height is the visible height - 32 and it scrolls '+JSON.stringify(sh));
 ok(p.errs.length===0,'no page errors '+p.errs.slice(0,2).join('|'));await b.close();
 const d=await boot(URL,{init:co+mgr,wait:3500});await d.p.setViewportSize({width:1440,height:900});await d.p.waitForTimeout(700);
 const pp=await pill(d.p);ok(pp&&pp.r<=30&&pp.l>1000,'computer: pill bottom-right, off the side menu '+JSON.stringify(pp));
 const foot=await d.p.evaluate(()=>{const x=document.getElementById('pbFbPill').getBoundingClientRect();const hit=[...document.querySelectorAll('#pbApp button,#pbApp a')].filter(e=>e.offsetParent).filter(e=>{const r=e.getBoundingClientRect();return !(r.right<x.left||r.left>x.right||r.bottom<x.top||r.top>x.bottom)});return hit.map(e=>e.textContent.trim().slice(0,30));});
 ok(foot.length===0,'computer Home: pill covers no button or link '+JSON.stringify(foot));await d.b.close();
 const src=await get(URL);const i=src.indexOf('id="homeAttention_a2hs"');const card=src.slice(i,i+900);
 ok(/<ol><li>Tap <strong>Get a Code<\/strong> below, then <strong>Copy Code<\/strong>\.<\/li><li>Tap <strong>Share/.test(card)&&/Open the new icon and tap <strong>Paste Join Code<\/strong>\.<\/li><\/ol>/.test(card)&&!/Open the new icon\. Tap/.test(card),'02: Home Screen card steps: code first, Paste Join Code last');
 ok(/max-height:calc\(100vh - 32px\);max-height:calc\(100dvh - 32px\);/.test(src),'03: dvh rule after the vh fallback');
 console.log(fail?('FAILED '+fail):'ALL PASS',pass);process.exit(fail?1:0);})();
