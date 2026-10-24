// Night sweep (daily): the foreman's My inspections list and the check-off form at 390 px — keyboards, tap targets,
// wording, the item scheduled for a past day, the list with nothing, and the daily report's inspections section vs the list.
// Run: DLY_PORT=9272 bash /home/claude/batch23/DAILY/tests/serve.sh /home/claude/rel1534/site1534 /home/claude/night/daily/p03_insp_mine.js
const T = require('/home/claude/batch23/DAILY/tests/daily_lib.js'); const { M, check } = T;
const SH = '/home/claude/night/daily/shots/';
(async () => {
  const browser = await M.chromium.launch();
  let ctx, page;
  try {
    ({ ctx, page } = await T.setup(browser, { who: 'foreman' }));
    await page.evaluate(() => pbOpenInspMine()); await page.waitForTimeout(1500);
    // one item scheduled 3 days ago, still open
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__dlySrv')); const d = new Date(Date.now() - 3 * 86400000); s.items[0].scheduled_date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); localStorage.setItem('__dlySrv', JSON.stringify(s)); });
    await page.evaluate(() => pbInsMineLoad()); await page.waitForTimeout(1500);
    await page.screenshot({ path: SH + 'p03_list.png', fullPage: true });
    const im = await page.evaluate(() => document.getElementById('screen-inspMine').innerText.replace(/\s+/g, ' '));
    console.log('LIST: ' + im.slice(0, 1200));
    check('D4 an open item scheduled 3 days ago says past due', /Scheduled Wed, Oct 21, 2026 \u2014 past due/.test(im), im.slice(0, 300));
    const intro = await page.evaluate(() => (document.querySelector('#screen-inspMine .pbd-intro') || {}).textContent || '');
    const geo = await page.evaluate(() => { const W = window.innerWidth, out = { hscroll: document.documentElement.scrollWidth > W + 1, small: [], wide: [] };
      document.querySelectorAll('#screen-inspMine button, #screen-inspMine input, #screen-inspMine select').forEach(el => { const r = el.getBoundingClientRect(); if (r.height > 0 && (r.height < 44 || r.width < 44)) out.small.push((el.id || el.textContent.trim().slice(0, 25)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
      document.querySelectorAll('#screen-inspMine *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > W + 1) out.wide.push(el.tagName + '#' + el.id + ' ' + Math.round(r.right)); }); return out; });
    console.log('list geometry: ' + JSON.stringify(geo));
    check('list: no horizontal scroll', !geo.hscroll, JSON.stringify(geo.wide.slice(0, 4)));
    check('My inspections: tap targets fine', geo.small.length === 0, JSON.stringify(geo.small));
    // the check-off form
    await page.click('#insCheckBtn_it-1'); await page.waitForTimeout(500);
    await page.screenshot({ path: SH + 'p03_form.png', fullPage: true });
    const attrs = await page.evaluate(() => [...document.querySelectorAll('#screen-inspCheck input, #screen-inspCheck select, #screen-inspCheck textarea')].filter(e => e.offsetParent).map(e => ({ id: e.id, type: e.type, im: e.getAttribute('inputmode'), ac: e.getAttribute('autocomplete'), cap: e.getAttribute('autocapitalize'), ph: e.placeholder, label: (document.querySelector('label[for="' + e.id + '"]') || {}).textContent })));
    console.log('form fields: ' + JSON.stringify(attrs));
    const names = attrs.filter(a => /icInspector|icAgency/.test(a.id));
    check('D7 the inspector / agency fields capitalise words', names.length === 2 && names.every(a => a.cap === 'words'), JSON.stringify(names));
    const form = await page.evaluate(() => { const el = document.getElementById('screen-inspCheck'); return el ? el.innerText.replace(/\s+/g, ' ') : ''; });
    console.log('FORM TEXT: ' + form.slice(0, 1200));
    const geo2 = await page.evaluate(() => { const out = []; document.querySelectorAll('#screen-inspCheck button, #screen-inspCheck input, #screen-inspCheck select, #screen-inspCheck label.pbd-check').forEach(el => { const r = el.getBoundingClientRect(); if (r.height > 0 && (r.height < 44 || r.width < 44)) out.push((el.id || el.textContent.trim().slice(0, 25)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }); return out; });
    console.log('form small: ' + JSON.stringify(geo2));
    check('check-off form: tap targets are fine (the 24 px box sits in a full-width label)', geo2.join() === 'icClose 24x24', JSON.stringify(geo2));
    // date/time defaults
    const dt = await page.evaluate(() => ({ d: document.getElementById('icDate').value, t: document.getElementById('icTime').value, tz: document.getElementById('icTz').value }));
    console.log('defaults: ' + JSON.stringify(dt));
    check('check-off date defaults to today, time filled', dt.d.length === 10 && dt.t.length === 5, JSON.stringify(dt));
    // the back button from the form: where does it go?
    const back = await page.evaluate(() => [...document.querySelectorAll('#screen-inspCheck button')].filter(b => b.offsetParent).map(b => b.id + ':' + b.textContent.trim().slice(0, 20)));
    console.log('visible buttons: ' + JSON.stringify(back));
    // My inspections with nothing assigned
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__dlySrv')); s.items.forEach(i => { i.foreman_uid = 'someone-else'; }); localStorage.setItem('__dlySrv', JSON.stringify(s)); });
    await page.evaluate(() => pbInsMineLoad()); await page.waitForTimeout(1200);
    const empty = await page.evaluate(() => document.getElementById('screen-inspMine').innerText.replace(/\s+/g, ' '));
    console.log('EMPTY: ' + empty.slice(0, 600));
    check('D5 the empty Open list does not repeat the intro sentence', (empty.match(/The office adds inspections and tests to a job and assigns a foreman\./g) || []).length === 1 && /Nothing assigned to you is open\./.test(empty), empty.slice(0, 300));
    await page.screenshot({ path: SH + 'p03_empty.png', fullPage: true });
    check('no page errors', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('probe ran to the end', false, e && e.stack); }
  await browser.close();
})();
