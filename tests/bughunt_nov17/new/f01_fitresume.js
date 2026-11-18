// fails on r16.88 (dbg.html), passes on fix.html: fittings on a resumed run are counted once
const mk=require('./mk');
(async()=>{const {b,p}=await mk();
 const r=await p.evaluate(async()=>{const e=window.__pbCsEntry();const rows=e.intervalRows;const RA=window.__ra();
   await window.pbLaidMark(8);await new Promise(r=>setTimeout(r,800)); // past the bend at 62 ft
   e.incomplete=true;e.completedDistance=rows[8].stationFt;e.runEndTime=new Date().toISOString();
   const e2=JSON.parse(JSON.stringify(e));e2.id=e.id+1;delete e2.laid;e2.incomplete=false;delete e2.completedDistance;e2.runEndTime=null;e2.resumedFromId=e.id;e.resumedIntoId=e2.id;RA.push(e2);
   const out={s1:pbFitCount(e).total,s2:pbFitCount(e2).total,s2planned:pbFitCount(e2).planned};
   const d=document.createElement('div');d.innerHTML=window.__pbMatFitHtml({job_number:'24-017'});out.job=d.innerText;
   // session 2 lays the wye (row 20)
   e2.laid={v:1,marks:{},log:[]};const S=window.pbLaidSummaryOf(e2.id);
   out.early=S.early.filter(Boolean).length;
   window.__cur(e2.id);await window.pbLaidMark(21);await new Promise(r=>setTimeout(r,800));
   out.s2after=pbFitCount(e2).items.map(g=>g.n+' '+g.name);
   delete e.laid;out.s1nomarks=pbFitCount(e).items.map(g=>g.name);
   return out;});
 console.log(JSON.stringify(r));
 const ok=r.s1===1&&r.s2===0&&/1 × AP 22.5° Bend/.test(r.job)&&!/2 ×/.test(r.job)&&r.s2after.join()==='1 8x6 Wye'&&r.s1nomarks.join()==='AP 22.5° Bend';
 console.log(ok?'PASS':'FAIL');await b.close();process.exit(ok?0:1);})();
