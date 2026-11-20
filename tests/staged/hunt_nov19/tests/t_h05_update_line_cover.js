// hunt_nov19 04: the "New version ready - Reload" line must not cover the buttons of a question the app asks, and
// must not cover the active bar (the way back to a run or permit in progress). Checked at 390x844, 375x667, 360x640.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node t_h05_update_line_cover.js
const L = require('./hlib');
(async () => {
  let b;
  for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 360, height: 640 }]) {
    const r = await L.open({}); b = r.b; const p = r.p, H = r.H; await p.setViewportSize(vp); const tag = vp.width + 'x' + vp.height;
    // a real question: a run in progress, then New Run again ("Start a New Run?" / "Crew Still Checked In" ...)
    await L.lockRun(p, H);
    // one person checked in on the run (so New Run asks "Crew Still Checked In": three buttons)
    await p.evaluate(() => { document.getElementById('crewLogAddForm').style.display = ''; document.getElementById('crewLogName').value = 'Joe Laborer'; document.getElementById('crewLogType').value = 'Laborer'; if (window.pbFmCrewTypeChanged) window.pbFmCrewTypeChanged(); }); await p.evaluate(() => pbAddCrewLogEntry(true)); await p.waitForTimeout(900);
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'Home'); if (b) b.click(); }); await p.waitForTimeout(900);
    await p.evaluate(() => window.__pbUpdateLineShow('r99.99 · 2099-01-01')); await p.waitForTimeout(300);
    // Home with the run in progress: the active bar is not under the line, and Reload can be tapped
    const ab = await p.evaluate(() => { const a = document.getElementById('pbActiveBar'), l = document.getElementById('pbUpdateLine'); if (!a || a.hidden || !a.getBoundingClientRect().height) return null; const x = a.getBoundingClientRect(), y = l.getBoundingClientRect(); const cx = (x.left + x.right) / 2, cy = (x.top + x.bottom) / 2, top = document.elementFromPoint(cx, cy); return { over: !(y.bottom <= x.top || y.top >= x.bottom), hit: !!(top && a.contains(top)) }; });
    L.ok(!!ab && !ab.over && ab.hit, tag + ': the active bar (run in progress) is not covered by the line ' + JSON.stringify(ab));
    L.ok(await p.evaluate(() => { const l = document.getElementById('pbUpdateReload').getBoundingClientRect(); const t = document.elementFromPoint((l.left + l.right) / 2, (l.top + l.bottom) / 2); return !!t && t.id === 'pbUpdateReload'; }), tag + ': with no question open, Reload can be tapped');
    // a real question
    await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1200);
    const q = await H.modal(), bs = await H.modalBtns();
    L.ok(!!q && bs.length >= 2, tag + ': the app asks a question (' + String(q).slice(0, 24) + '... ' + bs.join(' / ') + ')');
    const cov = await p.evaluate(() => { const line = document.getElementById('pbUpdateLine');
      return [...document.querySelectorAll('#pbModalDialog button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); const pts = [[(r.left + r.right) / 2, (r.top + r.bottom) / 2], [r.left + 30, r.top + 8], [r.right - 30, r.bottom - 8]]; const blocked = pts.some(([x, y]) => { const t = document.elementFromPoint(x, y); return !!t && line.contains(t); }); return { t: b.textContent.trim(), blocked }; }); });
    L.ok(cov.length >= 2 && cov.every(c => !c.blocked), tag + ': no button of the question is under the line: ' + cov.map(c => c.t + (c.blocked ? ' COVERED' : '')).join(' | '));
    await b.close();
  }
  await L.done(b);
})().catch(e => { console.log('FAIL exception', e && e.stack || e); process.exit(1); });
