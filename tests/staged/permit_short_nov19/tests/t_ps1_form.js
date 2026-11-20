// The shorter permit form: before/after numbers, every old box kept, prefill, folds, lock, the new items on the active permit.
// PB_URL = patched page, PB_BASE = r17.10. node t_ps1_form.js
const L=require('./_lib');const {ok}=L;
const OLD_IDS='cpJobsite cpJobNumber cpAddress cpLandmarks cpSpace cpPurpose cpDate cpStart cpEnd cpSupervisor cpSupervisorInitials cpAttendant cpComms cpCommInterval cpHazFlows cpHazEngulf cpHazElec cpHazMech cpHazNearby cpHazOther cpHazFlowsExplain cpHazEngulfExplain cpHazElecExplain cpHazMechExplain cpHazNearbyExplain cpHazOtherExplain cpHazards cpControls cpVentFail cpConditions cpMinO2 cpMaxO2 cpMaxLEL cpMaxH2S cpMaxCO cpAtmoInterval cpEqPPE cpEqTest cpEqComm cpEqAlarm cpEqRescue cpEqNotes cpAddlPermits cpDialNum cpRescue cpEmergContactNum cpEmergContactName cpMiscNotes cpMiscPhoto cpLockReview cpReviewMissing cpError cpDraftBand cpDraftSaveLine cpDraftMissing cpWindowPreview cpEndDateAuto cpTimeBasis cpTimeBasisMore cpReviewPermitBtn'.split(' ');
// 29 CFR 1926.1206 (a)-(p) -> the box (or screen) that carries it
const ITEMS={a:'cpSpace',b:'cpPurpose',c:'cpDate cpStart cpEnd',d:'.cp-entrants-line',e:'cpVentFail',f:'cpAttendant',g:'cpSupervisor cpSupervisorInitials',h:'cpHazards',i:'cpControls',j:'cpLimitsLine cpConditions',k:'.cp-entrants-line',l:'cpRescue cpDialNum',m:'cpComms',n:'cpEqPPE cpEqTest cpEqComm cpEqAlarm cpEqRescue cpMeter',o:'cpMiscNotes cpLandmarks',p:'cpAddlPermits'};
(async()=>{
 // ---- numbers
 const M={};
 for(const [k,u] of [['before',L.BASE],['after',L.CUR]]){const {b,p}=await L.start(u);await p.evaluate(()=>pbOpenConfinedPermitForm());await p.waitForTimeout(1200);M[k]=await L.measure(p);M[k].errs=p.errs.slice();
  if(k==='after'){
   const miss=await p.evaluate(ids=>ids.filter(i=>!document.getElementById(i)),OLD_IDS);ok(miss.length===0,'every old box and helper id is still on the form '+miss.join(','));
   const it=await p.evaluate(I=>Object.keys(I).filter(k=>!I[k].split(' ').every(s=>s[0]==='.'?document.querySelector('#screen-confinedPermit '+s):document.getElementById(s))),ITEMS);ok(it.length===0,'a box or line for each of 1926.1206 (a)-(p) '+it.join(','));
   const t=await p.evaluate(()=>document.getElementById('screen-confinedPermit').innerText);
   ok(/Nothing here allows entry or starts a timer until you tap Lock & Activate Permit/.test(t),'draft warning kept');
   ok(/Air limits the app checks every test against: O2 19\.5 to 23\.5%, LEL up to 10%, H2S up to 10 ppm, CO up to 25 ppm/.test(t),'standard air limits shown in one line');
   ok(/Check-in is blocked when the last air test is older than this \(20 min if blank\)/.test(t),'check-in block rule kept');
   ok(/Entrants are checked in by name on the next screen/.test(t),'entrant tracking named (1206(d) note)');
   ok(/Permit items: federal OSHA 29 CFR 1926\.1206/.test(t),'rule line shown');
   ok(await p.evaluate(()=>document.getElementById('cpMaxCO').placeholder==='25'),'CO placeholder says 25 (was 35 while blank used 25)');
   ok(await p.evaluate(()=>!document.getElementById('cpGroupNotes').open&&document.getElementById('cpGroupHazards').open),'Notes & Photos starts folded, the rest open');
  }
  await b.close();}
 console.log('BEFORE boxes '+M.before.boxes+' (typing '+M.before.typing+', ticks '+M.before.ticks+') words '+M.before.words+' px '+M.before.px+' screens '+M.before.screens);
 console.log('AFTER  boxes '+M.after.boxes+' (typing '+M.after.typing+', ticks '+M.after.ticks+') words '+M.after.words+' px '+M.after.px+' screens '+M.after.screens);
 ok(M.before.boxes===42,'before: 42 boxes (the critic\'s count)');
 ok(M.after.boxes<=34,'after: at most 34 boxes on screen ('+M.after.boxes+')');
 ok(M.after.words<=520,'after: at most 520 words ('+M.after.words+', was '+M.before.words+')');
 ok(M.after.screens<=6,'after: at most 6 screens ('+M.after.screens+', was '+M.before.screens+')');
 ok(M.after.errs.length===0,'no page errors '+M.after.errs.join('|'));

 // ---- prefill, folds, lock
 const init=L.co+`;(function(){window.__rpcOverride=Object.assign(window.__rpcOverride||{},{});})();`;
 const {b,p,H}=await L.start(L.CUR,init);
 await p.evaluate(()=>{window.__cj=window.pbCurJobGet;window.pbCurJobGet=()=>({job_number:'24-017',name:'Wildomar Sewer Ph 2'});});
 await p.evaluate(()=>pbOpenConfinedPermitForm());await p.waitForTimeout(1200);
 const v=await p.evaluate(()=>{const g=i=>document.getElementById(i);return {job:g('cpJobsite').value,jobAuto:g('cpJobsite').classList.contains('pb-cp-auto'),num:g('cpJobNumber').value,start:g('cpStart').value,date:g('cpDate').value,init:g('cpSupervisorInitials').value,att:g('cpAttendant').value,addr:g('cpAddress').value,cal:g('cpMeterCal').value,dial:g('cpDialNum').value,posted:g('cpPosted').value,reuse:getComputedStyle(g('cpReuseWrap')).display};});
 ok(v.job==='Wildomar Sewer Ph 2'&&v.jobAuto&&v.num==='24-017','jobsite and job number prefilled from the current job, marked auto');
 ok(/^\d\d:\d\d$/.test(v.start)&&!!v.date,'date and start time prefilled ('+v.date+' '+v.start+')');
 ok(v.init===''&&v.att===''&&v.addr===''&&v.cal==='','initials, attendant, address and meter test date are never prefilled');
 ok(v.dial==='911'&&/on this phone/.test(v.posted),'defaults: EMERGENCY dials 911; permit shown on this phone');
 ok(v.reuse==='none','no Copy From Last Permit button when there is no earlier permit');
 // an untouched prefilled form is not "typed work": leaving asks nothing
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(700);
 ok((await H.modal())===null&&(await H.screen())==='screen-home','leaving an untouched prefilled form asks nothing');
 await p.evaluate(()=>pbOpenConfinedPermitForm());await p.waitForTimeout(1000);
 // folds: closed when empty, open by themselves when they hold a value
 const f0=await p.evaluate(()=>[...document.querySelectorAll('#screen-confinedPermit details.cp-more')].map(d=>d.open));
 ok(f0.length===4&&f0.every(x=>!x),'four More details folds, all closed on a fresh form');
 await L.fill(p,{cpMaxCO:'20',cpEmergContactNum:'555-123-4567'});
 const f1=await p.evaluate(()=>({lim:document.getElementById('cpMaxCO').closest('details').open,con:document.getElementById('cpEmergContactNum').closest('details').open,land:document.getElementById('cpLandmarks').closest('details').open,line:document.getElementById('cpLimitsLine').textContent,rev:document.getElementById('cpLockReview').innerText}));
 ok(f1.lim&&f1.con&&!f1.land,'a fold opens when a box in it holds a value');
 ok(/CO up to 20 ppm/.test(f1.line)&&/CO up to 20 ppm \(1 typed on this permit, the rest standard\)/.test(f1.rev),'the air-limit line and the review follow a typed limit');
 // a lock error inside a fold opens it
 await p.evaluate(()=>{document.getElementById('cpMaxCO').closest('details').open=false;const e=document.getElementById('cpMinO2');e.value='-3';});
 await p.evaluate(()=>pbLockConfinedPermit());await p.waitForTimeout(900);
 for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt.includes('Cancel')?'Cancel':bt[0]);}
 await L.fill(p,{cpMinO2:'-3'});await p.evaluate(()=>pbLockConfinedPermit(true));await p.waitForTimeout(900);
 const e1=await p.evaluate(()=>({err:document.getElementById('cpError').innerText,open:document.getElementById('cpMinO2').closest('details').open,scr:[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent).id}));
 ok(e1.scr==='screen-confinedPermit'&&/Minimum O2 of -3 can.t be negative/.test(e1.err)&&e1.open,'a refused limit inside a fold: Lock refuses and the fold is open');
 // state rule line follows the address
 await L.fill(p,{cpMinO2:'',cpMaxCO:'',cpEmergContactNum:'',cpAddress:'12 Main St, Salem, OR 97301'});
 const r1=await p.evaluate(()=>document.getElementById('cpRulesLine').textContent);
 ok(/Oregon OAR 437-002-0146\(6\)\(b\)/.test(r1)&&/signature, not initials/.test(r1),'Oregon address: the Oregon rule and its signature note');
 await L.fill(p,{cpAddress:'400 Pine St, Seattle, WA'});ok(/Washington WAC 296-809-50004/.test(await p.evaluate(()=>document.getElementById('cpRulesLine').textContent)),'Washington address: WAC 296-809-50004');
 await L.fill(p,{cpAddress:'1 Main St, Austin, TX'});const r3=await p.evaluate(()=>document.getElementById('cpRulesLine').textContent);ok(/^Permit items: federal OSHA 29 CFR 1926\.1206\.$/.test(r3),'Texas address: federal only ('+r3+')');
 // lock with the same required set as before (the meter is asked for, not required), then the active permit
 await L.fill(p,{cpAddress:'1 Main St, Fresno, CA',cpMeter:'BW MicroClip XL, unit 3',cpMeterCal:await L.today(p)});
 const rv=await p.evaluate(()=>document.getElementById('cpLockReview').innerText);ok(/Gas meter\s+BW MicroClip XL, unit 3, last bump test or calibration \d{4}-\d\d-\d\d/.test(rv),'review shows the meter and its test date');
 await p.evaluate(()=>pbLockConfinedPermit());await p.waitForTimeout(900);
 for(let i=0;i<4;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt.includes('I Understand')?'I Understand':bt[bt.length-1]);}
 await p.waitForTimeout(1200);
 const a=await p.evaluate(()=>({scr:[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent).id,grid:document.getElementById('cpSummaryGrid').innerText.replace(/\s+/g,' '),note:(document.getElementById('cpShowNote')||{}).innerText,warn:document.getElementById('screen-confinedActive').innerText}));
 ok(a.scr==='screen-confinedActive','locks with the same required boxes as before');
 ok(/Gas Meter BW MicroClip XL, unit 3, last bump test or calibration/.test(a.grid)&&/How Entrants See This Permit Shown to each entrant on this phone at the entrance/.test(a.grid),'active permit: meter and how entrants see the permit');
 ok(/Show this permit to each entrant before they go in/.test(a.note||''),'active permit: show-the-permit line over the roster');
 ok(/DO NOT ENTER\. Call for trained rescue/.test(a.warn)&&/EMERGENCY will dial: 911/.test(a.warn.replace(/\s+/g,' ')),'active permit: DO NOT ENTER and the EMERGENCY number unchanged');
 ok(p.errs.length===0,'no page errors '+p.errs.join('|'));
 await L.done(b);
})();
