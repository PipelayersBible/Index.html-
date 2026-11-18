// shared: boot + create a locked run with 2 fittings (bend at hub0, wye at hub1). opts: {init, unit, pipeType}
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
module.exports=async function mk(opts={}){
 const url='http://127.0.0.1:8861/'+(process.env.PG||'cur.html');
 const {b,p}=await boot(url,{init:(opts.init||co)});const H=F(p);
 if(opts.norun)return {b,p,H};
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
 if(opts.pre)await opts.pre(p,H);
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 if(opts.arch){await H.f('startStakeReading_ft','4');await H.f('startStakeReading_in','4');}else if(!opts.noReading)await H.f('startStakeReading','4.36');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('2+12',103.7,3.69,'AP','3861');await p.setInputFiles('#hub0AiStakePhoto',[H.img('p01')]);await p.waitForTimeout(2500);
 await H.sel('hub0FitAng','22.5°');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('3+39',104.0,3.73,'WYE','3862');await p.setInputFiles('#hub1AiStakePhoto',[H.img('p03')]);await p.waitForTimeout(2500);
 await H.sel('hub1FitBr','6"');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('I Checked Them').catch(()=>{});await p.waitForTimeout(2500);
 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 const dists=await p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));
 return {b,p,H,rowMenu,dists};
};
