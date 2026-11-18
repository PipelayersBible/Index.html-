// Edge cases through the same driver + reference (node tests/edge.js; PG=page). Prints each case's mismatches,
// errors and warnings so expected refusals can be read too.
const L=require('./lib'),S=L.S;const {compare}=require('../ref/compare');
const R=(o)=>Object.assign({sizeIn:8,wallFt:0.02,bedding:0.5,trenchWidth:3,dist:200,interval:25,lay:null,hubs:[]},o);
const base=(o)=>Object.assign({rod:'engineer',hiMode:'direct',hiDirect:112,pipeType:'PVC SDR 35',startSta:null,dir:1},o);
const cases={
 zeroCut: base({runs:[R({start:S(100,0),end:S(101,0.5),hubs:[{...S(100.6,0),station:100}]})]}),
 fillStakes: base({runs:[R({start:S(98,-1.5),end:S(99,-0.25),hubs:[{...S(98.2,-0.5),station:120}]})]}),
 stakeAboveInstrument: base({hiDirect:104,runs:[R({start:S(105.5,6),end:S(106,6.3)})]}),
 invertAboveInstrument: base({hiDirect:99,runs:[R({start:S(105.5,6),end:S(106,6.3)})]}),
 hubAtStartAndEnd: base({runs:[R({start:S(105,5),end:S(106,5),hubs:[{mode:'elev',elev:99.5,station:0},{mode:'elev',elev:101.4,station:200}]})]}),
 dropSameStation: base({runs:[R({start:S(105,5),end:S(106,5.5),hubs:[{mode:'elev',elev:100.6,station:80},{mode:'elev',elev:100.1,station:80}]})]}),
 longRun2000: base({runs:[R({dist:20000,interval:10,start:S(105,5),end:S(160,8)})]}),
 longRun2001: base({runs:[R({dist:20010,interval:10,start:S(105,5),end:S(160,8)})]}),
 layShortRun: base({runs:[R({dist:9.3,lay:{on:true,len:14,div:'quarters'},start:S(105,5),end:S(105.1,5.05)})]}),
 layLong: base({runs:[R({dist:7000,lay:{on:true,len:14,div:'quarters'},start:S(105,5),end:S(140,8)})]}),
 intervalTooLong: base({runs:[R({dist:40,interval:50,start:S(105,5),end:S(105.4,5.1)})]}),
 tinyInterval: base({runs:[R({dist:150,interval:0.1,start:S(105,5),end:S(105.6,5)})]}),
 steep15pct: base({runs:[R({dist:100,interval:10,start:S(105,5),end:S(119,4)})]}),
 downStations: base({startSta:2000,dir:-1,staEntry:'sta',runs:[R({start:S(105,5),end:S(106,5.4),hubs:[{...S(105.5,5.2),station:75.5}]})]}),
 metricLike: base({hiDirect:35,runs:[R({dist:60.96,interval:3.048,start:S(30.48,1.52),end:S(30.78,1.68)})]}),
 typoStake: base({runs:[R({start:S(105,5),end:S(10600,5.5)})]}),
 lenkerFill: {rod:'lenker',pipeType:'Ductile Iron',startSta:100,dir:1,staEntry:'dist',runs:[R({sizeIn:12,wallFt:0.029,start:S(98,-1),end:S(99,2),hubs:[{...S(98.5,0.5),station:60.25}]})]},
 archDown: {rod:'architect',hiMode:'stakes',pipeType:'',startSta:1500,dir:-1,staEntry:'sta',runs:[R({start:{...S(103.40625,3.609375),shot:4.359375},end:S(104.25,3.828125),hubs:[{...S(103.6875,3.6875),station:61.5}]})]},
};
(async()=>{const T=await L();const fails=[];
 for(const [k,sc] of Object.entries(cases)){
  const a=await T.run(sc);
  if(a.errors){console.log(k.padEnd(22),'ERRORS:',a.errors.map(e=>e.slice(0,140)).join(' | '));continue;}
  const r=compare(sc,a);console.log(k.padEnd(22),'rows',a.rows.length,'mismatches',r.out.length,r.out.slice(0,3).join(' | '));
  console.log(' '.repeat(23)+'warn:',a.warn.map(w=>w.slice(0,110)).join(' || ')||'-',a.notes&&a.notes.length?'| notes: '+a.notes.join(' || '):'');
  if(r.out.length)fails.push(k+': '+r.out[0]);
 }
 await T.done(fails);})();
