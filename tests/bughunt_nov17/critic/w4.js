const boot=require('/home/claude/rig/boot');const F=require('/home/claude/rig/flow');
const SH='/tmp/claude-0/bughunt/critic/shots/';
const run=async(name,init,fn)=>{const {b,p}=await boot('http://127.0.0.1:8865/cur.html',{init});const H=F(p);await p.setViewportSize({width:390,height:800});await p.waitForTimeout(400);
 const txt=(n=2500)=>p.evaluate((n)=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s.id+' :: '+s.innerText.replace(/\n+/g,' | ').slice(0,n)},n);
 console.log('=== '+name+' HOME',await txt(3000));console.log('MODAL',await H.modal(),JSON.stringify(await H.modalBtns()));await p.screenshot({path:SH+name+'_home.png',fullPage:true});
 if(fn)await fn(p,H,txt);console.log('errs',p.errs.slice(0,5));await b.close();};
(async()=>{
 await run('pl',require('/home/claude/rig/co_pl'),async(p,H,txt)=>{
   for(const s of ['dailyReport','prodDashboard','crewMembers','tickets','plans','aiAsk','jobs']){const can=await p.evaluate(s=>{try{return window.pbCanOpen?window.pbCanOpen(s):'?'}catch(e){return 'ERR '+e.message}},s);console.log('PL canOpen',s,can);}
   await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(600);console.log('PL MORE',await txt(1500));
 });
 const co=require('/home/claude/rig/co');
 await run('mgr',co+require('/home/claude/rig/mgr'),async(p,H,txt)=>{
   await p.evaluate(()=>pbGoto('prodDashboard'));await p.waitForTimeout(1500);console.log('MGR DASH',await txt(4000));await p.screenshot({path:SH+'mgr_dash.png',fullPage:true});
   await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(600);console.log('MGR MORE',await txt(3000));
   await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(800);console.log('MGR SETTINGS',await txt(4000));
   await p.evaluate(()=>pbGoto('crewMembers'));await p.waitForTimeout(800);console.log('MGR CREW',await txt(3000));await p.screenshot({path:SH+'mgr_crew.png',fullPage:true});
   await p.evaluate(()=>pbGoto('plans'));await p.waitForTimeout(800);console.log('MGR PLANS',await txt(2000));
   await p.evaluate(()=>pbGoto('aiAsk'));await p.waitForTimeout(800);console.log('ASK',await txt(1500));
 });
 // foreman daily report hours tab
 await run('fm2',co,async(p,H,txt)=>{
   await p.evaluate(()=>pbGoto('dailyReport'));await p.waitForTimeout(1000);await H.f('drJob','24-017').catch(async e=>{console.log('ids',await p.evaluate(()=>[...document.querySelectorAll('#screen-dailyReport input,#screen-dailyReport textarea,#screen-dailyReport select')].map(e=>e.id+':'+e.type).join(' ')))});
   await H.click('Next: Hours & Sign').catch(e=>console.log(e.message));await p.waitForTimeout(1000);console.log('MODAL',await H.modal());console.log('DR2',await txt(4000));await p.screenshot({path:SH+'fm_daily2.png',fullPage:true});
   await p.evaluate(()=>pbGoto('quickrun'));await p.waitForTimeout(800);console.log('QUICK',await txt(1500));
   await p.evaluate(()=>pbGoto('prodNoRun'));await p.waitForTimeout(800);console.log('NORUN',await txt(1500));
   await p.evaluate(()=>pbGoto('calcHub'));await p.waitForTimeout(800);console.log('CALC',await txt(2500));
 });
})();
