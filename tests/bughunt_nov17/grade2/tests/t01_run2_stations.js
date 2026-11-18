// grade2 01: Run 1's stations go DOWN (10+00 to 8+00); Run 2 (100 ft, distances only) must continue down: 8+00 ... 7+00.
const L=require('./lib'),S=L.S;
(async()=>{const T=await L();const fails=[];
 const sc={rod:'engineer',hiMode:'direct',hiDirect:110,pipeType:'PVC SDR 35',startSta:1000,dir:-1,staEntry:'sta',
  runs:[{sizeIn:8,wallFt:0.02,bedding:null,trenchWidth:null,dist:200,interval:50,lay:null,start:S(105,5),end:S(106,5.5),hubs:[]},
        {sizeIn:8,wallFt:0.02,bedding:null,trenchWidth:null,dist:100,interval:50,lay:null,start:{mode:'step',step:0},end:S(106.2,5.2),hubs:[]}]};
 const a=await T.run(sc);if(a.errors){fails.push('errors '+a.errors);return T.done(fails);}
 const got=a.rows.map(r=>r.st+'='+r.sta).join(' ');console.log(got);
 const want={0:'10+00.00',50:'9+50.00',200:'8+00.00',250:'7+50.00',300:'7+00.00'};
 a.rows.forEach(r=>{if(want[r.st]!==undefined&&r.sta!==want[r.st])fails.push('row '+r.st+(r.hub?' ('+r.hub+')':'')+' station '+r.sta+', want '+want[r.st]);});
 await T.done(fails);})();
