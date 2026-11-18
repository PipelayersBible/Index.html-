// phone dies right after actions: are laid marks / break / end kept?
const {launch}=require('./srv');const co=require('./co_ok');const L=require('./lib');const F=require('./flow');
const W=+process.argv[2]||100;
(async()=>{const {b,ctx,p,S,page}=await launch('http://127.0.0.1:8877/cur.html',{init:co});const H=F(p);
 await L.newRun(p,100);await L.lock(p);await ctx.setOffline(true);
 const r=await L.rows(p);
 await L.markLaid(p,r[4]);await p.waitForTimeout(1500);
 await L.markLaid(p,r[8]); // marks to 40 ft
 await p.waitForTimeout(W);
 const before=await L.entry(p);
 await p.close({runBeforeUnload:false});
 const p2=await page();const H2=F(p2);
 console.log('screen after reopen',await H2.screen(),await H2.modal());
 const after=await p2.evaluate(()=>{const e=window.__pbRrDebug.run();return e?{id:e.id,marks:Object.keys((e.laid||{}).marks||{}),log:((e.laid||{}).log||[]).length}:null;});
 console.log('home:',(await p2.evaluate(()=>document.getElementById('screen-home').innerText)).replace(/\s+/g,' ').slice(0,400));
 console.log('before marks',Object.keys(before.laid.marks),'after',JSON.stringify(after));
 console.log(p2.errs);await b.close();})();
