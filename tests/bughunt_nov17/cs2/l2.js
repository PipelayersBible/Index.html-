const L=require('./lib2');(async()=>{let {b,p,H}=await L({perms:['geolocation'],geo:{latitude:33.6,longitude:-117.2,accuracy:15}});
 const T=(s)=>p.evaluate(id=>{const e=document.getElementById(id);return e?(e.offsetParent?e.innerText:'[hidden] '+e.innerText).slice(0,500):null;},s);
 await H.lock({cpJobNumber:'24-017'});await H.read(20.9,0,0,0);await H.addPerson('Ed Entrant');await H.checkin('Ed Entrant');
 await p.evaluate(()=>pbTriggerEmergency());await p.waitForTimeout(3500);
 // close out with emergency open and Ed in
 await p.evaluate(()=>{const b=[...document.querySelectorAll('#cpCloseoutReasonToggle button')].find(x=>x.dataset.val==='prohibited');b.click();});
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(800);
 for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('CLOSE MODAL',m.slice(0,220),bt);const pick=bt.find(x=>/Close Out|Continue|Yes|OK/i.test(x))||bt[bt.length-1];await H.modalClick(pick);await p.waitForTimeout(1500);}
 console.log('screen',await H.screen(),'permit',await H.D('!!confinedPermit'));
 console.log('panel',await T('cpEmergencyPanel'));
 const ca=await p.evaluate(()=>{const e=document.getElementById('cpEmCallAgain');return e?[!!e.offsetParent,e.textContent]:null;});console.log('callAgain',ca);
 const em=await p.evaluate(()=>[...document.querySelectorAll('.pb-emergency-btn')].filter(x=>x.offsetParent).map(x=>x.textContent.trim()));console.log('visible em buttons',em);
 // restart
 p=await H.restart();const F=require(__dirname+'/../../rig/flow');Object.assign(H,F(p));
 H.D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 console.log('after restart screen',await p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s&&s.id;}),'modal',await H.modal());
 for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt[bt.length-1]);}console.log('after restart buttons',await p.evaluate(()=>[...document.querySelectorAll('#screen-confinedActive button')].filter(x=>x.offsetParent&&/^(EMERGENCY|Call .* again)$/i.test(x.textContent.trim())).map(x=>x.textContent.trim())),await p.evaluate(()=>document.getElementById('screen-confinedActive').className));console.log('shell',await p.evaluate(()=>{const e=document.querySelector('.pb-shell-lines, #pbShellLines');return e?e.innerText:document.body.innerText.match(/EMERGENCY STILL OPEN[^\n]*/)?.[0];}));
 console.log('errs',p.errs);await b.close();})();
