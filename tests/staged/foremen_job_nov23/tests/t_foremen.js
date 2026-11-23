// foremen_job_nov23: "Foremen on this job" on the job page (rig: tests/rig, fake server stubs acting like
// sql/01_job_foremen.sql: version check, pb:changed carries the list as it is now, pb:owner_only, pb:not_foreman).
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_foremen.js   (page served from work/build_hooks). exit 1 on any FAIL.
const L = require('../../../r1706/office3/tests/lib');
const SHOTS = require('path').resolve(__dirname, '../results/shots'); try { L.fs.mkdirSync(SHOTS, { recursive: true }); } catch (e) {}
const fx = `;(function(){const D=${L.fs.readFileSync(L.RIG + '/dash.json', 'utf8')};
window.__rpcOverride.pb_prod_job_detail=(a)=>{const k=String(a.p_job_number).trim().toLowerCase();const j=D.jobs.find(x=>x.job_key===k)||D.jobs[1];return Object.assign({},j,{today:a.p_today,server_at:new Date().toISOString(),days:[],reporters:[],recent:[],crew:[],locates:[],daily_eq:[]});};
const P=(id,n)=>({user_id:id,name:n,email:n.toLowerCase().replace(/ /g,'.')+'@x.co'});
window.__pm={assigned:[Object.assign(P('u-ann','Ann'),{title:'project_manager',since:'2026-11-01',current:true})],ver:1};
window.__rpcOverride.pb_job_pms_get=()=>({ok:true,company_id:'d01a',can_edit:true,is_owner:true,assigned:window.__pm.assigned,candidates:[Object.assign(P('u-ann','Ann'),{title:'project_manager'})],ver:window.__pm.ver});
window.__fmC=[P('u-dale','Dale Ortiz'),P('u-eli','Eli Banks'),P('u-finn','Finn Cole'),P('u-gus','Gus Reyes')];
window.__fm={assigned:[Object.assign(P('u-dale','Dale Ortiz'),{since:'2026-11-10',current:true}),Object.assign(P('u-eli','Eli Banks'),{since:'2026-11-12',current:true})],ver:2,may_remove:true};window.__fmSets=[];window.__fmNext=null;
const st=()=>({assigned:window.__fm.assigned,candidates:window.__fmC,ver:window.__fm.ver});
window.__rpcOverride.pb_job_foremen_get=()=>Object.assign({ok:true,company_id:'d01a',can_edit:true,is_owner:true,may_remove:window.__fm.may_remove},st());
window.__rpcOverride.pb_job_foremen_set=(a)=>{window.__fmSets.push(JSON.parse(JSON.stringify(a)));if(window.__fmNext){const r=window.__fmNext;window.__fmNext=null;return r;}
  if(a.p_expect_ver!==window.__fm.ver)return Object.assign({ok:false,code:'pb:changed'},st());
  window.__fm=Object.assign({},window.__fm,{assigned:a.p_user_ids.map(id=>Object.assign({},window.__fmC.find(c=>c.user_id===id),{since:'2026-11-23',current:true})),ver:window.__fm.ver+a.p_user_ids.length+1});return Object.assign({ok:true},st());};
})();`;
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + fx, wait: 3500 });
  const ev = (s) => p.evaluate(s);
  const txt = (id) => ev(`(document.getElementById('${id}')||{}).textContent||''`);
  const boxIdx = (uid) => ev(`[...document.querySelectorAll('#pjFmSec input[type=checkbox]')].findIndex(x=>x.dataset.uid==='${uid}')`);
  await ev("pbGoto('prodDashboard')"); await p.waitForTimeout(1500);
  await ev("window.pbCxOpenJob('26014')"); await p.waitForTimeout(2000);
  await ev("window.pbCxTab && window.pbCxTab('overview')"); await p.waitForTimeout(800);
  // ---- the section sits right under PMs & supers, folded, names in the summary
  const where = await ev("(()=>{const a=document.getElementById('pjPmSec'),f=document.getElementById('pjFmSec');return {pm:!!a,fm:!!f,next:a&&a.nextElementSibling&&a.nextElementSibling.id,vis:!!(f&&f.offsetParent)};})()");
  L.ok(where.pm && where.fm && where.next === 'pjFmSec' && where.vis, '1 "Foremen on this job" shows on the job page right under PMs & supers ' + JSON.stringify(where));
  const head = await ev("(document.querySelector('#pjFmSec summary h3')||{}).textContent||''");
  L.ok(head === 'Foremen on this job' && await txt('pjFmSum') === 'Dale Ortiz, Eli Banks', '2 heading "Foremen on this job"; the folded row shows the names (' + head + ' / ' + await txt('pjFmSum') + ')');
  L.ok((await L.rpcs(p, 'pb_job_foremen_get')).length >= 1 && (await L.rpcs(p, 'pb_job_foremen_get'))[0].p_job_number === '26014', '3 it loads with the job page (pb_job_foremen_get with the job number)');
  await ev("document.getElementById('pjFmFold').open=true"); await p.waitForTimeout(300);
  const list = await ev("[...document.querySelectorAll('#pjFmList li')].map(x=>x.innerText.replace(/\\s+/g,' ').trim())");
  L.ok(list.length === 2 && /^Dale Ortiz dale\.ortiz@x\.co · since /.test(list[0]) && await txt('pjFmEdit') === 'Change Foremen', '4 opened: each foreman with email and since, and a Change Foremen button ' + JSON.stringify(list));
  // ---- change it: tick Finn, untick Eli, Save
  await ev('window.pbFmJobEdit()'); await p.waitForTimeout(300);
  const boxes = await ev("[...document.querySelectorAll('#pjFmSec label.pbp-pmrow')].map(l=>({t:l.innerText.replace(/\\s+/g,' ').trim(),c:l.querySelector('input').checked,d:l.querySelector('input').disabled,h:Math.round(l.getBoundingClientRect().height)}))");
  L.ok(boxes.length === 4 && boxes.filter(x => x.c).length === 2 && boxes.every(x => !x.d && x.h >= 44), '5 Change shows every foreman of the company with a tick box (2 ticked), each row 44 px or taller ' + JSON.stringify(boxes));
  await ev(`window.pbFmJobTick(${await boxIdx('u-finn')}, true)`); await ev(`window.pbFmJobTick(${await boxIdx('u-eli')}, false)`);
  await ev('window.pbFmJobSave()'); await p.waitForTimeout(1800);
  let sets = await ev('window.__fmSets'); let last = sets[sets.length - 1];
  L.ok(last && last.p_expect_ver === 2 && last.p_user_ids.slice().sort().join() === 'u-dale,u-finn' && last.p_job_number === '26014' && typeof last.p_expect_uid === 'string', '6 Save sends the list on the version it read (2): Dale and Finn ' + JSON.stringify(last));
  L.ok(await txt('pjFmMsg') === 'Saved. 2 foremen on this job.' && await txt('pjFmSum') === 'Dale Ortiz, Finn Cole' && !(await ev("!!document.getElementById('pjFmSave')")), '7 "Saved. 2 foremen on this job." and the list shows Dale and Finn (' + await txt('pjFmMsg') + ')');
  // ---- another manager adds Gus after this page loaded: his add is kept, said in plain words
  await ev('window.pbFmJobEdit()'); await p.waitForTimeout(200);
  await ev("window.__fm=Object.assign({},window.__fm,{assigned:window.__fm.assigned.concat([Object.assign({},window.__fmC[3],{current:true})]),ver:window.__fm.ver+2})");
  await ev(`window.pbFmJobTick(${await boxIdx('u-eli')}, true)`); await ev('window.pbFmJobSave()'); await p.waitForTimeout(1800);
  sets = await ev('window.__fmSets'); last = sets[sets.length - 1];
  L.ok(last.p_user_ids.slice().sort().join() === 'u-dale,u-eli,u-finn,u-gus' && /Gus Reyes was added by someone else meanwhile and is kept\./.test(await txt('pjFmMsg')), '8 someone else added Gus meanwhile: Gus kept, Eli added, said so (' + await txt('pjFmMsg') + ')');
  // ---- a save between this read and this save (pb:changed): applied again on the new list, saved once more
  await ev('window.pbFmJobEdit()'); await p.waitForTimeout(200);
  await ev(`(()=>{const g=window.__rpcOverride.pb_job_foremen_get;window.__rpcOverride.pb_job_foremen_get=(a)=>{const r=g(a);window.__fm=Object.assign({},window.__fm,{assigned:window.__fm.assigned.filter(x=>x.user_id!=='u-dale'),ver:window.__fm.ver+1});window.__rpcOverride.pb_job_foremen_get=g;return r;};})()`);
  const n0 = (await ev('window.__fmSets')).length;
  await ev(`window.pbFmJobTick(${await boxIdx('u-gus')}, false)`); await ev('window.pbFmJobSave()'); await p.waitForTimeout(2000);
  sets = await ev('window.__fmSets'); const race = sets.slice(n0);
  L.ok(race.length === 2 && race[1].p_expect_ver === race[0].p_expect_ver + 1 && race[1].p_user_ids.slice().sort().join() === 'u-eli,u-finn' && /^Saved\. 2 foremen on this job\./.test(await txt('pjFmMsg')), '9 refused as changed, re-applied (the other manager took Dale off, this one Gus) and saved on the new version ' + JSON.stringify(race.map(x => [x.p_expect_ver, x.p_user_ids])));
  // ---- refusals in plain words, nothing changed
  const refuse = async (resp, rx, label) => { await ev('window.pbFmJobEdit()'); await p.waitForTimeout(150); await ev(`window.__fmNext=${JSON.stringify(resp)}`); await ev('window.pbFmJobSave()'); await p.waitForTimeout(1500);
    const m = await txt('pjFmMsg'); L.ok(rx.test(m) && await ev("!!document.getElementById('pjFmSave')"), label + ' (' + m + ')'); await ev('window.pbFmJobCancel()'); };
  await refuse({ ok: false, code: 'pb:owner_only' }, /^Only the owner, a PM or a superintendent can take another foreman off this job\. Nothing was changed\.$/, '10 pb:owner_only: plain words, still editing');
  await refuse({ ok: false, code: 'pb:not_foreman' }, /^Someone you picked isn’t a foreman of the company any more\. Nothing was changed\. Refresh and try again\.$/, '11 pb:not_foreman: plain words');
  // ---- a manager who is not a PM: other foremen can't be unticked, a note says why
  await ev("window.__fm.may_remove=false"); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(800); await ev('window.pbFmJobEdit()'); await p.waitForTimeout(200);
  const lock = await ev("[...document.querySelectorAll('#pjFmSec input[type=checkbox]')].map(x=>x.dataset.uid+':'+x.checked+':'+x.disabled)");
  L.ok(/^Only the owner, a PM or a superintendent can take another foreman off this job\. You can add foremen, or take yourself off\.$/.test(await txt('pjFmOwnerNote'))
    && lock.filter(x => /:true:true$/.test(x)).length === 2 && lock.filter(x => /:false:false$/.test(x)).length === 2, '12 manager (not a PM/super): assigned foremen locked, the others can be added, a note says why ' + JSON.stringify(lock));
  await ev('window.pbFmJobCancel()'); await ev("window.__fm.may_remove=true");
  // ---- none assigned / nobody to pick
  await ev("window.__fm=Object.assign({},window.__fm,{assigned:[],ver:window.__fm.ver+1})"); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(800);
  L.ok(await txt('pjFmSum') === 'None assigned' && await txt('pjFmNone') === 'None assigned.' && await txt('pjFmEdit') === 'Assign Foremen', '13 none assigned: "None assigned" and an Assign Foremen button');
  await ev("window.__fmC0=window.__fmC;window.__fmC=[]"); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(800); await ev('window.pbFmJobEdit()'); await p.waitForTimeout(200);
  L.ok(await txt('pjFmNoCands') === 'No foremen in the company yet. Add them in Crew members.', '14 no foremen in the company: says where to add them');
  await ev('window.pbFmJobCancel()'); await ev("window.__fmC=window.__fmC0");
  // ---- no signal: like PMs & supers, it loads and changes with signal only
  await ev("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false})"); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(300);
  await ev('window.pbFmJobEdit()'); await p.waitForTimeout(300);
  const off = await L.modal(p);
  L.ok(/No signal\. Assigning foremen needs signal\./.test(off) && !(await ev("!!document.getElementById('pjFmSave')")), '15 no signal: Change says "No signal. Assigning foremen needs signal." and nothing opens (' + off.replace(/\n/g, ' ').slice(0, 80) + ')');
  await L.clickModal(p, 'OK'); await p.waitForTimeout(200);
  await ev("window.pbCxOpenJob('26043')"); await p.waitForTimeout(1500); await ev("window.pbCxTab && window.pbCxTab('overview')"); await p.waitForTimeout(500);
  L.ok(await txt('pjFmSum') === 'Loads with signal.', '16 another job opened with no signal: "Loads with signal." (' + await txt('pjFmSum') + ')');
  await ev("Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true})");
  // ---- an older server without the new functions (with signal, the first time a job page loads)
  await ev("window.__fmGet=window.__rpcOverride.pb_job_foremen_get;window.__rpcOverride.pb_job_foremen_get=()=>{throw new Error('Could not find the function public.pb_job_foremen_get(p_job_number) in the schema cache')}");
  await ev("window.pbCxOpenJob('26014')"); await p.waitForTimeout(2000); await ev("window.pbCxTab && window.pbCxTab('overview')"); await p.waitForTimeout(500);
  L.ok(await txt('pjFmSum') === 'Assigning foremen isn’t ready on the company server yet.', '17 server not updated yet: "Assigning foremen isn’t ready on the company server yet." (' + await txt('pjFmSum') + ')');
  await ev("window.__rpcOverride.pb_job_foremen_get=window.__fmGet"); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(800);
  // ---- like PMs & supers: a card on the Overview tab only
  const card = await ev("(()=>{const a=getComputedStyle(document.getElementById('pjPmSec')),f=getComputedStyle(document.getElementById('pjFmSec'));return {same:a.backgroundColor===f.backgroundColor&&a.borderRadius===f.borderRadius&&a.boxShadow===f.boxShadow&&a.paddingLeft===f.paddingLeft,r:f.borderRadius};})()");
  await ev("window.pbCxTab && window.pbCxTab('waiting')"); await p.waitForTimeout(400);
  const hid = await ev("(()=>{const f=document.getElementById('pjFmSec'),a=document.getElementById('pjPmSec');return {fm:!!(f&&f.offsetParent),pm:!!(a&&a.offsetParent),tab:(document.getElementById('pjBody')||{dataset:{}}).dataset.cxtab};})()");
  await ev("window.pbCxTab && window.pbCxTab('overview')"); await p.waitForTimeout(400);
  L.ok(card.same && !hid.fm && !hid.pm && hid.tab === 'waiting' && await ev("!!document.getElementById('pjFmSec').offsetParent"), '17b drawn as a card like PMs & supers, and hidden on the other tabs with it ' + JSON.stringify([card, hid]));
  // ---- Edit Job menu: Foremen right after PMs & supers, opens the editor
  await ev("window.pbCxMenu && window.pbCxMenu()"); await p.waitForTimeout(400);
  const menu = await ev("[...document.querySelectorAll('#pjCxMenu .pbx-menu-btn')].map(x=>x.id)");
  const mi = menu.indexOf('pjCxEdit_fms');
  L.ok(mi > 0 && menu[mi - 1] === 'pjCxEdit_pms' && /^Foremen\s*Which foremen are on this job$/.test(await ev("document.getElementById('pjCxEdit_fms').innerText.replace(/\\s+/g,' ').trim()")), '17c Edit Job menu: "Foremen" right after "PMs & supers" ' + JSON.stringify(menu));
  await ev("window.pbCxEdit('fms')"); await p.waitForTimeout(500);
  L.ok(await ev("!!document.getElementById('pjFmSave')") && await ev("document.getElementById('pjFmFold').open"), '17d tapping it opens the Foremen editor on the Overview tab');
  await ev('window.pbFmJobCancel()');
  // ---- the PM/super section is unchanged next to it
  L.ok(/^PMs & supers on this job/.test(await ev("(document.querySelector('#pjPmSec summary')||{}).textContent||''")) && /Ann/.test(await txt('pjPmSum')), '18 PMs & supers still shows as before (' + await txt('pjPmSum') + ')');
  // ---- Spanish lines exist for the new words (Spanish stays off)
  const es = await ev("(()=>{const d=JSON.parse(document.getElementById('pbI18nDict').textContent.replace(/<\\\\\\//g,'</'));return ['Foremen on this job','Assign Foremen','Change Foremen','No signal. Assigning foremen needs signal.','Only the owner, a PM or a superintendent can take another foreman off this job. Nothing was changed.'].map(k=>d.t[k]||null);})()");
  L.ok(es.every(Boolean), '19 every new line has Spanish ' + JSON.stringify(es));
  // ---- narrow phones, page errors
  await ev("window.__rpcOverride.pb_job_foremen_get=()=>({ok:true,company_id:'d01a',can_edit:true,is_owner:true,may_remove:true,assigned:[{user_id:'u-dale',name:'Dale Ortiz With A Very Long Family Name Indeed',email:'dale.ortiz.long.address@example-contracting.co',since:'2026-11-10',current:true},{user_id:'u-x',name:'Old Hand',email:'old@x.co',since:'2026-10-01',current:false}],candidates:window.__fmC,ver:9})");
  for (const w of [400, 360]) {
    await p.setViewportSize({ width: w, height: 800 }); await ev('window.pbFmJobLoad()'); await p.waitForTimeout(800);
    await ev("document.getElementById('pjFmFold').open=true"); await p.waitForTimeout(200);
    const ov = await L.overflow(p);
    const bh = await ev("Math.round((document.getElementById('pjFmEdit')||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)");
    L.ok(ov.length === 0 && bh >= 44, '20 at ' + w + ' px: nothing runs off the side, Change Foremen is ' + bh + ' px tall ' + JSON.stringify(ov));
    await ev("document.getElementById('pjFmSec').scrollIntoView({block:'start'})"); await p.waitForTimeout(200);
    await p.screenshot({ path: SHOTS + '/foremen_' + w + '.png' });
  }
  L.ok(/No longer a foreman/.test(await ev("(document.getElementById('pjFmList')||{}).innerText||''")), '21 someone who is no longer a foreman is marked "No longer a foreman"');
  await ev('window.pbFmJobEdit()'); await p.waitForTimeout(200); await ev("document.getElementById('pjFmSec').scrollIntoView({block:'start'})"); await p.screenshot({ path: SHOTS + '/foremen_edit_360.png' });
  L.ok(p.errs.length === 0, '22 no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
