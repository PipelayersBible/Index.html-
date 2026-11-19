// office3 #31, office side: while a reported permit has someone inside, Company production's "Live now" board reloads
// every 20 s (it was every 60 s); with nobody inside it stays at 60 s. Company account (rig co.js + mgr.js).
const L = require('./lib');
const fx = `;window.__inside=1;window.__rpcOverride.pb_prod_company_live_permits=()=>{(window.__lp=window.__lp||[]).push(Date.now());return {ok:true,server_at:new Date().toISOString(),permits:[{permit_ref:'1795000000000',user_id:'u1',name:'Brandon',closed:false,updated_at:new Date().toISOString(),status:{space:'MH1',jobsite:'Test Job',jobNumber:'26014',inside:window.__inside,activeSince:Date.now()-3600000}}]};};
window.__rpcOverride.pb_prod_company_live=()=>({ok:true,server_at:new Date().toISOString(),today:'2026-11-19',people:[]});`;
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + L.mgr + fx, wait: 3500 });
  await p.evaluate(() => pbGoto('prodDashboard')); await p.waitForTimeout(3000);
  const t0 = await p.evaluate(() => (window.__lp || []).length);
  await p.waitForTimeout(46000);
  const n1 = await p.evaluate(() => (window.__lp || []).length) - t0;
  console.log('  reloads in 46 s with someone inside:', n1);
  L.ok(n1 >= 2, '#31 someone inside: the board reloaded at least twice in 46 s (every ~20 s)');
  await p.evaluate(() => { window.__inside = 0; }); await p.evaluate(() => window.pbBdRefresh && window.pbBdRefresh()); await p.waitForTimeout(2000);
  const t1 = await p.evaluate(() => (window.__lp || []).length); await p.waitForTimeout(42000);
  const n2 = await p.evaluate(() => (window.__lp || []).length) - t1;
  console.log('  reloads in 42 s with nobody inside:', n2);
  L.ok(n2 <= 1, '#31 nobody inside: back to the one-minute reload');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await L.done(b);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
