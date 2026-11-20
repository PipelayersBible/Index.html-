// A permit draft saved by the build BEFORE this change (r17.10) restores on the shortened form: every value back,
// folds holding a value open, the new boxes empty/default, and it still locks. node t_ps3_olddraft.js
const L=require('./_lib');const {ok}=L;
(async()=>{const {b,p,H}=await L.start(L.BASE);
 await p.evaluate(()=>pbOpenConfinedPermitForm());await p.waitForTimeout(1000);
 const type=async(id,v)=>{await p.click('#'+id);await p.keyboard.type(v);};
 await type('cpSpace','MH-77');await type('cpJobsite','Old Draft Job');await type('cpLandmarks','north gate');await type('cpMaxCO','18');await type('cpEmergContactNum','555-000-1111');await type('cpEqNotes','tripod');await type('cpSupervisor','Dana Old');
 await p.check('#cpHazEngulf');await p.check('#cpEqRescue');await p.keyboard.press('Tab');
 await p.waitForTimeout(1500);
 const band=await p.evaluate(()=>document.getElementById('cpDraftSaveLine').innerText);
 ok(/Draft saved on this phone/.test(band),'r17.10 page saved a draft ('+band.slice(0,50)+')');
 await p.goto(L.CUR,{waitUntil:'load'});await p.waitForTimeout(3500);
 const found=await p.evaluate(()=>{const el=[...document.querySelectorAll('[onclick]')].find(e=>/pbPmdResume\(/.test(e.getAttribute('onclick')));if(!el)return null;el.click();return el.getAttribute('onclick');});
 ok(!!found,'the patched page lists the old draft ('+found+')');
 await p.waitForTimeout(1200);for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt.find(x=>/Continue|Resume|OK|Open/i.test(x))||bt[0]);await p.waitForTimeout(600);}
 await p.waitForTimeout(800);
 const v=await p.evaluate(()=>{const g=i=>document.getElementById(i);const o=i=>g(i).closest('details.cp-more');return {scr:[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent).id,space:g('cpSpace').value,job:g('cpJobsite').value,land:g('cpLandmarks').value,co:g('cpMaxCO').value,cn:g('cpEmergContactNum').value,eq:g('cpEqNotes').value,sup:g('cpSupervisor').value,supAuto:g('cpSupervisor').classList.contains('pb-cp-auto')&&g('cpSupervisor').dataset.cpAuto===g('cpSupervisor').value,haz:g('cpHazEngulf').checked,res:g('cpEqRescue').checked,start:g('cpStart').value,meter:g('cpMeter').value,cal:g('cpMeterCal').value,posted:g('cpPosted').value,
  open:[o('cpLandmarks').open,o('cpMaxCO').open,o('cpEmergContactNum').open,o('cpEqNotes').open],line:g('cpLimitsLine').textContent,exp:getComputedStyle(g('cpHazEngulfExplainWrap')).display};});
 ok(v.scr==='screen-confinedPermit','the draft opens on the permit form');
 ok(v.space==='MH-77'&&v.job==='Old Draft Job'&&v.land==='north gate'&&v.co==='18'&&v.cn==='555-000-1111'&&v.eq==='tripod'&&v.sup==='Dana Old'&&v.haz&&v.res,'every value of the old draft is back '+JSON.stringify(v).slice(0,200));
 ok(!v.supAuto,'a typed supervisor is not marked auto');
 ok(v.start==='','the old draft\'s empty start time stays empty (no value invented on restore)');
 ok(v.open.every(Boolean),'each fold holding a value from the draft is open '+v.open);
 ok(/CO up to 18 ppm/.test(v.line),'the air-limit line shows the draft\'s typed CO limit');
 ok(v.exp!=='none','a ticked hazard shows its explain box');
 ok(v.meter===''&&v.cal===''&&/on this phone/.test(v.posted),'boxes the old draft never had: empty, and the default choice');
 await L.fill(p,{cpSpace:'MH-77',cpJobsite:'Old Draft Job',cpSupervisor:'Dana Old'});
 await p.evaluate(()=>pbLockConfinedPermit());await p.waitForTimeout(900);
 for(let i=0;i<5;i++){const bt=await H.modalBtns();if(!bt.length)break;await H.modalClick(bt.find(x=>/I Understand|Lock|OK|Yes|Continue/i.test(x))||bt[bt.length-1]);await p.waitForTimeout(400);}
 await p.waitForTimeout(1200);
 const a=await p.evaluate(()=>({scr:[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent).id,grid:document.getElementById('cpSummaryGrid').innerText.replace(/\s+/g,' '),err:document.getElementById('cpError').innerText}));
 ok(a.scr==='screen-confinedActive','the restored draft locks '+a.err.slice(0,120));
 ok(/CO at most 18 ppm \(entered\)/.test(a.grid)&&/Gas Meter not recorded/.test(a.grid),'locked with the draft\'s limit; meter shown as not recorded');
 ok(p.errs.length===0,'no page errors '+p.errs.join('|'));
 await L.done(b);})();
