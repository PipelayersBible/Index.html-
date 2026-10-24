// Night sweep (daily): the foreman's Daily report form on r15.34 — draft survival across a reload, offline sign, what the
// office receives, 390 px layout. Mocks: batch 23 daily_lib (foreman acctA, job 24-101 with one run today).
// Run: DLY_PORT=9270 bash /home/claude/batch23/DAILY/tests/serve.sh /home/claude/rel1534/site1534 /home/claude/night/daily/p01_daily_form.js
const T = require('/home/claude/batch23/DAILY/tests/daily_lib.js'); const { M, check } = T;
const SH = '/home/claude/night/daily/shots/';
(async () => {
  const browser = await M.chromium.launch();
  let ctx, page;
  try {
    ({ ctx, page } = await T.setup(browser, { who: 'foreman' }));
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3000);
    await page.screenshot({ path: SH + 'p01_top.png' });
    check('daily report opened on today’s job', (await page.$eval('#drJob', e => e.value)) === '24-101');
    // --- 390 px geometry ---
    const geo = await page.evaluate(() => {
      const W = window.innerWidth, out = { hscroll: document.documentElement.scrollWidth > W + 1, wide: [], small: [] };
      document.querySelectorAll('#screen-dailyReport *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > W + 1) out.wide.push(el.tagName + '#' + el.id + '.' + el.className + ' right=' + Math.round(r.right)); });
      document.querySelectorAll('#screen-dailyReport button, #screen-dailyReport input, #screen-dailyReport a, #screen-dailyReport label.pbd-check').forEach(el => { const r = el.getBoundingClientRect(); if (r.height > 0 && (r.height < 44 || r.width < 44)) out.small.push((el.id || el.textContent.trim().slice(0, 30)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
      return out;
    });
    check('no horizontal scroll', !geo.hscroll, JSON.stringify(geo.wide.slice(0, 5)));
    console.log('small tap targets on the daily report: ' + JSON.stringify(geo.small));
    console.log('tap targets under 44 px on the daily report: ' + JSON.stringify(geo.small));
    // --- repetition / wording ---
    const txt = await page.evaluate(() => document.getElementById('screen-dailyReport').innerText);
    const srcN = (txt.match(/Source: /g) || []).length, notVer = (txt.match(/not in this version/gi) || []).length;
    console.log('Source: lines=' + srcN + ' "not in this version"=' + notVer + ' chars=' + txt.length);
    const intro = await page.$eval('.pbd-intro', e => e.textContent.length);
    console.log('intro paragraph chars=' + intro);
    // --- draft: typed, then the app is killed (full reload) ---
    await page.fill('#drNarrative', 'Draft before the app was killed'); await page.dispatchEvent('#drNarrative', 'input');
    await page.fill('#drName', 'Frank Ortiz'); await page.dispatchEvent('#drName', 'input'); await page.waitForTimeout(1500);
    await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page);
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3500);
    const narr = await page.$eval('#drNarrative', e => e.value), nm = await page.$eval('#drName', e => e.value);
    check('after a reload the narrative draft is restored', /Draft before/.test(narr), narr);
    check('after a reload the typed name is restored', nm === 'Frank Ortiz', nm);
    // --- the draft is per day: switch to yesterday and back ---
    const yday = await page.evaluate(() => { const d = new Date(Date.now() - 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
    await page.evaluate((d) => { document.getElementById('drDate').value = d; pbDlyPick(); }, yday); await page.waitForTimeout(2500);
    const narrY = await page.$eval('#drNarrative', e => e.value), nmY = await page.$eval('#drName', e => e.value);
    check('yesterday: narrative empty (its own draft)', narrY === '', narrY);
    console.log('yesterday: name field = ' + JSON.stringify(nmY) + ' (kept from today)');
    await page.screenshot({ path: SH + 'p01_yesterday.png', fullPage: true });
    const bodyY = await T.text(page, 'drBody');
    const emptyRuns = /No runs/.test(bodyY);
    console.log('yesterday body (no run): ' + (bodyY || '').replace(/\s+/g, ' ').slice(0, 700));
    // a drawn signature survives the switch of day?
    await page.evaluate(() => { const c = document.getElementById('drSig'), g = c.getContext('2d'); g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 20); g.lineTo(200, 100); g.stroke(); if (window.pbDlySigDirty !== undefined) window.pbDlySigDirty = true; });
    const sigBefore = await page.evaluate(() => typeof pbDlySigPng === 'function' ? !!pbDlySigPng() : null);
    await page.evaluate(() => { document.getElementById('drDate').value = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })(); pbDlyPick(); }); await page.waitForTimeout(2500);
    const sigAfter = await page.evaluate(() => { const c = document.getElementById('drSig'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    console.log('signature pixels after switching day: ' + sigAfter + ' (drawn before=' + sigBefore + ')');
    check('D1 the pad is clean when another day is picked', sigAfter === 0, String(sigAfter));
    const narrBack = await page.$eval('#drNarrative', e => e.value);
    check('back on today: the narrative draft is restored', /Draft before/.test(narrBack), narrBack);
    // --- sign offline ---
    await page.evaluate(() => pbDlySigClear());
    await page.evaluate(() => { window.__offline = true; });
    await page.fill('#drNarrative', 'Laid 60 ft, gas conflict at 0+40.'); await page.dispatchEvent('#drNarrative', 'input'); await page.fill('#drName', 'Frank Ortiz');
    await page.click('#drSignBtn'); await page.waitForTimeout(2500);
    let st = await T.text(page, 'drSignStatus'); console.log('sign status (1): ' + st);
    if (!(await T.modal(page))) { if (await page.$('#drWxConfirm')) await page.check('#drWxConfirm'); await page.click('#drSignBtn'); await page.waitForTimeout(2500); }
    let m = await T.modal(page); console.log('modal: ' + JSON.stringify(m));
    await T.click(page, 'Sign Report'); await page.waitForTimeout(2000); m = await T.modal(page); console.log('after sign modal: ' + JSON.stringify(m)); if (m) await T.click(page, 'OK'); await page.waitForTimeout(500);
    const signed1 = await T.text(page, 'drSigned'); console.log('drSigned offline: ' + (signed1 || '').replace(/\s+/g, ' ').slice(0, 400));
    await page.screenshot({ path: SH + 'p01_signed_offline.png', fullPage: true });
    // killed and reopened while still offline
    await page.reload(); await page.waitForTimeout(2500); await M.dismiss(page); await page.evaluate(() => { window.__offline = true; });
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3500);
    const reps = await page.evaluate(() => window.__debugDaily().st.reports.map(r => r.state + ':' + r.workDate));
    const signed2 = await T.text(page, 'drSigned');
    check('after a reload the offline-signed report is still waiting and shown', reps.length === 1 && /waiting/.test(reps[0]) && /Waiting|waiting|signal/.test(signed2 || ''), JSON.stringify(reps) + ' ' + (signed2 || '').slice(0, 200));
    check('the editor is gone (one report per day)', !(await T.shown(page, 'drSignWrap')));
    // back online: sent, and what the office got
    await page.evaluate(() => { window.__offline = false; window.dispatchEvent(new Event('online')); }); await page.waitForTimeout(5000);
    const reps2 = await page.evaluate(() => window.__debugDaily().st.reports.map(r => r.state));
    check('online: sent', reps2.join() === 'sent', reps2.join());
    const srvRep = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('__dlySrv')); return s.reports.map(r => ({ job: r.job_number, date: r.work_date, name: r.signed_name, narr: r.snapshot && r.snapshot.narrative, sig: !!r.signature_png_b64, runs: r.snapshot && r.snapshot.runs && r.snapshot.runs.items.length, crew: r.snapshot && r.snapshot.crew && r.snapshot.crew.people.length })); });
    console.log('office received: ' + JSON.stringify(srvRep));
    check('office copy carries the narrative, the name, the run and the crew', srvRep[0] && srvRep[0].narr === 'Laid 60 ft, gas conflict at 0+40.' && srvRep[0].name === 'Frank Ortiz' && srvRep[0].runs === 1 && srvRep[0].crew >= 2, JSON.stringify(srvRep));
    const signed3 = await T.text(page, 'drSigned'); console.log('drSigned sent: ' + (signed3 || '').replace(/\s+/g, ' ').slice(0, 500));
    await page.screenshot({ path: SH + 'p01_sent.png', fullPage: true });
    // Reports list: does the foreman see his signed report anywhere but this screen?
    await page.evaluate(() => pbOpenArchive()); await page.waitForTimeout(1200);
    const arch = await page.evaluate(() => document.getElementById('archiveDailyBtn') ? document.getElementById('archiveDailyBtn').innerText.replace(/\s+/g, ' ') : null);
    console.log('Reports > Daily report row: ' + arch);
    check('no page errors', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('probe ran to the end', false, e && e.stack); }
  await browser.close();
})();
