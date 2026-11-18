const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co+`;window.__seals=[];window.__clock=[];window.__rpcOverride.pb_prod_run_clock=(a)=>{window.__clock.push(a);return {ok:true};};window.__rpcOverride.pb_run_seal_add=(a)=>{window.__seals.push(a);return {ok:true,version:window.__seals.length,sealed_at:new Date().toISOString()};};window.__rpcOverride.pb_run_seals_list=()=>({seals:window.__seals.map((a,i)=>({version:i+1,path:a.p_path,sha256:a.p_sha256,bytes:a.p_bytes,made_at:a.p_made_at,server_check:i===window.__seals.length-1?{matches:true,at:new Date().toISOString(),tsa:['DigiCert','FreeTSA'],tokens:[{name:'DigiCert',token:btoa('fake-token')}]}:null})).reverse()});`});const H=F(p);
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
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('Lock Without It').catch(()=>{});await p.waitForTimeout(600);await H.modalClick('I Checked Them');await p.waitForTimeout(2500);
 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 await rowMenu('301.0');await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(600);
 await H.click('Delay');await p.selectOption('#pbSlReason',{label:'Waiting on inspector'});await H.click('Start Delay');await p.waitForTimeout(1200);await H.click('End Delay');await p.waitForTimeout(500);
 await p.evaluate(()=>{const s=[...document.querySelectorAll('#screen-results summary')].find(s=>/Production & Crew/.test(s.textContent));s&&s.click();});await p.waitForTimeout(400);
 await H.f('fpPipeInstalled','301');await H.click('Save Production');await p.waitForTimeout(1500);
 await H.click('End Run and Send Report');await p.waitForTimeout(1500);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1500);}
 
 await p.waitForTimeout(1000);
 const id=await p.evaluate(()=>{const b=document.getElementById('homeRunReportPdf');return b?Number(/\((\d+)\)/.exec(b.getAttribute('onclick'))[1]):null;});
 const copy=await p.evaluate((id)=>{const c=window.__pbRrDebug.copy(id);return {photos:(c.pbOffice.photos||[]).map(x=>({p:x.p.join('.'),f:x.f||null,path:x.path})),left:c.pbOffice.photosLeftOut};},id);
 console.log('office copy photo refs:',copy.photos.length,'left out:',copy.left);copy.photos.slice(0,8).forEach(x=>console.log('  ',x.p,x.f||'',x.path.replace(/^[^/]+/,'<uid>')));
 await p.evaluate(()=>window.__pbRrDebug.send());
 for(let i=0;i<20;i++){await p.waitForTimeout(1000);const n=await p.evaluate(()=>Object.keys(window.__uploads||{}).filter(k=>k.startsWith('run-photos/')).length);if(n>=copy.photos.length)break;}
 console.log('uploaded:',await p.evaluate(()=>Object.keys(window.__uploads||{}).filter(k=>k.startsWith('run-photos/')).length));

 const uid=await p.evaluate(()=>window.__pbRrDebug.state().uid);
 await p.evaluate(async(u)=>{await window.pbRrSealPass(u);},uid);
 let r=await p.evaluate(async()=>{const a=window.__seals[0];if(!a)return null;const blob=window.__uploads['run-seals/'+a.p_path];const buf=await blob.arrayBuffer();const h=await crypto.subtle.digest('SHA-256',buf);const hex=Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
   const head=new TextDecoder('latin1').decode(new Uint8Array(buf));return {n:window.__seals.length,path:a.p_path.replace(/^[^/]+/,'<uid>'),bytes:a.p_bytes,real:buf.byteLength,shaOk:hex===a.p_sha256,images:(head.match(/\/Subtype\s*\/Image/g)||[]).length,title:/sealed original/.test(head),subject:/Subject \(Sealed original/.test(head)};});
 console.log('seal 1:',JSON.stringify(r));
 await p.evaluate(async(u)=>{await window.pbRrSealPass(u);},uid);
 console.log('after 2nd pass (no change) seals:',await p.evaluate(()=>window.__seals.length));
 // report flags changing must not reseal
 await p.evaluate(async(u)=>{const e=window.__pbRrDebug.run();e.reportSentAt=Date.now();e.reportSentHow='pipelayer';await window.__pbRrDebug.send();await window.pbRrSealPass(u);},uid);
 console.log('after report flags change seals:',await p.evaluate(()=>window.__seals.length));
 // an edit reseals as version 2
 await p.evaluate(async(u)=>{const e=window.__pbRrDebug.run();e.notes=(e.notes||'')+' edited';await window.__pbRrDebug.send();await window.pbRrSealPass(u);},uid);
 console.log('after edit seals:',await p.evaluate(()=>window.__seals.length));
 const zip=await p.evaluate(async()=>{const e=window.__pbRrDebug.run();const rec=window.__pbRrDebug.copy(e.id);window.__pbRrDebug.open({id:'run-uuid',job_number:'24-017'},rec);
   let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=(b)=>{blob=b;return oc(b);};await window.pbRrExport();await new Promise(r=>setTimeout(r,500));URL.createObjectURL=oc;
   if(!blob)return null;const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(zip){fs.writeFileSync('/tmp/claude-0/export.zip',Buffer.from(zip,'base64'));console.log('zip bytes',Buffer.from(zip,'base64').length);}else console.log('no zip');
 console.log('modal:',JSON.stringify(await H.modal()).slice(0,200));
console.log('errs',p.errs.slice(0,3));await b.close();})();
