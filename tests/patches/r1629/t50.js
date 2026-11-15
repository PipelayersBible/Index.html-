const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/idx29.html');
 let n=0;
 await p.route('**/functions/v1/ai**', async r=>{n++;
   const reply=n===1?{is_stake:true,stake_number:{value:'3864',conf:'high'},station:{value:null,conf:'uncertain'},offset:{value:'10/SD',conf:'high'},line_label:{value:'MH IE IN',conf:'high'},cut_fill:{direction:'cut',feet:3.83,as_written:'C-3.83',to:'IE',conf:'high'},stake_elevation:{feet:103.83,as_written:'103.83',conf:'high'},other_text:'',uncertain:[]}
     :{is_stake:true,stake_number:{value:null,conf:'uncertain'},offset:{value:'25/SD',conf:'high'},cut_fill:{direction:'cut',feet:1.1,as_written:'C-1 10 INV',to:'INV',conf:'low'},stake_elevation:{feet:null,as_written:null,conf:'uncertain'},other_text:'',uncertain:[]};
   await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(reply),used:1,limit:60})});});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const fs=require('fs');const mk=(name)=>({name,mimeType:'image/jpeg',buffer:fs.readFileSync('/tmp/claude-0/evimg/p12.jpg')});
 await p.setInputFiles('#startAiStakePhoto',[mk('f.jpg'),mk('b.jpg')]);await p.waitForTimeout(2500);
 const rd=()=>p.evaluate(()=>['startStakeElev','startCutFillVal','startCutFill','startLabel'].map(i=>(document.getElementById(i)||{}).value).join(' | ')+' || card:'+(document.getElementById('startAiStakeReview').style.display)+' || '+document.getElementById('startAiStakeStatus').innerText.replace(/\s+/g,' '));
 console.log('1:',await rd());
 console.log('outlined:',await p.evaluate(()=>[...document.querySelectorAll('.pb-ai-filled')].map(e=>e.id).join(',')));
 // second read on end point: one unsure value
 await p.setInputFiles('#endAiStakePhoto',[mk('f.jpg')]);await p.waitForTimeout(1500);await p.evaluate(()=>pbStakeAiReadNow('end'));await p.waitForTimeout(2000);
 console.log('2:',await p.evaluate(()=>['endStakeElev','endCutFillVal','endLabel'].map(i=>(document.getElementById(i)||{}).value).join(' | ')+' || '+document.getElementById('endAiStakeStatus').innerText.replace(/\s+/g,' ')));
 // conflict: read start again with typed different value
 await p.evaluate(()=>{const e=document.getElementById('startCutFillVal');e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}));});n=0;
 await p.setInputFiles('#startAiStakePhoto',[mk('f.jpg'),mk('b.jpg')]);await p.waitForTimeout(2500);
 console.log('modal:',await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,.pb-modal,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,200):'none';}));
 console.log('errs',p.errs.length,p.errs.slice(0,3));await b.close();})();
