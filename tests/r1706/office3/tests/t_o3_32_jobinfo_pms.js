// office3 #32: two managers. The server holds a version for Job details and for a job's PMs & supers; a save made on an
// older version is refused (pb:changed) and the app merges onto what is there now, or says so. Stubs act like
// sql/32_version_check.sql (version checked, refusal carries the current state).
const L = require('./lib');
const fx = `;(function(){const D=${L.fs.readFileSync(L.RIG + '/dash.json', 'utf8')};
window.__rpcOverride.pb_prod_job_detail=(a)=>{const k=String(a.p_job_number).trim().toLowerCase();const j=D.jobs.find(x=>x.job_key===k)||D.jobs[1];return Object.assign({},j,{today:a.p_today,server_at:new Date().toISOString(),days:[],reporters:[],recent:[],crew:[],locates:[],daily_eq:[]});};
// the server's job details with a version
const J0=D.jobs.find(x=>x.job_key==='26014');window.__ji={project_name:J0.project_name,address:J0.address,start_date:J0.start_date?String(J0.start_date).slice(0,10):null,info_ver:0};window.__jiSets=[];
{const d0=window.__rpcOverride.pb_prod_company_dashboard;window.__rpcOverride.pb_prod_company_dashboard=(a)=>{const d=JSON.parse(JSON.stringify(typeof d0==='function'?d0(a):d0));d.jobs.forEach(j=>{if(j.job_key==='26014')Object.assign(j,{project_name:window.__ji.project_name,address:window.__ji.address,start_date:window.__ji.start_date});});return d;};} // the dashboard shows what the server has
window.__rpcOverride.pb_prod_job_info_get=()=>Object.assign({ok:true,job_key:'26014',job_number:'26014'},window.__ji);
window.__rpcOverride.pb_prod_job_info_set=(a)=>{window.__jiSets.push(a);if(a.p_expect_ver===undefined)return {ok:true};if(a.p_expect_ver!==window.__ji.info_ver)return {ok:false,code:'pb:changed',now:Object.assign({},window.__ji)};
  window.__ji={project_name:a.p_project_name,address:a.p_address,start_date:a.p_start_date,info_ver:window.__ji.info_ver+1};return Object.assign({ok:true,job_key:'26014',job_number:'26014'},window.__ji);};
// PMs: Ann (PM) assigned; Bob (super) and Cal (PM) candidates
const P=(id,n,t)=>({user_id:id,name:n,email:n.toLowerCase()+'@x.co',title:t});
window.__pm={assigned:[Object.assign(P('u-ann','Ann','project_manager'),{since:'2026-11-01',current:true})],ver:1};window.__pmSets=[];
const cands=[P('u-ann','Ann','project_manager'),P('u-bob','Bob','superintendent'),P('u-cal','Cal','project_manager')];
window.__rpcOverride.pb_job_pms_get=()=>({ok:true,company_id:'d01a',can_edit:true,is_owner:true,assigned:window.__pm.assigned,candidates:cands,ver:window.__pm.ver});
window.__rpcOverride.pb_job_pms_set=(a)=>{window.__pmSets.push(a);const st=()=>({assigned:window.__pm.assigned,candidates:cands,ver:window.__pm.ver});
  if(a.p_expect_ver!==window.__pm.ver)return Object.assign({ok:false,code:'pb:changed'},st());
  window.__pm={assigned:a.p_user_ids.map(id=>Object.assign(cands.find(c=>c.user_id===id),{current:true})),ver:window.__pm.ver+a.p_user_ids.length+1};return Object.assign({ok:true},st());};
})();`;
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + fx, wait: 3500 });
  const ev = (s) => p.evaluate(s);
  await ev("pbGoto('prodDashboard')"); await p.waitForTimeout(1500);
  await ev("window.pbCxOpenJob('26014')"); await p.waitForTimeout(2000);
  // ---- Job details: B opens the form (sees the old name); A saves a new name on the server meanwhile
  await ev("window.pbCxInfoForm(null,'')"); await p.waitForTimeout(400);
  await ev("window.__ji=Object.assign({},window.__ji,{project_name:'Sundance Sewer Phase 2',address:'Banning, CA',info_ver:1})");
  await p.fill('#cxiStart', '2026-10-29'); await L.clickModal(p, 'Save'); await p.waitForTimeout(2500);
  let sets = await ev('window.__jiSets'), last = sets[sets.length - 1];
  console.log('  sent:', JSON.stringify(sets)); console.log('  modal after first save:', (await L.modal(p)).slice(0, 300).replace(/\n/g, ' '));
  L.ok(last && last.p_expect_ver === 1 && last.p_project_name === 'Sundance Sewer Phase 2' && last.p_address === 'Banning, CA' && last.p_start_date === '2026-10-29', 'job details: B\'s date saved on version 1, A\'s name and City, State kept');
  // ---- A saves again between B's read and B's save: the server refuses, the app merges and saves once more
  await ev("window.pbCxInfoForm(null,'')"); await p.waitForTimeout(400);
  await ev(`(()=>{const g=window.__rpcOverride.pb_prod_job_info_get;window.__rpcOverride.pb_prod_job_info_get=(a)=>{const r=g(a);window.__ji=Object.assign({},window.__ji,{address:'Calimesa, CA',info_ver:window.__ji.info_ver+1});window.__rpcOverride.pb_prod_job_info_get=g;return r;};})()`);
  await p.fill('#cxiName', 'Sundance Phase 2 (B)'); await L.clickModal(p, 'Save'); await p.waitForTimeout(2500);
  sets = await ev('window.__jiSets'); const r2 = sets.slice(-2);
  console.log('  race:', JSON.stringify(r2)); console.log('  modal after race save:', (await L.modal(p)).slice(0, 300).replace(/\n/g, ' '), JSON.stringify(await ev('window.__ji')));
  L.ok(r2.length === 2 && r2[0].p_expect_ver === 2 && r2[1].p_expect_ver === 3 && r2[1].p_address === 'Calimesa, CA' && r2[1].p_project_name === 'Sundance Phase 2 (B)', 'job details race: refused on version 2, merged (A\'s Calimesa kept) and saved on version 3');
  // ---- both changed the same field: stopped with "Someone else changed"
  await ev("window.pbCxInfoForm(null,'')"); await p.waitForTimeout(400);
  await ev("window.__ji=Object.assign({},window.__ji,{project_name:'Name by A',info_ver:window.__ji.info_ver+1})");
  const n0 = (await ev('window.__jiSets')).length;
  await p.fill('#cxiName', 'Name by B'); await L.clickModal(p, 'Save'); await p.waitForTimeout(2000);
  const m = await L.modal(p); console.log('  clash modal:', m.slice(0, 200).replace(/\n/g, ' '));
  L.ok((await ev('window.__jiSets')).length === n0 && /Someone else changed the job name meanwhile \(now .Name by A.\)/.test(m), 'job details clash: nothing sent, "Someone else changed the job name meanwhile" with the server\'s value');
  await L.clickModal(p, 'Cancel'); await p.waitForTimeout(300);
  // ---- PMs & supers: B's page loaded with Ann; A adds Bob (version moves); B ticks Cal and saves
  await ev("window.pbCxTab && window.pbCxTab('overview')"); await p.waitForTimeout(600);
  await ev('window.pbPmJobLoad()'); await p.waitForTimeout(800);
  await ev('window.pbPmJobEdit()'); await p.waitForTimeout(300);
  await ev("window.__pm={assigned:window.__pm.assigned.concat([{user_id:'u-bob',name:'Bob',email:'bob@x.co',title:'superintendent',current:true}]),ver:3}");
  const ci = await ev("[...document.querySelectorAll('#pjPmSec input[type=checkbox]')].findIndex(x=>x.dataset.uid==='u-cal')");
  await ev(`window.pbPmJobTick(${ci}, true)`); await ev('window.pbPmJobSave()'); await p.waitForTimeout(2000);
  let ps = await ev('window.__pmSets'); console.log('  pms sent:', JSON.stringify(ps));
  const pl = ps[ps.length - 1];
  L.ok(pl && pl.p_expect_ver === 3 && pl.p_user_ids.slice().sort().join() === 'u-ann,u-bob,u-cal', 'PMs: saved on version 3 with Bob (A\'s add) kept and Cal added');
  L.ok(/Bob was added by someone else meanwhile and is kept/.test(await ev("(document.getElementById('pjPmMsg')||{}).textContent||''")), 'PMs: the line says Bob was kept');
  // ---- race on PMs: A takes Ann off between B's read and B's save: refused, re-applied, saved
  await ev('window.pbPmJobEdit()'); await p.waitForTimeout(300);
  await ev(`(()=>{const g=window.__rpcOverride.pb_job_pms_get;window.__rpcOverride.pb_job_pms_get=(a)=>{const r=g(a);window.__pm={assigned:window.__pm.assigned.filter(x=>x.user_id!=='u-ann'),ver:window.__pm.ver+1};window.__rpcOverride.pb_job_pms_get=g;return r;};})()`);
  const bi = await ev("[...document.querySelectorAll('#pjPmSec input[type=checkbox]')].findIndex(x=>x.dataset.uid==='u-bob')");
  await ev(`window.pbPmJobTick(${bi}, false)`); await ev('window.pbPmJobSave()'); await p.waitForTimeout(2000);
  ps = await ev('window.__pmSets'); const pr = ps.slice(-2); console.log('  pms race:', JSON.stringify(pr));
  L.ok(pr.length === 2 && pr[1].p_expect_ver === pr[0].p_expect_ver + 1 && pr[1].p_user_ids.slice().sort().join() === 'u-cal', 'PMs race: refused, A\'s removal of Ann and B\'s removal of Bob both kept (only Cal left)');
  L.ok((await L.overflow(p)).length === 0, '390-400 px: nothing runs off the side ' + JSON.stringify(await L.overflow(p)));
  // ---- an older server (no version, no _get): the old calls still work
  await ev("window.__rpcOverride.pb_prod_job_info_get=()=>null;window.__rpcOverride.pb_job_pms_get=()=>({ok:true,company_id:'d01a',can_edit:true,is_owner:true,assigned:[],candidates:[{user_id:'u-cal',name:'Cal',title:'project_manager'}]});window.__rpcOverride.pb_job_pms_set=(a)=>{window.__pmSets.push(a);return {ok:true,assigned:a.p_user_ids.map(id=>({user_id:id,name:'Cal',current:true})),candidates:[]};}");
  await ev("window.pbCxInfoForm(null,'')"); await p.waitForTimeout(400); await p.fill('#cxiStart', '2026-11-02'); await L.clickModal(p, 'Save'); await p.waitForTimeout(2500);
  sets = await ev('window.__jiSets'); L.ok(sets[sets.length - 1].p_expect_ver === undefined && sets[sets.length - 1].p_start_date === '2026-11-02', 'older server: job details saved with the old call (no version)');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
