// office3 #30 (responder link "(not on the server yet)") and #31 (check-in / check-out reach the office board at once).
// Foreman with a company (rig co.js). Page: the hook page (PB_URL .../hk/cur.html, window.__ev). A permit is locked, a person added, air logged, checked in.
const L = require('./lib');
const extra = `;window.__rpcOverride.pb_prod_permit_status_put=(a)=>{(window.__ps=window.__ps||[]).push({t:Date.now(),s:a.p_status});return {ok:true};};`;
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + extra, wait: 4000 });
  const ev = (s) => p.evaluate(s);
  const modalLast = async () => { for (let i = 0; i < 4; i++) { if (await ev("(()=>{const m=document.getElementById('pbModalMessage');return !!(m&&m.offsetParent)})()")) { await ev("[...document.querySelectorAll('#pbModalButtons button')].pop().click()"); await p.waitForTimeout(700); } } };
  await ev("pbGoto('confinedPermit')"); await p.waitForTimeout(500);
  const now = new Date(), hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const vals = { cpJobsite: 'Test Job', cpJobNumber: '26014', cpAddress: '1 Main St, Beaumont CA', cpSpace: 'MH1', cpPurpose: 'Inspect', cpDate: now.toISOString().slice(0, 10).replace(/^(.*)$/, () => { const d = now; return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }), cpStart: hm(new Date(now - 600000)), cpEnd: hm(new Date(+now + 3 * 3600000)), cpSupervisor: 'Tom', cpSupervisorInitials: 'TF', cpAttendant: 'Brandon Jones', cpComms: 'Radio', cpHazards: 'None', cpControls: 'Vent', cpVentFail: 'Monitor', cpRescue: '911' };
  for (const [k, v] of Object.entries(vals)) await p.fill('#' + k, v);
  await ev('pbLockConfinedPermit()'); await p.waitForTimeout(1500);
  if (/Entry Supervisor Decides/.test(await L.modal(p))) { await L.clickModal(p, 'I Understand'); await p.waitForTimeout(1500); }
  await ev('pbOpenRosterAddForm()'); await p.fill('#cpRosterName', 'Mike'); await p.selectOption('#cpRosterRole', 'Entrant'); await ev('pbAddRosterPerson()'); await p.waitForTimeout(1200);
  await ev('pbQuickAddAtmoTest()'); await p.fill('#cpAtmoO2', '20.9'); await p.fill('#cpAtmoLEL', '0'); await p.fill('#cpAtmoTester', 'Tom'); await ev('pbSaveAtmoReading()'); await p.waitForTimeout(1500); await modalLast();
  // ---- #31: a check-in reaches the board's sender within a couple of seconds (the minute tick is not waited for)
  await p.waitForTimeout(2500); const before = (await ev('window.__ps||[]')).length;
  const tIn = Date.now();
  const idx = await ev("window.__ev(\"confinedRoster.findIndex(x=>x.name==='Mike')\")");
  await ev('pbToggleRosterStatus(' + idx + ')'); await p.waitForTimeout(400); await modalLast();
  let got = null; for (let i = 0; i < 20 && !got; i++) { await p.waitForTimeout(250); const ps = await ev('window.__ps||[]'); got = ps.slice(before).find(x => x.s && x.s.inside === 1) || null; }
  L.ok(!!got, '#31 check-in: the live board status (inside 1) was sent' + (got ? ' after ' + (got.t - tIn) + ' ms' : ''));
  L.ok(got && got.t - tIn < 5000, '#31 check-in sent within 5 s (was up to 60 s)');
  const n2 = (await ev('window.__ps||[]')).length, tOut = Date.now();
  await ev('pbToggleRosterStatus(' + idx + ')'); await p.waitForTimeout(400); await modalLast();
  let got2 = null; for (let i = 0; i < 20 && !got2; i++) { await p.waitForTimeout(250); const ps = await ev('window.__ps||[]'); got2 = ps.slice(n2).find(x => x.s && x.s.inside === 0) || null; }
  L.ok(got2 && got2.t - tOut < 5000, '#31 check-out sent within 5 s (inside 0)');
  // a repaint that changes nothing sends nothing new
  const n3 = (await ev('window.__ps||[]')).length; await ev("window.__ev('renderRosterList()')").catch(() => null); await p.waitForTimeout(1500);
  L.ok((await ev('window.__ps||[]')).length === n3, '#31 a repaint with no change sends nothing');
  // ---- #30: emergency panel, link not on the server yet
  await ev("window.__rpcOverride.pb_permit_open_put=null");
  await ev("window.open=()=>null"); await p.route(/^tel:|^sms:/, r => r.abort()).catch(() => {});
  await ev('pbTriggerEmergency()').catch(() => null); await p.waitForTimeout(1500); await modalLast(); await p.waitForTimeout(800);
  const st = await ev("(()=>{const l=document.getElementById('cpEmLink'),w=document.getElementById('cpEmLinkWait');return {link:!!l&&l.style.display!=='none',addr:(document.getElementById('cpEmLinkAddr')||{}).textContent||'',wait:!!w&&!w.hidden,txt:l?l.innerText:''};})()");
  console.log('  panel link:', JSON.stringify(st));
  L.ok(st.link && /e\.pipelayersbible\.com/.test(st.addr), '#30 the responder link is on the emergency panel');
  L.ok(st.wait && /\(not on the server yet\)/.test(st.txt), '#30 "(not on the server yet)" shows while the server has not filed it');
  await p.screenshot({ path: L.OUT + '/o3_30_wait.png' });
  // the open-permit upload succeeds: the words go
  await ev("window.__rpcOverride.pb_permit_open_put=()=>({ok:true})"); await ev("window.__rpcOverride.pb_em_taken=()=>({taken:false})");
  await ev('window.__pbOpenBackupTick()'); await p.waitForTimeout(2500);
  const st2 = await ev("(()=>{const w=document.getElementById('cpEmLinkWait'),l=document.getElementById('cpEmLink');return {wait:!!w&&!w.hidden,link:!!l&&l.style.display!=='none'};})()");
  L.ok(st2.link && !st2.wait, '#30 once the upload carrying the code succeeds, the words go (link stays)');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.message); process.exit(1); });
