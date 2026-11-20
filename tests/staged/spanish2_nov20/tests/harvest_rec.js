// node harvest_rec.js <out.json> : the Records list screens with a locked run / closed permit in them
const L=require('./lib');const fs=require('fs');
(async()=>{const b=await L.chromium.launch();const out={};
 for(const [rig,sc] of [['fm','permit_closed'],['pl','run_locked']]){
  let p;try{p=await L.SC[sc](b,{lang:'es'});}catch(e){console.log('scenario failed',sc,String(e).slice(0,200));continue;}
  for(const id of ['archive','reportsAll','myReports','reportsInbox','companyPermits','reportReceipt','tickets','crewView','prodMine','notifications','settings']){
   await p.evaluate((id)=>{try{pbGoto(id,false,true);}catch(e){}},id);await p.waitForTimeout(1200);
   const r=await p.evaluate((id)=>window.pbI18nScan(document.getElementById('screen-'+id),true),id);
   const seen=new Set();const m=[];for(const x of r){if(x.hit)continue;const k=x.kind+'|'+x.k;if(seen.has(k))continue;seen.add(k);m.push([x.kind,x.k]);}
   out[rig+'_'+id]={n:r.length,miss:m};console.log(rig,id,r.length,m.length);}
  await p.context().close();}
 fs.writeFileSync(process.argv[2],JSON.stringify(out));await b.close();})();
