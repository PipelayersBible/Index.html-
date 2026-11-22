const boot=require(__dirname+'/rig/boot');const co=require(__dirname+'/rig/co');const F=require(__dirname+'/rig/flow');
// design_nov22 G-3: an incomplete permit is checked first (no acknowledgment); a complete one shows the acknowledgment once.
(async()=>{const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init:co});const H=F(p);
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
 await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(400);
 console.log('first (empty form):',JSON.stringify(await H.modal()));
 const err=await p.evaluate(()=>{const e=document.getElementById('cpError');return e?e.textContent.slice(0,160):null;});console.log('cpError:',err);
 const lbl=await p.evaluate(()=>[...document.querySelectorAll('#screen-confinedPermit label')].map(l=>l.textContent).find(t=>/Maximum CO/.test(t)));console.log('label:',lbl);
 const date=await p.evaluate(()=>{const d=new Date(),z=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());});
 const vals={cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'};
 await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},vals);
 await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(400);
 console.log('first (complete form):',JSON.stringify(await H.modal()));
 await H.modalClick('I Understand');await p.waitForTimeout(1200);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt.find(x=>/Lock|Yes|Continue|OK/i.test(x))||bt[0]);await p.waitForTimeout(600);}
 console.log('screen after:',await H.screen());
 console.log('errs',p.errs.slice(0,3));await b.close();})();
