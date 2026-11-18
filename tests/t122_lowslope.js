const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
// r16.94: 8" SDR 35 at 0.21% gets a "Low Slope — Check The Plans" review note; 0.50% does not; C900 (pressure) does not.
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 const review=async(endEl,endCut,type)=>{
  await p.evaluate(()=>{try{pbGoto('home')}catch(e){}});await p.waitForTimeout(500);
  await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
  await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
  if(type)await p.evaluate(t=>{const e=document.getElementById('runPipeType');e.value=t;e.dispatchEvent(new Event('change',{bubbles:true}));},type);
  stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
  await H.f('startStakeReading','4.36');
  stake=S('4+51',endEl,endCut,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
  await H.click('Review & Calculate');await p.waitForTimeout(1500);
  const t=await p.evaluate(()=>document.getElementById('screen-review').innerText);
  const m=/Low Slope[^\n]*\n?[^\n]*/.exec(t);return m?m[0].replace(/\s+/g,' ').slice(0,200):null;};
 const a=await review(104.26,3.83,null);console.log('0.21% SDR35:',a);if(!a||!/0\.21%/.test(a))p.errs.push('no low-slope note at 0.21%');
 await p.evaluate(()=>{try{pbClearRunForm&&pbClearRunForm()}catch(e){}});
 console.log('errs',p.errs.slice(0,3));await b.close();
 // fresh pages for the other two cases
 const r2=async(endEl,endCut,type)=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H2=F(p);
  let st=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(st),used:1,limit:60})});});
  await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
  await H2.f('saJobNumber','24-017');await H2.f('saJobsite','Test Sewer');await H2.sel('runIdSel','8"');
  if(type)await p.evaluate(t=>{const e=document.getElementById('runPipeType');e.value=t;e.dispatchEvent(new Event('change',{bubbles:true}));},type);
  st=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H2.img('p12')]);await p.waitForTimeout(2500);
  await H2.f('startStakeReading','4.36');
  st=S('4+51',endEl,endCut,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H2.img('p05')]);await p.waitForTimeout(2500);
  await H2.click('Review & Calculate');await p.waitForTimeout(1500);
  const t=await p.evaluate(()=>document.getElementById('screen-review').innerText);const e=p.errs.slice();await b.close();return {low:/Low Slope/.test(t),errs:e};};
 const c=await r2(105.13,3.83,null);console.log('0.50% SDR35 low note:',c.low);
 const d=await r2(104.26,3.83,'PVC C900');console.log('0.21% C900 low note:',d.low);
 const bad=[];if(c.low)bad.push('note at 0.50%');if(d.low)bad.push('note on C900');console.log('errs',bad.concat(c.errs,d.errs).slice(0,3));})();
