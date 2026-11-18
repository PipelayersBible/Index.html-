const L=require('./lib');
(async()=>{const {b,p,H}=await L.boot();
 const T=(h,m)=>{const d=new Date();d.setHours(h,m||0,0,0);return d.getTime();};
 await L.capSubmit(p);
 await L.mkrun(p,{job:'24-017'});await L.prod(p,{by:'Tommy',pipe:60});await L.endRun(p);await L.setEnd(p,T(10));
 await L.ev(p,`(()=>{const e=runArchive.slice().sort((a,b)=>b.id-a.id)[0];e.runStartTime=${T(6)};return saveRunArchive();})()`);
 await L.mkrun(p,{job:'24-020',site:'Elm St Water'});await L.prod(p,{by:'Tommy',pipe:40});await L.endRun(p);await L.setEnd(p,T(14,30));
 await L.ev(p,`(()=>{const e=runArchive.slice().sort((a,b)=>b.id-a.id)[0];e.runStartTime=${T(10,30)};return saveRunArchive();})()`);
 await L.daily(p,{job:'24-017'});
 // add two crew names by typing
 for(const n of ['Joe Laborer','Sam Operator']){await p.evaluate(n=>{const i=document.querySelector('#dpCrew input[type=text]:not(.dp-eqh)');i.value=n;i.dispatchEvent(new Event('input',{bubbles:true}));const b=[...document.querySelectorAll('#dpCrew button')].find(b=>b.textContent.trim()==='Add');b.click();},n);await p.waitForTimeout(500);}
 console.log('A',JSON.stringify(await L.draftDump(p)));
 console.log('sign A',JSON.stringify(await L.sign(p,'Tommy Fontaine','Laid 60 ft on 24-017.')));
 const s=await p.evaluate(()=>window.__subs.map(x=>({job:x.p_job_number,crew:x.p_snapshot.crew_today.people.map(q=>q.name+'='+q.hours)})));console.log('submitted',JSON.stringify(s));
 await L.daily(p,{job:'24-020'});
  const B=await L.draftDump(p);console.log("B",JSON.stringify(B));const ok=B.crew.every(x=>/=0$/.test(x));console.log(ok?"PASS second job does not repeat the full day":"FAIL second job repeats the full day: "+B.crew.join(", "));
 console.log((await L.txt(p,'#dpCrew')).replace(/\s+/g,' '));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
