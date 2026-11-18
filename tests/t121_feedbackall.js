const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
// r16.92: the Feedback pill shows on every signed-in account (here a non-beta foreman), and opens the feedback sheet.
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 await p.waitForTimeout(1500);
 const st=await p.evaluate(()=>{const e=document.getElementById('pbFbPill');return e?{hidden:e.hidden,vis:!!e.offsetParent}:null;});console.log('pill:',JSON.stringify(st));
 if(!st||st.hidden)p.errs.push('pill not shown');
 else{await p.click('#pbFbPill');await p.waitForTimeout(600);const open=await p.evaluate(()=>document.documentElement.classList.contains('pb-fb-open'));console.log('sheet open:',open);if(!open)p.errs.push('sheet did not open');}
 console.log('errs',p.errs.slice(0,3));await b.close();})();
