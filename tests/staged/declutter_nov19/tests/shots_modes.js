// dark theme and Large text screenshots of the patched Home. DARK=1 node shots_modes.js dark | node shots_modes.js large
const L=require('./_lib');const mode=process.argv[2]||'large';const SH=__dirname+'/../shots/';
(async()=>{for(const role of ['fm','owner']){const {b,p}=await L.start(L.CUR,L.ROLES[role]);
 if(mode==='large'){await p.evaluate(()=>pbSetTextSize(120));await p.waitForTimeout(600);}
 await p.screenshot({path:SH+'after_'+role+'_'+mode+'.png',fullPage:true});
 const m=await L.measure(p,'home');console.log(role,mode,'height',m.height,'under14',m.under14,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'errs',p.errs.length);await b.close();}})();
