// office3 #35: Leave Company (Settings, members) and handing a removed foreman's runs and crew to another foreman.
const L = require('./lib');
const ci = require(L.path.resolve(__dirname, '../../../bughunt_nov17/beta/coinit'));
const CO = 'c0ffee00-0000-4000-8000-000000000001';
const mem = (id, n, r) => ({ user_id: id, email: n.toLowerCase() + '@sandoval.test', name: n, role: r, member: true, status: 'active', joined_at: new Date().toISOString() });
const RICK = '00000001-0000-4000-8000-000000000001', ANN = '00000002-0000-4000-8000-000000000002', PAT = '00000003-0000-4000-8000-000000000003';
const owner = ci() + `;window.__rpcOverride.pb_crew_list=()=>({company_id:'${CO}',company_name:'Sandoval Pipeline',is_owner:true,invites_today:1,invite_limit:30,seats:3,seats_included:5,can_manage_pms:true,
  members:[{user_id:'00000000-0000-4000-8000-000000000001',email:'tester@example.com',owner:true,me:true,member:false,status:'active'}].concat(window.__members)});
window.__members=${JSON.stringify([mem(RICK, 'Rick', 'foreman'), mem(ANN, 'Ann', 'foreman'), mem(PAT, 'Pat', 'pipelayer')])};
window.__fn={'crew-admin':(b)=>{(window.__cmCalls=window.__cmCalls||[]).push(b);if(b&&b.action==='remove'){window.__members=window.__members.filter(m=>m.user_id!==b.user_id);return {ok:true,action:'remove'};}return null;}};
window.__rpcOverride.pb_crew_handover=(a)=>{window.__hand=a;return {ok:true,runs:2,crew:1,to_name:'Ann'};};`;
const member = L.co + `;window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'foreman',companies:{name:'Acme Pipeline',status:'active'}}});
window.__rpcOverride.pb_crew_leave=(a)=>{window.__leave=a;window.__tableOne.company_members=null;window.__rpcOverride.pb_prod_access=()=>({member:false,company_id:null,manager:false,role:null,server_at:new Date().toISOString()});return {ok:true,company_id:a.p_expect_company,company_name:'Acme Pipeline',role:'foreman'};};`;
(async () => {
  // ---- A: the owner removes foreman Rick, then hands his runs and crew to Ann
  let { b, p } = await L.boot(L.URL, { init: owner, wait: 6000 });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => pbOpenCrewMembers()); await p.waitForTimeout(1500);
  const ri = await p.evaluate((id) => window.__ev ? null : null, RICK);
  await p.evaluate(() => { const rows = [...document.querySelectorAll('#crList button')].map(x => x.getAttribute('onclick') || ''); window.__rmBtns = rows.filter(x => /pbCmAct\('remove'/.test(x)); });
  const rmIdx = await p.evaluate((id) => { const btn = [...document.querySelectorAll('#crList button')].find(x => /pbCmAct\('remove'/.test(x.getAttribute('onclick') || '') && (x.closest('[class*=row]') || x.parentElement).innerText.includes('Rick')); return btn ? btn.getAttribute('onclick') : null; }, RICK);
  console.log('  remove button:', rmIdx);
  if (rmIdx) await p.evaluate((oc) => eval(oc), rmIdx); else await p.evaluate(() => pbCmAct('remove', 1));
  await p.waitForTimeout(500);
  L.ok(/Remove Rick from Sandoval Pipeline/.test(await L.modal(p)), 'remove asks first');
  await L.clickModal(p, 'Remove from Company'); await p.waitForTimeout(2500);
  const hm = await L.modal(p); console.log('  handover modal:', hm.replace(/\n/g, ' ').slice(0, 300));
  L.ok(/Who takes Rick.s crew runs that are waiting for a foreman, and the pipelayers who were on his crew/.test(hm) && /Ann/.test(hm) && !/Pat/.test(hm), 'after removing a foreman: who takes his runs and crew, other foremen listed (not pipelayers)');
  await p.screenshot({ path: L.OUT + '/o3_35_handover.png' });
  L.ok((await L.overflow(p)).length === 0, '390 px: handover sheet fits ' + JSON.stringify(await L.overflow(p)));
  await L.clickModal(p, 'Hand Over'); await p.waitForTimeout(2000);
  const ha = await p.evaluate(() => window.__hand); console.log('  handover rpc:', JSON.stringify(ha));
  L.ok(ha && ha.p_from === RICK && ha.p_to === ANN && ha.p_expect_uid === '00000000-0000-4000-8000-000000000001', 'pb_crew_handover from Rick to Ann (the only other foreman, picked already)');
  const st = await p.evaluate(() => (document.getElementById('crStatus') || {}).textContent || ''); console.log('  status:', st);
  L.ok(/2 waiting runs and 1 pipelayer from Rick went to Ann\. Ann was told\./.test(st), 'the line says what moved and that Ann was told');
  L.ok(p.errs.length === 0, 'owner: no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  // removing a pipelayer asks nothing more
  const n0 = await p.evaluate(() => (window.__cmCalls || []).length);
  const ocPat = await p.evaluate(() => { const btn = [...document.querySelectorAll('#crList button')].find(x => /pbCmAct\('remove'/.test(x.getAttribute('onclick') || '') && (x.closest('[class*=row]') || x.parentElement).innerText.includes('Pat')); return btn ? btn.getAttribute('onclick') : null; });
  if (ocPat) { await p.evaluate((oc) => eval(oc), ocPat); await p.waitForTimeout(400); await L.clickModal(p, 'Remove from Company'); await p.waitForTimeout(2000); }
  L.ok(ocPat && !/Who takes/.test(await L.modal(p)), 'removing a pipelayer: no handover question');
  await b.close();
  // ---- B: a foreman leaves the company from Settings
  ({ b, p } = await L.boot(L.URL, { init: member, wait: 5000 }));
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => pbGoto('settings')); await p.waitForTimeout(1500);
  const lt = await p.evaluate(() => { const w = document.getElementById('settingsLeaveCo'); return w && !w.hidden ? w.innerText : ''; });
  console.log('  settings block:', lt.replace(/\n/g, ' | '));
  L.ok(/You are in Acme Pipeline as Foreman/.test(lt) && /Leave Company/.test(lt), 'Settings: "You are in Acme Pipeline as Foreman." and Leave Company');
  await p.screenshot({ path: L.OUT + '/o3_35_settings.png', fullPage: true });
  await p.click('#settingsLeaveCoBtn'); await p.waitForTimeout(400);
  const cm = await L.modal(p); console.log('  confirm:', cm.replace(/\n/g, ' ').slice(0, 400));
  L.ok(/What this does/.test(cm) && /What it doesn.t do/.test(cm) && /The owner is told/.test(cm) && !/—/.test(cm), 'the confirm says what leaving does and doesn\'t do (no em-dash)');
  await L.clickModal(p, 'Stay'); await p.waitForTimeout(300);
  L.ok(!(await p.evaluate(() => window.__leave)), 'Stay: nothing sent');
  await p.click('#settingsLeaveCoBtn'); await p.waitForTimeout(400); await L.clickModal(p, 'Leave Company'); await p.waitForTimeout(3500);
  const lv = await p.evaluate(() => window.__leave); console.log('  leave rpc:', JSON.stringify(lv));
  L.ok(lv && lv.p_expect_uid === '00000000-0000-4000-8000-000000000001' && lv.p_expect_company === '11111111-1111-4111-8111-111111111111', 'pb_crew_leave with this account and the company it is leaving');
  const al = await L.modal(p); console.log('  alert:', al.replace(/\n/g, ' '));
  L.ok(/You left Acme Pipeline/.test(al), 'the alert says you left');
  await L.clickModal(p, 'OK'); await p.waitForTimeout(500);
  L.ok(await p.evaluate(() => { const w = document.getElementById('settingsLeaveCo'); return !w || w.hidden; }), 'after leaving, the block is gone (company checked again)');
  // offline: needs signal
  L.ok(p.errs.length === 0, 'member: no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close();
  // ---- C: the company account has no Leave Company
  ({ b, p } = await L.boot(L.URL, { init: L.co + L.mgr, wait: 4000 }));
  await p.evaluate(() => pbGoto('settings')); await p.waitForTimeout(1200);
  L.ok(await p.evaluate(() => { const w = document.getElementById('settingsLeaveCo'); return !!w && w.hidden; }), 'the company account: no Leave Company');
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
