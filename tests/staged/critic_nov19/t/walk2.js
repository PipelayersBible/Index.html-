// critic measurements: small tap targets, small text, low contrast, and what the Feedback pill covers, per screen (390x664)
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const F=require(R+'/flow');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/cur.html';const SH=__dirname+'/../shots/';
const measure=(p)=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);
 const vis=e=>e.offsetParent&&e.getBoundingClientRect().width>0;
 const tg=[...s.querySelectorAll('button,a,select,input:not([type=hidden]):not([type=file]),summary,[role=button]')].filter(vis);
 const small=tg.filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44});
 const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
 const bgOf=e=>{while(e){const b=getComputedStyle(e).backgroundColor;if(b&&!/rgba\(0, 0, 0, 0\)|transparent/.test(b))return b;e=e.parentElement}return 'rgb(255,255,255)'};
 const tx=[];const w=document.createTreeWalker(s,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const t=n.textContent.trim();if(!t||!n.parentElement.offsetParent)continue;const cs=getComputedStyle(n.parentElement);const fs=parseFloat(cs.fontSize);const L1=lum(cs.color),L2=lum(bgOf(n.parentElement));const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);tx.push({t:t.slice(0,28),fs,cr:+cr.toFixed(2)});}
 const pill=document.getElementById('pbFbPill');let cover=[];if(pill&&!pill.hidden&&getComputedStyle(pill).display!=='none'){const pr=pill.getBoundingClientRect();cover=tg.filter(e=>{const r=e.getBoundingClientRect();return !(r.right<pr.left||r.left>pr.right||r.bottom<pr.top||r.top>pr.bottom)}).map(e=>(e.textContent||e.id||e.getAttribute('aria-label')||'').trim().slice(0,30));}
 return {id:s.id,targets:tg.length,small:small.length,smallEx:small.slice(0,8).map(e=>(e.textContent||e.id).trim().slice(0,22)+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height)),texts:tx.length,under14:tx.filter(x=>x.fs<14).length,under14Ex:[...new Set(tx.filter(x=>x.fs<14).map(x=>x.t+' '+x.fs))].slice(0,6),lowContrast:tx.filter(x=>x.cr<4.5).length,lowEx:[...new Set(tx.filter(x=>x.cr<4.5).map(x=>x.t+' '+x.cr))].slice(0,8),pillCovers:cover}});
(async()=>{const {b,p}=await boot(URL,{init:co,wait:3500});const H=F(p);await p.setViewportSize({width:390,height:664});
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num||'',conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line||'',conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 const out=async(tag)=>console.log(tag,JSON.stringify(await measure(p)));
 await out('HOME');
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);await out('NEWRUN');
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);await H.f('endStakeReading','3.57').catch(e=>console.log('no endStakeReading'));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);await out('REVIEW');await p.screenshot({path:SH+'c_review_fold.png'});
 await H.click('Lock This Run');await p.waitForTimeout(800);console.log('LOCKMODAL',await H.modal());for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;const pick=bt.find(x=>/I Checked|Lock Without|Lock/i.test(x))||bt[bt.length-1];await H.modalClick(pick);await p.waitForTimeout(900);}
 await p.waitForTimeout(1500);await out('RESULTS');
 // scroll the grade table so rows sit under the pill; which row controls does the pill cover at 4 scroll positions?
 for(const y of [0,300,600,900]){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(200);const m=await measure(p);console.log(' scroll',y,'pill covers',JSON.stringify(m.pillCovers));}
 await p.evaluate(()=>window.scrollTo(0,420));await p.waitForTimeout(200);await p.screenshot({path:SH+'c_results_pill.png'});
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);await out('PERMIT');
 await p.evaluate(()=>pbGoto('trenchCalc'));await p.waitForTimeout(600);await H.f('trenchDepth','12');await p.selectOption('#trenchSoil',{index:4}).catch(()=>{});await p.waitForTimeout(600);await out('TRENCH');await p.screenshot({path:SH+'c_trench_result.png',fullPage:true});
 console.log('TRENCHTXT',await p.evaluate(()=>document.getElementById('screen-trenchCalc').innerText.replace(/\n+/g,' | ').slice(0,2200)));
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(600);await out('SETTINGS');
 await p.evaluate(()=>pbGoto('quickrun'));await p.waitForTimeout(600);await out('QUICK');
 console.log('errs',p.errs.slice(0,3));await b.close();})();
