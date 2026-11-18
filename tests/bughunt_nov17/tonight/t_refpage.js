const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');
// The Rod Units reference must describe the TOP the grade sheet computes (BOP + real OD, r16.90).
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});
 const t=await p.evaluate(()=>{const e=document.querySelector('[data-edu-id="top-top-of-pipe"]');return e?e.textContent:'';});console.log(t);
 if(!/OD/.test(t)||/INV \+ pipe ID \+ wall/.test(t))p.errs.push('reference TOP formula is not the one the app uses');
 console.log(p.errs.length?'FAIL':'PASS',p.errs);await b.close();process.exit(p.errs.length?1:0);})();
