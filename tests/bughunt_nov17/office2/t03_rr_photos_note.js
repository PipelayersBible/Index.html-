const L=require('./lib');
const extra=`;window.__rpcOverride.pb_prod_company_runs=()=>({ok:true,runs:[{id:'r1',job_key:'26014',job_number:'26014',label:'MH-3 to MH-4',who:'Rick Foreman',role:'foreman',locked_at:'2026-11-16T22:00:00Z',status:'foreman',ended:true,record:{pbOffice:{photos:[{sha:'a'}]}}}]});`;
(async()=>{const {b,p}=await L.open(extra,{w:1280});let fail=0;
 await p.evaluate(()=>window.pbCxOpenList('runs'));await p.waitForTimeout(2500);
 const t=await L.txt(p);const line=(t.match(/Last 60 days\.[^\n]*/)||[''])[0];console.log('note:',line);
 if(!line){console.log('FAIL: list note not found');fail=1;}
 if(/stay on the crew/i.test(line)){console.log('FAIL: says photos stay on the crew\'s phone');fail=1;}
 if(p.errs.length){console.log('errs',p.errs);fail=1;}
 console.log(fail?'RESULT FAIL':'RESULT PASS');await b.close();process.exit(fail);})();
