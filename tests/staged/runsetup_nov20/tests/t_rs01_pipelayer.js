// runsetup 01: a foreman's New Run does not put the foreman's own name in "Pipelayer name".
// Run: PB_URL=http://127.0.0.1:PORT/cur.html [PB_BASE=.../base.html] node t_rs01_pipelayer.js
const T = require('path').resolve(__dirname, '../../..'); const boot = require(T + '/rig/boot'); const F = require(T + '/rig/flow');
const CUR = process.env.PB_URL || 'http://127.0.0.1:9650/cur.html', BASE = process.env.PB_BASE || '';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const fm = (crew) => require(T + '/rig/co_fm').replace('my_crew:[]', 'my_crew:' + JSON.stringify(crew));
const st = (p) => p.evaluate(() => { const pl = document.getElementById('saPipelayer'), c = document.getElementById('saPlChips'), f = document.getElementById('saFmPick'); return { pl: pl.value, chips: c && !c.hidden ? [...c.querySelectorAll('button')].map(b => b.textContent) : [], fm: f && f.selectedOptions[0] ? f.selectedOptions[0].text : '' }; });
const open = async (url, init, pre) => { const { b, p } = await boot(url, { init: (pre || '') + init }); await p.setViewportSize({ width: 390, height: 844 }); await p.getByText('New Run', { exact: true }).first().click(); await p.waitForTimeout(4200); return { b, p }; };
(async () => {
  let b, p, s;
  if (BASE) { ({ b, p } = await open(BASE, fm([]))); s = await st(p); console.log('before (base): pipelayer box = "' + s.pl + '", foreman = "' + s.fm + '"'); ok(s.pl === 'Tommy Fontaine', 'BEFORE: base build fills the foreman\'s own name (the bug)'); await b.close(); }
  // A) foreman, no crew linked
  ({ b, p } = await open(CUR, fm([]))); s = await st(p);
  ok(s.pl === '' && s.fm === 'Tommy Fontaine', 'A foreman, no crew: Pipelayer box is blank (foreman list still says ' + s.fm + ')');
  ok(s.chips.length === 1 && /^Me \(Tommy Fontaine\)$/.test(s.chips[0]), 'A one-tap name offered: ' + JSON.stringify(s.chips));
  const H = F(p);
  await H.f('saPipelayer', 'Jose Ramirez'); await p.waitForTimeout(3500); s = await st(p);
  ok(s.pl === 'Jose Ramirez' && s.chips.length === 0, 'A a typed name stays through the 3 s refresh, names row hidden');
  // the record gets the typed name
  ok(await p.evaluate(() => window.pbRfFormVal('pipelayer', true)) === 'Jose Ramirez', 'A the run would save pipelayer "Jose Ramirez"');
  await H.f('saPipelayer', ''); await p.waitForTimeout(600); s = await st(p);
  ok(s.pl === '' && s.chips.length >= 1, 'A emptied again: stays blank, names row back');
  ok(await p.evaluate(() => window.pbRfFormVal('pipelayer', true)) === '', 'A blank box saves a blank pipelayer (not the foreman)');
  // next New Run in the same session: the name typed for the last run is offered, not filled
  await H.f('saPipelayer', 'Jose Ramirez'); await p.evaluate(() => window.pbOpenNewRun()); await p.waitForTimeout(4200); s = await st(p);
  ok(s.pl === '' && s.chips[0] === 'Jose Ramirez', 'A next New Run: blank, with the last name one tap away: ' + JSON.stringify(s.chips));
  await p.evaluate(() => document.querySelector('#saPlChips button').click()); await p.waitForTimeout(3500); s = await st(p);
  ok(s.pl === 'Jose Ramirez' && s.chips.length === 0, 'A one tap fills it and it stays');
  ok(p.errs.length === 0, 'A no page errors ' + JSON.stringify(p.errs.slice(0, 3))); await b.close();
  // B) foreman with exactly one pipelayer on his crew
  ({ b, p } = await open(CUR, fm([{ id: 'aaaaaaaa-0000-4000-8000-000000000011', name: 'Luis Ortega' }]))); s = await st(p);
  ok(s.pl === 'Luis Ortega', 'B crew of one: Pipelayer starts as the crew\'s pipelayer ("' + s.pl + '")');
  await b.close();
  // C) foreman with three: blank, three names + Me
  ({ b, p } = await open(CUR, fm([{ id: 'a1', name: 'Luis Ortega' }, { id: 'a2', name: 'Dan Cole' }, { id: 'a3', name: 'Sam Pike' }]))); s = await st(p);
  ok(s.pl === '' && s.chips.length === 4 && s.chips[3] === 'Me (Tommy Fontaine)', 'C crew of three: blank, names offered ' + JSON.stringify(s.chips));
  ok(await p.evaluate(() => [...document.querySelectorAll('#saPlChips button')].every(b => b.getBoundingClientRect().height >= 44)), 'C name buttons are 44 px tall');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'C no sideways scroll at 390 px');
  await b.close();
  // E) a pipelayer's phone is unchanged: his own name
  ({ b, p } = await open(CUR, require(T + '/rig/co_pl'))); s = await st(p);
  ok(s.pl !== '' && s.chips.length === 0, 'E pipelayer\'s phone: still starts with his own name ("' + s.pl + '"), no names row');
  await b.close();
  console.log(fails ? 'RS01 FAILED: ' + fails : 'RS01 ALL PASS'); process.exit(fails ? 1 : 0);
})();
