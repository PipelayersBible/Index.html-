const boot=require('./boot');(async()=>{const {b,p}=await boot(process.argv[2]||'http://localhost:8812/',{init:require('./pm'),wait:4000});
await p.screenshot({path:'pm0.png'});
console.log(await p.evaluate(()=>[document.documentElement.className, typeof window.pbOpenProdJob]));
await p.evaluate(()=>window.pbOpenProdJob&&window.pbOpenProdJob(0));await p.waitForTimeout(2500);
await p.screenshot({path:'pm1.png'});await p.evaluate(()=>window.scrollTo(0,600));await p.waitForTimeout(500);await p.screenshot({path:'pm2.png'});
console.log(p.errs);await b.close();})();
