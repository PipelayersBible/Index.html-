// simplify 02 + 03: the CO hint matches the limit a blank box uses (25), and a blank permit Job number takes today's run's job.
const L=require('./_lib');const {ok}=L;
const fill=async(p)=>{const date=await p.evaluate(()=>{const d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());});
 const v={cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'};
 await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},v);};
const co=(p)=>p.evaluate(()=>{const e=document.getElementById('cpMaxCO');return {ph:e.placeholder,label:e.closest('.pb-field').querySelector('label').textContent};});
(async()=>{
 let {b,p,H}=await L.start(L.BASE);await p.click('#homeTileNewPermit');await p.waitForTimeout(1000);let c=await co(p);
 ok(c.ph==='35'&&/blank uses 25 ppm/.test(c.label),'before: the empty CO box hints 35 while its label says blank uses 25');
 ok(await p.inputValue('#cpJobNumber')==='','before: no run today, Job number blank');await b.close();
 ({b,p,H}=await L.start(L.BASE));await L.lockedRun(p,H,'24-017');await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(400);await p.click('#homeTileNewPermit');await p.waitForTimeout(1000);
 ok(await p.inputValue('#cpJobNumber')==='','before: after a run on 24-017 today the permit Job number is still blank (typed again)');await b.close();
 // after
 ({b,p,H}=await L.start(L.CUR));await p.click('#homeTileNewPermit');await p.waitForTimeout(1000);c=await co(p);
 ok(c.ph==='25'&&/blank uses 25 ppm/.test(c.label),'after: the empty CO box hints 25, same as its label');
 ok(await p.inputValue('#cpJobNumber')==='','after: no run today, Job number blank');
 const phs=await p.evaluate(()=>['cpMinO2','cpMaxO2','cpMaxLEL','cpMaxH2S','cpMaxCO'].map(i=>document.getElementById(i).placeholder).join(','));ok(phs==='19.5,23.5,10,10,25','all five gas hints equal the standard limits ('+phs+')');
 await fill(p);await H.click('Lock & Activate Permit');await p.waitForTimeout(800);await H.modalClick('I Understand');await p.waitForTimeout(1200);
 const t=await p.evaluate(()=>document.getElementById('screen-confinedActive').innerText.replace(/\s+/g,' '));
 ok(/CO at most 25 ppm \(standard, field left blank\)/.test(t),'a blank CO box still locks at 25 ppm (limit unchanged)');
 ok(/EMERGENCY/.test(t)&&/DO NOT ENTER/.test(t),'active permit: EMERGENCY and the DO NOT ENTER line are there');
 const logs=await p.evaluate(()=>[...document.querySelectorAll('#screen-confinedActive button')].filter(x=>x.checkVisibility()).map(x=>x.textContent.trim()).filter(x=>/Air Test|Test Reading/.test(x)));
 ok(logs.length===2&&logs.every(x=>x==='+ Log Air Test'),'05: both air-test buttons say "+ Log Air Test" ('+logs.join(' / ')+')');
 await p.evaluate(()=>{const x=[...document.querySelectorAll('#screen-confinedActive button')].filter(x=>x.checkVisibility()&&x.textContent.trim()==='+ Log Air Test');x[1].click();});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.getElementById('cpAtmoO2').checkVisibility()),'the renamed button still opens the air test form');
 await b.close();
 ({b,p,H}=await L.start(L.CUR));await L.lockedRun(p,H,'24-017');await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(400);await p.click('#homeTileNewPermit');await p.waitForTimeout(1000);
 const j=await p.evaluate(()=>{const e=document.getElementById('cpJobNumber');return {v:e.value,auto:e.classList.contains('pb-cp-auto')};});
 ok(j.v==='24-017'&&j.auto,'after: a run on 24-017 today: permit Job number filled in, marked auto');
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(500);ok(!(await H.modal())&&await H.screen()==='screen-home','an untouched auto job number is not "typed": leaving asks nothing');
 // two different jobs today: left blank
 await L.lockedRun(p,H,'24-099');await p.evaluate(()=>pbGoto('home',false,true));await p.waitForTimeout(400);
 await p.evaluate(()=>pbHomeStartPermit());await p.waitForTimeout(1000);for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;console.log('  modal:',(await H.modal()).slice(0,120),bt);await H.modalClick(bt[0]);}
 ok(await H.screen()==='screen-confinedPermit'&&await p.inputValue('#cpJobNumber')==='','two jobs run today: Job number left blank');
 ok(p.errs.length===0,'no page errors '+p.errs.join('|'));await L.done(b);
})();
