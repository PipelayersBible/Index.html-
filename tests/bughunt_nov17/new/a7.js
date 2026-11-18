const mk=require('./mk');
(async()=>{const {b,p,H}=await mk();
 await p.evaluate(async()=>{const e=window.__pbCsEntry();const rows=e.intervalRows;const RA=window.__ra();
   await window.pbLaidMark(8);await new Promise(r=>setTimeout(r,800));
   e.incomplete=true;e.completedDistance=rows[8].stationFt;e.runEndTime=new Date().toISOString();
   const e2=JSON.parse(JSON.stringify(e));e2.id=e.id+1;delete e2.laid;e2.incomplete=false;delete e2.completedDistance;e2.runEndTime=null;e2.resumedFromId=e.id;e.resumedIntoId=e2.id;e2.lockTime=new Date(e2.lockTime);RA.push(e2);
   window.__cur(e2.id);await window.__save();});
 await p.evaluate(()=>{pbGoto('home');});await p.waitForTimeout(500);await p.evaluate(()=>window.pbResumeLastRunResults());await p.waitForTimeout(1500);
 await p.evaluate(async()=>{await window.pbLaidMark(12);});await p.waitForTimeout(1200);
 for(const w of [390,360,320]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(500);
  const m=await p.evaluate(()=>{const el=document.getElementById('laidProgress')||document.querySelector('.pb-lstats');if(!el)return null;const r=el.getBoundingClientRect();const kids=[...el.children].map(c=>{const q=c.getBoundingClientRect();return [c.dataset.k,Math.round(q.left),Math.round(q.right),Math.round(q.top)];});const btn=document.getElementById('pbBrkBtn');const br=btn&&btn.getBoundingClientRect();return {id:el.id,cls:el.className,w:Math.round(r.width),right:Math.round(r.right),sw:el.scrollWidth,cw:el.clientWidth,kids,btn:br?[Math.round(br.left),Math.round(br.right),Math.round(br.height)]:null,docW:document.documentElement.scrollWidth,vw:window.innerWidth,text:el.innerText.replace(/\s+/g,' ')};});
  console.log(w,JSON.stringify(m));
  await p.evaluate(()=>{const el=document.querySelector('#pbBrkBtn');el&&el.scrollIntoView({block:'center'});});await p.waitForTimeout(200);await p.screenshot({path:'/tmp/claude-0/bughunt/new/t/bar'+w+'.png'});}
 console.log('errs',p.errs.slice(0,5));await b.close();})();
