const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const F=require('/home/claude/rig/flow');
// r16.90: record-only confined space permit: an out-of-limit reading shows a plain notice (no siren, no EVACUATE), check-in
// warns "Permit Does Not Allow Entry" and still asks "Did they enter anyway?"; the emergency panel is untouched.
(async()=>{const {b,p}=await boot('http://127.0.0.1:8878/index.html',{init:co+`;(function(){window.__osc=0;const P=(window.AudioContext||window.webkitAudioContext||function(){}).prototype;if(P&&P.createOscillator){const o=P.createOscillator;P.createOscillator=function(){window.__osc++;return o.apply(this,arguments);};}})();`});const H=F(p);
 await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
 const d=new Date();const pad=n=>String(n).padStart(2,'0');const date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const vals={cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'};
 await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},vals);
 await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(600);
 for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();const pick=bt.find(x=>/I Understand|OK|Lock|Yes|Continue/i.test(x))||bt[0];await H.modalClick(pick);await p.waitForTimeout(600);}
 const read=async(v)=>{await p.evaluate(v=>{const s=(id,x)=>{document.getElementById(id).value=(x===null||x===undefined)?'':String(x);};s('cpAtmoO2',v[0]);s('cpAtmoLEL',v[1]);s('cpAtmoH2S',v[2]);s('cpAtmoCO',v[3]);s('cpAtmoTester','Tess');},v);await p.evaluate(()=>window.pbSaveAtmoReading());await p.waitForTimeout(700);};
 const o0=await p.evaluate(()=>window.__osc);
 await read([20.9,0,0,50]);
 const m=await H.modal();console.log('modal:',JSON.stringify(m.slice(0,240)));
 if(/EVACUATE/.test(m))p.errs.push('EVACUATE still shown');if(!/OUTSIDE PERMIT LIMITS/.test(m))p.errs.push('no limits notice');
 const o1=await p.evaluate(()=>window.__osc);console.log('oscillators',o0,'->',o1);if(o1!==o0)p.errs.push('siren played');
 await H.modalClick((await H.modalBtns())[0]);await p.waitForTimeout(400);
 const ban=await p.evaluate(()=>{const e=document.getElementById('cpUnsafeBanner');return e&&e.offsetParent?e.innerText.slice(0,240):null;});console.log('banner:',JSON.stringify(ban));
 if(!ban||/DO NOT ENTER|EVACUATE/.test(ban))p.errs.push('banner wording');
 const idx=await p.evaluate(()=>{const r=[...document.querySelectorAll('[onclick*="pbToggleRosterStatus"]')].map(e=>e.getAttribute('onclick'));return r;});
 const sup=await p.evaluate(()=>{const b=[...document.querySelectorAll('[onclick*="pbToggleRosterStatus"]')].find(e=>/Sam Sup/.test((e.closest('tr,li,div')||e).innerText));return b?b.getAttribute('onclick'):null;});
 console.log('roster btn:',sup);
 if(sup){await p.evaluate(s=>eval(s),sup);await p.waitForTimeout(600);const m2=await H.modal();console.log('check-in:',JSON.stringify(m2.slice(0,220)),JSON.stringify(await H.modalBtns()));
  if(!/Permit Does Not Allow Entry/.test(m2))p.errs.push('check-in title');const bts=await H.modalBtns();if(!bts.some(x=>/they.re inside/.test(x)))p.errs.push('no enter-anyway question');await H.modalClick('No — they stayed out').catch(()=>{});}
 else p.errs.push('no roster button');
 const em=await p.evaluate(()=>!!document.getElementById('cpEmergencyPanel'));if(!em)p.errs.push('emergency panel gone');console.log('emergency panel present:',em);
 console.log('errs',p.errs.slice(0,4));await b.close();})();
