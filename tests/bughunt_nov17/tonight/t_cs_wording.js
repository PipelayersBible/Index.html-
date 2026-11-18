const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');
// r16.90 record-only permit: no "evacuated" order left in the reading alerts.
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});
 const n=await p.evaluate(()=>[...document.scripts].filter(s=>/space is evacuated/.test(s.textContent)).length);console.log('scripts with the order:',n);
 if(n)p.errs.push('"once the space is evacuated" still in the reading alert');
 const cp=await p.evaluate(()=>typeof window.pbEmText==='function'&&!!document.getElementById('cpText911Btn'));if(!cp)p.errs.push('Text 911 missing');
 console.log(p.errs.length?'FAIL':'PASS',p.errs);await b.close();process.exit(p.errs.length?1:0);})();
