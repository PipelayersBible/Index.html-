const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const F=require('/home/claude/rig/flow');const fs=require('fs');
(async()=>{const ST=process.argv[2]||'';const {b,p}=await boot('http://127.0.0.1:8878/cur.html',{init:co});const H=F(p);
 const hook=()=>p.evaluate(()=>{const J=window.jspdf&&window.jspdf.jsPDF;if(!J)return 'nojspdf';J.API.save=function(n){window.__pdfs=(window.__pdfs||[]).concat([{n,d:this.output('datauristring')}]);return this;};return 'ok';});
 await (async()=>{let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 if(ST)await p.evaluate(st=>localStorage.setItem('pbHereState',JSON.stringify({s:st,at:Date.now()})),ST);
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

 await H.f('hub0StakeElev','103.7');
 await H.f('startCutFillVal','4.40');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 const w=await p.evaluate(()=>{const e=[...document.querySelectorAll('.pb-warn')].find(x=>/Deep Trench/.test(x.textContent));return e?e.textContent.slice(0,260):'no deep warning';});
 console.log('['+(ST||'unknown')+'] review:',w);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them');await p.waitForTimeout(2500);
 for(let i=0;i<3;i++){const mm=await H.modal();if(!mm)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1200);}
 console.log('entry:',JSON.stringify(await p.evaluate(()=>{const e=window.__pbRrDebug.run();return {flag:e.depthFlagged,ft:e.caveFt,st:e.caveState};})));
console.log('errs',p.errs.slice(0,3));await b.close();})();
