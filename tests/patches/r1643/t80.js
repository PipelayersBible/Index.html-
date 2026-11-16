const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx43.html');
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const f=async(id,v)=>{await p.click('#'+id);await p.fill('#'+id,String(v));await p.keyboard.press('Tab');await p.waitForTimeout(700);};
 const D=()=>p.evaluate(()=>document.getElementById('startStakeDerived').textContent+' | hub0 rd='+document.getElementById('hub0StakeReading').value);
 await p.evaluate(()=>pbAddHub());await f('hub0Station','62');await f('hub0StakeElev','104.26');await f('hub0CutFillVal','3.14');
 await f('startCutFillVal','3.83');await f('startStakeReading','4.36');console.log('no elev:',await D());
 await f('startStakeElev','103.5');console.log('elev:',await D());
 console.log('errs',p.errs);await b.close();})();
