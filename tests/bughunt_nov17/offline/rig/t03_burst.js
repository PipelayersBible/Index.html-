// r16.95 faster send: a laid mark made while a send is in flight (slow signal)
const {launch}=require('./srv');const co=require('./co_ok');const L=require('./lib');const F=require('./flow');
(async()=>{const {b,ctx,p,S}=await launch((process.env.PB_ROOT||'http://127.0.0.1:8877/')+(process.env.PG||'cur.html'),{init:co});
 await L.newRun(p,100);await L.lock(p);
 await p.waitForTimeout(12000); // first copy up
 S.opts.delay=6000; // slow bar of signal: each call takes 6 s
 const r=await L.rows(p);const t0=Date.now();
 await L.markLaid(p,r[4]);      // mark A -> send ~4 s later, in flight for ~12 s (put + clock)
 await p.waitForTimeout(6000);
 await L.markLaid(p,r[8]);      // mark B while A's send is in flight
 const want=await p.evaluate(()=>Object.keys(window.__pbRrDebug.run().laid.marks).length);
 let got=null;
 for(let i=0;i<50;i++){await p.waitForTimeout(1000);const rec=Object.values(S.records)[0];const n=rec&&rec.record.laid?Object.keys(rec.record.laid.marks).length:0;if(n===want){got=(Date.now()-t0)/1000;break;}}
 console.log('marks on phone',want,'server has them after',got===null?'>50 s (not yet)':got+' s');
 console.log(S.calls.filter(c=>/run_record_put/.test(c.n)).map(c=>((c.t-t0)/1000).toFixed(1)).join(' '));
 await b.close();console.log(got!==null&&got<32?"PASS":"FAIL");process.exit(got!==null&&got<32?0:1);})();
