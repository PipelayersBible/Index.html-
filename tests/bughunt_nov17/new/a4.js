const mk=require('./mk');
(async()=>{const {b,p,H,rowMenu,dists}=await mk();
 await p.setViewportSize({width:390,height:800});
 await p.evaluate(async()=>{await window.pbLaidMark(2);});await p.waitForTimeout(900);
 // stats before
 const st=()=>p.evaluate(()=>{const T=window.__debugLaidStats();return {avg:T.avg,ms:T.ms,sticks:T.sticks,cur:T.lastOwn===null?null:Date.now()-T.lastOwn};});
 // craft marks: row0-2 at t0=-40min, rows to 4 at -10min; break from -30 to -15
 await p.evaluate(async()=>{const e=window.__pbCsEntry();const now=Date.now();const ks=Object.keys(e.laid.marks);ks.forEach(k=>e.laid.marks[k]=now-40*60000);});
 await p.evaluate(async()=>{await window.pbLaidMark(4);});await p.waitForTimeout(900);
 await p.evaluate(()=>{const e=window.__pbCsEntry();const now=Date.now();Object.keys(e.laid.marks).forEach(k=>{if(e.laid.marks[k]>now-60000)e.laid.marks[k]=now-10*60000;});});
 console.log('no break',JSON.stringify(await st()));
 await p.evaluate(()=>{const e=window.__pbCsEntry();const now=Date.now();e.breaks=[{start:now-30*60000,end:now-15*60000}];});
 console.log('with 15m break between',JSON.stringify(await st()));
 await p.evaluate(()=>{const e=window.__pbCsEntry();const now=Date.now();e.breaks=[{start:now-8*60000,end:now-3*60000}];});
 console.log('5m break after last mark',JSON.stringify(await st()));
 await p.evaluate(()=>{const e=window.__pbCsEntry();delete e.breaks;});
 // real break
 await p.evaluate(()=>window.scrollTo(0,600));
 await p.click('#pbBrkBtn');await p.waitForTimeout(1500);
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/brk390.png')});
 console.log('vis leak:',JSON.stringify(await p.evaluate(()=>{const scr=document.getElementById('screen-results');const out=[];scr.querySelectorAll('*').forEach(el=>{if(el.closest('#pbBrk'))return;const cs=getComputedStyle(el);if(cs.visibility==='visible'&&el.offsetParent!==null&&el.getClientRects().length)out.push(el.tagName+'#'+el.id+'.'+String(el.className).slice(0,30));});return out.slice(0,10);})));
 console.log('cover rect',JSON.stringify(await p.evaluate(()=>{const o=document.getElementById('pbBrk');const r=o.getBoundingClientRect();const c=o.querySelector('.pb-sl-pcard').getBoundingClientRect();const cs=getComputedStyle(o);return {pos:cs.position,z:cs.zIndex,r:[r.left,r.top,r.width,r.height],card:[c.left,c.top,c.width,c.height],scrollY:window.scrollY};})));
 // other things visible outside screen-results while on break
 console.log('active bar:',JSON.stringify(await p.evaluate(()=>{const a=document.querySelector('.pb-activebar, #pbActiveBar');return a?a.innerText:null;})));
 // can the hidden UI still act? check shot + laid + notes
 console.log('laid while break ->',await p.evaluate(async()=>{const r=await window.pbLaidMark(6);return r;}));await H.modalClick('OK').catch(()=>{});
 await p.evaluate(()=>window.pbCsOpen(3));await p.waitForTimeout(300);console.log('cs sheet opens on break:',await p.evaluate(()=>!!document.getElementById('pbCsSheet')));await p.evaluate(()=>{const s=document.getElementById('pbCsSheet');s&&s.remove();});
 // go home
 await p.evaluate(()=>window.pbGoto('home'));await p.waitForTimeout(1500);
 console.log('home: on-break class',await p.evaluate(()=>document.documentElement.classList.contains('pb-on-break')),'bar:',JSON.stringify(await p.evaluate(()=>{const a=[...document.querySelectorAll('[class*=activebar],[id*=ActiveBar]')].map(x=>x.innerText).join('|');return a;})));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/brkhome.png')});
 // reload
 await p.reload({waitUntil:'load'});await p.waitForTimeout(3500);
 console.log('after reload: screen',await H.screen().catch(()=>null),'cur',await p.evaluate(()=>{const e=window.__pbCsEntry();return e?{id:e.id,onBreak:e.onBreak}:null;}),'bar:',JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('[class*=activebar],[id*=ActiveBar]')].map(x=>x.innerText).join('|'))));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/brkreload.png')});
 console.log('errs',p.errs.slice(0,5));await b.close();})();
