// Behaviour checks on the local copy: tools still compute, question links open, new pages fit a 390 px phone, trial form posts.
const { chromium } = require('playwright'); const assert = require('assert');
(async () => { const port = process.argv[2], B = 'http://127.0.0.1:' + port; const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let posted = null;
  await ctx.route(/gc\.zgo\.at|goatcounter/, r => r.abort());
  await ctx.route(/supabase\.co/, r => { posted = JSON.parse(r.request().postData() || '{}'); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  // trench tool: 8 ft, Type B, 3 ft bottom = 19 ft top; 20 ft = engineer
  await p.goto(B + '/tools/trench-sloping/'); await p.fill('#t-depth', '8'); await p.fill('#t-bottom', '3'); await p.selectOption('#t-soil', { index: 2 });
  assert.match(await p.textContent('#t-top'), /19\.00 ft/); assert.match(await p.textContent('#t-slope'), /1 : 1/);
  const rows = await p.$$eval('#t-table tbody tr', r => r.map(x => x.innerText.replace(/\s+/g, ' ')));
  assert.match(rows[1], /Type A.*3\/4 : 1 \(53°\).*6\.00 ft.*15\.00 ft/); assert.match(rows[3], /Type C.*1 1\/2 : 1 \(34°\).*12\.00 ft.*27\.00 ft/);
  await p.fill('#t-depth', '20'); assert.ok(await p.$('#t-pe')); assert.ok(!(await p.$('#t-slope')));
  await p.fill('#t-depth', '19.9'); assert.ok(await p.$('#t-slope'));
  // grade tool: 250 ft at 0.40% falling from 100.00 ends at 99.00
  await p.goto(B + '/tools/pipe-grade-calculator/'); await p.fill('#g-start', '100'); await p.fill('#g-len', '250'); await p.fill('#g-slope', '0.40'); await p.fill('#g-int', '25');
  assert.match(await p.textContent('#g-out'), /99\.00/);
  assert.match(await p.textContent('main'), /2\.08% \(1\/4" per foot\)/);
  // every page fits the phone
  for (const u of ['/', '/guides/', '/guides/trench-depth-rules/', '/tools/pipe-grade-calculator/', '/tools/trench-sloping/', '/confined-space-permit-app/', '/daily-reports-for-underground-crews/', '/grade-and-cut-sheet-app/']) {
    await p.goto(B + u); const m = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); assert.ok(m[0] <= m[1], u + ' scrolls sideways');
  }
  // home: quick links open the question; first screen names what it does
  await p.goto(B + '/'); const fold = await p.evaluate(() => [...document.querySelectorAll('.hero-sub,.hero-note,.hero-ctas')].every(e => e.getBoundingClientRect().bottom <= 844));
  assert.ok(fold, 'hero text and buttons above the fold');
  for (const id of ['q-cost', 'q-phone', 'q-signal']) { await p.click('.quick a[href="#' + id + '"]'); await p.waitForTimeout(150); assert.ok(await p.evaluate(i => document.getElementById(i).open, id), id); }
  assert.strictEqual(await p.$$eval('.faq details', d => d.length), 11);
  const ld = JSON.parse(await p.textContent('#site-ld')); const faq = ld['@graph'].find(g => g['@type'] === 'FAQPage');
  const qs = await p.$$eval('.faq summary', s => s.map(x => x.textContent.trim())); assert.deepStrictEqual(faq.mainEntity.map(q => q.name), qs);
  // trial form still sends
  await p.fill('#f-name', 'Test Person'); await p.fill('#f-company', 'Test Co'); await p.selectOption('#f-role', 'Foreman'); await p.fill('#f-email', 'test@example.com');
  await p.click('#f-submit'); await p.waitForSelector('#f-thanks:not([hidden])'); assert.strictEqual(posted.email, 'test@example.com');
  assert.deepStrictEqual(errs, []); await b.close(); console.log('ALL PASS'); })().catch(e => { console.error('FAIL', e.message); process.exit(1); });
