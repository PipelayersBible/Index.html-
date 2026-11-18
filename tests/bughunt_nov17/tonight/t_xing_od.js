const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
// r16.90 TOP = BOP + real OD, but the crossing clearance still used INV + nominal size + wall. 12" DI (OD 13.20"):
// a water line 12.2" above the OLD top is really only ~11.7" above the pipe's real top, under its 12" minimum.
const URL=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
(async()=>{const {b,p}=await boot(URL,{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');
 await p.selectOption('#runPipeType','Ductile Iron');await p.waitForTimeout(300);
 await H.sel('runIdSel','12"');await p.waitForTimeout(300);
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.f('endStakeReading','3.50');
 const g=await p.evaluate(()=>({wt:document.getElementById('runWT').value,type:document.getElementById('runPipeType').value}));console.log('pipe:',JSON.stringify(g));
 // our invert at 100 ft from start: 99.79 + (100.43-99.79)*100/301
 const inv=99.79+(100.43-99.79)*100/301, wt=parseFloat(g.wt);
 const trueTop=inv-wt+13.2/12, oldTop=inv+1+wt, bop=oldTop+12.2/12;
 console.log('inv',inv.toFixed(4),'true TOP',trueTop.toFixed(4),'old TOP',oldTop.toFixed(4),'xing BOP',bop.toFixed(3),'true clearance in',((bop-trueTop)*12).toFixed(2));
 await p.evaluate(()=>pbXingAdd(1));await p.waitForTimeout(300);
 const id=await p.evaluate(()=>document.querySelector('#screen-input .pb-xing-card').dataset.xingId);
 await H.f(id+'Sta','2+50');await H.f(id+'Util','Gas');await H.f(id+'Bop',bop.toFixed(3));await p.waitForTimeout(900);
 await p.evaluate(()=>window.pbXingLiveNow());await p.waitForTimeout(200);
 const live=await p.evaluate(()=>document.querySelector('#screen-input .pb-xing-card .pb-xing-live').textContent);console.log('live:',live);
 const m=/([0-9.]+) ft/.exec(live);const shown=m?parseFloat(m[1])*12:null;
 if(/^Clear/.test(live)&&((bop-trueTop)*12)<12)p.errs.push('crossing shown clear ('+live+') but the real clearance is '+((bop-trueTop)*12).toFixed(2)+' in, under the 12 in minimum');
 console.log(p.errs.length?'FAIL':'PASS','errs',p.errs.slice(0,3));await b.close();process.exit(p.errs.length?1:0);})();
