// hunt_nov19 01: "New version ready > Reload" asks before it throws away work that is only on the screen.
// On an iPhone (no beforeunload question): foreman quantities typed with Save Production not tapped; a run note typed
// with Save Note not tapped. Reload must ask; Not Now keeps what was typed; Reload Anyway reloads. With nothing typed
// it reloads at once. Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_h01_reload_unsaved.js
const L = require('./hlib');
(async () => {
  const { b, p, H } = await L.lockedRun({ init: L.IOS });
  const showLine = () => p.evaluate(() => { const l = document.getElementById('pbUpdateLine'); if (l) l.style.display = 'flex'; else window.__pbUpdateLineShow('r99.99 · 2099-01-01'); window.__mark = 1; });
  const reloaded = async () => !(await p.evaluate(() => window.__mark).catch(() => 0));
  // 1) foreman quantities typed, Save Production not tapped
  await p.click('#resForemanCard > summary'); await p.waitForTimeout(300);
  await p.fill('#fpExcavated', '120'); await p.keyboard.press('Tab');
  await showLine(); await p.click('#pbUpdateReload'); await p.waitForTimeout(2500);
  let gone = await reloaded(), m = gone ? null : await H.modal();
  L.ok(!gone && /NOT been saved/.test(m || ''), 'foreman quantities typed: Reload asks first' + (gone ? ' (the app reloaded and lost them)' : ''));
  if (!gone) { await H.modalClick('Not Now'); L.ok((await p.inputValue('#fpExcavated')) === '120', 'Not Now keeps what was typed'); await p.fill('#fpExcavated', ''); await p.keyboard.press('Tab'); }
  else { await p.waitForTimeout(2500); }
  // 2) a run note typed, Save Note not tapped
  if (await reloaded()) { await p.close(); const r2 = await L.lockedRun({ init: L.IOS }); return main2(r2.b, r2.p, r2.H); }
  return main2(b, p, H);
  async function main2(b, p, H) {
  const showLine = () => p.evaluate(() => { const l = document.getElementById('pbUpdateLine'); if (l) l.style.display = 'flex'; else window.__pbUpdateLineShow('r99.99 · 2099-01-01'); window.__mark = 1; });
  const reloaded = async () => !(await p.evaluate(() => window.__mark).catch(() => 0));
  await p.evaluate(() => { const e = [...document.querySelectorAll('#screen-results td[aria-label]')].find(e => e.getAttribute('aria-label').startsWith('Distance 10.0 ')); e.click(); }); await p.waitForTimeout(600);
  await H.modalClick('Add note'); await p.waitForTimeout(600);
  const ta = await p.evaluate(() => { const t = [...document.querySelectorAll('#screen-results textarea')].find(x => x.offsetParent); if (!t) return false; t.scrollIntoView({ block: 'center' }); t.focus(); return true; });
  L.ok(ta, 'the note box opens on the row');
  await p.keyboard.type('Hit an unmarked 2 in gas line at 0+10'); await p.waitForTimeout(300);
  await showLine(); await p.click('#pbUpdateReload'); await p.waitForTimeout(2500);
  let gone = await reloaded(), m = gone ? null : await H.modal();
  L.ok(!gone && /NOT been saved/.test(m || ''), 'a run note typed: Reload asks first' + (gone ? ' (the app reloaded and lost it)' : ''));
  if (!gone) { await H.modalClick('Not Now'); L.ok(/unmarked 2 in gas/.test(await p.evaluate(() => { const t = [...document.querySelectorAll('#screen-results textarea')].find(x => x.offsetParent); return t ? t.value : ''; })), 'Not Now keeps the note');
    await p.evaluate(() => { const t = [...document.querySelectorAll('#screen-results textarea')].find(x => x.offsetParent); t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); }); }
  else { await p.waitForTimeout(2500); }
  // 3) nothing unsaved (Home): Reload reloads at once
  await p.waitForTimeout(500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'Home'); if (b) b.click(); }); await p.waitForTimeout(800);
  m = await H.modal(); if (m) { const bs = await H.modalBtns(); console.log('leaving the run screen asked:', m.slice(0, 80)); await H.modalClick(bs[bs.length - 1]); }
  await showLine(); await p.click('#pbUpdateReload'); await p.waitForTimeout(3000);
  L.ok(await reloaded(), 'nothing unsaved: Reload reloads at once (' + ((await H.modal()) || 'no question') + ')');
  await L.done(b);
  }
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
