const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
// r16.90 second shot: a Lenker run (no stake rod reading, no HI) must not be asked for one, nor recorded as locked without it.
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=true;});await p.evaluate(()=>document.querySelector('#rodToggle [data-val=lenker]').click());await p.waitForTimeout(500);
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 const vis=await p.evaluate(()=>['startStakeReading','endStakeReading'].map(id=>{const e=document.getElementById(id);return id+':'+(e?(e.offsetParent!==null):'none');}));console.log('reading fields visible:',vis);
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);console.log('screen',await H.screen(),(await H.modal()||'').slice(0,100));
 await H.click('Lock This Run');await p.waitForTimeout(800);
 const m1=await H.modal()||'';console.log('m1:',m1.slice(0,300));
 if(/One More Rod Shot/.test(m1)){p.errs.push('second-shot prompt on a Lenker run');await H.modalClick('Lock Without It');await p.waitForTimeout(700);}
 await H.modalClick('I Checked Them').catch(()=>{});await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>{const e=window.__pbCsEntry();return e?{no2:e.aiNo2nd===true,ai:!!e.aiReads}:null;});console.log('record:',JSON.stringify(r));
 if(!r)p.errs.push('not locked');else if(r.no2)p.errs.push('Lenker record says locked without a second rod shot');
 console.log(p.errs.length?'FAIL':'PASS','errs',p.errs.slice(0,3));await b.close();process.exit(p.errs.length?1:0);})();
