const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const F=require('/home/claude/rig/flow');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8878/index.html',{init:co});const H=F(p);
 const hook=()=>p.evaluate(()=>{const J=window.jspdf&&window.jspdf.jsPDF;if(!J)return 'nojspdf';J.API.save=function(n){window.__pdfs=(window.__pdfs||[]).concat([{n,d:this.output('datauristring')}]);return this;};return 'ok';});
 await (async()=>{let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
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

 // change one AI value by hand: start stake elevation
 await p.evaluate(()=>{const el=document.getElementById('startStakeElev');});
 const before=await p.evaluate(()=>{const P=window.pbStakeAiProvOf();return Object.keys(P).map(k=>k+':'+P[k].fields.map(f=>f.name+'='+f.val).join(','));});
 console.log('prov:',JSON.stringify(before));
 await H.f('hub0StakeElev','103.75');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);
 const m=await H.modal();console.log('modal:',JSON.stringify(m));
 await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them');await p.waitForTimeout(2500);
 for(let i=0;i<3;i++){const mm=await H.modal();if(!mm)break;console.log('next modal:',JSON.stringify(mm).slice(0,120));const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1500);}
 const e=await p.evaluate(()=>{const e=window.__pbRrDebug.run();return {checked:!!e.aiCheckedAt,reads:e.aiReads};});
 console.log('checked:',e.checked);(e.reads||[]).forEach(x=>console.log(' ',x.point,x.fields.map(f=>f.name+': '+f.ai+' -> '+f.locked+(f.changed?' CHANGED':'')).join(' | ')));
 await p.evaluate(()=>{const J=window.jspdf&&window.jspdf.jsPDF;J.API.save=function(n){window.__pdfTxt=null;window.__pdfDoc=this;return this;};});
 await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 const t=await p.evaluate(()=>{const d=window.__pdfDoc;if(!d)return 'no pdf';const raw=d.output();const i=raw.indexOf('stake photos by AI');return i<0?'section missing':'found section; changed note: '+(/changed\)/.test(raw)||raw.indexOf('(changed)')>=0);});
 console.log('pdf:',t);const b64=await p.evaluate(()=>{const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});fs.writeFileSync('/tmp/claude-0/t103.pdf',Buffer.from(b64,'base64'));
console.log('errs',p.errs.slice(0,3));await b.close();})();
