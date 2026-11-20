// t123 (r16.95 newrun-short): the New Run form is shorter, nothing is lost, and the folds open by themselves.
// Run: cd /home/claude/rig && node tests/t123_newrunshort.js  (base.html = the build before, cur.html = this one, on 8843)
const boot=require(__dirname+'/rig/boot');const co=require(__dirname+'/rig/co');const F=require(__dirname+'/rig/flow');
const BASE=process.env.PB_BASE||'http://127.0.0.1:8843/base.html', CUR=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const formInfo=(p)=>p.evaluate(()=>{const s=document.getElementById('screen-input');const vis=e=>e.checkVisibility();
 const c=[...s.querySelectorAll('input,select,textarea')].filter(e=>e.type!=='hidden'&&e.type!=='file'&&vis(e));
 return {h:s.scrollHeight,inputs:c.filter(e=>e.tagName!=='SELECT').length,selects:c.filter(e=>e.tagName==='SELECT').length,buttons:[...s.querySelectorAll('button,[role=button]')].filter(vis).length,ids:[...s.querySelectorAll('[id]')].map(e=>e.id).filter(Boolean)};});
const openNew=async(p)=>{await p.evaluate(()=>window.pbOpenNewRun());await p.waitForTimeout(1500);};
const st=(p)=>p.evaluate(()=>({more:document.getElementById('runSecMore').open,seg:document.getElementById('runSegGroup').open,pts:document.getElementById('runSecPoints').open,sum:document.getElementById('runSecMoreSum').textContent,flag:document.getElementById('runSecMoreFlag').textContent}));
// The "before" numbers come from the r16.94 build. With PB_BASE set (run_all.sh --base FILE, or by hand with base.html on
// 8843) they are measured live; under run_all.sh without --base they are read from fixtures/t123_before_r16.94.json, which
// is the same measurement saved from r16.94 (tests/fixtures/README.md says how to remake it).
const BEFORE_FIX=__dirname+'/fixtures/t123_before_r16.94.json';
const liveBase=!!process.env.PB_BASE||!process.env.PB_URL;
(async()=>{
 // ---- before (r16.94) ----
 let b,p,before;
 if(liveBase){({b,p}=await boot(BASE,{init:co.replace("000000000001','"+require(__dirname+'/rig/env').NOTICE+"'","000000000001','"+require(__dirname+'/rig/env').BASE_NOTICE+"'")}));await p.setViewportSize({width:390,height:844});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 before=await formInfo(p);await b.close();
 if(process.env.PB_OUT)require('fs').writeFileSync(process.env.PB_OUT+'/t123_before.json',JSON.stringify(before));}
 else{before=JSON.parse(require('fs').readFileSync(BEFORE_FIX,'utf8'));console.log('before: from '+BEFORE_FIX.split('/').pop()+' (no --base given)');}
 // ---- after ----
 ({b,p}=await boot(CUR,{init:co}));await p.setViewportSize({width:390,height:844});const H=F(p);
 let stake=null;await p.route('**/functions/v1/ai**', async r=>{await r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,text:JSON.stringify(stake),used:1,limit:60})});});
 const S=(sta,el,cf,line,num)=>({is_stake:true,stake_number:{value:num,conf:'high'},station:{value:sta,conf:'high'},offset:{value:'10/SD',conf:'high'},line_label:{value:line,conf:'high'},cut_fill:{direction:'cut',feet:cf,as_written:'C-'+cf,to:'IE',conf:'high'},stake_elevation:{feet:el,as_written:String(el),conf:'high'},other_text:'',uncertain:[]});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 const after=await formInfo(p);
 console.log(`empty New Run at 390 px: before ${before.h}px, ${before.inputs} inputs + ${before.selects} dropdowns, ${before.buttons} buttons; after ${after.h}px, ${after.inputs} inputs + ${after.selects} dropdowns, ${after.buttons} buttons`);
 ok(after.h<=before.h-350,'empty form at least 350 px shorter (r16.96: wall and intervals back under the pipe) ('+(before.h-after.h)+' px, '+Math.round(100*(before.h-after.h)/before.h)+'%)');
 const ids=new Set(after.ids);const missing=before.ids.filter(i=>!ids.has(i)&&!/^pbA11y/.test(i)); /* pbA11y* ids are auto-numbered at start-up */ok(missing.length===0,'every original control id still on the form ('+before.ids.length+' ids)'+(missing.length?' missing: '+missing.join(','):''));
 let s=await st(p);ok(!s.more&&!s.seg,'More settings and Additional runs start closed');
 ok(/Engineer’s rod/.test(s.sum)&&/HI from stake shots/.test(s.sum)&&/trench not set/.test(s.sum)&&!/interval/.test(s.sum),'closed line states rod, HI, trench (r16.96: no interval/wall there): "'+s.sum+'"');
 ok(await p.evaluate(()=>{const e=document.getElementById('runSecMoreSum');return e.checkVisibility()&&e.scrollWidth<=e.clientWidth+1;}),'closed line is shown whole (wraps, not cut off)');
 await p.evaluate(()=>document.querySelector('#rodToggle [data-val=lenker]').click());await p.waitForTimeout(400);s=await st(p);
 ok(/^Lenker rod/.test(s.sum)&&!/HI/.test(s.sum),'closed line follows the rod unit: "'+s.sum+'"');
 await p.evaluate(()=>document.querySelector('#rodToggle [data-val=engineer]').click());await p.waitForTimeout(400);
 ok(!(await st(p)).more,'changing the rod unit (always shown on the line) does not pop the fold');
 // ---- the common run never opens More ----
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Test Sewer');await H.sel('runIdSel','8"');await p.waitForTimeout(400);
 s=await st(p);ok(!s.more&&await p.evaluate(()=>{const e=document.getElementById('runWT'),g=document.getElementById('runWallGroup'),l=document.getElementById('runWallGroupSum');return e.value!==''&&!e.closest('#runSecMore')&&(!g||g.closest('#runPipeGroup'))&&(e.checkVisibility()||(l&&l.checkVisibility()&&l.textContent.indexOf('Wall '+e.value+' ft (auto)')===0));}),'pipe size fills the wall (auto), shown under the pipe (r17.11: on the Wall line when folded), More stays closed: "'+s.sum+'"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await p.waitForTimeout(1200);s=await st(p);ok(!s.more&&!s.seg,'start/end stakes read and typed: folds stay closed (total='+await p.evaluate(()=>document.getElementById('totalDist').value)+', end='+await p.evaluate(()=>document.getElementById('endSta').value)+')');
 // ---- Add Hub: the hub card is shown, every fold around it opens ----
 await p.evaluate(()=>{document.getElementById('runSecPoints').open=false;});await p.waitForTimeout(200);
 await p.evaluate(()=>pbAddHub());await p.waitForTimeout(400);
 ok(await p.evaluate(()=>{const c=document.querySelector('#hubsContainer > [data-hub-id]:last-child');return !!c&&document.getElementById('runSecPoints').open&&c.querySelector('input').checkVisibility();}),'Add Hub with Points folded: section opens, new hub card visible');
 await p.evaluate(()=>{const c=document.querySelector('#hubsContainer > [data-hub-id]:last-child');pbRemoveHub?pbRemoveHub(c.dataset.hubId):c.remove();});await p.waitForTimeout(300);await H.modalClick('Remove').catch(()=>{});await H.modalClick('Remove Hub').catch(()=>{});await p.waitForTimeout(300);
 // ---- pbGoToField to folded fields ----
 ok(!(await st(p)).more,'More still closed before Go to field');
 await p.evaluate(()=>pbGoToField('interval'));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>{const e=document.getElementById('interval');return !e.closest('#runSecMore')&&e.checkVisibility()&&document.activeElement===e;}),'pbGoToField(interval) focuses the field under the pipe (r16.96)');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=false;});await p.waitForTimeout(200);
 await p.evaluate(()=>pbGoToField('runBedding'));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('runBedding').checkVisibility()),'pbGoToField(runBedding) opens More and the nested Trench design');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=false;document.getElementById('runBedRow').open=false;});await p.waitForTimeout(900);
 ok(!(await st(p)).more,'a fold the person closes stays closed (nothing in it changed)');
 // ---- error list: a flagged folded field opens the fold; "Go to this field" opens it again ----
 await openNew(p);await H.click('Review & Calculate');await p.waitForTimeout(1200);
 const errs=await p.evaluate(()=>[...document.querySelectorAll('#inputError .pb-err-link')].map(b=>b.getAttribute('onclick')));console.log('error list:',JSON.stringify(errs));
 s=await st(p);ok(s.more&&/field to fix/.test(s.flag),'a flagged field inside More (totalDist) opens it by itself (flag "'+s.flag+'")');
 await p.evaluate(()=>{document.getElementById('runSecMore').open=false;});await p.waitForTimeout(200);
 const ti=errs.findIndex(t=>/totalDist/.test(t));
 await p.evaluate(i=>document.querySelectorAll('#inputError .pb-err-link')[i].click(),ti);await p.waitForTimeout(400);
 ok(ti>=0&&await p.evaluate(()=>document.getElementById('runSecMore').open&&document.getElementById('totalDist').checkVisibility()&&document.activeElement===document.getElementById('totalDist')),'"Go to this field" on The Run distance opens More and focuses it');
 // ---- a value put on the form without events (a draft / import / Resume fill) opens it ----
 await openNew(p);s=await st(p);ok(!s.more,'New Run: More closed again');
 await p.evaluate(()=>{document.getElementById('interval').value='20';});await p.waitForTimeout(1500);
 s=await st(p);ok(await p.evaluate(()=>{const e=document.getElementById('interval');return e.value==='20'&&e.checkVisibility();}),'interval set without events (as a draft/Resume does) is shown under the pipe');
 await openNew(p);await p.evaluate(()=>{document.getElementById('runBedding').value='0.5';});await p.waitForTimeout(1500);
 ok(await p.evaluate(()=>document.getElementById('runSecMore').open),'bedding set without events opens More');
 await openNew(p);await p.evaluate(()=>document.querySelector('#hiToggle [data-val=bm]').click());await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.getElementById('runSecMore').open),'HI method Benchmark opens More');
 // ---- Edit Run Data shows what the run used ----
 await openNew(p);await H.sel('runIdSel','8"');
 stake=S('1+50',103.4,3.61,'MH-1','3860');await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);await H.f('startStakeReading','4.36');
 stake=S('4+51',104.26,3.83,'MH-2','3863');await p.setInputFiles('#endAiStakePhoto',[H.img('p05')]);await p.waitForTimeout(2500);
 await p.evaluate(()=>pbGoToField('interval'));await H.f('interval','5');await p.evaluate(()=>{document.getElementById('runSecMore').open=false;});await p.waitForTimeout(900);
 ok(!(await st(p)).more,'closed by hand with interval 5 typed: stays closed');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);console.log('screen after review:',await H.screen());
 await p.evaluate(()=>pbEditRunData());await p.waitForTimeout(2500);await H.modalClick('Edit').catch(()=>{});await p.waitForTimeout(1500);
 s=await st(p);ok((await H.screen())==='screen-input'&&await p.evaluate(()=>{const e=document.getElementById('interval');return e.value==='5'&&e.checkVisibility();}),'Edit Run Data shows the run\'s interval under the pipe');
 // ---- End Point typed as a station: The Run's distance follows it, More stays closed ----
 await openNew(p);await H.f('startStaTxt','1+50');await p.click('.pb-st-wrap[data-st-pt="end"] [data-st="sta"]');await p.waitForTimeout(200);await H.f('endStaTxt','4+50');await p.waitForTimeout(1200);
 const td=await p.evaluate(()=>[document.getElementById('totalDist').value,document.getElementById('endSta').value]);
 ok(!(await st(p)).more&&Number(td[0])===300,'End as a station: total distance follows ('+td.join(' / ')+') and More stays closed');
 // ---- Additional runs ----
 await openNew(p);await p.click('#runSegGroup > summary');await p.waitForTimeout(300);await H.click('Add Additional Run');await p.waitForTimeout(600);
 ok(await p.evaluate(()=>document.getElementById('reducerSegmentWrap').checkVisibility()&&document.getElementById('seg2WT').checkVisibility()),'Add Additional Run shows Run 2');
 await p.evaluate(()=>{document.getElementById('runSegGroup').open=false;});await p.waitForTimeout(400);
 ok(/Run 2 added/.test(await p.evaluate(()=>document.getElementById('runSegGroupSum').textContent)),'Additional runs line says Run 2 added');
 // ---- tap targets ----
 const small=await p.evaluate(()=>[...document.querySelectorAll('#runSecMore > summary, #runSegGroup > summary')].filter(e=>e.getBoundingClientRect().height<44).length);ok(small===0,'fold headings are 44 px+ tall');
 ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs.slice(0,3)));
 console.log(fails?'T123 FAILED: '+fails:'T123 ALL PASS');await b.close();})();
