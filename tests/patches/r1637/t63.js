const boot=require('./boot');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+(process.argv[2]||'idx36.html'));
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 const typ=async(id,v)=>{await p.click('#'+id);await p.fill('#'+id,String(v));await p.keyboard.press('Tab');await p.waitForTimeout(300);};
 const tog=async(pt,m)=>{await p.evaluate(([pt,m])=>{document.querySelector('.pb-st-wrap[data-st-pt="'+pt+'"] .pb-st-tog button[data-st="'+m+'"]').click();},[pt,m]);await p.waitForTimeout(300);};
 const show=async(pt)=>p.evaluate(pt=>{const w=document.querySelector('.pb-st-wrap[data-st-pt="'+pt+'"]');return 'mode='+w.dataset.stMode+' sta="'+document.getElementById(pt+'StaTxt').value+'" dist="'+(document.getElementById(pt==='end'?'totalDist':pt+'Station')||{}).value+'" out="'+(w.querySelector('.pb-st-out')||{}).textContent+'"';},pt);
 
 await typ('startStaTxt','10+00');
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(300);
 console.log('hub0 init:',await show('hub0'));
 await typ('hub0StaTxt','12+12');console.log('hub0 sta typed:',await show('hub0'));
 await tog('hub0','dist');console.log('hub0 -> dist:',await show('hub0'));
 await typ('hub0Station','250');console.log('hub0 dist typed 250:',await show('hub0'));
 await tog('hub0','sta');console.log('hub0 -> sta:',await show('hub0'));
 await tog('hub0','dist');console.log('hub0 -> dist again:',await show('hub0'));await typ('hub0Station','300');await tog('hub0','sta');console.log('hub0 dist300 -> sta:',await show('hub0'));await typ('hub0StaTxt','11+00');await tog('hub0','dist');await tog('hub0','sta');console.log('sta typed 11+00, round trip:',await show('hub0'));
 await b.close();})();
