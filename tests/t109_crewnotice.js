const boot=require(__dirname+'/rig/boot');const co=require(__dirname+'/rig/co');const F=require(__dirname+'/rig/flow');
(async()=>{const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init:co+";try{localStorage.removeItem('pbCrewNotice:00000000-0000-4000-8000-000000000001')}catch(e){}"});const H=F(p);
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(3500);
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(800);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(2500);
 const m=await H.modal();console.log('notice:',JSON.stringify(m).slice(0,160));
 if(m){await H.modalClick('Got It');await p.waitForTimeout(300);}
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(500);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(2500);
 console.log('again:',JSON.stringify(await H.modal()));
 await p.evaluate(()=>window.pbFeedbackOpen('problem'));await p.waitForTimeout(500);
 console.log('feedback note:',await p.evaluate(()=>[...document.querySelectorAll('.pb-help')].map(x=>x.textContent).find(t=>/quote you/.test(t))||null));
 console.log('errs',p.errs.slice(0,3));await b.close();})();
