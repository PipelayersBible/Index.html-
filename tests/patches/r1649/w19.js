const boot=require('./boot');const mgr=require('./mgr');const F=require('./flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:mgr});const H=F(p);
 await p.waitForTimeout(2000);await H.shot('160-mgr-home');
 console.log('rpcs',await p.evaluate(()=>[...new Set(window.__rpcLog)].join(' ')));
 await p.evaluate(()=>window.pbOpenProdDashboard&&pbOpenProdDashboard());await p.waitForTimeout(2500);
 console.log('screen',await H.screen(),await H.modal());await H.shot('161-mgr-dash');await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(300);await H.shot('162-mgr-dash-top',false);console.log(await p.evaluate(()=>document.getElementById('screen-prodDashboard').innerText.slice(0,300)+' || firstTop='+(()=>{const s=document.getElementById('screen-prodDashboard');const els=[...s.querySelectorAll('*')].filter(e=>e.offsetParent&&e.children.length===0&&e.textContent.trim());return els.slice(0,6).map(e=>e.tagName+'.'+e.className+':'+Math.round(e.getBoundingClientRect().top)+':'+e.textContent.trim().slice(0,30)).join(' | ');})()));
 console.log('errs',p.errs);await b.close();})();
