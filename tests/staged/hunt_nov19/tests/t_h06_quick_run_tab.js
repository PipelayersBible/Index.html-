// hunt_nov19 05: Quick Run and the Confined Space Permits list are opened from Home (Start work); the bottom bar must
// light up Home for them, not "More" (neither is on the More tab). Reference pages under More still light up More.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_h06_quick_run_tab.js
const L = require('./hlib');
(async () => {
  const { b, p, H } = await L.open({});
  const tab = () => p.evaluate(() => { const t = document.querySelector('#pbTabBar .pb-tab[aria-current=page]'); return t ? t.querySelector('.lb').textContent.trim() : null; });
  await p.click('#homeTileQuickRun'); await p.waitForTimeout(800);
  L.ok((await H.screen()) === 'screen-quickrun' && (await tab()) === 'Home', 'Quick Run opened from Home: the Home tab is lit (' + (await tab()) + ')');
  await p.evaluate(() => pbGotoTab('tools')); await p.waitForTimeout(700);
  const more = await p.evaluate(() => [...document.querySelectorAll('#screen-tools .pb-tool-row')].filter(x => x.offsetParent).map(x => x.textContent.trim()).join(' | '));
  L.ok(!/Quick Run|Confined Space Permits/.test(more) && (await tab()) === 'More', 'the More tab itself has no Quick Run / permit list row and lights up More');
  await p.evaluate(() => pbGoto('confinedHub')); await p.waitForTimeout(700);
  L.ok((await H.screen()) === 'screen-confinedHub' && (await tab()) === 'Home', 'Confined Space Permits list: the Home tab is lit (' + (await tab()) + ')');
  await p.evaluate(() => pbGoto('refConfined')); await p.waitForTimeout(700);
  L.ok((await tab()) === 'More', 'Confined Space Reference (on More) still lights up More');
  await p.evaluate(() => pbGoto('stats')); await p.waitForTimeout(700);
  L.ok((await tab()) === 'More', 'Stats (on More) still lights up More');
  L.ok(p.errs.length === 0, 'no page errors ' + JSON.stringify(p.errs));
  await L.done(b);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
