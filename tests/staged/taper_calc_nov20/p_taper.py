#!/usr/bin/env python3
# taper_calc_nov20 (Tommy approved Nov 20): Taper & Cone Spacing calculator, under Calculators > Traffic Control.
# Speed, lane/shoulder width, taper type, road type and job state give: taper length, cones in the taper and their
# spacing, spacing along the work, buffer length, advance warning sign spacing A/B/C. Federal MUTCD 11th Edition
# (Dec 2023, Rev. 1 Dec 2025) Part 6; California's own city sign spacing (CA MUTCD 2026 Table 6B-1) when the job is in CA.
# Works offline (all numbers in the page). Answers as you type (the calclive engine). usage: python3 p_taper.py in out
import sys, os
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
here = os.path.dirname(os.path.abspath(__file__))
math_js = open(os.path.join(here, 'taper_math.js'), encoding='utf-8').read().strip()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

CONE = ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' "
        "stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 3h4l4.5 16h-13z'/%3E"
        "%3Cpath d='M3 20.5h18'/%3E%3Cpath d='M8.2 10.5h7.6'/%3E%3C/svg%3E\")")

# 1. the screen (before Backfill Lift Count), with its own small style block
SCREEN = '''  <!-- TAPER & CONE SPACING (taper_calc_nov20) -->
  <style id="pbTaperCss">
#pbApp { --pb-icon-cone: ''' + CONE + '''; }
#pbApp .pb-tool-row[data-dest="taper"] { --pb-tool-icon: var(--pb-icon-cone); }
#pbApp .pb-sc-tile[data-dest="taper"] { --pb-tile-icon: var(--pb-icon-cone); }
#pbApp #screen-taperCalc { --pb-calc-icon: var(--pb-icon-cone); }
#pbApp #screen-calcHub section[aria-label="Traffic Control"] { --pb-sec-icon: var(--pb-icon-cone); }
#pbApp #screen-taperCalc .tc-signs { font-variant-numeric: tabular-nums; }
#pbApp #screen-taperCalc .tc-state { margin: 12px 0 0; font-size: 14px; line-height: 1.45; color: var(--pb-text-2); }
#pbApp #screen-taperCalc .tc-state strong { color: var(--pb-text); }
#pbApp #screen-taperCalc .tc-tcp { margin: 14px 0 0; font-size: 15px; line-height: 1.45; font-weight: 650; color: var(--pb-text); }
#pbApp #screen-taperCalc .tc-src ul { margin: 6px 0 0; padding-left: 18px; }
#pbApp #screen-taperCalc .tc-src li { margin: 0 0 6px; font-size: 14px; line-height: 1.4; color: var(--pb-text-2); }
#pbApp #screen-taperCalc select, #pbApp #screen-taperCalc input { min-height: 52px; font-size: 18px; }
  </style>
  <div class="pb-screen pb-b6-calc" id="screen-taperCalc">
    <div class="pb-header">
      <p class="pb-eyebrow"><span>TRAFFIC CONTROL</span><button class="pb-back" title="Back" onclick="pbGoBack()"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></svg></button></p>
      <h1 class="pb-title">Taper &amp; Cone Spacing</h1>
      <div class="pb-addhome-wrap"><button type="button" class="pb-addhome" data-dest="taper" aria-pressed="false" onclick="pbAddToHome('taper')">Add to Home</button></div>
    </div>
    <div class="pb-warn" style="margin-top:16px;">
      <strong>Minimums from the national manual (MUTCD)</strong>
      <span class="pb-warn-keep">Not a traffic control plan. The approved plan or permit comes first.</span>
    </div>
    <div class="pb-section">
      <div class="pb-body">
        <div class="pb-field"><label for="tcSpeed">Posted speed (mph)</label><input type="number" enterkeyhint="next" step="5" min="20" max="75" id="tcSpeed" inputmode="numeric"></div>
        <div class="pb-field">
          <label for="tcType">Taper type</label>
          <select id="tcType">
            <option value="merge" selected>Merging (lane closed)</option>
            <option value="shift">Shifting (no merge)</option>
            <option value="shoulder">Shoulder closed</option>
            <option value="flagger">Flagger (one lane, two-way)</option>
            <option value="down">Downstream (end of the work)</option>
          </select>
        </div>
        <div class="pb-field" id="tcWidthWrap"><label for="tcWidth" id="tcWidthLabel">Lane width closed or shifted (ft)</label><input type="number" enterkeyhint="next" step="1" min="1" max="30" id="tcWidth" value="12" inputmode="decimal"></div>
        <div class="pb-field">
          <label for="tcRoad">Road type (for sign spacing)</label>
          <select id="tcRoad">
            <option value="" selected>Pick the road type</option>
            <option value="urbanLow">City street, low speed</option>
            <option value="urbanHigh">City street, high speed</option>
            <option value="rural">Rural road</option>
            <option value="freeway">Expressway / freeway</option>
          </select>
        </div>
        <div class="pb-field">
          <label for="tcState">Job state</label>
          <select id="tcState"><option value="" selected>Not set (national numbers)</option></select>
          <p class="pb-help" id="tcStateHow" style="margin:6px 0 0;"></p>
        </div>
        <div class="pb-derived" id="taperResult" style="font-size:16px; margin-top:10px;"></div>
        <details class="pb-more tc-src" id="tcSources"><summary><svg class="pb-ic sm" aria-hidden="true" focusable="false"><use href="#pb-i-info"/></svg><span>Where the numbers come from</span></summary>
          <ul>
            <li>Taper length: MUTCD 11th Edition (FHWA, Dec 2023, with Revision 1, Dec 2025), Section 6B.08, Tables 6B-3 and 6B-4. L = W &times; S&sup2; &divide; 60 at 40 mph or less, L = W &times; S at 45 mph or more. Shifting &frac12; L, shoulder &#8531; L (rounded up).</li>
            <li>Cone spacing: Section 6K.01, no more than 1 &times; the speed in feet in a taper and 2 &times; along the work. One-lane two-way and downstream tapers: 50 to 100 ft, devices about 20 ft apart (Section 6B.08).</li>
            <li>Sign spacing A, B, C: Section 6B.04, Table 6B-1. The road agency decides what is low or high speed.</li>
            <li>Buffer: Section 6B.06 and Table 6B-2 (stopping sight distance). The same distances may place a flagger station (Section 6D.06).</li>
            <li>California: CA MUTCD 2026 (Caltrans, Jan 18, 2026), Table 6B-1 sets city street sign spacing by speed. Its taper table (6B-3(CA)) matches the national formula.</li>
          </ul>
          <p class="pb-help" style="margin:4px 0 0;">Checked Nov 20, 2026. Speeds between table rows use the next row up.</p>
        </details>
        <p class="tc-tcp" id="tcTcpLine">Your competent person / traffic control plan decides on site. Follow the approved TCP if there is one.</p>
      </div>
    </div>
  </div>

  <!-- BACKFILL LIFT COUNT -->'''
rep('  <!-- BACKFILL LIFT COUNT -->', SCREEN)

# 2. Calculators tab: a Traffic Control category button
rep('''onclick="pbCalcCatJump('Confined Space')">Confined Space</button>''',
    '''onclick="pbCalcCatJump('Confined Space')">Confined Space</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnTraffic" onclick="pbCalcCatJump('Traffic Control')">Traffic Control</button>''')

# 3. the destination, its category and order, its short line, its tab
rep("['structures', 'Structures'], ['safety', 'Confined Space'], ['permits',",
    "['structures', 'Structures'], ['safety', 'Confined Space'], ['traffic', 'Traffic Control'], ['permits',")
rep("const PB_CALC_CATS = ['grade', 'trench', 'pipe', 'structures', 'safety'];",
    "const PB_CALC_CATS = ['grade', 'trench', 'pipe', 'structures', 'safety', 'traffic'];")
rep("'manhole', 'bedding', 'vent']; // clean_c", "'manhole', 'bedding', 'vent', 'taper']; // clean_c")
rep("  const PB_DEST = Object.fromEntries(PB_DESTINATIONS.map(d => [d.id, d]));",
    "  PB_DESTINATIONS.push({ id: 'taper', label: 'Taper & Cone Spacing', sub: 'Taper length, cones, sign spacing and buffer by speed (MUTCD)', cat: 'traffic', gate: 'calcHub', screen: 'taperCalc', words: 'traffic control taper cone cones channelizer channelizing devices drums spacing lane closure merge merging shift shifting shoulder flagger flagging one lane two way downstream buffer advance warning sign signs road work ahead mutcd tcp work zone', open: () => pbGoto('taperCalc') }); /* taper_calc_nov20 */\n"
    "  const PB_DEST = Object.fromEntries(PB_DESTINATIONS.map(d => [d.id, d]));")
rep("    manhole: 'Depth and barrel sections'\n  };",
    "    manhole: 'Depth and barrel sections', taper: 'Taper, cones, signs, buffer'\n  };")
rep("manningCalc: 'calculators', manholeDepthCalc: 'calculators', rodElevCalc: 'calculators', constCalc: 'calculators',",
    "manningCalc: 'calculators', manholeDepthCalc: 'calculators', rodElevCalc: 'calculators', constCalc: 'calculators', taperCalc: 'calculators',")

# 4. cursor in Posted speed when the calculator opens empty (simplify 04)
# 4. (cursor in Posted speed on opening: done by the calculator's own screen hook, since Width starts filled)

# 5. the calculator (before the live engine's table, so it is wrapped like the others) and its entry in that table
CALC = '''  // ---------- Taper & Cone Spacing (taper_calc_nov20) ----------
''' + '\n'.join('  ' + l if l else l for l in math_js.split('\n')) + '''
  // the job's state: the current job (picked, its address), then the company, then where this phone is; '' = not known
  function pbTcDefaultState() {
    const ok = (c) => !!c && !!window.PB_STATE_RULES && Object.prototype.hasOwnProperty.call(window.PB_STATE_RULES.states, c);
    try {
      const cj = typeof window.pbCurJobGet === 'function' ? window.pbCurJobGet() : null;
      if (cj && cj.job_number && typeof window.pbSrJobState === 'function') { const x = window.pbSrJobState(cj.job_number); if (x && x.how !== 'default' && ok(x.code)) return { code: x.code, how: x.how === 'company' ? 'company' : 'job' }; }
      if (typeof window.pbSrJobState === 'function') { const x = window.pbSrJobState(''); if (x && x.how === 'company' && ok(x.code)) return { code: x.code, how: 'company' }; }
    } catch (e) {}
    try { const h = typeof window.pbHereState === 'function' ? window.pbHereState() : null; if (ok(h)) return { code: h, how: 'here' }; } catch (e) {}
    return { code: '', how: '' };
  }
  let pbTcStatePicked = false, pbTcStateHow = '';
  function pbTcStateName(c) { const R = c && window.PB_STATE_RULES ? window.PB_STATE_RULES.states[c] : null; return R ? R.name : ''; }
  function pbTcFillStates() {
    const sel = document.getElementById('tcState'); if (!sel || !window.PB_STATE_RULES || sel.options.length > 1) return;
    const S = window.PB_STATE_RULES.states, codes = Object.keys(S).sort((a, b) => S[a].name.localeCompare(S[b].name));
    codes.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = S[c].name; sel.appendChild(o); });
  }
  function pbTcOnOpen() {
    pbTcFillStates();
    const sel = document.getElementById('tcState'); if (!sel || pbTcStatePicked) return;
    const d = pbTcDefaultState(); sel.value = d.code; pbTcStateHow = d.code ? d.how : '';
  }
  document.addEventListener('change', (e) => { if (e.target && e.target.id === 'tcState') { pbTcStatePicked = true; pbTcStateHow = 'picked'; } }, true);
  (window.pbScreenHooks = window.pbScreenHooks || []).push(function(name, back) {
    if (name !== 'taperCalc') return;
    try { pbTcOnOpen(); } catch (e) { console.error(e); }
    if (back) return; // simplify 04's rule, here because Width starts at 12: cursor in an empty Posted speed
    const go = () => { try { const el = document.getElementById('tcSpeed'); if (pbCurrentScreen === 'taperCalc' && !pbModalIsOpen() && el && el.value === '') el.focus({ preventScroll: true }); } catch (e) {} };
    go(); setTimeout(go, 60);
  });
  window.pbCalcTaper = function() {
    const resultEl = document.getElementById('taperResult'); if (!resultEl) return;
    const type = document.getElementById('tcType').value, range = type === 'flagger' || type === 'down';
    const ww = document.getElementById('tcWidthWrap'); if (ww) ww.style.display = range ? 'none' : '';
    const wl = document.getElementById('tcWidthLabel'); if (wl) wl.textContent = type === 'shoulder' ? 'Shoulder width closed (ft)' : 'Lane width closed or shifted (ft)';
    const state = document.getElementById('tcState').value, road = document.getElementById('tcRoad').value;
    const how = document.getElementById('tcStateHow');
    if (how) how.textContent = !state ? 'Pick the state to check for its own rule.' : pbTcStateHow === 'job' ? 'From the current job.' : pbTcStateHow === 'company' ? 'From your company.' : pbTcStateHow === 'here' ? 'Where this phone is now.' : '';
    const sp = document.getElementById('tcSpeed').value.trim(), wd = document.getElementById('tcWidth').value.trim();
    if (sp === '') { resultEl.innerHTML = ''; return; }
    const r = window.pbTaperMath.calc({ speed: Number(sp), width: wd === '' ? NaN : Number(wd), type, road, state });
    if (r.err) { resultEl.textContent = r.err; return; }
    const ft = (n) => Number(n).toLocaleString('en-US') + ' ft', S = r.speed, e = escapeHtml;
    const box = (label, val, sub, cls) => '<div class="pb-answer-box' + (cls ? ' ' + cls : '') + '"><div class="pb-answer-label">' + e(label) + '</div><div class="pb-answer-val">' + e(val) + '</div>' + (sub ? '<div class="pb-answer-sub">' + e(sub) + '</div>' : '') + '</div>';
    const NAME = { merge: 'Merging taper', shift: 'Shifting taper', shoulder: 'Shoulder taper', flagger: 'One-lane, two-way taper', down: 'Downstream taper' }[type];
    let h;
    if (r.range) {
      h = box(NAME + ' length', '50 to 100 ft', '50 ft minimum, 100 ft maximum.')
        + box('Cones in the taper', r.conesMin + ' to ' + r.conesMax + ' cones', 'About ' + r.taperSpacing + ' ft apart.');
    } else {
      const f = r.formula === 'WS' ? 'L = W \\u00d7 S = ' + r.width + ' \\u00d7 ' + S + ' = ' + ft(r.Lfull) : 'L = W \\u00d7 S\\u00b2 \\u00f7 60 = ' + r.width + ' \\u00d7 ' + S + '\\u00b2 \\u00f7 60 = ' + ft(r.Lfull);
      const part = type === 'shift' ? ' Shifting: \\u00bd L.' : type === 'shoulder' ? ' Shoulder: \\u2153 L.' : '';
      h = box(NAME + ' length', ft(r.L), 'At least this long. ' + f + '.' + part)
        + box('Cones in the taper', r.cones + ' cones', (r.coneGap === r.taperSpacing ? r.taperSpacing + ' ft apart' : 'About ' + r.coneGap + ' ft apart') + ' (no more than ' + r.taperSpacing + ' ft: 1 \\u00d7 the speed).');
    }
    h += box('Cone spacing along the work', r.tangentSpacing + ' ft', 'No more than this (2 \\u00d7 the speed), along the buffer and the work. Closer at night, on curves, or where drivers cut in.');
    h += box('Buffer space', ft(r.buffer), 'Empty road before the work' + (r.ssdSpeed !== S ? ' (' + r.ssdSpeed + ' mph row)' : '') + '. No trucks, material or equipment in it.' + (type === 'flagger' ? ' Flagger station: about ' + ft(r.buffer) + ' ahead of the work.' : ''));
    if (r.signs) {
      const a = r.signs.abc, ROAD = { urbanLow: 'city street, low speed', urbanHigh: 'city street, high speed', rural: 'rural road', freeway: 'expressway / freeway' }[road];
      h += box('Advance warning signs', a.map(x => Number(x).toLocaleString('en-US')).join(' \\u00b7 ') + ' ft', 'A: taper to 1st sign ' + ft(a[0]) + '. B: 1st to 2nd ' + ft(a[1]) + '. C: 2nd to 3rd ' + ft(a[2]) + '. First sign ' + ft(r.firstSign) + ' before the taper (' + (r.signs.rule === 'CA' ? 'California, city street at ' + S + ' mph' : ROAD) + ').', 'tc-signs');
    } else {
      h += box('Advance warning signs', 'Pick road type', 'Pick the road type above. Sign spacing depends on it.', 'tc-signs');
    }
    const nm = pbTcStateName(state);
    let note;
    if (state === 'CA') note = r.signs && r.signs.rule === 'CA' ? '<strong>California rule:</strong> city street sign spacing by speed (CA MUTCD 2026, Table 6B-1). Tapers and buffer are the same as the national numbers.' : '<strong>California:</strong> same as the national numbers here (CA MUTCD 2026). City street sign spacing goes by speed in California.';
    else if (nm) note = 'National MUTCD numbers. ' + e(nm) + ' may have its own manual or supplement with different numbers; check it.';
    else note = 'National MUTCD numbers. Your state may have its own manual with different numbers.';
    h += '<p class="tc-state" id="tcStateNote">' + note + '</p>';
    resultEl.innerHTML = h;
  };

  // ---------- UX batch 1: out-of-date calculator answers (UX-01) ----------'''
rep("  // ---------- UX batch 1: out-of-date calculator answers (UX-01) ----------", CALC)
rep("    manholeDepthCalc: { results: ['manholeDepthResult'], calc: 'pbCalcManholeDepth' }\n  };",
    "    manholeDepthCalc: { results: ['manholeDepthResult'], calc: 'pbCalcManholeDepth' },\n    taperCalc: { results: ['taperResult'], calc: 'pbCalcTaper' } /* taper_calc_nov20 */\n  };")

open(out, 'w', encoding='utf-8').write(s); print('ok')
