const boot=require('./boot');(async()=>{const {b,p}=await boot('http://localhost:8814/',{init:require('./pm'),wait:4000});
await p.context().setOffline(true);await p.evaluate(()=>window.dispatchEvent(new Event('offline')));await p.waitForTimeout(1500);
await p.evaluate(()=>window.pbGoto('home'));await p.waitForTimeout(1500);await p.screenshot({path:'off_home.png',fullPage:true});
await p.evaluate(()=>window.pbOpenProdJob(0));await p.waitForTimeout(2500);await p.screenshot({path:'off_job.png',fullPage:true});
console.log(await p.evaluate(()=>{const out={};document.querySelectorAll('body *').forEach(e=>{if(e.children.length===0&&e.offsetParent){const t=e.textContent.trim();if(/signal|load|Refresh/i.test(t)&&t.length<90)out[t]=(out[t]||0)+1;}});return out;}));
await b.close();})();
