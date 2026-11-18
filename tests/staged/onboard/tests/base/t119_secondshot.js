const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const F=require('/home/claude/rig/flow');
// r16.90: AI-read stakes with one rod shot: Lock asks for a rod shot on a second stake; a misread end cut is then caught.
(async()=>{const {b,p}=await boot('http://127.0.0.1:8878/index.html',{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 // AI misreads the end stake's ELEVATION by 1 ft (103.26 where the stake says 104.26)
 stake=S('4+51',103.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);
 const m1=await H.modal();console.log('modal1:',JSON.stringify(m1.slice(0,260)));
 if(!/One More Rod Shot/.test(m1))p.errs.push('no second-shot prompt');
 await H.modalClick('Add a Rod Shot');await p.waitForTimeout(1200);
 const foc=await p.evaluate(()=>document.activeElement&&document.activeElement.id);console.log('focused:',foc);
 if(!/^end/.test(foc||''))p.errs.push('not taken to the end stake reading: '+foc);
 // the real rod reading on top of the end stake: HI 107.76 - true stake elev 104.26 = 3.50
 await H.f('endStakeReading','3.50');await p.waitForTimeout(400);console.log('endread:',JSON.stringify(await p.evaluate(()=>{const e=document.getElementById('endStakeReading');return {v:e.value,ds:Object.assign({},e.dataset),cls:e.className,mode:document.querySelector('#endModeToggle .active')&&document.querySelector('#endModeToggle .active').textContent};})));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 const err=await p.evaluate(()=>{const e=document.querySelector('#screen-input .pb-err-head');return e?e.parentElement.innerText:'';});console.log('after 2nd shot:',JSON.stringify(err.slice(0,200)));
 if(!/disagree/i.test(err))p.errs.push('misread not caught after second shot');
 // second case: lock without it is kept on the record
 await H.f('endStakeReading','');await p.waitForTimeout(300);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);await H.click('Lock This Run');await p.waitForTimeout(800);
 await H.modalClick('Lock Without It');await p.waitForTimeout(600);await H.modalClick('I Checked Them');await p.waitForTimeout(2500);
 const no2=await p.evaluate(()=>{const e=window.__pbCsEntry();return e&&e.aiNo2nd;});console.log('record aiNo2nd:',no2);if(no2!==true)p.errs.push('aiNo2nd not kept');
 console.log('errs',p.errs.slice(0,3));await b.close();})();
