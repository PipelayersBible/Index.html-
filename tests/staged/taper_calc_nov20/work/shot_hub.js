const boot=require('/home/claude/index.html-/tests/rig/boot');const co=require('/home/claude/index.html-/tests/rig/co');
(async()=>{for(const u of ['base','cur']){const {b,p}=await boot('http://127.0.0.1:10350/'+u+'.html',{init:co});await p.setViewportSize({width:390,height:844});await p.click('#pbTabCalculators');await p.waitForTimeout(600);
await p.screenshot({path:__dirname+'/hub_'+u+'.png'});console.log(u,await p.evaluate(()=>{const s=document.getElementById('toolsBrowseCats');return s.getBoundingClientRect().height}));await b.close();}})();
