import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.88 (owner, Nov 17): BREAK. A one-tap Break button on an active run's laid-progress bar. While on break the whole
# Results screen is covered (no numbers, no marking, so nothing can be worked ahead while the clock is stopped), the
# break time is taken out of Avg. time and Current time, and every break is kept with its times on the run and in the
# run report: entry.onBreak { start, by }, entry.breaks [{ start, end, by }].
rep("""  const PB_LS_GAP = 60 * 60000, PB_LS_STICK = /(^|,)(joint|finalend|boundary)(,|$)/;""",
"""  const PB_LS_GAP = 60 * 60000, PB_LS_STICK = /(^|,)(joint|finalend|boundary)(,|$)/;
  function pbBrkList(entry, now) { const L = Array.isArray(entry && entry.breaks) ? entry.breaks.filter(b => b && b.start && b.end && b.end > b.start).map(b => [b.start, b.end]) : []; if (entry && entry.onBreak && entry.onBreak.start) L.push([entry.onBreak.start, now || Date.now()]); return L; }
  function pbBrkOverlap(B, a, b) { let ms = 0; B.forEach(([s, e]) => { const x = Math.max(a, s), y = Math.min(b, e); if (y > x) ms += y - x; }); return ms; }
  window.pbBrkList = pbBrkList; window.pbBrkOverlap = pbBrkOverlap;""")
rep("""      for (let k = 1; k < times.length; k++) { const g = times[k] - times[k - 1]; if (g <= PB_LS_GAP) ms += g; }""",
    """      const BK = pbBrkList(entry); /* r16.88: breaks don't count */
      for (let k = 1; k < times.length; k++) { const g = times[k] - times[k - 1] - pbBrkOverlap(BK, times[k - 1], times[k]); if (g > 0 && g <= PB_LS_GAP) ms += g; }""")
rep("""    return { avg, sticks, ms, lastOwn: ended ? null : (S.lastOwn !== null && S.lastOwn !== undefined ? S.lastOwn : (Number.isFinite(st) ? st : null)), ended };""",
    """    let lastOwn = ended ? null : (S.lastOwn !== null && S.lastOwn !== undefined ? S.lastOwn : (Number.isFinite(st) ? st : null));
    if (lastOwn !== null) lastOwn += pbBrkOverlap(pbBrkList(entry), lastOwn, Date.now()); /* r16.88: Current time stops during a break */
    return { avg, sticks, ms, lastOwn, ended };""")
# the Break button on the bar (active runs only)
rep("""      + col('cur', 'Current time', pbLsDd(T.lastOwn === null ? null : Math.max(0, Date.now() - T.lastOwn)), true);""",
    """      + col('cur', 'Current time', pbLsDd(T.lastOwn === null ? null : Math.max(0, Date.now() - T.lastOwn)), true)
      + (!T.ended && !entry.slPause ? '<div class="pb-lstat pb-lstat-brk" data-k="brk"><button type="button" class="pb-btn ghost small" id="pbBrkBtn" onclick="pbBreakStart()" aria-label="Pause for a break">Break</button></div>' : ''); /* r16.88 */""")
# guard: no laid marks while on break
rep("""  async function pbLaidApply(entryId, idx, on, confirmed, src) {
    const e0 = runArchive.find(x => x && x.id === entryId);""", """  async function pbLaidApply(entryId, idx, on, confirmed, src) {
    const e0 = runArchive.find(x => x && x.id === entryId);
    if (e0 && e0.onBreak) { pbAlert('End the break first.', 'On Break'); return false; } /* r16.88 */""")
# start / end / paint
rep("""  function pbLaidStatsPaint(entry, S) {""", """  window.pbBreakStart = function() {
    const entry = getCurrentArchiveEntry(); if (!entry || entry.kind !== 'run' || entry.onBreak || entry.completed || entry.incomplete) return;
    if (entry.slPause) { pbAlert('The run is paused for a delay. End the delay first.', 'Paused'); return; }
    return pbRunOnEntry(entry, async () => {
      entry.onBreak = { start: Date.now(), by: (sbUser && sbUser.id) || pbArchiveOwnerUid || null };
      const ok = await saveRunArchive(); if (!ok) delete entry.onBreak;
      pbBreakPaint(true); try { pbRenderShell(); } catch (e) {} return ok;
    });
  };
  window.pbBreakEnd = function() {
    const entry = getCurrentArchiveEntry(); if (!entry || !entry.onBreak) return;
    const ob = entry.onBreak, prior = Array.isArray(entry.breaks) ? entry.breaks.slice() : undefined;
    return pbRunOnEntry(entry, async () => {
      const end = Math.max(Date.now(), ob.start + 1000);
      entry.breaks = (prior || []).concat([{ start: ob.start, end, by: ob.by || null }]).slice(-200); delete entry.onBreak;
      const ok = await saveRunArchive(); if (!ok) { entry.onBreak = ob; if (prior === undefined) delete entry.breaks; else entry.breaks = prior; }
      pbBreakPaint(true); try { pbRenderShell(); } catch (e) {}
      try { if (getCurrentArchiveEntry() === entry && pbCurrentScreen === 'results') renderResultsTable(entry); } catch (e) {}
      return ok;
    });
  };
  let pbBrkKey = '';
  function pbBreakPaint(force) {
    const e = pbCurrentScreen === 'results' ? getCurrentArchiveEntry() : null, b = e && e.kind === 'run' ? e.onBreak : null;
    let el = document.getElementById('pbBrk');
    if (!b) { if (el && !el.hidden) el.hidden = true; document.documentElement.classList.remove('pb-on-break'); pbBrkKey = ''; return; }
    const scr = document.getElementById('screen-results'); if (!scr) return;
    if (!el) { el = document.createElement('div'); el.id = 'pbBrk'; el.className = 'pb-sl-pause pb-brk'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pbBrkH'); scr.appendChild(el); }
    const m = Math.max(0, Math.floor((Date.now() - b.start) / 60000)), key = e.id + '|' + b.start + '|' + m;
    if (force || key !== pbBrkKey || el.hidden) {
      pbBrkKey = key;
      const at = new Date(b.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), age = m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
      el.innerHTML = '<div class="pb-sl-pcard"><h2 id="pbBrkH">On Break</h2><p class="pb-sl-ptime">Since ' + escapeHtml(at) + ' \\u00b7 ' + escapeHtml(age) + '</p><p class="pb-help">The run\\u2019s clock is stopped and the grade sheet is hidden until the break ends.</p><button type="button" class="pb-btn" id="pbBrkEnd" onclick="pbBreakEnd()">End Break</button></div>';
    }
    if (el.hidden) el.hidden = false;
    document.documentElement.classList.add('pb-on-break');
  }
  window.pbBreakPaint = pbBreakPaint;
  setInterval(() => { try { pbBreakPaint(false); } catch (e) {} }, 1000);
  (window.pbActiveBarProviders = Array.isArray(window.pbActiveBarProviders) ? window.pbActiveBarProviders : []).push(() => {
    const e = getCurrentArchiveEntry(); if (!e || e.kind !== 'run' || !e.onBreak) return null;
    const m = Math.max(0, Math.floor((Date.now() - e.onBreak.start) / 60000));
    return { id: 'brk', text: 'On break \\u00b7 ' + m + ' min', go: 'End', warn: true, screen: 'results', onClick: () => { try { window.pbResumeLastRunResults(); } catch (er) { pbGoto('results'); } } };
  });
  function pbLaidStatsPaint(entry, S) {""")
# solid cover (nothing readable behind it)
rep("""  #pbApp .pb-sl-pause[hidden] { display: none; }""", """  #pbApp .pb-sl-pause[hidden] { display: none; }
  #pbApp .pb-sl-pause.pb-brk { background: var(--pb-bg, #08090B); z-index: 45; } /* r16.88: a break hides the grade sheet completely */
  html.pb-on-break #pbApp #screen-results > :not(#pbBrk) { visibility: hidden; }
  #pbApp .pb-lstat-brk { display: flex; align-items: center; }""")
# run report: breaks
rep("""    // --- r16.77: values read from stake photos by AI""", """    // --- r16.88: breaks
    if (Array.isArray(e.breaks) && e.breaks.length) {
      const B = e.breaks.filter(b => b && b.start && b.end), tot = B.reduce((t, b) => t + (b.end - b.start), 0), mins = (ms) => Math.max(1, Math.round(ms / 60000)) + ' min';
      R.section('breaks', 'Breaks (' + B.length + ', ' + mins(tot) + ')', { keep: 26, intro: 'Breaks taken with the Break button (device time). The run\\u2019s clock was stopped and the grade sheet hidden during each one; break time is left out of the time-per-pipe stats.' });
      R.table({ head: ['Started', 'Ended', 'Length'], body: B.map(b => [pbRptDt(b.start, { sec: true }), pbRptDt(b.end, { sec: true }), mins(b.end - b.start)]), fontSize: 8.5 });
    }
    // --- r16.77: values read from stake photos by AI""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
