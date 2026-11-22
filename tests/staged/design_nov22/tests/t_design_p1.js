// design_nov22 PHASE 1 checks (behaviour only). PASS/FAIL per item; exit 1 on any FAIL.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_design_p1.js   (page served with sw.js, data/ and pbx/ next to it)
const R = __dirname + '/../../../rig/';
const boot = require(R + 'boot'), co = require(R + 'co_fm'), F = require(R + 'flow'), mk = require(R + 'mkrun');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10700/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, p } = await boot(URL0, { init: co }); const H = F(p);
  const reqs = []; p.on('request', r => reqs.push(r.url()));
  const tab = () => p.evaluate(() => { const t = document.querySelector('#pbTabBar [aria-current]'); return t ? t.dataset.tab : null; });
  const scr = () => p.evaluate(() => document.querySelector('.pb-screen.active').id.replace('screen-', ''));
  const home = async () => { await p.evaluate(() => { try { pbHideModal(); } catch (e) {} }); await p.evaluate(() => pbGotoTab('home')); await p.waitForTimeout(400); };
  const modalOff = async () => { for (let i = 0; i < 3; i++) { const m = await H.modal(); if (!m) return; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Cancel') ? 'Cancel' : bt[bt.length - 1]).catch(() => {}); } };

  // ---- A-4: the tab you came from ----
  for (const [k, want] of [['daily', 'home'], ['norun', 'home'], ['ticket', 'home'], ['mgmt', 'home']]) {
    await home(); await p.evaluate(k => pbRecFromHome(k), k); await p.waitForTimeout(1300); await modalOff();
    ok((await tab()) === want, 'A-4 Home > ' + k + ' (' + (await scr()) + ') lights ' + want + ' (got ' + (await tab()) + ')');
  }
  await home(); await p.evaluate(() => pbGotoTab('tools')); await p.waitForTimeout(500); await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(500);
  ok((await scr()) === 'settings' && (await tab()) === 'tools', 'A-4 More > Account & Settings lights More (got ' + (await tab()) + ')');
  await home(); await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(500);
  ok((await tab()) === 'home', 'A-4 Home > Account & Settings lights Home');
  await p.evaluate(() => pbGotoTab('reports')); await p.waitForTimeout(800);
  ok((await scr()) === 'archive' && (await tab()) === 'reports', 'A-4 a tab tap lights its own tab (Records)');
  await home(); await p.evaluate(() => pbRecFromHome('daily')); await p.waitForTimeout(1200); await modalOff();
  await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(500); await p.evaluate(() => pbGoBack()); await p.waitForTimeout(600);
  ok((await scr()) === 'dailyReport' && (await tab()) === 'home', 'A-4 Back to Daily report keeps the tab it had (Home)');

  // ---- A-3: Back arrow on the screens that had none ----
  for (const s of ['formulasHub', 'reportIssue', 'reportReceipt', 'confinedHub', 'confinedActive', 'quickrun', 'results']) {
    await home(); await p.evaluate(s => pbGoto(s), s); await p.waitForTimeout(500); await modalOff();
    const vis = await p.evaluate(() => { const sc = document.querySelector('.pb-screen.active'); return [...sc.querySelectorAll('.pb-header .pb-back')].filter(x => x.offsetParent && /Back/.test(x.title)).length; });
    ok(vis === 1, 'A-3 ' + s + ' shows one Back arrow (' + vis + ')');
  }
  await home(); await p.evaluate(() => pbGotoTab('tools')); await p.waitForTimeout(400); await p.evaluate(() => pbGoto('formulasHub')); await p.waitForTimeout(500);
  await p.evaluate(() => { const x = document.querySelector('#screen-formulasHub .pb-back-hdr'); if (x) x.click(); }); await p.waitForTimeout(500);
  ok((await scr()) === 'tools', 'A-3 Education & Reference Back returns to More (' + (await scr()) + ')');
  await home(); await p.evaluate(() => pbGoto('quickrun')); await p.waitForTimeout(500);
  await p.evaluate(() => { const x = document.querySelector('#screen-quickrun .pb-back-hdr'); if (x) x.click(); }); await p.waitForTimeout(500);
  ok((await scr()) === 'home', 'A-3 Quick Run Back returns Home');

  // ---- C-1 / C-3 / B-3: a run on job 24-017, locked and ended ----
  await home();
  ok(/None chosen/.test(await p.evaluate(() => document.getElementById('homeCurrentJob').innerText)), 'setup: Current job starts as None chosen');
  await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1000); await H.f('saJobNumber', '24-017');
  await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
  await mk(p, 100);
  await H.click('Lock This Run'); await p.waitForTimeout(800);
  for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
  ok((await scr()) === 'results', 'setup: run locked, on Run Results');
  const lbl = await p.evaluate(() => window.pbRfEndLabel ? window.pbRfEndLabel() : 'End Run');
  await H.click(lbl); await p.waitForTimeout(500);
  for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt[0] === 'Go Back' ? 'End Run' : bt[bt.length - 1]); await p.waitForTimeout(800); }
  await p.waitForTimeout(300);
  const toast = await p.evaluate(() => { const t = document.getElementById('pbDoneToast'); return t && !t.hidden ? t.innerText : ''; });
  ok(/^Run ended\. (Sending the report to .+…|Report saved on this phone.+)$/.test(toast), 'C-3 End Run says where the report goes: "' + toast + '"');
  await p.waitForTimeout(3000);
  const cj = await p.evaluate(() => document.getElementById('homeCurrentJob').innerText.replace(/\s+/g, ' '));
  ok(/Current job Job 24-017/.test(cj), 'C-1 Current job stays on Job 24-017 after End Run ("' + cj + '")');
  const homeTxt = await p.evaluate(() => document.getElementById('screen-home').innerText);
  ok(/Sending the report to the office/.test(homeTxt), 'C-3 Home card names who it goes to');
  ok(!/Not sent\s*\n?\s*1 run report/.test(homeTxt), 'B-3 Home does not also list the same report under Needs Attention');
  // C-3: the card stops saying "Sending…" once it has waited 2 min (clock moved on)
  const later = await p.evaluate(() => { const e = window.__ra().filter(x => x.kind === 'run').slice(-1)[0]; const real = Date.now; const t0 = real(); Date.now = () => t0 + 180000; try { return window.pbRfHomeTitle(e); } finally { Date.now = real; } });
  ok(/^Not sent yet: it goes to the office by itself$/.test(later), 'C-3 after 2 min still waiting the card says "' + later + '"');
  // C-1: forms start on the Current job
  const val = async (id) => p.evaluate(id => { const e = document.getElementById(id); return e ? e.value : null; }, id);
  await home(); await p.evaluate(() => pbRecFromHome('daily')); await p.waitForTimeout(1300); await modalOff();
  ok((await val('drJob')) === '24-017', 'C-1 Daily report opens on 24-017');
  await home(); await p.evaluate(() => pbRecFromHome('norun')); await p.waitForTimeout(1500); await modalOff();
  const nr = (await val('nrJob')) === '__other' ? await val('nrJobTyped') : await val('nrJob');
  ok(nr === '24-017', 'C-1 Log Work Without a Run opens on 24-017 (' + nr + ')');
  await home(); await p.evaluate(() => pbRecFromHome('ticket')); await p.waitForTimeout(1300); await modalOff();
  ok((await val('tkJobNumber')) === '24-017', 'C-1 Field ticket opens on 24-017');
  // ---- C-2: field ticket time ----
  const tt = await val('tkF_time'), td = await val('tkF_date');
  const now = await p.evaluate(() => { const d = new Date(); return [d.getHours(), d.getMinutes()]; });
  const [hh, mm] = (tt || '0:0').split(':').map(Number);
  ok(!!td && /^\d\d:\d\d$/.test(tt || '') && Math.abs((hh * 60 + mm) - (now[0] * 60 + now[1])) <= 2, 'C-2 Field ticket starts with the time now (' + td + ' ' + tt + ')');
  // the person's own time is never replaced without asking: auto time counts as empty, a typed one does not
  const autoT = await p.evaluate(() => window.__ev('pbTkForm && pbTkForm.auto ? pbTkForm.auto.time : null'));
  ok(!!autoT && autoT === tt, 'C-2 the auto-filled time is remembered as the app\u2019s own, so an AI ticket read may fill it (' + autoT + ')');
  await home(); await p.evaluate(() => pbGoto('plans')); await p.waitForTimeout(1200); await modalOff();
  const pj = await val('plansJobIn');
  ok(pj === '24-017' || pj === null, 'C-1 Plans job box starts on 24-017 (' + pj + ')');
  // an ended run seen again does not change the Current job
  await p.evaluate(() => pbCurJobOpen()); await p.waitForTimeout(300); await p.fill('#cjType', 'B-9'); await p.click('#cjTypeGo'); await p.waitForTimeout(400);
  await p.evaluate(() => { try { window.pbFxViewReport && 0; } catch (e) {} pbGoto('results'); }); await p.waitForTimeout(500); await home();
  const cj2 = await p.evaluate(() => document.getElementById('homeCurrentJob').innerText.replace(/\s+/g, ' '));
  ok(/Job B-9/.test(cj2), 'C-1 the ended run on Results does not take the Current job back (' + cj2 + ')');

  // ---- A-12 fonts ----
  const g = reqs.filter(u => /fonts\.(googleapis|gstatic)\.com/.test(u));
  ok(g.length === 0, 'A-12 no request to Google Fonts (' + g.length + ')');
  const fonts = await p.evaluate(async () => { await document.fonts.ready; const metas = [...document.querySelectorAll('meta[name="pb-part"][data-pb-src]')].map(m => m.getAttribute('data-pb-src'));
    const st = {}; for (const f of ['16px Inter', '600 16px Oswald', '500 16px "IBM Plex Mono"']) { try { await document.fonts.load(f); } catch (e) {} st[f] = document.fonts.check(f); }
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')); return { metas, st, loaded: [...new Set(loaded)] }; });
  ok(fonts.metas.length === 4 && fonts.metas.every(m => /^pbx\/[A-Za-z0-9._-]+\.woff2$/.test(m)), 'A-12 the page names its 4 font files for the service worker (' + fonts.metas.join(', ') + ')');
  ok(['Inter', 'Oswald', 'IBM Plex Mono'].every(f => fonts.loaded.includes(f)), 'A-12 Inter, Oswald and IBM Plex Mono load from pbx/ (' + fonts.loaded.join(', ') + ')');
  const fr = reqs.filter(u => /\/pbx\/.*\.woff2$/.test(u)).length; ok(fr >= 1, 'A-12 fonts fetched from the app\u2019s own pbx/ (' + fr + ' requests)');
  // the service worker's own reader finds them (sw.js pbLazyNames regex)
  const swRe = /data-pb-src="(pbx\/[A-Za-z0-9._-]{1,120})"/g; const html = await p.content(); let m, n = 0; while ((m = swRe.exec(html))) if (/\.woff2$/.test(m[1])) n++;
  ok(n === 4, 'A-12 sw.js\u2019s part reader would keep the 4 font files (' + n + ')');

  // ---- C-4 ----
  const cc = await p.evaluate(() => document.querySelectorAll('[id^="screen-calcCat"]').length);
  ok(cc === 0, 'C-4 the 4 unreachable calculator category screens are gone (' + cc + ' left)');
  await home(); await p.evaluate(() => pbGoto('confinedHub')); await p.waitForTimeout(500);
  const icons = await p.evaluate(() => [...document.querySelectorAll('#screen-confinedHub .cp-hub-list > .pb-home-tile')].filter(t => t.offsetParent).map(t => { const c = getComputedStyle(t, '::before'); return (c.webkitMaskImage || c.maskImage || 'none') !== 'none'; }));
  ok(icons.length >= 2 && icons.every(Boolean), 'C-4 Confined Space tiles have their icons (' + JSON.stringify(icons) + ')');
  ok(p.errs.length === 0, 'no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
  await b.close();
  console.log(fails ? 'DONE with ' + fails + ' FAIL' : 'DONE all pass'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + e.message); process.exit(1); });
