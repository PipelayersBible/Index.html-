const mk=require('./mk');
(async()=>{const {b,p,H,rowMenu,dists}=await mk();
 console.log('parse',JSON.stringify(await p.evaluate(()=>['4.36','4.','.5','-4.36','7-3 1/2',"7'-3 1/2\"","7' 3-1/2\"",'7-3-1/2','7 3 1/2','7 1/2','3 1/2"','1/2','0-11 15/16',"7'","7ft 3in",'7,36','4 36','4-3','1e3',' 4.36 ','７.３',"0'-0\"","-0'-3\"", '12"','7\' 3.5"','4.36 ft','4.36\''].map(s=>[s,pbCsParse(s)]))));
 console.log('result',JSON.stringify(await p.evaluate(()=>[0,0.004,0.005,0.01,0.02,0.0208,0.0249,0.025,0.03,-0.0208,-0.02,1,5,-0.3].map(d=>[d,pbCsResult(d).ok,pbCsResult(d).txt]))));
 console.log('glob',await p.evaluate(()=>typeof runArchive+' '+typeof currentRunArchiveId+' '+typeof saveRunArchive));
 // mark laid to row index 8 (past the bend at 62?), see counts
 const r=await p.evaluate(async()=>{const e=window.__pbCsEntry();const rows=e.intervalRows;const out={};
   out.fitRows=rows.map((r,i)=>pbFitCount&&r.pointId?[i,r.station,r.pointId,r.label]:null).filter(Boolean);
   return out;});console.log(JSON.stringify(r));
 // resumed-session simulation
 const r2=await p.evaluate(async()=>{const e=window.__pbCsEntry();const rows=e.intervalRows;
   const iB=rows.findIndex(r=>r.pointId&&e.pointInputs[r.pointId]&&e.pointInputs[r.pointId].fit); // bend row
   await pbLaidApply(e.id,iB+1,true,true);
   const c1=pbFitCount(e);
   // end short at the row after the bend
   e.incomplete=true;e.completedDistance=rows[iB+1].stationFt-rows[0].stationFt;e.runEndTime=new Date().toISOString();
   const e2=JSON.parse(JSON.stringify(e));e2.id=e.id+1;delete e2.laid;e2.incomplete=false;e2.completedDistance=undefined;e2.runEndTime=null;e2.resumedFromId=e.id;e.resumedIntoId=e2.id;runArchive.push(e2);
   const S=pbLaidSummary(e2);
   return {iB,cap:e.completedDistance,c1,early:S.early.filter(Boolean).length,c2:pbFitCount(e2),dly:(await window.__pbDlyFitTest(e2)).filter(r=>r.kind==='counted'),mat:(()=>{const d=document.createElement('div');d.innerHTML=window.__pbMatFitHtml({job_number:'24-017'});return d.innerText;})()};});
 console.log(JSON.stringify(r2,null,1));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
