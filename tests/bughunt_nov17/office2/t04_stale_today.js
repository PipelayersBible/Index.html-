// Office laptop: the dashboard was loaded yesterday afternoon (2 crew members reported, 300 LF pipe that day).
// This morning there is no signal; Home and Company production show the saved copy. They must not call yesterday "today".
const L=require('./lib');const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const mgr=require(__dirname+'/../../rig/mgr');
const y=(()=>{const d=new Date(Date.now()-86400000);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})();
const extra=`;(function(){const o=window.__rpcOverride.pb_prod_company_dashboard;window.__rpcOverride.pb_prod_company_dashboard=(a)=>{const d=JSON.parse(JSON.stringify(o(a)));d.today='${y}';d.server_at=new Date(Date.now()-86400000).toISOString();d.jobs.forEach(j=>{if(j.job_key==='26014'){j.reporters_today=2;j.last_work_date='${y}';j.last_at=new Date(Date.now()-86400000).toISOString();j.cats.forEach(c=>{if(c.key==='pipe'){c.today=300;}});}});return d;};})();`;
(async()=>{const {b,p}=await L.open(extra,{w:1280});let fail=0;
 await p.evaluate(()=>pbGoto('prodDashboard'));await p.waitForTimeout(2500); // loads and saves the copy (as yesterday)
 // overnight: the saved copy is what's left; next morning, no signal
 await p.evaluate(()=>{window.__rpcOverride.pb_prod_company_dashboard=()=>{throw new Error('Failed to fetch')};});
 await p.context().setOffline(true);
 await p.evaluate(()=>window.dispatchEvent(new Event('offline')));await p.waitForTimeout(500);
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(1500);
 const h=await L.txt(p);const hl=h.split('\n').filter(x=>/today|Copy|Updated/i.test(x));console.log('HOME:',hl.join(' | '));
 await p.evaluate(()=>window.pbOpenProdDashboard?window.pbOpenProdDashboard():pbGoto('prodDashboard'));await p.waitForTimeout(1500);
 const d=await L.txt(p);const dl=d.split('\n').filter(x=>/today|Copy|Updated/i.test(x));console.log('DASH:',dl.join(' | '));
 const all=h+'\n'+d;
 if(/2 crew members reported today|2 reported today/.test(all)){console.log('FAIL: yesterday\'s crew shown as "reported today"');fail=1;}
 if(/Today: [^\n]*Pipe/.test(all)){console.log('FAIL: yesterday\'s pipe shown as "Today:"');fail=1;}
 if(/Reported today\s*\n\s*1/.test(d)){console.log('FAIL: Reported today counts yesterday');fail=1;}
 if(p.errs.length){console.log('errs',p.errs);}
 console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();process.exit(fail);})();
