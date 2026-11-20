const L=require('./lib');(async()=>{const b=await L.chromium.launch();const p=await L.SC[process.argv[2]](b,{lang:process.argv[3]||'es'});
console.log(JSON.stringify(await p.evaluate(process.argv[4])));
await p.screenshot({path:'/tmp/claude-0/es19/shots/probe2.png'});await b.close();})();
