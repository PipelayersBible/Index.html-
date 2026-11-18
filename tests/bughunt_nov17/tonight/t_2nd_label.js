const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
// r16.90 second shot: the stake's name shows as typed (6" LAT & MH), not HTML-escaped.
// was: "Lock Without It", then Go Back at "Check the AI Readings", add the second rod shot, lock: the record must NOT say aiNo2nd.
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.f('endLabel','6" LAT & MH');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);
 console.log('m1:',(await H.modal()||'').slice(0,60));
 const m1=await H.modal()||'';if(/&quot;|&amp;|&#/.test(m1))p.errs.push('escaped label in prompt: '+m1.slice(0,200));if(!/6" LAT & MH/.test(m1))p.errs.push('label missing: '+m1.slice(0,200));
 console.log(p.errs.length?'FAIL':'PASS','errs',p.errs.slice(0,3));await b.close();process.exit(p.errs.length?1:0);})();
