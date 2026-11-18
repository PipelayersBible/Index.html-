const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
// r16.94 low-slope note: a 27" run at 0.066% (minimum 0.067%) must not read "0.07% ... is flatter than ... 0.067%".
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','27"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,4.27,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.f('endStakeReading','3.50');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 const t=await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-review *')].find(x=>x.children.length===0&&/flatter than/.test(x.textContent));return e?e.textContent:(document.getElementById('screen-review').innerText.match(/[^\n]*flatter[^\n]*/)||[''])[0];});
 console.log('note:',t);
 const m=/([0-9.]+)% from .* \(([0-9.]+)%/.exec(t);
 if(!m)p.errs.push('no low-slope note');else if(!(parseFloat(m[1])<parseFloat(m[2])))p.errs.push('note shows '+m[1]+'% as flatter than '+m[2]+'%');
 console.log(p.errs.length?'FAIL':'PASS','errs',p.errs.slice(0,3));await b.close();process.exit(p.errs.length?1:0);})();
