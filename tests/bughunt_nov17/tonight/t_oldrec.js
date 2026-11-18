const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
// A run locked before r16.90 (TOP = INV + size + wall, no odIn), still open after the update: adding an interval,
// and Edit Run Data -> Review -> Lock (Replace) with nothing changed, must keep the run's TOP as locked.
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','15"');await p.waitForTimeout(300);
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.f('endStakeReading','3.50');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('I Checked Them').catch(()=>{});await p.waitForTimeout(2500);
 const id0=await p.evaluate(()=>window.__pbCsEntry().id);
 // as locked by r16.89: TOP = INV + 15" + 0.437" wall, and no odIn on the record
 console.log('mut:',await p.evaluate(()=>{const e=window.__pbCsEntry(),H=(e.hiLay!==null&&e.hiLay!==undefined)?e.hiLay:e.hi,wt=e.summary.pipeInfo[0].wtFt,f=(n)=>(Math.sign(n)*Math.round(Math.abs(n)*100+1e-7)/100).toFixed(2);let bad=0;(e.intervalRows||[]).forEach(r=>{if(f(H-r.piFt)!==r.inv)bad++;r.top=f(H-(r.piFt+15/12+wt));});e.summary.pipeInfo.forEach(x=>delete x.odIn);return 'inv mismatches '+bad+' H '+H;}));
 // the app restarted since (the form no longer holds the run): New Run empties the form, then back to its Results
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(600);await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>pbGoto('results'));await p.waitForTimeout(800);
 // Edit Run Data, Review, Lock with nothing changed
 await p.evaluate(()=>pbEditRunData());await p.waitForTimeout(1500);if(await H.modal())console.log('m0',(await H.modal()).slice(0,80));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);
 let m=await H.modal()||'';if(/Check the AI/.test(m)){await H.modalClick('I Checked Them');await p.waitForTimeout(800);m=await H.modal()||'';}
 console.log('lock:',m.slice(0,120));
 if(/Locked Once Already/.test(m)){await H.modalClick('Replace');await p.waitForTimeout(800);let m2=await H.modal()||'';if(/Check the AI/.test(m2)){await H.modalClick('I Checked Them');}await p.waitForTimeout(2500);}
 const z=await p.evaluate(()=>{const e=window.__pbCsEntry();const r=e.intervalRows.find(r=>!r.addedTime&&r.inv&&r.top);return {id:e.id,d:parseFloat(r.inv)-parseFloat(r.top),odIn:e.summary.pipeInfo[0].odIn};});console.log('after re-lock:',JSON.stringify(z));
 if(Math.abs(z.d-(15/12+0.036))>0.011)p.errs.push('re-locking the unchanged form rewrote the run\'s TOP column: INV-TOP '+z.d.toFixed(2)+' (locked 1.29)');
 await H.modalClick('Cancel').catch(()=>{});await H.modalClick('OK').catch(()=>{});await p.waitForTimeout(400);await p.evaluate(()=>pbGoto('results'));await p.waitForTimeout(800);
 const a=await p.evaluate(async()=>{document.getElementById('newIntervalStation').value='107';document.getElementById('newIntervalLabel').value='X';await window.pbAddInterval();await new Promise(r=>setTimeout(r,2000));const e=document.getElementById('addIntervalError');const rr=window.__pbCsEntry().intervalRows.find(r=>r.addedTime);return {err:e&&e.style.display!=='none'?e.textContent:'',row:rr?{inv:rr.inv,top:rr.top}:null};});
 console.log('add interval:',JSON.stringify(a));
 if(!a.row)p.errs.push('interval not added: '+a.err);
 else{const d=parseFloat(a.row.inv)-parseFloat(a.row.top);if(Math.abs(d-(15/12+0.036))>0.011)p.errs.push('added row TOP not on the run\'s own basis: INV-TOP '+d.toFixed(2)+' (others 1.29)');}
 console.log(p.errs.length?'FAIL':'PASS','errs',p.errs.slice(0,3),'page errs');await b.close();process.exit(p.errs.length?1:0);})();
