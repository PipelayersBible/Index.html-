const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+(process.argv[2]||'idx31.html'));
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 const typ=async(id,v)=>{await p.click('#'+id);await p.fill('#'+id,String(v));await p.keyboard.press('Tab');await p.waitForTimeout(250);};
 await p.evaluate(()=>{const w=document.querySelector('.pb-st-wrap[data-st-pt="start"] .pb-st-tog button[data-st="sta"]');w&&w.click();});
 await typ('startStaTxt','0+00');await f('totalDist',400);
 for(let i=0;i<3;i++) await p.evaluate(()=>pbAddHub());await p.waitForTimeout(400);
 const setSta=async(h,t)=>{await p.evaluate(h=>{const w=document.querySelector('.pb-st-wrap[data-st-pt="'+h+'"] .pb-st-tog button[data-st="sta"]');w&&w.click();},h);await typ(h+'StaTxt',t);};
 await setSta('hub0','1+00');await setSta('hub1','2+00');await setSta('hub2','3+00');
 await p.evaluate(()=>pbXingAdd(1));await p.waitForTimeout(500);
 const xid=await p.evaluate(()=>document.querySelector('.pb-xing-card').dataset.xingId);
 await typ(xid+'Sta','2+50');await p.waitForTimeout(600);
 const order=()=>p.evaluate(()=>[...document.querySelectorAll('#hubsContainer > [data-hub-id], #hubsContainer > .pb-xing-card, #xingContainer1 > .pb-xing-card')].map(e=>e.dataset.hubId? e.dataset.hubId+'@'+document.getElementById(e.dataset.hubId+'Station').value : 'X').join(' '));
 console.log('typed:',await order());
 // hub station set by AI-like (no events)
 await p.evaluate(()=>{document.getElementById('hub2Station').value='120';});await p.evaluate(()=>pbXingOrder());
 console.log('after hub2=120:',await order());
 console.log('errs',p.errs.length,p.errs.slice(0,2));await b.close();})();
