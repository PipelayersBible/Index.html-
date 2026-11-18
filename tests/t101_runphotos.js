const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 const hook=()=>p.evaluate(()=>{const J=window.jspdf&&window.jspdf.jsPDF;if(!J)return 'nojspdf';J.API.save=function(n){window.__pdfs=(window.__pdfs||[]).concat([{n,d:this.output('datauristring')}]);return this;};return 'ok';});
 await (async()=>{let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('2+12',103.7,3.69,'AP','3861');await p.setInputFiles('#hub0AiStakePhoto',[H.img('p01'),H.img('p02')]);await p.waitForTimeout(2500);
 await H.sel('hub0FitAng','22.5°');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('3+39',104.0,3.73,'WYE','3862');await p.setInputFiles('#hub1AiStakePhoto',[H.img('p03')]);await p.waitForTimeout(2500);
 await H.sel('hub1FitBr','6"');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05'),H.img('p07')]);await p.waitForTimeout(2500);
})();
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them');await p.waitForTimeout(2500);
 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 await rowMenu('301.0');await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(600);
 await H.click('Delay');await p.selectOption('#pbSlReason',{label:'Waiting on inspector'});await H.click('Start Delay');await p.waitForTimeout(1200);await H.click('End Delay');await p.waitForTimeout(500);
 await p.evaluate(()=>{const s=[...document.querySelectorAll('#screen-results summary')].find(s=>/Production & Crew/.test(s.textContent));s&&s.click();});await p.waitForTimeout(400);
 await H.f('fpPipeInstalled','301');await H.click('Save Production');await p.waitForTimeout(1500);
 await H.click('End Run and Send Report');await p.waitForTimeout(1500);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1500);}
 
 await p.waitForTimeout(1000);
 const id=await p.evaluate(()=>{const b=document.getElementById('homeRunReportPdf');return b?Number(/\((\d+)\)/.exec(b.getAttribute('onclick'))[1]):null;});
 const copy=await p.evaluate((id)=>{const c=window.__pbRrDebug.copy(id);return {photos:(c.pbOffice.photos||[]).map(x=>({p:x.p.join('.'),f:x.f||null,path:x.path})),left:c.pbOffice.photosLeftOut};},id);
 console.log('office copy photo refs:',copy.photos.length,'left out:',copy.left);copy.photos.slice(0,8).forEach(x=>console.log('  ',x.p,x.f||'',x.path.replace(/^[^/]+/,'<uid>')));
 await p.evaluate(()=>window.__pbRrDebug.send());
 for(let i=0;i<20;i++){await p.waitForTimeout(1000);const n=await p.evaluate(()=>Object.keys(window.__uploads||{}).filter(k=>k.startsWith('run-photos/')).length);if(n>=copy.photos.length)break;}
 console.log('uploaded:',await p.evaluate(()=>Object.keys(window.__uploads||{}).filter(k=>k.startsWith('run-photos/')).length));
 const back=await p.evaluate(async(id)=>{const c=window.__pbRrDebug.copy(id);const r=await window.pbRrPhotosIn(c);
   const rows=(e)=>(e.intervalRows||[]).map((x,i)=>[i,(x.photos||[]).filter(u=>typeof u==='string'&&u.startsWith('data:')).length]).filter(x=>x[1]);
   return {before:rows(c),after:rows(r)};},id);
 console.log('phone vs office after photos put back:',JSON.stringify(back));
console.log('errs',p.errs.slice(0,3));await b.close();})();
