// grade2 03: Run 1 all stakes, Run 2 Start from a measured step (no stake: the previous End's stake is its ground),
// Run 2 End a stake, trench width on both runs: the backfill estimate must exist and match the reference.
const L=require('./lib'),S=L.S;const {compute}=require('../ref/refcalc');
(async()=>{const T=await L();const fails=[];
 const sc={rod:'lenker',pipeType:'PVC SDR 35',startSta:null,dir:1,
  runs:[{sizeIn:12,wallFt:0.03,bedding:0.5,trenchWidth:3,dist:200,interval:10,lay:null,start:S(105,6),end:S(106.5,6.5),hubs:[{...S(105.8,6.2),station:100}]},
        {sizeIn:8,wallFt:0.02,bedding:0.5,trenchWidth:2.5,dist:150,interval:10,lay:null,start:{mode:'step',step:0.25},end:S(107,6.4),hubs:[{...S(106.9,6.3),station:60}]}]};
 const a=await T.run(sc);if(a.errors){fails.push('errors '+a.errors);return T.done(fails);}
 const ref=compute(sc).backfillYd3();console.log('app backfill',a.vol.yd3,'incomplete',a.vol.inc,'| ref',ref.yd3.toFixed(3),'| bedding app',a.bed.yd3);
 if(a.vol.yd3===null)fails.push('backfill unavailable (incomplete='+a.vol.inc+'), ref '+ref.yd3.toFixed(2)+' cu yd');
 else if(Math.abs(a.vol.yd3-ref.yd3)>0.05)fails.push('backfill '+a.vol.yd3.toFixed(3)+' vs ref '+ref.yd3.toFixed(3));
 // control: Run 2 Start staked (unchanged by the fix)
 const sc2=JSON.parse(JSON.stringify(sc));sc2.runs[1].start=S(106.5,6.75);const a2=await T.run(sc2);const r2=compute(sc2).backfillYd3();
 console.log('control (staked Run 2 Start) app',a2.vol.yd3,'ref',r2.yd3.toFixed(3));if(a2.vol.yd3===null||Math.abs(a2.vol.yd3-r2.yd3)>0.05)fails.push('control changed: '+a2.vol.yd3+' vs '+r2.yd3);
 await T.done(fails);})();
