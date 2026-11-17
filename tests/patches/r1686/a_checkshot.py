import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

# ---------- shared helpers (next to the fitting helpers) ----------
rep("""  function pbFitOf(entry, r) {""", """  // r16.86 (owner, Nov 17): CHECK SHOTS (optional). After laying, the pipelayer can record a rod reading taken on the
  // pipe at any row, from the top of pipe (TOP), bottom of pipe (BOP) or the invert (INV). The app compares it with the
  // grade sheet's target for that row and reference, in the run's own rod units (an elevation for a Lenker rod), and keeps
  // every shot with its time: entry.checkShots [{ k, sta, staFt, ref, rod, target, diff (ft, + = high), unit, at, by }].
  const PB_CS_TOL = 0.02; // ft (about 1/4 in): "on grade"
  const PB_CS_REFS = [['top', 'TOP', 'Top of pipe'], ['bop', 'BOP', 'Bottom of pipe'], ['inv', 'INV', 'Invert']];
  function pbCsParse(t) { // "4.36" | "4-3 1/2" | "4'-3 1/2\\"" | "4' 3.5" -> feet
    const x = String(t == null ? '' : t).trim().replace(/[\\u2032\\u2019]/g, "'").replace(/[\\u2033\\u201d]/g, '"');
    if (!x || /^[\\u2014-]+$/.test(x)) return null;
    if (/^-?\\d*\\.?\\d+$/.test(x)) { const v = Number(x); return isFinite(v) ? v : null; }
    const m = /^(-)?\\s*(\\d+)\\s*(?:'|ft)?\\s*[- ]?\\s*(\\d+(?:\\.\\d+)?)?\\s*(?:(\\d+)\\s*\\/\\s*(\\d+))?\\s*(?:"|in)?$/.exec(x);
    if (!m) return null;
    const ft = Number(m[2]), inch = m[3] ? Number(m[3]) : 0, fr = m[4] && Number(m[5]) ? Number(m[4]) / Number(m[5]) : 0;
    if (inch >= 12 || fr >= 1) return null;
    const v = ft + (inch + fr) / 12; return m[1] ? -v : v;
  }
  function pbCsIn(ft) { const e = Math.round(Math.abs(ft) * 12 * 8); const w = Math.floor(e / 8), r = e % 8; let f = ''; if (r) { let n = r, d = 8; while (n % 2 === 0) { n /= 2; d /= 2; } f = n + '/' + d; } return (w ? w + (f ? ' ' + f : '') : (f || '0')) + '"'; }
  function pbCsResult(diff) { const a = Math.abs(diff); if (a <= PB_CS_TOL + 1e-9) return { ok: true, txt: 'On grade' + (a >= 0.005 ? ' (' + a.toFixed(2) + ' ft ' + (diff > 0 ? 'high' : 'low') + ')' : '') }; return { ok: false, txt: a.toFixed(2) + ' ft ' + (diff > 0 ? 'HIGH' : 'LOW') + ' (' + pbCsIn(a) + ')' }; }
  function pbCsTarget(row, ref) { return row ? pbCsParse(ref === 'top' ? row.top : ref === 'bop' ? row.bop : row.inv) : null; }
  function pbCsDiff(unit, meas, target) { return unit === 'lenker' ? meas - target : target - meas; } // + = the pipe is high
  function pbCsOf(entry, key) { const L = Array.isArray(entry && entry.checkShots) ? entry.checkShots.filter(c => c && c.k === key) : []; return L.length ? L[L.length - 1] : null; }
  window.PB_CS_TOL = PB_CS_TOL; window.pbCsParse = pbCsParse; window.pbCsResult = pbCsResult; window.pbCsOf = pbCsOf; window.PB_CS_REFS = PB_CS_REFS;
  // r16.86: FITTINGS COUNTED BY THE APP. Each hub marked as a fitting on the run is counted (only the laid ones once the
  // run has laid marks), with its joints: a bend, reducer, coupling or valve 2, a tee or wye 3, a cross 4, a cap or plug 1.
  // Joint type: MJ (ductile iron / C900 water: each joint needs an MJ accessory kit) or gasketed (the gaskets come in the
  // fitting bells). Default from the pipe type; the foreman can switch it (entry.fitJoint). Shown above his production
  // boxes so he doesn't count them again.
  function pbFitJoints(f) { const i = String(f.info || '').toLowerCase(); if (f.type === 'tee' || f.type === 'wye') return /cross/.test(i) ? 4 : 3; if (/\\bcross\\b/.test(i)) return 4; if (/\\b(cap|plug)\\b/.test(i)) return 1; return 2; }
  function pbFitJointKind(entry) { if (entry && (entry.fitJoint === 'mj' || entry.fitJoint === 'gasket')) return entry.fitJoint; return /ductile|c900|c-900/i.test(String((entry && entry.pipeType) || '')) ? 'mj' : 'gasket'; }
  function pbFitCount(entry) {
    const rows = Array.isArray(entry && entry.intervalRows) ? entry.intervalRows : [];
    let S = null; try { S = pbLaidSummary(entry); } catch (e) { S = null; }
    const anyLaid = !!(S && S.laid && S.laid.some(t => t !== null && t !== undefined));
    const by = new Map(); let total = 0, joints = 0, planned = 0;
    rows.forEach((r, i) => {
      const f = pbFitOf(entry, r); if (!f) return; planned++;
      if (anyLaid && !(S.laid[i] !== null && S.laid[i] !== undefined)) return;
      const name = (f.info ? f.info + ' ' : '') + (f.type === 'other' ? (f.info ? '' : 'Fitting') : pbFitWord(f.type));
      const key = name.trim().toLowerCase(), j = pbFitJoints(f);
      const g = by.get(key) || { name: name.trim(), n: 0, joints: 0 }; g.n++; g.joints += j; by.set(key, g); total++; joints += j;
    });
    return { items: [...by.values()], total, joints, planned, laidOnly: anyLaid, kind: pbFitJointKind(entry) };
  }
  window.pbFitCount = pbFitCount;
  window.pbFitCountRender = function(entry) {
    const host = document.getElementById('fpCounted'); if (!host) return;
    const C = entry ? pbFitCount(entry) : null;
    if (!C || !C.planned) { host.hidden = true; host.innerHTML = ''; return; }
    const lines = C.items.map(g => '<li>' + escapeHtml(g.n + ' × ' + g.name) + '</li>').join('');
    const acc = C.kind === 'mj' ? '<li><strong>' + C.joints + ' MJ accessory kit' + (C.joints === 1 ? '' : 's') + '</strong> (gland, gasket, bolts): one per MJ joint. A restrained joint takes a restraint gland instead of a plain gland.</li>'
      : '<li>Gaskets: ' + C.joints + ' fitting joint' + (C.joints === 1 ? '' : 's') + '; the gaskets come installed in the fitting bells, so there\\u2019s nothing extra to count.</li>';
    host.hidden = false;
    host.innerHTML = '<div class="pb-tag">Already Counted by the App</div><div class="pb-body"><p class="pb-help" style="margin:0 0 6px;">From the fittings on this run' + (C.laidOnly ? ' that are marked laid (' + C.total + ' of ' + C.planned + ')' : '') + '. Don\\u2019t count these again below.</p>'
      + (C.total ? '<ul style="margin:0 0 8px 18px;padding:0;">' + lines + acc + '</ul>' : '<p class="pb-help" style="margin:0 0 8px;">None laid yet (' + C.planned + ' on the run).</p>')
      + '<div class="pb-field" style="margin:0;"><label for="fpFitJoint">Fitting joints</label><select id="fpFitJoint" onchange="pbFitJointSet(this.value)"><option value="mj"' + (C.kind === 'mj' ? ' selected' : '') + '>MJ (count accessory kits)</option><option value="gasket"' + (C.kind === 'gasket' ? ' selected' : '') + '>Gasketed (gaskets in the fittings)</option></select></div></div>';
  };
  window.pbFitJointSet = function(v) {
    const entry = getCurrentArchiveEntry(); if (!entry || (v !== 'mj' && v !== 'gasket')) return;
    const prior = entry.fitJoint;
    return pbRunOnEntry(entry, async () => { entry.fitJoint = v; const ok = await saveRunArchive(); if (!ok) { if (prior === undefined) delete entry.fitJoint; else entry.fitJoint = prior; } try { window.pbFitCountRender(entry); } catch (e) {} return ok; });
  };
  function pbFitOf(entry, r) {""")

# the box above the production boxes
rep("""        <div class="pb-tag">Enter Production</div>""", """        <div id="fpCounted" class="pb-fp-counted" hidden style="margin:0 0 14px;padding:10px 12px;border:1px solid var(--pb-divider);border-radius:12px;"></div>
        <div class="pb-tag">Enter Production</div>""")
rep("""    try { pbFmOwnForm(entry); } catch (e) { console.error(e); } // feat_foreman 3""",
    """    try { pbFmOwnForm(entry); } catch (e) { console.error(e); } // feat_foreman 3
    try { window.pbFitCountRender(entry); } catch (e) { console.error(e); } // r16.86""")
rep("""      pbLaidCapLog(L);
      pbLaidAfterChange(entry, on ? idx : null, on, keys.length, row);""", """      pbLaidCapLog(L);
      pbLaidAfterChange(entry, on ? idx : null, on, keys.length, row);
      try { window.pbFitCountRender(entry); } catch (e) {} // r16.86: the counted fittings follow the laid marks""")

# ---------- the row menu: a check shot ----------
rep("""    const hasLay = !!L.toolsTr.querySelector('button[onclick^="pbLayAdjustFromRow"]');""", """    { const cs = pbCsOf(entry, pbLaidKey(r)); if (cs) lines.push('Check shot ' + (PB_CS_REFS.find(x => x[0] === cs.ref) || [0, ''])[1] + ' ' + fmtReading(cs.rod, cs.unit === 'lenker' ? 'engineer' : cs.unit) + ' \\u00b7 ' + pbCsResult(cs.diff).txt + ' \\u00b7 ' + new Date(cs.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })); } /* r16.86 */
    const hasLay = !!L.toolsTr.querySelector('button[onclick^="pbLayAdjustFromRow"]');""")
rep("""    const calcWant = !toolsOpen;
    acts.push({ k: 'calc',""", """    acts.push({ k: 'check', ic: 'ruler', label: pbCsOf(entry, pbLaidKey(r)) ? 'New check shot' : 'Check shot', onClick: go(false, (n) => window.pbCsOpen(n.idx)) }); /* r16.86: optional */
    const calcWant = !toolsOpen;
    acts.push({ k: 'calc',""")
rep("""  function pbLaidDecorate(entry) {""", """  // r16.86: the check-shot sheet
  window.__pbCsEntry = () => getCurrentArchiveEntry(); // tests
  window.pbCsOpen = function(idx) {
    const entry = getCurrentArchiveEntry(); if (!entry || !Array.isArray(entry.intervalRows)) return;
    const row = entry.intervalRows[idx]; if (!row) return;
    const unit = entry.rodUnit || 'engineer', key = pbLaidKey(row), lenker = unit === 'lenker';
    let ref = PB_CS_REFS.some(x => x[0] === entry.checkShotRef) ? entry.checkShotRef : 'inv';
    const old = document.getElementById('pbCsSheet'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'pbCsSheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'pbCsTitle');
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px;';
    const tg = (k) => { const t = pbCsTarget(row, k); return t === null ? '\\u2014' : fmtReading(t, lenker ? 'engineer' : unit); };
    d.innerHTML = '<div style="background:var(--pb-surface,#fff);color:var(--pb-text,#15181d);max-width:520px;width:100%;border-radius:16px;padding:20px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3);">'
      + '<h2 id="pbCsTitle" style="margin:0 0 4px;font-size:1.2rem;">Check Shot \\u00b7 Distance ' + escapeHtml(String(row.station)) + '</h2>'
      + '<p class="pb-help" style="margin:0 0 10px;">Optional. Shoot the laid pipe and type the ' + (lenker ? 'elevation read on the rod' : 'rod reading') + '. Target here: TOP ' + escapeHtml(tg('top')) + ' \\u00b7 BOP ' + escapeHtml(tg('bop')) + ' \\u00b7 INV ' + escapeHtml(tg('inv')) + '.</p>'
      + '<p style="margin:0 0 6px;font-weight:700;">Shot taken on</p><div class="pb-seg" id="pbCsRefs" role="radiogroup" aria-label="Shot taken on" style="display:flex;gap:6px;margin:0 0 10px;">' + PB_CS_REFS.map(x => '<button type="button" class="pb-btn ' + (x[0] === ref ? '' : 'ghost ') + 'small" role="radio" aria-checked="' + (x[0] === ref) + '" data-ref="' + x[0] + '" style="flex:1;" title="' + x[2] + '">' + x[1] + '</button>').join('') + '</div>'
      + '<div class="pb-field"><label for="pbCsRod">' + (lenker ? 'Elevation read (ft)' : unit === 'architect' ? 'Rod reading (ft-in, e.g. 7-3 1/2, or decimal feet)' : 'Rod reading (ft)') + '</label><input type="text" inputmode="decimal" id="pbCsRod" autocomplete="off" enterkeyhint="done"></div>'
      + '<p id="pbCsOut" role="status" style="margin:4px 0 12px;min-height:1.3em;font-weight:700;"></p>'
      + '<div style="display:flex;gap:10px;"><button type="button" class="pb-btn ghost" id="pbCsCancel" style="flex:1;">Cancel</button><button type="button" class="pb-btn" id="pbCsSave" style="flex:1;">Save Shot</button></div></div>';
    (document.getElementById('pbApp') || document.body).appendChild(d);
    const inp = d.querySelector('#pbCsRod'), out = d.querySelector('#pbCsOut');
    const calc = () => { const m = pbCsParse(inp.value), t = pbCsTarget(row, ref); if (m === null || t === null) { out.textContent = t === null ? 'No target for ' + ref.toUpperCase() + ' on this row.' : ''; out.style.color = ''; return null; } const df = pbCsDiff(unit, m, t), R = pbCsResult(df); out.textContent = R.txt; out.style.color = R.ok ? 'var(--pb-ok, #1a7f37)' : 'var(--pb-accent, #c62828)'; return { m, t, df }; };
    d.querySelectorAll('#pbCsRefs button').forEach(b => b.addEventListener('click', () => { ref = b.dataset.ref; d.querySelectorAll('#pbCsRefs button').forEach(x => { const on = x === b; x.classList.toggle('ghost', !on); x.setAttribute('aria-checked', String(on)); }); calc(); }));
    inp.addEventListener('input', calc);
    d.querySelector('#pbCsCancel').addEventListener('click', () => d.remove());
    const save = async () => {
      const c = calc(); if (!c) { out.textContent = pbCsTarget(row, ref) === null ? out.textContent : 'Type the ' + (lenker ? 'elevation' : 'rod reading') + ' first.'; return; }
      if (Math.abs(c.df) > 5) { out.textContent = 'That is more than 5 ft off the target. Check the reading and which part of the pipe it was taken on.'; out.style.color = 'var(--pb-accent, #c62828)'; return; }
      const now = runArchive.find(x => x && x.id === entry.id); if (!now || !now.intervalRows || pbLaidKey(now.intervalRows[idx] || {}) !== key) { d.remove(); pbAlert('This row changed while the sheet was open. Nothing was saved.', 'Row Changed'); return; }
      const rec = { k: key, sta: String(row.station), staFt: typeof row.stationFt === 'number' ? row.stationFt : null, ref, rod: Math.round(c.m * 10000) / 10000, target: Math.round(c.t * 10000) / 10000, diff: Math.round(c.df * 10000) / 10000, unit, at: Date.now(), by: (sbUser && sbUser.id) || pbArchiveOwnerUid || null };
      const priorList = Array.isArray(entry.checkShots) ? entry.checkShots.slice() : undefined, priorRef = entry.checkShotRef;
      d.querySelector('#pbCsSave').disabled = true;
      const ok = await pbRunOnEntry(entry, async () => { entry.checkShots = (Array.isArray(entry.checkShots) ? entry.checkShots : []).concat([rec]).slice(-500); entry.checkShotRef = ref; const s2 = await saveRunArchive(); if (!s2) { if (priorList === undefined) delete entry.checkShots; else entry.checkShots = priorList; if (priorRef === undefined) delete entry.checkShotRef; else entry.checkShotRef = priorRef; } return s2; });
      d.remove();
      if (ok) { const R = pbCsResult(rec.diff); try { pbLiveNoteRun(entry); } catch (e) {} pbAlert('Check shot saved at ' + rec.sta + ' (' + ref.toUpperCase() + '): ' + R.txt + '.', R.ok ? 'On Grade' : 'Off Grade'); }
    };
    d.querySelector('#pbCsSave').addEventListener('click', save);
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 80);
  };
  function pbLaidDecorate(entry) {""")

# ---------- the run report PDF: a check-shot section ----------
rep("""    // --- r16.77: values read from stake photos by AI""", """    // --- r16.86: check shots taken on the laid pipe
    if (Array.isArray(e.checkShots) && e.checkShots.length) {
      const C = e.checkShots.filter(c => c && typeof c.rod === 'number'), off = C.filter(c => !window.pbCsResult(c.diff).ok).length;
      R.section('checks', 'Check shots (' + C.length + ')', { keep: 30, intro: 'Rod readings taken on the laid pipe, compared with the grade sheet\\u2019s target for that row (device time). TOP = top of pipe, BOP = bottom of pipe, INV = invert. On grade = within ' + (window.PB_CS_TOL || 0.02).toFixed(2) + ' ft. ' + (off ? off + ' shot' + (off === 1 ? ' was' : 's were') + ' off grade.' : 'Every shot was on grade.') + (C.some(c => c.unit === 'lenker') ? ' Lenker rod: the values are elevations.' : '') });
      const rd = (v, u) => fmtReading(v, u === 'lenker' ? 'engineer' : u);
      R.table({ head: ['Dist.', 'On', 'Read', 'Target', 'Result', 'Taken (device time)'], body: C.map(c => { const r0 = window.pbCsResult(c.diff); return [c.sta, String(c.ref || '').toUpperCase(), rd(c.rod, c.unit), rd(c.target, c.unit), r0.ok ? r0.txt : { content: r0.txt, _accent: true }, pbRptDt(c.at, { sec: true })]; }), fontSize: 8.5 });
    }
    // --- r16.77: values read from stake photos by AI""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
