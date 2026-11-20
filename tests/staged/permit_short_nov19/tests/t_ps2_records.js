// Old saved permits still open and print; a new permit's closeout PDF carries the new items in plain words; Copy From
// Last Permit prefers the same space; the supervisor is prefilled from the account's name. Needs the hooked pages
// (tests/mk.sh): PB_ROOT = .../hk/ . node t_ps2_records.js
process.env.PB_ROOT=process.env.PB_ROOT||'http://127.0.0.1:9200/hk/';
const P=require('../../../bughunt_nov17/pdfs/plib');const F=require('../../../rig/flow');const fs=require('fs');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const OUT=(process.env.PB_OUT||'/tmp/claude-0/ps_out');fs.mkdirSync(OUT,{recursive:true});
const BAD=/received_at|minO2 standard|maxO2 standard|zone is not written|device time of the server/;
(async()=>{
 const old=JSON.parse(fs.readFileSync(__dirname+'/../../../bughunt_nov17/pdfs/fixtures/archp.json'));
 // ---- 1. an old saved permit (no meter, no permitShown) on the patched page
 let T=await P.open();await P.load(T,old);
 let r=await P.recPdf(T,0,OUT+'/old.pdf');let f=P.flat(r.txt);
 ok(f.length>2000&&/Confined Space Entry Permit/.test(f),'old permit: the PDF is made ('+f.length+' chars)');
 ok(/Gas meter used: not recorded/.test(f),'old permit: item (n) says the meter was not recorded');
 ok(!BAD.test(f),'old permit: no programmer wording '+((f.match(BAD)||[''])[0]));
 ok(/the standard values; none was changed on this permit|typed on this permit: /.test(f),'old permit: limits in plain words');
 ok(!/Permit items: federal OSHA/.test(f),'old permit: no state-rule line claimed for a permit that never had one');
 ok(T.p.errs.length===0,'old permit: no page errors '+T.p.errs.join('|'));
 // the same PDF on the page before, for the wording it used
 await T.b.close();
 process.env.PG='base.html';T=await P.open();await P.load(T,old);r=await P.recPdf(T,0,OUT+'/old_base.pdf');const fb=P.flat(r.txt);await T.b.close();process.env.PG='cur.html';
 ok(BAD.test(fb),'before: the same permit\'s PDF had the programmer wording ('+((fb.match(BAD)||[''])[0])+')');
 // ---- 2. Copy From Last Permit, supervisor prefill, then a new permit through closeout to its PDF
 T=await P.open();const p=T.p,H=F(p);await p.setViewportSize({width:390,height:844});
 const two=[Object.assign({},old[0],{id:'x2',permitSessionId:222,space:'MH-9',lockTime:'2026-11-12T10:00:00Z',permit:Object.assign({},old[0].permit,{hazards:'MH-9 HAZARD',eqPPE:true,eqTest:true,eqRescue:true,meter:'Old Meter 7',meterCal:'2026-11-01'})}),Object.assign({},old[0],{space:'MH-4 Wet Well',permit:Object.assign({},old[0].permit,{hazards:'WETWELL HAZARD'})})];
 await P.load(T,two);
 await T.E(()=>{pbRfName={uid:pbArchiveOwnerUid,name:'Tommy Fontaine'};return 1;});
 await p.evaluate(()=>pbOpenConfinedPermitForm());await p.waitForTimeout(1200);
 let v=await p.evaluate(()=>({sup:document.getElementById('cpSupervisor').value,auto:document.getElementById('cpSupervisor').classList.contains('pb-cp-auto'),btn:getComputedStyle(document.getElementById('cpReuseWrap')).display,line:document.getElementById('cpReuseLine').textContent,names:[...document.querySelectorAll('#cpNamesList option')].map(o=>o.value)}));
 ok(v.sup==='Tommy Fontaine'&&v.auto,'supervisor prefilled from the account name, marked auto');
 ok(v.btn!=='none'&&/^From MH-9/.test(v.line),'Copy From Last Permit offered, from the last permit ('+v.line.slice(0,40)+')');
 ok(v.names.includes('Tommy Fontaine')&&v.names.length>=2,'name suggestions from past permits ('+v.names.slice(0,4).join(', ')+')');
 const set=(o)=>p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},o);
 await set({cpSpace:'mh-4 wet well'});
 ok(/^From MH-4 Wet Well/.test(await p.evaluate(()=>document.getElementById('cpReuseLine').textContent)),'typing a space that has a past permit: the button copies from that space');
 await p.evaluate(()=>pbReuseLastPermitHazards());await p.waitForTimeout(500);const m=await H.modal();const bt=await H.modalBtns();if(bt.length)await H.modalClick(bt[0]);
 ok(/Pulled in hazards, controls, gas limits, equipment, gas meter, rescue info/.test(m||''),'the copy says what it pulled in');
 ok((await p.evaluate(()=>document.getElementById('cpHazards').value))==='WETWELL HAZARD','hazards came from the same-space permit');
 await set({cpSpace:'MH-9'});await p.evaluate(()=>pbReuseLastPermitHazards());await p.waitForTimeout(500);{const b2=await H.modalBtns();if(b2.length)await H.modalClick(b2[0]);}
 v=await p.evaluate(()=>({h:document.getElementById('cpHazards').value,m:document.getElementById('cpMeter').value,c:document.getElementById('cpMeterCal').value,pp:document.getElementById('cpEqPPE').checked,al:document.getElementById('cpEqAlarm').checked}));
 ok(v.h==='MH-9 HAZARD'&&v.m==='Old Meter 7'&&v.c===''&&v.pp&&!v.al,'copy brings the meter and equipment ticks, never the meter\'s test date');
 const date=await p.evaluate(()=>{const d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());});
 await set({cpJobsite:'Test Sewer',cpAddress:'12 Main St, Salem, OR 97301',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisorInitials:'TF',cpAttendant:'Al Att',cpMeterCal:date,cpMaxCO:'20',cpPosted:'Printed copy posted at the entrance'});
 await p.evaluate(()=>pbLockConfinedPermit());await p.waitForTimeout(800);
 for(let i=0;i<5;i++){const b3=await H.modalBtns();if(!b3.length)break;await H.modalClick(b3.find(x=>/I Understand|Lock|OK|Yes|Continue/i.test(x))||b3[b3.length-1]);await p.waitForTimeout(400);}
 await p.waitForTimeout(1000);ok((await H.screen())==='screen-confinedActive','new permit locked');
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(800);
 for(let i=0;i<6;i++){const b4=await H.modalBtns();if(!b4.length)break;await H.modalClick(b4.find(x=>/Close Out|Continue|Yes|OK/i.test(x))||b4[b4.length-1]);await p.waitForTimeout(1200);}
 await p.waitForTimeout(1500);
 const idx=await T.E(()=>runArchive.findIndex(e=>e.kind==='confined'&&e.space==='MH-9'&&e.permit&&e.permit.meter==='Old Meter 7'&&e.permit.closeoutReason));
 ok(idx>=0,'closed out: the record keeps the meter');
 if(idx>=0){const rec=await T.E((i)=>{const q=runArchive[i].permit;return {m:q.meter,c:q.meterCal,s:q.permitShown,st:q.ruleState,rt:runArchive[i].reportText};},idx);
  ok(rec.c===date&&rec.s==='Printed copy posted at the entrance'&&rec.st==='OR','record: test date, how entrants saw the permit, state OR');
  ok(/Gas meter: Old Meter 7, last bump test or calibration/.test(rec.rt)&&/Permit made available to entrants: Printed copy posted at the entrance/.test(rec.rt),'text report carries both lines');
  r=await P.recPdf(T,idx,OUT+'/new.pdf');f=P.flat(r.txt);
  ok(/Gas meter used: Old Meter 7, last bump test or calibration \d{4}-\d\d-\d\d/.test(f),'PDF (n): the meter and its test date');
  ok(/How entrants saw this permit before entry \(1926\.1205\(c\)\): Printed copy posted at the entrance/.test(f),'PDF (o): how the permit was made available');
  ok(/typed on this permit: max CO; the rest are the standard values/.test(f),'PDF (j): typed limit named in plain words');
  ok(/Permit items: federal OSHA 29 CFR 1926\.1206 and Oregon OAR 437-002-0146\(6\)\(b\)\./.test(f)&&/signature, not initials/.test(f),'PDF: Oregon rule line and signature note');
  ok(!BAD.test(f),'PDF: no programmer wording '+((f.match(BAD)||[''])[0]));}
 ok(p.errs.length===0,'no page errors '+p.errs.join('|'));
 console.log(fails?fails+' FAILED':'ALL PASS');await T.b.close();process.exit(fails?1:0);
})();
