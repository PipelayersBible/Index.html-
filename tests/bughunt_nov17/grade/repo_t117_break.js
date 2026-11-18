const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
(async()=>{const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8862/')+(process.env.PG||'cur.html')+'',{init:co});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('2+12',103.7,3.69,'AP','3861');await p.setInputFiles('#hub0AiStakePhoto',[H.img('p01')]);await p.waitForTimeout(2500);
 await H.sel('hub0FitAng','22.5°');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);
 stake=S('3+39',104.0,3.73,'WYE','3862');await p.setInputFiles('#hub1AiStakePhoto',[H.img('p03')]);await p.waitForTimeout(2500);
 await H.sel('hub1FitBr','6"');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them').catch(()=>{});await p.waitForTimeout(2500);

 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 const dists=await p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));
 await rowMenu(dists[2]);await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(800);
 console.log('break btn:',await p.evaluate(()=>!!document.getElementById('pbBrkBtn')));
 await p.click('#pbBrkBtn');await p.waitForTimeout(1500);
 console.log('overlay:',await p.evaluate(()=>{const o=document.getElementById('pbBrk');const tbl=document.querySelector('#screen-results [aria-label^="Distance "]');return {shown:!!o&&!o.hidden,text:o&&o.innerText.slice(0,60),gradeVisible:tbl?getComputedStyle(tbl).visibility:null,cls:document.documentElement.classList.contains('pb-on-break')};}));
 // the clock: pretend the break began 10 minutes ago
 await p.evaluate(()=>{const e=window.__pbCsEntry();e.onBreak.start-=600000;});
 await p.setViewportSize({width:390,height:800});await p.waitForTimeout(1200);await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0')+'/brk.png')});
 await p.click('#pbBrkEnd');await p.waitForTimeout(1200);
 console.log('after end:',JSON.stringify(await p.evaluate(()=>{const e=window.__pbCsEntry();return {onBreak:!!e.onBreak,breaks:(e.breaks||[]).map(b=>Math.round((b.end-b.start)/60000)+' min'),overlay:!document.getElementById('pbBrk')||document.getElementById('pbBrk').hidden,vis:getComputedStyle(document.querySelector('#screen-results [aria-label^="Distance "]')).visibility};})));
 // stats exclude the break: a break between two marks
 console.log('overlap test:',await p.evaluate(()=>window.pbBrkOverlap([[100,200],[300,400]],150,350)));
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};});await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 {const b64=await p.evaluate(()=>{const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});require('fs').writeFileSync(((process.env.PB_OUT||'/tmp/claude-0')+'/t117.pdf'),Buffer.from(b64,'base64'));}
 console.log(require('child_process').execSync(('pdftotext -layout '+(process.env.PB_OUT||'/tmp/claude-0')+'/t117.pdf - | grep -A4 "^ *Breaks (" | head -6')).toString());
 console.log('errs',p.errs.slice(0,3));await b.close();})();
