// grade2 02: 24" SDR 35 (wall 0.055), hub at 59 ft = Reducer to 18" (wall 0.042), a second hub at 59 ft, End 104 ft.
// Past the reducer every row is 18" pipe: BOP = INV - 0.042, TOP = INV + (18.701/12 - 0.042) = INV + 1.5164.
const L=require('./lib'),S=L.S;
(async()=>{const T=await L();const fails=[];
 const sc={rod:'engineer',hiMode:'direct',hiDirect:790,pipeType:'PVC SDR 35',startSta:null,dir:1,
  runs:[{sizeIn:24,wallFt:0.055,bedding:null,trenchWidth:null,dist:104,interval:12.5,lay:null,start:S(780,10),end:S(781,10.5),
   hubs:[{mode:'elev',elev:770.4,station:59,reducer:{toIn:18,wallFt:0.042,wallTyped:true}},{mode:'elev',elev:770.4,station:59}]}]};
 const a=await T.run(sc);if(a.errors){fails.push('errors '+a.errors);return T.done(fails);}
 a.rows.filter(r=>r.st>=59).forEach(r=>{const bop=r.pi-0.042,top=r.pi+18.701/12-0.042;
  if(Math.abs(r.bp-bop)>0.0005||Math.abs(r.tp-top)>0.0005)fails.push('row '+r.st+(r.hub?' ('+r.hub+')':'')+': BOP '+r.bp.toFixed(3)+' TOP '+r.tp.toFixed(3)+', want '+bop.toFixed(3)+' / '+top.toFixed(3)+' (shown TOP reading '+r.d.top+')');});
 a.rows.filter(r=>r.st<59).forEach(r=>{const top=r.pi+24.803/12-0.055;if(Math.abs(r.tp-top)>0.0005)fails.push('before reducer row '+r.st+' TOP '+r.tp.toFixed(3)+' want '+top.toFixed(3));});
 await T.done(fails);})();
