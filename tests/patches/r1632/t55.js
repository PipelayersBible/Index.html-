const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx32.html');
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(300);
 const set=async(id,v,ev='change')=>p.evaluate(([id,v,ev])=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=v;else e.value=v;e.dispatchEvent(new Event(ev,{bubbles:true}));},[id,v,ev]);
 await set('hub0FitOn',true);await set('hub0FitType','bend');await p.waitForTimeout(200);
 console.log('bend no angle:',await p.evaluate(()=>document.getElementById('hub0FitLay').value||'(blank)'));
 for (const a of ['22','11','90','45°','AP 22']) { await set('hub0FitInfo',a,'input');await p.waitForTimeout(200); console.log(a,'=>',await p.evaluate(()=>document.getElementById('hub0FitLay').value||'(blank)')); }
 console.log('errs',p.errs.length,p.errs.slice(0,2));await b.close();})();
