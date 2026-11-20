const L=require('./lib');(async()=>{const b=await L.chromium.launch();const p=await L.SC[process.argv[2]](b,{});
console.log(await p.evaluate(()=>[...document.querySelectorAll('.pb-screen')].filter(x=>x.offsetParent).map(x=>x.id).join(',')), 'modal:', (await L.modalText(p)).slice(0,300), 'errs', p.errs, p.fillErr, p.mods);
if(process.argv[3])console.log(await p.evaluate(process.argv[3]));
await p.screenshot({path:'/tmp/claude-0/es19/shots/probe.png',fullPage:true});await b.close();})();
