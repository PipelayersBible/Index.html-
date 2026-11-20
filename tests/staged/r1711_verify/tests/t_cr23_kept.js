// r1711_verify: the two critic_nov19 patches that are IN r17.11 (02 Home Screen card step order, 03 sheet height),
// cut out of critic_nov19/tests/t_cr1_pill.js. The 01 checks (Feedback pill hidden on work screens) are left out:
// patch 01 was dropped, and the pill is now a button in the top bar (feedback_btn_nov19 01).
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_cr23_kept.js
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const http=require('http');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/fixed.html';
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('PASS',m);}else{fail++;console.log('FAIL',m);}};
const get=(u)=>new Promise((res,rej)=>http.get(u,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej));
(async()=>{
 const {b,p}=await boot(URL,{init:co,wait:3500});await p.setViewportSize({width:390,height:664});await p.waitForTimeout(300);
 // 03: a sheet (Settings > Add a Pipelayer by Text) is capped to the height you can see, and scrolls
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(500);await p.getByText('Add a Pipelayer by Text',{exact:true}).click();await p.waitForTimeout(900);
 const sh=await p.evaluate(()=>{const c=document.querySelector('.pbob-card');if(!c||!c.offsetParent)return null;const cs=getComputedStyle(c);const r=c.getBoundingClientRect();return {mh:cs.maxHeight,ov:cs.overflowY,bottom:Math.round(r.bottom),ih:innerHeight};});
 ok(sh&&sh.mh===(664-32)+'px'&&sh.ov==='auto'&&sh.bottom<=sh.ih,'03: sheet max-height is the visible height - 32 and it scrolls '+JSON.stringify(sh));
 ok(p.errs.length===0,'no page errors '+p.errs.slice(0,2).join('|'));await b.close();
 const src=await get(URL);const i=src.indexOf('id="homeAttention_a2hs"');const card=src.slice(i,i+900);
 ok(/<ol><li>Tap <strong>Get a Code<\/strong> below, then <strong>Copy Code<\/strong>\.<\/li><li>Tap <strong>Share/.test(card)&&/Open the new icon and tap <strong>Paste Join Code<\/strong>\.<\/li><\/ol>/.test(card)&&!/Open the new icon\. Tap/.test(card),'02: Home Screen card steps: code first, Paste Join Code last');
 ok(/max-height:calc\(100vh - 32px\);max-height:calc\(100dvh - 32px\);/.test(src),'03: dvh rule after the vh fallback');
 console.log(fail?('FAILED '+fail):'ALL PASS',pass);process.exit(fail?1:0);})();
