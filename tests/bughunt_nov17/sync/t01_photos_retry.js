// Run photos: more than 20 in a run, or an upload that fails once, must still all reach the company.
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const mkrun=require('/home/claude/rig/mkrun');
const URL_=process.env.URL||'http://127.0.0.1:8864/cur.html';
(async()=>{const {b,p}=await boot(URL_,{init:co});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 await f('saJobNumber','24-017');await f('saJobsite','Test Sewer');
 await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
 await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);await f('totalDist',100);await f('interval',10);
 await p.waitForTimeout(500);await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);
 await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(1200);
 for(let i=0;i<4;i++){const m=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());if(!d)return null;const t=d.innerText.replace(/\s+/g,' ').slice(0,120);const bs=[...d.querySelectorAll('button')].filter(b=>b.offsetParent);const inp=d.querySelector('input[type=text],input:not([type])');if(inp&&!inp.value){inp.value='24-017';inp.dispatchEvent(new Event('input',{bubbles:true}));}(bs.find(b=>/Use It|I Checked|OK|Lock/.test(b.textContent))||bs[bs.length-1]).click();return t;});if(!m)break;console.log('modal:',m);await p.waitForTimeout(1500);}
 await p.waitForTimeout(1500);
 const n0=await p.evaluate(()=>{const e=window.__pbRrDebug.run();if(!e)return -1;
   const px='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=';
   e.sitePhotos=[];for(let i=0;i<25;i++)e.sitePhotos.push({at:i,dataUrl:px+'#'+'x'.repeat(200)+i});return (window.__pbRrDebug.copy(e.id).pbOffice.photos||[]).length;});
 console.log('photo refs in office copy:',n0);
 const up=()=>p.evaluate(()=>Object.keys(window.__uploads||{}).filter(k=>k.startsWith('run-photos/')).length);
 await p.evaluate(()=>window.__pbRrDebug.send());await p.waitForTimeout(1500);
 console.log('after 1st send:',await up());
 for(let i=0;i<4;i++){await p.evaluate(()=>window.__pbRrDebug.send());await p.waitForTimeout(1500);}
 await p.waitForTimeout(6000);
 const n1=await up();console.log('after later passes:',n1);
 console.log(n1>=n0&&n0>=25?'PASS':'FAIL: '+(n0-n1)+' photos never reach the company');
 console.log('errs',p.errs.slice(0,3));await b.close();})();
