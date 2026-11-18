// A pipelayer (and a foreman) opens every office screen by pbGoto and by hash; report what shows.
const boot=require('/home/claude/rig/boot');const F=require('/home/claude/rig/flow');
const URL_=process.env.URL||'http://127.0.0.1:8864/cur.html';
const who=process.env.WHO||'co_pl';
(async()=>{const {b,p}=await boot(URL_,{init:require('/home/claude/rig/'+who)});const H=F(p);
 const screens=['crewMembers','companyLogo','reportsAll','reportsInbox','companyPermits','ticketsDashboard','prodDashboard','prodJob','cxList','cxNew','inspCompany','inspJob','jobBook','prodMine','jobSummary','prodNoRun','dailyReport','docsReview','appProblems','myReports','locates','inspMine'];
 for(const s of screens){
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(300);
  let err=null;try{await p.evaluate(s=>pbGoto(s),s);}catch(e){err=e.message.slice(0,80);}
  await p.waitForTimeout(700);
  const cur=await H.screen();const m=await H.modal();
  if(m){const bt=await H.modalBtns();try{await H.modalClick(bt[bt.length-1]);}catch(e){}}
  const txt=cur==='screen-'+s?await p.evaluate(s=>document.getElementById('screen-'+s).innerText.replace(/\s+/g,' ').slice(0,160),s):'';
  console.log(s.padEnd(18),'->',(cur||'').replace('screen-','').padEnd(16),m?'MODAL: '+m.slice(0,90):'',txt?'TEXT: '+txt:'',err||'');
 }
 console.log('rpcs:',[...new Set(await p.evaluate(()=>window.__rpcLog))].join(' '));
 console.log('errs',p.errs.slice(0,5));await b.close();})();
