// #48 (owner's note): the company and supers search near misses, incidents and stop-work on their own: Home tile,
// filters (job, type, dates, who) sent to pb_jb_safety_search, results, Show More, open the Job Book and come back,
// the last search with no signal, refused for a foreman, the "not ready" server.
const boot = require(__dirname + '/../../../rig/boot'), co = require(__dirname + '/../../../rig/co'), mgr = require(__dirname + '/../../../rig/mgr');
const L = require('./lib3');
const ITEMS = [
  { id: 'b1', job_number: '24-017', job_key: '24-017', kind: 'Stop work', date: '2026-11-12', time: '13:00', people: 'Sam Operator', what: 'Gas smell, stopped work', done: 'Gas company called', status: 'closed', by: 'Tommy Fontaine', photo_count: 2 },
  { id: 'b2', job_number: '24-020', job_key: '24-020', kind: 'Near miss', date: '2026-11-10', time: '09:15', people: 'Joe Laborer', what: 'Bucket swung near a laborer', done: null, status: 'open', by: 'Ray Foreman', photo_count: 0 },
  { id: 'b3', job_number: '24-017', job_key: '24-017', kind: 'Incident', date: '2026-11-03', time: null, people: null, what: 'Trench wall sloughed', done: null, status: 'open', by: 'Tommy Fontaine', photo_count: 0 },
];
const INIT = `;window.__ssCalls=[];window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_jb_safety_search:(a)=>{window.__ssCalls.push(JSON.parse(JSON.stringify(a)));
  let L=${JSON.stringify(ITEMS)}.filter(x=>(!a.p_job_number||x.job_number===a.p_job_number)&&(!a.p_kinds||a.p_kinds.includes(x.kind))&&(!a.p_from||x.date>=a.p_from)&&(!a.p_to||x.date<=a.p_to)&&(!a.p_who||((x.by||'')+' '+(x.people||'')).toLowerCase().includes(a.p_who.toLowerCase())));
  const off=a.p_offset||0,lim=a.p_limit||50;return {ok:true,server_at:new Date().toISOString(),total:L.length,items:L.slice(off,off+lim),jobs:[{job_key:'24-017',job_number:'24-017',n:2},{job_key:'24-020',job_number:'24-020',n:1}]};},
  pb_prod_job_items:(a)=>({ok:true,company_id:'c1',job_key:a.p_job_number,can_manage:true,server_at:new Date().toISOString(),job_number:a.p_job_number,items:[]})});`;
(async () => {
  const { b, p } = await boot((process.env.PB_ROOT || 'http://127.0.0.1:8843/') + (process.env.PG || 'curT.html'), { init: co + mgr + INIT });
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(1500);
  // the Home tile (last 30 days)
  await p.evaluate(() => window.pbGotoTab && window.pbGotoTab('home')); await p.waitForTimeout(2500);
  await p.evaluate(() => window.pbCxRender && window.pbCxRender()); await p.waitForTimeout(1500);
  const tile = await p.evaluate(() => { const t = document.getElementById('homeCxSafety'); return t ? t.innerText.replace(/\s+/g, ' ') : null; }); console.log('tile:', tile);
  const c0 = await p.evaluate(() => window.__ssCalls[0]); console.log('tile call', JSON.stringify(c0));
  L.ok(!!tile && /Safety events/.test(tile) && c0 && /^\d{4}-\d{2}-\d{2}$/.test(c0.p_from), 'the office Home has a Safety events tile (asks for the last 30 days)');
  await p.evaluate(() => document.getElementById('homeCxSafety').click()); await p.waitForTimeout(2000);
  const scr = await p.evaluate(() => document.querySelector('.pb-screen.active') && document.querySelector('.pb-screen.active').id); L.ok(scr === 'screen-safetySearch', 'the tile opens the Safety events screen');
  let st = await L.txt(p, '#ssStatus'); let list = await L.txt(p, '#ssList'); console.log('first:', st, '|', list.replace(/\s+/g, ' ').slice(0, 200));
  L.ok(/3 events/.test(st) && /Gas smell/.test(list) && /Bucket swung/.test(list) && /Trench wall/.test(list), 'it searches at once and lists every job’s events, newest first');
  const jobs = await p.evaluate(() => [...document.querySelectorAll('#ssJob option')].map(o => o.textContent)); L.ok(jobs.join('|') === 'All jobs|Job 24-017 (2)|Job 24-020 (1)', 'the job filter lists the jobs that have safety events');
  // filters: job, two types, dates, who
  await p.selectOption('#ssJob', '24-017');
  await p.click('#ssKind_4'); await p.click('#ssKind_2'); // Stop work, Incident
  await p.fill('#ssFrom', '2026-11-01'); await p.fill('#ssTo', '2026-11-15'); await p.fill('#ssWho', 'sam');
  await p.click('#ssGo'); await p.waitForTimeout(1500);
  const c = await p.evaluate(() => window.__ssCalls.slice(-1)[0]); console.log('call', JSON.stringify(c));
  L.ok(c.p_job_number === '24-017' && JSON.stringify(c.p_kinds.slice().sort()) === '["Incident","Stop work"]' && c.p_from === '2026-11-01' && c.p_to === '2026-11-15' && c.p_who === 'sam' && c.p_offset === 0, 'Search sends job, types, dates and who to the server');
  list = await L.txt(p, '#ssList'); st = await L.txt(p, '#ssStatus'); console.log('filtered:', st, '|', list.replace(/\s+/g, ' '));
  L.ok(/1 event/.test(st) && /Gas smell/.test(list) && /People: Sam Operator/.test(list) && /Logged by Tommy Fontaine/.test(list) && /2 photos/.test(list), 'the result shows kind, when, job, what, done, people, who logged it, photos');
  const pressed = await p.evaluate(() => [...document.querySelectorAll('#ssKinds button[aria-pressed=true]')].map(x => x.textContent).join()); L.ok(/Stop work/.test(pressed) && /Incident/.test(pressed), 'the type chips show what is picked');
  await L.both(p, 't04_search');
  // open the Job Book on Safety and come back
  await p.click('#ssOpen_0'); await p.waitForTimeout(2000);
  const jb = await p.evaluate(() => ({ scr: document.querySelector('.pb-screen.active').id, tab: (document.querySelector('#jbTabs [aria-selected=true]') || {}).id }));
  L.ok(jb.scr === 'screen-jobBook' && jb.tab === 'jbTab_safety', 'Open Job Book opens that job’s Job Book on the Safety tab');
  await p.evaluate(() => window.pbJbBack()); await p.waitForTimeout(1500);
  const back = await p.evaluate(() => ({ scr: document.querySelector('.pb-screen.active').id, who: document.getElementById('ssWho').value }));
  L.ok(back.scr === 'screen-safetySearch' && back.who === 'sam', 'Back returns to the search with its filters');
  // Show More
  await p.evaluate(() => window.pbSsClear()); await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__rpcOverride.__ssLim = 1; const o = window.__rpcOverride.pb_jb_safety_search; window.__rpcOverride.pb_jb_safety_search = (a) => o(Object.assign({}, a, { p_limit: 2 })); }); // pages of 2
  await p.evaluate(() => window.pbSsSearch(0)); await p.waitForTimeout(1200);
  const more = await p.evaluate(() => (document.getElementById('ssMore') || {}).textContent || ''); L.ok(/Show More \(1\)/.test(more), 'Show More when there are more than one page');
  await p.click('#ssMore'); await p.waitForTimeout(1200);
  const n = await p.evaluate(() => document.querySelectorAll('#ssList .ss-item').length); L.ok(n === 3 && !(await p.$('#ssMore')), 'Show More adds the next page');
  // no signal: the last search, with its time
  await p.context().setOffline(true); await p.waitForTimeout(500);
  await p.evaluate(() => window.pbSsSearch(0)); await p.waitForTimeout(800);
  st = await L.txt(p, '#ssStatus'); console.log('offline:', st);
  L.ok(/No signal/.test(st) && /last search/.test(st) && (await p.evaluate(() => document.querySelectorAll('#ssList .ss-item').length)) === 3, 'offline: says no signal and keeps showing the last search');
  await p.context().setOffline(false); await p.waitForTimeout(500);
  // the server without the function
  await p.evaluate(() => { window.__rpcOverride.pb_jb_safety_search = () => { throw new Error('Could not find the function public.pb_jb_safety_search'); }; });
  await p.evaluate(() => window.pbSsSearch(0)); await p.waitForTimeout(1200);
  st = await L.txt(p, '#ssStatus'); console.log('missing:', st); L.ok(/isn.t ready for this search yet|Couldn.t reach/.test(st), 'a server without the search says so in plain words');
  await L.done(b, p);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
