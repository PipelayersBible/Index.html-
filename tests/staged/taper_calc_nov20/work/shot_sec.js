const boot=require('/home/claude/index.html-/tests/rig/boot');const co=require('/home/claude/index.html-/tests/rig/co');
(async()=>{const {b,p}=await boot('http://127.0.0.1:10350/cur.html',{init:co});await p.setViewportSize({width:390,height:844});await p.click('#pbTabCalculators');await p.waitForTimeout(600);await p.click('#calcCatBtnTraffic');await p.waitForTimeout(900);
await p.screenshot({path:__dirname+'/hub_traffic.png'});console.log(p.errs);await b.close();})();
