const boot=require('./boot');const co=require('./co');const F=require('./flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co});const H=F(p);
 await F.setup(p,H);
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 await H.click('Lock This Run');await p.waitForTimeout(2500);
 const rowMenu=async(d)=>{await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(600);};
 await rowMenu('62.0');await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(800);
 await H.click('Edit Run Data');await p.waitForTimeout(1500);
 console.log('edit:',await H.screen(),await H.modal(),JSON.stringify(await H.modalBtns()));
 let m=await H.modal(); if(m){const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1200);console.log('after modal',await H.screen(),await H.modal());}
 // change hub1 stake elevation
 const v=await p.evaluate(()=>({h1:document.getElementById('hub1StakeElev').value,dis:document.getElementById('hub1StakeElev').disabled,sta:document.getElementById('hub1StaTxt').value,br:document.getElementById('hub1FitBr').value,photos:(window._pbPhotos.hub1||[]).length}));console.log('form',JSON.stringify(v));
 await H.f('hub1StakeElev','104.1');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);console.log('review',await H.screen(),await H.modal());
 const lockBtn=(await H.btns()).find(t=>/Lock|Save|Apply/.test(t));console.log('lock btn',lockBtn,JSON.stringify(await H.btns()));
 if(lockBtn){await H.click(lockBtn);await p.waitForTimeout(2500);}
 for(let i=0;i<4;i++){m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('M',m.slice(0,300),bt);await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(1500);}
 console.log('final',await H.screen(),await p.evaluate(()=>{const m=document.getElementById('screen-results').innerText.match(/Pipe laid[\s\S]{0,30}/);return m&&m[0].replace(/\s+/g,' ');}));
 await p.evaluate(()=>pbHomeOpenReports());await p.waitForTimeout(800);await p.evaluate(()=>renderArchiveList());console.log('records count:',await p.evaluate(()=>document.getElementById('archiveList').children.length));
 console.log('errs',p.errs);await b.close();})();
