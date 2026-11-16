const boot=require('./boot');const co=require('./co');const F=require('./flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 const out=async(t)=>{const m=await H.modal();const errs=await p.evaluate(()=>[...document.querySelectorAll('#screen-input [aria-invalid="true"]')].map(e=>e.id).join(','));const box=await p.evaluate(()=>{const e=document.querySelector('#screen-input .pb-rs-errs, #screen-input .pb-inline-warn:not(:empty), #rsErrBox');return e?e.innerText.replace(/\s+/g,' ').slice(0,300):'';});console.log('['+t+'] screen='+await H.screen()+' modal='+(m||'').slice(0,250)+' invalid='+errs+' box='+box);if(m){const bt=await H.modalBtns();await H.modalClick(bt[0]);}};
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 // 1 empty form
 await H.click('Review & Calculate');await p.waitForTimeout(800);await out('empty');await H.shot('111-empty',false);
 // 2 weird station text
 await H.f('saJobNumber','24-017');await H.sel('runIdSel','8"');
 await H.f('startStaTxt','1+5o');await p.waitForTimeout(300);console.log('bad sta readout:',await p.evaluate(()=>document.querySelector('[data-st-pt="start"] .pb-st-out, #startStaTxt').parentElement.parentElement.innerText.replace(/\s+/g,' ').slice(0,120)));
 await H.f('startStaTxt','1+50');
 await H.f('startStakeElev','100');await H.f('startCutFillVal','-3');await H.f('startStakeReading','4.5');
 await H.f('endStakeElev','101');await H.f('endCutFillVal','5');
 await H.f('totalDist','150');
 await H.click('Review & Calculate');await p.waitForTimeout(800);await out('negative cutfill');
 await H.f('startCutFillVal','3');
 // 3 hub beyond end
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);await p.click('#hub0StaTxt');await p.fill('#hub0StaTxt','3+50');await p.keyboard.press('Tab');await H.f('hub0StakeElev','100.5');await H.f('hub0CutFillVal','4');
 await H.click('Review & Calculate');await p.waitForTimeout(800);await out('hub past end');
 // 4 comma decimal
 await p.fill('#hub0StaTxt','2,25');await p.keyboard.press('Tab');await p.waitForTimeout(300);console.log('comma sta:',await p.evaluate(()=>document.getElementById('hub0Station').value+' | '+document.querySelector('[data-st-pt="hub0"] .pb-st-out').textContent));
 await p.fill('#hub0StaTxt','2+25');await p.keyboard.press('Tab');
 await H.f('hub0StakeElev','1005');await H.click('Review & Calculate');await p.waitForTimeout(800);await out('typo elev 1005');await H.shot('110-typo-review');await H.click('Go Back & Fix');await p.waitForTimeout(800);
 await H.f('hub0StakeElev','100.5');
 // 5 huge interval
 await H.f('interval','0');await H.click('Review & Calculate');await p.waitForTimeout(800);await out('interval 0');
 await H.f('interval','0.01');await H.click('Review & Calculate');await p.waitForTimeout(1500);await out('interval 0.01');
 await H.f('interval','10');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);await out('ok review');
 // 6 double lock
 if(await H.screen()==='screen-review'){await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Lock This Run');b.click();b.click();});await p.waitForTimeout(3000);await out('double lock');
   await p.evaluate(()=>pbHomeOpenReports());await p.waitForTimeout(800);await p.evaluate(()=>renderArchiveList());console.log('records count:',await p.evaluate(()=>document.getElementById('archiveList').children.length));}
 console.log('errs',p.errs);await b.close();})();
