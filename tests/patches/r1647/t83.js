const boot=require('./boot');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx41.html');
 await p.route('**/functions/v1/ai**', async r=>{const reply={is_stake:true,stake_number:{value:'1',conf:'high'},station:{value:null,conf:'uncertain'},offset:{value:'10/SD',conf:'high'},line_label:{value:'',conf:'high'},cut_fill:{direction:'cut',feet:5,as_written:'C-5',to:'IE',conf:'high'},stake_elevation:{feet:99.5,as_written:'99.5',conf:'high'},other_text:'',uncertain:[]};await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(reply),used:1,limit:60})});});
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 const img=n=>({name:n+'.jpg',mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/'+n+'.jpg')});
 const lockRun=async(nh)=>{
  await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
  await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
  await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
  await p.selectOption('#runIdSel',{label:'8"'});
  await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);
  await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);
  await f('totalDist',200);await f('interval',10);
  for(let i=0;i<nh;i++){await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);const h='hub'+i;await p.setInputFiles('#'+h+'AiStakePhoto',[img('p12'),img('p13')]);await p.waitForTimeout(1800);await f(h+'Station',20+i*15);await f(h+'StakeElev',99.9-i*0.07);await f(h+'CutFillVal',5);}
  await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);
  await p.evaluate(()=>pbLock());await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,200):'none';});
  if(m!=='none'){await p.evaluate(()=>{const b=[...document.querySelectorAll('.pb-modal-overlay button,[role=dialog] button,[role=alertdialog] button')].filter(b=>b.offsetParent).pop();b&&b.click();});}
  return m;};
 const state=async()=>p.evaluate(async()=>{let ls=0,arch=null,mark=null;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);ls+=(localStorage.getItem(k)||'').length;if(/:runArchive$/.test(k))arch=k+':'+localStorage.getItem(k).length;if(/@idb$/.test(k))mark=k;}
   const idb=await new Promise(ok=>{const r=indexedDB.open('pb-big',1);r.onupgradeneeded=()=>{r.transaction.abort();ok('none');};r.onsuccess=()=>{try{const t=r.result.transaction('kv').objectStore('kv').getAll();t.onsuccess=()=>ok(t.result.map(v=>v.length));}catch(e){ok('no store')}};r.onerror=()=>ok('err');});
   return {lsChars:ls,arch,mark,idb};});
 console.log('old app lock:',await lockRun(2));console.log('old state:',JSON.stringify(await state()));
 await p.goto('http://127.0.0.1:8843/idx47b.html');await p.waitForTimeout(3000);
 console.log('new app loaded state:',JSON.stringify(await state()));
 console.log('new app lock:',await lockRun(2));console.log('new state:',JSON.stringify(await state()));
 await p.reload();await p.waitForTimeout(3000);
 await p.evaluate(()=>renderArchiveList());await p.waitForTimeout(500);console.log('records after reload:',await p.evaluate(()=>{const l=document.getElementById('archiveList');return l.children.length+' | '+l.innerText.replace(/\s+/g,' ').slice(0,200);}));
 console.log('errs',p.errs.slice(0,3));await b.close();})();
