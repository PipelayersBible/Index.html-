const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const F=require('/home/claude/rig/flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8878/cur.html',{init:co});const H=F(p);
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
 // counted box before laying
 await p.evaluate(()=>{const s=[...document.querySelectorAll('#screen-results summary')].find(s=>/Production & Crew/.test(s.textContent));s&&s.click();});await p.waitForTimeout(400);
 console.log('counted (none laid):',JSON.stringify(await p.evaluate(()=>{const h=document.getElementById('fpCounted');return h&&!h.hidden?h.innerText:null;})));
 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 const dists=await p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));console.log('rows:',dists.join(' '));
 const mid=dists[Math.floor(dists.length/2)];
 await rowMenu(mid);await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(800);
 console.log('counted (laid to '+mid+'):',JSON.stringify(await p.evaluate(()=>{const h=document.getElementById('fpCounted');return h&&!h.hidden?h.innerText:null;})));
 await rowMenu(mid);console.log('menu buttons:',JSON.stringify(await H.modalBtns()));await H.modalClick('Check shot');await p.waitForTimeout(500);
 const tgt=await p.evaluate(()=>document.querySelector('#pbCsSheet .pb-help').textContent);console.log(tgt);
 await p.click('#pbCsRefs [data-ref="inv"]');
 const inv=parseFloat(/INV ([0-9.]+)/.exec(tgt)[1]);
 console.log('dbg:',await p.evaluate(()=>{try{return JSON.stringify([pbCsParse('7.56'),typeof pbCsResult]);}catch(e){return String(e)}}));await p.fill('#pbCsRod',(inv+0.01).toFixed(2));console.log('val:',await p.evaluate(()=>document.getElementById('pbCsRod').value),'errs so far',p.errs);console.log('live:',await p.evaluate(()=>document.getElementById('pbCsOut').textContent));
 await p.fill('#pbCsRod',(inv+0.06).toFixed(2));console.log('live:',await p.evaluate(()=>document.getElementById('pbCsOut').textContent));
 await p.click('#pbCsSave');await p.waitForTimeout(800);console.log('saved:',JSON.stringify(await H.modal()));await H.modalClick('OK').catch(()=>{});
 await rowMenu(mid);console.log('menu text:',JSON.stringify((await H.modal()).slice(0,200)));await H.modalClick('Close');
 // TOP shot from a ft-in string parse check
 console.log('parse:',await p.evaluate(()=>[pbCsParse("7-3 1/2"),pbCsParse("7'-3 1/2\""),pbCsParse('4.36'),pbCsParse('—'),pbCsParse('7-13')].join('|')));
 console.log('stored:',JSON.stringify(await p.evaluate(()=>{const e=window.__pbCsEntry();return e.checkShots.map(c=>({ref:c.ref,diff:c.diff,sta:c.sta}));})));
 // joint toggle
 await p.selectOption('#fpFitJoint','mj');await p.waitForTimeout(800);console.log('after MJ:',JSON.stringify(await p.evaluate(()=>document.getElementById('fpCounted').innerText)));
 console.log('daily used:',JSON.stringify(await p.evaluate(async()=>(await window.__pbDlyFitTest(window.__pbCsEntry())).filter(r=>r.kind==='counted'))));
 console.log('job materials block:',JSON.stringify(await p.evaluate(()=>{const d=document.createElement('div');d.innerHTML=window.__pbMatFitHtml({job_number:'24-017'});return d.innerText;})));
 // PDF section
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};});await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 const t=await p.evaluate(()=>{const d=window.__pdfDoc;if(!d)return 'no pdf';const raw=d.output();return raw.indexOf('Check shots')<0?'missing':'found; LOW: '+(raw.indexOf('LOW')>=0);});console.log('pdf:',t);{const b64=await p.evaluate(()=>{const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});require('fs').writeFileSync('/tmp/claude-0/t115.pdf',Buffer.from(b64,'base64'));}
 await p.setViewportSize({width:390,height:800});await rowMenu(mid);await H.modalClick('New check shot');await p.waitForTimeout(400);await p.evaluate(()=>{const J=window.jspdf.jsPDF;const d=window.__pdfDoc;const a=new Uint8Array(d.output('arraybuffer'));window.__pdfb=a.length;});await p.screenshot({path:'/tmp/claude-0/cs.png'});
 console.log('errs',p.errs.slice(0,3));await b.close();})();
