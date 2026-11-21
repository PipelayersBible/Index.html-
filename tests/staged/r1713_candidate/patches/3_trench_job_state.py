# r17.13 item 2(d): Trench Sloping and the cave-in notes follow the JOB's state (Tommy approved Nov 20;
# ask_followups_nov20 decisions 3-4). Built from tests/staged/michigan_nov20/patches/01_trench_state_rules.py with
# MICHIGAN LEFT OUT (Michigan Part 9 Table 1 stays ON HOLD until someone checks the table by eye).
#  - PB_TRENCH_RULES: one row per state whose sloping table differs from federal Appendix B. Only Washington now:
#    Table N-1 (WAC 296-155-66403) has no short-term Type A slope, so 0.5:1 is not offered on a Washington job and a
#    line says so. A state with no row gets the federal calculator, unchanged.
#  - The state: the current job (picked for it, or in its address), else where the phone is. NOT the company's state:
#    that could be less strict than "not known" (strictest wins: not known = Washington's 4 ft).
#  - The run's deep-trench flag (pbCaveTrig) and the note under the Trench Sloping answer use the same state.
#  - State table: Minnesota and Kentucky trench lines confirmed (MNOSHA fact sheet; 803 KAR 2:415). Michigan's row untouched.
# Sources: tests/staged/michigan_nov20/NOTES.md, tests/staged/ask_followups_nov20/raw_findings.md
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# ---- 1. the screen: ids on the warning so its words can follow the rule; a line that says which rule is used ----
p.rep('''      <strong>OSHA’s table, not a substitute for a competent person</strong>
      <span class="pb-warn-keep">Soil type must be classified per Appendix A by a competent person — don't guess.</span>
      <details class="pb-more"><summary><svg class="pb-ic sm" aria-hidden="true" focusable="false"><use href="#pb-i-info"/></svg><span>Details</span></summary><span>These are OSHA's Table B-1''',
'''      <strong id="trenchWarnT">OSHA’s table, not a substitute for a competent person</strong>
      <span class="pb-warn-keep" id="trenchWarnK">Soil type must be classified per Appendix A by a competent person — don't guess.</span>
      <details class="pb-more"><summary><svg class="pb-ic sm" aria-hidden="true" focusable="false"><use href="#pb-i-info"/></svg><span>Details</span></summary><span id="trenchWarnD">These are OSHA's Table B-1''')
p.rep('''        <div class="pb-field"><label>Trench depth (ft)</label><input type="number" enterkeyhint="next" step="0.1" id="trenchDepth" inputmode="decimal"></div>''',
'''        <div class="pb-trench-rule" id="trenchRuleLine" hidden></div>
        <div class="pb-field"><label>Trench depth (ft)</label><input type="number" enterkeyhint="next" step="0.1" id="trenchDepth" inputmode="decimal"></div>''')
p.rep('''.pb-help { font-size: 11.5px; color: var(--ink-soft); margin-top: 5px; line-height: 1.4; }''',
'''.pb-help { font-size: 11.5px; color: var(--ink-soft); margin-top: 5px; line-height: 1.4; }
.pb-trench-rule { font-size: 14px; line-height: 1.4; margin: 0 0 12px; padding: 10px 12px; border: 1px solid var(--line, rgba(128,128,128,.4)); border-radius: 10px; }
.pb-trench-rule strong { display: block; font-size: 15px; }
.pb-trench-rule button { margin-top: 8px; }''')

# ---- 2. the rule table and the state it follows ----
p.rep('''  function updateTrenchVertOptVisibility() {
    const soil = document.getElementById('trenchSoil').value;''',
'''  // ---- Trench Sloping by state (Nov 20). One row per state whose sloping table is not federal Appendix B. ----
  // soils: the state's own soil list replaces Type A/B/C (ratio = horizontal per 1 vertical). drop: federal options the
  // state's table does not have. engOver: deeper than this, a registered professional engineer designs it (the state's
  // own words; federal Table B-1 stops below 20 ft and is handled by the federal code). Every value is from the cited
  // rule; sources in tests/staged/michigan_nov20/NOTES.md. Checked 2026-11-20; re-check with the yearly state table.
  const PB_TRENCH_RULES = { checked: '2026-11-20', states: {
    WA: { name: 'Washington', tag: 'Washington rule (WAC 296-155 Part N)', table: 'Table N-1', cite: 'WAC 296-155-66403', drop: ['Ashort'],
      line: 'Same slopes as OSHA’s table, but no short-term Type A (0.5:1). Use Type A 0.75:1. Your competent person decides on site.' } } };
  window.PB_TRENCH_RULES = PB_TRENCH_RULES;
  // The state the calculator and the cave-in notes answer for: the current job (picked for it, or in its address), else
  // where this phone is. '' when neither says: the federal table, and the strictest depth (Washington, 4 ft). Not the
  // company's state: it could be less strict than "not known".
  function pbTrenchWhere() {
    let s = null;
    try { const cj = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null; s = window.pbSrJobState((cj && cj.job_number) || ''); } catch (e) { s = null; }
    if (s && (s.how === 'phone' || s.how === 'picked' || s.how === 'address')) return { code: s.code, how: 'job' };
    let h = null; try { h = typeof window.pbHereState === 'function' ? window.pbHereState() : null; } catch (e) { h = null; }
    if (h) return { code: h, how: 'here' };
    return { code: '', how: '' };
  }
  window.pbTrenchWhere = pbTrenchWhere;
  const PB_TRENCH_HOW = { job: 'the current job', here: 'where this phone is', company: 'your company’s state' };
  const pbTrenchFed = { soil: document.getElementById('trenchSoil').innerHTML, t: document.getElementById('trenchWarnT').innerHTML, k: document.getElementById('trenchWarnK').innerHTML, d: document.getElementById('trenchWarnD').innerHTML };
  let pbTrenchUseFed = false, pbTrenchShown = null; const pbTrenchLast = {};
  function pbTrenchRule() {
    const w = pbTrenchWhere(), R = w.code && Object.prototype.hasOwnProperty.call(PB_TRENCH_RULES.states, w.code) ? PB_TRENCH_RULES.states[w.code] : null;
    return { code: w.code, how: w.how, row: R, on: !!R && !(pbTrenchUseFed && R.soils) };
  }
  // The soil list, the warning and the rule line follow the rule in use. Only rebuilt when the rule changes, so a
  // soil already picked is kept.
  function pbTrenchApplyRule() {
    const u = pbTrenchRule(), R = u.row, key = (R ? u.code : '') + '|' + (u.on ? 1 : 0) + '|' + u.how;
    if (key === pbTrenchShown) return u;
    const sel = document.getElementById('trenchSoil'), was = sel.value, line = document.getElementById('trenchRuleLine');
    const state = u.on && R.soils;
    if (state) sel.innerHTML = Object.keys(R.soils).map(k => { const s = R.soils[k]; return '<option value="' + k + '">' + escapeHtml(s.name + ' — ' + (s.ratio ? s.label : 'vertical') + ' (' + s.deg + '°)') + '</option>'; }).join('');
    else { sel.innerHTML = pbTrenchFed.soil; if (u.on && R.drop) R.drop.forEach(v => { const o = sel.querySelector('option[value="' + v + '"]'); if (o) o.remove(); }); }
    const keep = [...sel.options].some(o => o.value === was) ? was : (state ? (pbTrenchLast[u.code] || R.def) : 'B');
    sel.value = keep;
    document.getElementById('trenchWarnT').innerHTML = state ? escapeHtml(R.warnT) : pbTrenchFed.t;
    document.getElementById('trenchWarnK').innerHTML = state ? escapeHtml(R.warnK) : pbTrenchFed.k;
    document.getElementById('trenchWarnD').innerHTML = state ? escapeHtml(R.warnD) : pbTrenchFed.d;
    if (!R) { line.hidden = true; line.innerHTML = ''; }
    else {
      const from = PB_TRENCH_HOW[u.how] ? ' State from ' + PB_TRENCH_HOW[u.how] + '.' : '';
      line.innerHTML = u.on
        ? '<strong id="trenchRuleName">' + escapeHtml(R.tag) + '</strong><span id="trenchRuleText">' + escapeHtml(R.line + from) + '</span>' + (R.soils ? '<br><button type="button" class="pb-btn ghost small" id="trenchRuleSwap" onclick="pbTrenchRuleSwap()">Use Federal OSHA Table</button>' : '')
        : '<strong id="trenchRuleName">Federal OSHA table</strong><span id="trenchRuleText">' + escapeHtml('You switched to OSHA’s table. ' + R.name + ' has its own rule.' + from) + '</span><br><button type="button" class="pb-btn ghost small" id="trenchRuleSwap" onclick="pbTrenchRuleSwap()">' + escapeHtml('Use ' + R.name + ' Rule') + '</button>';
      line.hidden = false;
    }
    pbTrenchShown = key;
    try { updateTrenchVertOptVisibility(); } catch (e) {}
    if (sel.value !== was) { document.getElementById('trenchResult').innerHTML = ''; document.getElementById('trenchDiagram').innerHTML = ''; } // an answer for the other table is never left up
    return u;
  }
  window.pbTrenchRuleSwap = function() { pbTrenchUseFed = !pbTrenchUseFed; pbTrenchApplyRule(); const d = numVal('trenchDepth'); if (d !== null && d > 0) window.pbCalcTrench(); };
  // A state's own table: same boxes and words as the federal answer, the state's numbers and rule named.
  function pbCalcTrenchState(u, depth, soil, bottomW, resultEl) {
    const R = u.row, s = R.soils[soil] || R.soils[R.def];
    pbTrenchLast[u.code] = soil;
    if (depth > R.engOver) {
      resultEl.innerHTML = `<div class="pb-answer-box"><div class="pb-answer-label">Engineer Required</div><div class="pb-answer-val pb-answer-warn">Over ${R.engOver} ft</div><div class="pb-answer-sub">No slope is given over ${R.engOver} ft. A registered professional engineer designs the protective system.</div></div><div class="pb-answer-box pb-trench-20warn"><div class="pb-answer-label">${escapeHtml(R.tag)}</div><div class="pb-answer-sub">${escapeHtml(R.engQ)}</div></div>`;
      return;
    }
    const offset = depth * s.ratio;
    let html = `<div class="pb-answer-box"><div class="pb-answer-label">Max Allowable Slope</div><div class="pb-answer-val">${s.label}</div><div class="pb-answer-sub">${s.deg}° from horizontal. ${escapeHtml(s.name)}, ${escapeHtml(R.tag)}, ${escapeHtml(R.table)}</div></div>`;
    html += `<div class="pb-answer-box"><div class="pb-answer-label">Horizontal Offset Each Side</div><div class="pb-answer-val">${offset.toFixed(2)} ft</div></div>`;
    let usedBottomW = bottomW, isExample = false;
    if (bottomW !== null && bottomW > 0) {
      const topW = bottomW + 2 * offset;
      html += `<div class="pb-answer-box"><div class="pb-answer-label">Required Top Width</div><div class="pb-answer-val">${topW.toFixed(2)} ft</div><div class="pb-answer-sub">${bottomW.toFixed(2)} ft bottom + ${offset.toFixed(2)} ft offset each side</div></div>`;
    } else { usedBottomW = 2; isExample = true; }
    if (depth === R.engOver) html += `<div class="pb-answer-box pb-trench-20warn"><div class="pb-answer-label">${R.engOver} Feet: Any Deeper Needs an Engineer</div><div class="pb-answer-sub">${escapeHtml(R.engQ)}</div></div>`;
    resultEl.innerHTML = html;
    document.getElementById('trenchDiagram').innerHTML = buildTrenchDiagramSVG(depth, usedBottomW, offset, isExample);
  }
  function updateTrenchVertOptVisibility() {
    const soil = document.getElementById('trenchSoil').value;''')

# ---- 3. opening the calculator: the rule first, then the soil ----
p.rep('''    document.getElementById('trenchSoil').value = saved || 'B'; // this account's last soil, else the default — never another account's
    updateTrenchVertOptVisibility();''',
'''    pbTrenchUseFed = false; pbTrenchShown = null; // every opening starts on the job's state's rule
    { const u = pbTrenchApplyRule(), sel = document.getElementById('trenchSoil');
      if (u.on && u.row.soils) sel.value = pbTrenchLast[u.code] || u.row.def; // the state's own list: its last soil this session, else its 1:1 row
      else sel.value = saved && [...sel.options].some(o => o.value === saved) ? saved : 'B'; } // this account's last soil, else the default — never another account's
    updateTrenchVertOptVisibility();''')

# ---- 4. the answer ----
p.rep('''    const soil = document.getElementById('trenchSoil').value;
    pbSet('lastTrenchSoil', soil);
    const bottomW = numVal('trenchBottomW');
    const resultEl = document.getElementById('trenchResult');
    if (depth === null || depth <= 0) { resultEl.textContent = 'Enter a valid trench depth greater than zero.'; return; }''',
'''    const pbTr = pbTrenchApplyRule(), pbTrState = pbTr.on && !!pbTr.row.soils; // the job's state's rule (Nov 20)
    const soil = document.getElementById('trenchSoil').value;
    if (!pbTrState) pbSet('lastTrenchSoil', soil);
    const bottomW = numVal('trenchBottomW');
    const resultEl = document.getElementById('trenchResult');
    if (depth === null || depth <= 0) { resultEl.textContent = 'Enter a valid trench depth greater than zero.'; return; }
    if (pbTrState) { pbCalcTrenchState(pbTr, depth, soil, bottomW, resultEl); return; }''')

# ---- 5. the note under the result uses the same state ----
p.rep('''    const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null, R = pbSrRow(st);
    let h;''',
'''    const W = typeof window.pbTrenchWhere === 'function' ? window.pbTrenchWhere() : { code: typeof window.pbHereState === 'function' ? window.pbHereState() : null, how: 'here' };
    const st = W.code || null, R = pbSrRow(st), how = W.how === 'job' ? 'the current job' : 'where this phone is';
    let h;''')
p.rep('''</strong> (where this phone is): ' + escapeHtml(R.trench && R.trench.text''', '''</strong> (' + how + '): ' + escapeHtml(R.trench && R.trench.text''')

# ---- 6. the state table: Minnesota and Kentucky trench lines confirmed (Michigan untouched: on hold) ----
i = p.s.index('  const PB_SR = {'); j = p.s.index('\n', i); line = p.s[i:j]
a = line.index('{'); b = line.rindex('}') + 1
T = json.loads(line[a:b]); dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
assert dump(T) == line[a:b], 'state table does not round-trip'
def row(code, trench, sources):
    R = T['states'][code]; old = dump(R)
    assert R['trench']['ft'] is None, code + ' already confirmed'
    R = json.loads(old); R['trench'] = trench; R['sources'] = R['sources'] + sources; R['checked'] = '2026-11-20'
    p.rep('"' + code + '":' + old, '"' + code + '":' + dump(R))
row('MN', { 'ft': 5, 'text': 'MNOSHA uses the federal rule: protective system from 5 ft (29 CFR 1926.652).' },
    [{ 'what': 'MNOSHA fact sheet: Trenching and excavation (May 2026)', 'url': 'https://www.dli.mn.gov/sites/default/files/pdf/fact_trenching_excavation.pdf' }])
row('KY', { 'ft': 5, 'text': 'Kentucky OSH adopts the federal rule: protective system from 5 ft (29 CFR 1926.652; 803 KAR 2:415).' },
    [{ 'what': '803 KAR 2:415 Excavations', 'url': 'https://apps.legislature.ky.gov/law/kar/titles/803/002/415/' }])
# ---- 7. the run's deep-trench flag: the job's state, then the phone; neither = the strictest (Washington, 4 ft) ----
p.rep("""  function pbCaveTrig() { const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null, R = st""",
"""  function pbCaveTrig() { let st = null; try { st = typeof window.pbTrenchWhere === 'function' ? (window.pbTrenchWhere().code || null) : (typeof window.pbHereState === 'function' ? window.pbHereState() : null); } catch (e) { st = null; } /* r17.13: the job's state first, then the phone */ const R = st""")
p.rep("""  function pbDepthFlagText(e) {
""", """  window.pbCaveTrig = pbCaveTrig; /* r17.13: for the tests */
  function pbDepthFlagText(e) {
""")
p.rep("""      h = '<p class="pbsr-tl" id="trenchStateText">This phone doesn’t know which state it is in. Federal OSHA and most states: protective system from 5 ft. Washington: from 4 ft.</p>'""",
"""      h = '<p class="pbsr-tl" id="trenchStateText">The job’s state isn’t known (no state on the job, no phone location). Federal OSHA and most states: protective system from 5 ft. Washington: from 4 ft.</p>'""")
p.save()
