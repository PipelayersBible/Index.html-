// node t_c01.js cur.html (fails) | fixed.html (passes)
const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
(async()=>{const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8865/')+(process.argv[2]||'cur.html'),{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,2.83,'MH-2','3863'); // the stake says C-3.83: a 1.00 ft misread
 await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 const t=await p.evaluate(()=>document.getElementById('screen-review').innerText);
 const bad=/data looks clean/i.test(t), good=/can.t tell if a stake was read or typed wrong/i.test(t);
 console.log(bad?'FAIL: review calls a 1 ft misread "clean"':good?'PASS':'FAIL: no line');console.log('errs',p.errs.slice(0,3));await b.close();process.exit(good&&!bad?0:1);})();
