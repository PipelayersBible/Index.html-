const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
const SH=((process.env.PB_OUT||'/tmp/claude-0/bughunt/critic/shots')+'/');
(async()=>{
 for(const [tag,endCut,conf] of [['ok',3.83,'high'],['misread1ft',2.83,'high'],['misread_low',2.83,'low']]){
 const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8865/cur.html'),{init:co});const H=F(p);await p.setViewportSize({width:390,height:800});
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num,c)=>({is_stake:true,stake_number:{value:num||'',conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line||'',conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:c||'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:c==='low'?['cut_fill']:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,endCut,'MH-2','3863',conf);await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 const endTxt=await p.evaluate(()=>{const e=document.getElementById('endAiStakePhoto');let n=e;for(let i=0;i<6&&n;i++)n=n.parentElement;return n?n.innerText.replace(/\n+/g,' | ').slice(-500):''});
 console.log(tag,'END BLOCK:',endTxt);
 if(tag==='misread_low')await p.screenshot({path:SH+'fm_ai_low.png',fullPage:true});
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 console.log(tag,'MODAL',await H.modal(),JSON.stringify(await H.modalBtns()));
 console.log(tag,'REVIEW',await p.evaluate(()=>{const s=document.getElementById('screen-review');return s.offsetParent?s.innerText.replace(/\n+/g,' | ').slice(0,200)+' ... '+s.innerText.replace(/\n+/g,' | ').slice(-260):'not on review'}));
 await H.click('Lock This Run').catch(()=>{});await p.waitForTimeout(800);console.log(tag,'LOCK MODAL',await H.modal());
 await b.close();}
 // desktop owner
 const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8865/cur.html'),{init:co+require(__dirname+'/../../rig/mgr')});await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(800);
 await p.screenshot({path:SH+'mgr_desktop.png'});console.log('desktop main width',await p.evaluate(()=>{const s=document.getElementById('screen-home');return s.getBoundingClientRect().width+' of '+innerWidth}));
 await b.close();
})();
