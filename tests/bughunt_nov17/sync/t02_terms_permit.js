// The Terms sheet must not cover a live confined space permit (it is asked once the permit is closed).
const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
const URL_=process.env.URL||process.env.PB_URL||'http://127.0.0.1:8864/cur.html';
(async()=>{const {b,p}=await boot(URL_,{init:co});const H=F(p);
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
 const d=new Date();const pad=n=>String(n).padStart(2,'0');const date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const vals={cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'};
 await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},vals);
 await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(600);
 for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();const pick=bt.find(x=>/I Understand|OK|Lock|Yes|Continue/i.test(x))||bt[0];await H.modalClick(pick);await p.waitForTimeout(600);}
 console.log('screen after lock:',await H.screen());
 // the Terms version on the server is older than this build's (an update landed, or a new Terms version shipped)
 await p.evaluate(()=>{Object.keys(localStorage).filter(k=>/^pbTermsOk:/.test(k)).forEach(k=>localStorage.removeItem(k));window.__rpcOverride.pb_terms_status=()=>({terms:'0.9',privacy:'0.9'});});
 await p.evaluate(()=>window.pbTermsCheck());await p.waitForTimeout(800);
 const over=await p.evaluate(()=>!!document.getElementById('pbTermsSheet'));
 console.log('Terms sheet over the live permit:',over, over?'FAIL':'PASS');
 // still asked where no permit is live: covered by the repo's t105_terms.js
 console.log('errs',p.errs.slice(0,3));await b.close();})();
