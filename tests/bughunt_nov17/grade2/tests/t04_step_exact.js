// grade2 04: Architect's rod, Run 2 Start from a measured step. Run 1 End invert 98.0 (wall 0.02), step 0.028 ft,
// Run 2 wall 0.031: Run 2 Start invert = 98 - 0.02 + 0.028 + 0.031 = 98.039 exactly (its Invert box rounds it to 98.0365).
// HI 105: BOP reading = 105 - 98.039 + 0.031 = 6.992 ft = 6'-11 0.904" -> shown 6'-11 7/8" (from the box: 6'-11 15/16").
const L=require('./lib'),S=L.S;
(async()=>{const T=await L();const fails=[];
 const q=x=>Math.round(x*192)/192;
 const sc={rod:'architect',hiMode:'direct',hiDirect:105,pipeType:'PVC SDR 35',startSta:null,dir:1,
  runs:[{sizeIn:8,wallFt:0.02,bedding:null,trenchWidth:null,dist:100,interval:50,lay:null,start:S(q(103),5),end:S(q(104),6),hubs:[]},
        {sizeIn:8,wallFt:0.031,bedding:null,trenchWidth:null,dist:100,interval:50,lay:null,start:{mode:'step',step:0.028},end:S(q(104.5),6.25),hubs:[]}]};
 const a=await T.run(sc);if(a.errors){fails.push('errors '+a.errors);return T.done(fails);}
 const r=a.rows.find(x=>x.hub==='seg2start');console.log('seg2start INV',r.pi,'shown',JSON.stringify(r.d));
 if(Math.abs(r.pi-98.039)>0.0005)fails.push('Run 2 Start invert '+r.pi.toFixed(4)+', want 98.0390');
 if(r.d.bop!=="6'-11 7/8\"")fails.push('BOP reading shown '+r.d.bop+', want 6\'-11 7/8"');
 await T.done(fails);})();
