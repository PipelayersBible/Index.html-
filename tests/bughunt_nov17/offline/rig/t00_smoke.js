const {launch}=require('./srv');const co=require('./co');const L=require('./lib');const F=require('./flow');
(async()=>{const {b,ctx,p,S}=await launch((process.env.PB_URL||'http://127.0.0.1:8877/cur.html'),{init:co});const H=F(p);
 await L.newRun(p,100);await L.lock(p);
 console.log('screen',await H.screen(),await H.modal());const r=await L.rows(p);console.log(r);
 await L.markLaid(p,r[2]);
 await p.waitForTimeout(6000);
 console.log('calls',S.calls.map(c=>c.n).filter(n=>/run_/.test(n)).join(','));console.log('versions',S.versions.length, JSON.stringify(await L.entry(p)).slice(0,300));console.log(p.errs);await b.close();})();
