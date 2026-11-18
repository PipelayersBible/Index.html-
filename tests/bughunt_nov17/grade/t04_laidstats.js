// Avg. time per pipe with a lunch gap: 4 rows at 10:00, 10:20, 12:00, 12:20 -> 20 min per pipe, not 13m20s.
const L=require('./lib');
(async()=>{const T=await L();const {p}=T;
 const r=await T.E(()=>{const t0=Date.UTC(2026,10,17,18,0,0),m=60000;
  const mk=(ts)=>({rows:ts.map((t,i)=>({stationFt:i*14,station:String(i*14)})),laid:ts,early:ts.map(()=>false),lastOwn:ts[ts.length-1]});
  const e={lockTime:new Date(t0).toISOString(),runStartTime:t0,completed:true};
  const a=pbLaidStats(e,mk([t0,t0+20*m,t0+120*m,t0+140*m]));
  const b=pbLaidStats(e,mk([t0,t0+20*m,t0+40*m,t0+60*m])); // no gap: unchanged, 20 min
  const c=pbLaidStats(Object.assign({},e,{breaks:[{start:t0+25*m,end:t0+115*m}]}),mk([t0,t0+20*m,t0+130*m,t0+150*m])); // a 90 min Break inside a 110 min gap: 20 min each
  return [a.avg/m,a.sticks,b.avg/m,b.sticks,c.avg/m,c.sticks];});
 console.log('lunch gap avg min/sticks:',r[0],r[1],'| no gap:',r[2],r[3],'| with Break:',r[4],r[5]);
 const ok=Math.abs(r[0]-20)<1e-6&&Math.abs(r[2]-20)<1e-6&&Math.abs(r[4]-20)<1e-6;
 console.log(ok?'PASS':'FAIL');await T.b.close();process.exit(ok?0:1);})();
