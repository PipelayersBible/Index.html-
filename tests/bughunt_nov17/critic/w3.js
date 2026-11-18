const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const F=require('/home/claude/rig/flow');
const SH='/tmp/claude-0/bughunt/critic/shots/';
(async()=>{const {b,p}=await boot('http://127.0.0.1:8865/cur.html',{init:co});const H=F(p);
 await p.setViewportSize({width:390,height:800});
 const txt=(n=2500)=>p.evaluate((n)=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s.id+' :: '+s.innerText.replace(/\n+/g,' | ').slice(0,n)},n);
 const stats=()=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);const v=e=>e.offsetParent;return {inputs:[...s.querySelectorAll('input:not([type=file]):not([type=hidden]),textarea')].filter(v).length,selects:[...s.querySelectorAll('select')].filter(v).length,buttons:[...s.querySelectorAll('button')].filter(v).length,height:s.scrollHeight,words:s.innerText.split(/\s+/).length}});
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num||'',conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line||'',conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(800);await H.modalClick('I Checked Them').catch(()=>{});await p.waitForTimeout(2500);
 await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')][20];e.click();});await p.waitForTimeout(600);
 await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(800);
 // check shot
 await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')][20];e.click();});await p.waitForTimeout(600);
 await H.modalClick('Check shot');await p.waitForTimeout(800);
 console.log('CHECKSHOT',await H.modal(),JSON.stringify(await H.modalBtns()));await p.screenshot({path:SH+'fm_checkshot.png'});
 await H.modalClick('Cancel').catch(async()=>{await H.modalClick('Close').catch(()=>{})});
 // end run
 await H.click('End Run and Send Report');await p.waitForTimeout(1200);
 console.log('ENDRUN1',await H.modal(),JSON.stringify(await H.modalBtns()));await p.screenshot({path:SH+'fm_endrun1.png'});
 for(let i=0;i<5;i++){const bt=await H.modalBtns();if(!bt.length)break;const pick=bt.find(x=>!/cancel|back|close|keep/i.test(x))||bt[0];console.log(' ->click',pick);await H.modalClick(pick);await p.waitForTimeout(1500);console.log('ENDRUN'+(i+2),await H.modal(),JSON.stringify(await H.modalBtns()));}
 console.log('AFTER END',await txt(1500));await p.screenshot({path:SH+'fm_afterend.png',fullPage:true});
 // daily report
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(800);
 await H.click('Daily report').catch(e=>console.log(e.message));await p.waitForTimeout(1500);
 console.log('DR MODAL',await H.modal(),JSON.stringify(await H.modalBtns()));
 console.log('DAILY',await txt(4000));console.log(JSON.stringify(await stats()));await p.screenshot({path:SH+'fm_daily.png',fullPage:true});
 // More
 await H.click('More').catch(e=>console.log(e.message));await p.waitForTimeout(800);
 console.log('MORE modal',await H.modal());console.log('MORE',await txt(3000));console.log(JSON.stringify(await stats()));await p.screenshot({path:SH+'fm_more.png',fullPage:true});
 await H.click('Records').catch(e=>console.log(e.message));await p.waitForTimeout(1000);
 console.log('RECORDS',await txt(2000));await p.screenshot({path:SH+'fm_records.png',fullPage:true});
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(800);
 console.log('SETTINGS',await txt(5000));console.log(JSON.stringify(await stats()));await p.screenshot({path:SH+'fm_settings.png',fullPage:true});
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
 console.log('PERMIT',await txt(5000));console.log(JSON.stringify(await stats()));await p.screenshot({path:SH+'fm_permit.png',fullPage:true});
 console.log('errs',p.errs.slice(0,5));await b.close();})();
