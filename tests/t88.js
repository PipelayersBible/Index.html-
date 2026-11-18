const boot=require('./rig/boot');const F=require('./rig/flow');
(async()=>{const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init:require('./rig/co')});const H=F(p);
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const R=await F.setup(p,H);
 const lab=()=>p.evaluate(()=>['startLabel','hub0Label','hub1Label','endLabel'].map(i=>i+'="'+((document.getElementById(i)||{}).value||'')+'"').join(' '));
 console.log('MH stakes:',await lab());
 // plain stake at a new run: no MH -> Start point; lateral -> LAT-
 await p.evaluate(()=>{['startLabel','endLabel'].forEach(i=>{const e=document.getElementById(i);e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});});
 R.setStake(R.S('1+50',103.4,3.61,'','3860'));await p.setInputFiles('#startAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 R.setStake(R.S('4+51',104.26,3.83,'LAT 7','3863'));await p.setInputFiles('#endAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 console.log('plain/lat:',await lab());
 await p.evaluate(()=>{const e=document.getElementById('startLabel');e.value='';e.dispatchEvent(new Event('input',{bubbles:true}));});
 R.setStake(R.S('1+50',103.4,3.61,'LAT 3 @ MH 4','3860'));await p.setInputFiles('#startAiStakePhoto',[H.img('p12'),H.img('p13')]);await p.waitForTimeout(1800);
 await p.evaluate(()=>{const b=document.getElementById('startAiUse');if(b&&b.offsetParent)b.click();});await p.waitForTimeout(400);
 console.log('both:',await lab());
 console.log('build',await p.evaluate(()=>window.PB_APP_BUILD),'errs',errs);
 await b.close();})();
