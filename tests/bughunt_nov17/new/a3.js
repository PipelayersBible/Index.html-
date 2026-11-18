const mk=require('./mk');
(async()=>{const {b,p,H,rowMenu,dists}=await mk();
 const r2=await p.evaluate(async()=>{const e=window.__pbCsEntry();const rows=e.intervalRows;const RA=window.__ra();
   const iB=7;
   await window.pbLaidMark(iB+1);await new Promise(r=>setTimeout(r,800));
   const c1=pbFitCount(e);
   e.incomplete=true;e.completedDistance=rows[iB+1].stationFt-rows[0].stationFt;e.runEndTime=new Date().toISOString();
   const e2=JSON.parse(JSON.stringify(e));e2.id=e.id+1;delete e2.laid;e2.incomplete=false;e2.completedDistance=undefined;e2.runEndTime=null;e2.resumedFromId=e.id;e.resumedIntoId=e2.id;RA.push(e2);
   const S=window.pbLaidSummaryOf(e2.id);
   const out={cap:e.completedDistance,c1,early:S.early.filter(Boolean).length,c2:pbFitCount(e2),dly2:(await window.__pbDlyFitTest(e2)).filter(r=>r.kind==='counted'),mat:(()=>{const d=document.createElement('div');d.innerHTML=window.__pbMatFitHtml({job_number:'24-017'});return d.innerText;})()};
   // B: session 1 ended short with NO laid marks
   delete e.laid; out.noMarks1=pbFitCount(e); out.noMarks2=pbFitCount(e2);
   return out;});
 console.log(JSON.stringify(r2,null,1));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
