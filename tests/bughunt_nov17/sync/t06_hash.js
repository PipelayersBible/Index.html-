const boot=require('/home/claude/rig/boot');const F=require('/home/claude/rig/flow');
(async()=>{for(const h of ['prodDashboard','crewMembers','reportsInbox','companyPermits','cxList','appProblems']){const {b,p}=await boot('http://127.0.0.1:8864/cur.html#/'+h,{init:require('/home/claude/rig/co_pl'),wait:3500});const H=F(p);
 const m=await H.modal();console.log(h.padEnd(16),'->',await H.screen(),m?'MODAL '+m.slice(0,100):'', (await p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s?s.innerText.replace(/\s+/g,' ').slice(0,140):'';})));
 await b.close();}})();
