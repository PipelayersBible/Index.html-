#!/usr/bin/env python3
"""feat_weight: material weight (tons) next to calculator volumes. Owner, Oct 21: "add an option to convert material
volume to weight in the calculators" (checked against his supplier app).

usage:  python3 patch.py IN.html OUT.html
Apply AFTER /home/claude/wording_audit/runs_calcs_patch.py on rel15/m15.html (also applies to plain m15).
Every replacement must match exactly once (asserted) or nothing is written.

What it does
  F01  run materials presets: coarse sand 1.35 -> 1.485 (110 lb/ft3), fine sand 1.20 -> 1.431 (106 lb/ft3) (owner, Oct 21);
       3/4" rock 1.35 and pea gravel 1.40 unchanged. Adds a short name per preset.
  F02  PM materials form help text: preset numbers come from PB_MAT_PRESETS (shown 1.35, 1.40, 1.49, 1.43), not typed twice.
  F03  shared weight block (after the presets, reusing PB_MAT_PRESETS, PB_MAT_DEFAULT_EXTRA_PCT and pbMatFactor):
       material picker (4 bedding presets, "Typical supplier values" type -> rock source in lb/ft3, Custom in t/yd3 or
       lb/ft3), last choice remembered per calculator, raw tons line + separate 15% compaction line, ft = in echo.
  F04  CSS for the picker (big tap targets, reuses .pb-toggle).
  F05  Material Volume: weight panel under the result.
  F06  Structure Bedding: optional pad length / width fields.
  F07  Structure Bedding: bedding volume + weight panel when the pad size is given.
  F08  F09  weight picker taps / typing do not mark the calculator answer stale (crossed out).
"""
import sys

R = []

# F01 one shared constant for the presets (run materials + calculators)
R.append(('F01',
"""    { k: 'rock34', name: '3/4" crushed rock', category: 'bedding_rock', density: 1.35 },
    { k: 'pea', name: 'Pea gravel (1/4" rock)', category: 'bedding_rock', density: 1.40 },
    { k: 'csand', name: 'Coarse sand (concrete sand)', category: 'bedding_sand', density: 1.35 },
    { k: 'fsand', name: 'Fine sand (mason sand)', category: 'bedding_sand', density: 1.20 }
  ];""",
"""    { k: 'rock34', name: '3/4" crushed rock', short: '3/4" crushed rock', category: 'bedding_rock', density: 1.35 },
    { k: 'pea', name: 'Pea gravel (1/4" rock)', short: 'pea gravel', category: 'bedding_rock', density: 1.40 },
    { k: 'csand', name: 'Coarse sand (concrete sand)', short: 'coarse sand', category: 'bedding_sand', density: 1.485 }, // 110 lb/ft³ (owner, Oct 21; was 1.35)
    { k: 'fsand', name: 'Fine sand (mason sand)', short: 'fine sand', category: 'bedding_sand', density: 1.431 } // 106 lb/ft³ (owner, Oct 21; was 1.20)
  ];
  // a density shown to 2 places, an exact half rounded up (1.485 -> 1.49, never the float's 1.48)
  const pbMatDens2 = (n) => (Math.round(Number(n) * 100 + 1e-7) / 100).toFixed(2);
  const pbMatPresetText = () => PB_MAT_PRESETS.map(p => p.short + ' ' + pbMatDens2(p.density)).join(', ');"""))

# F02 the PM form's help text reads the constant
R.append(('F02',
"""'<strong>Verify with your supplier.</strong> Presets: 3/4" crushed rock 1.35, pea gravel 1.40, coarse sand 1.35, fine sand 1.20.'""",
"""'<strong>Verify with your supplier.</strong> Presets: ' + escapeHtml(pbMatPresetText()) + '.'"""))

# F03 the shared weight block
R.append(('F03',
"""  const pbMatIsShade = (m) => m && m.source === 'bedding_calc' && m.use_as === 'shading';
""",
r"""  // ==== feat_weight (Oct 21): weight in tons next to calculator volumes ====
  // Reuses the run materials' presets (PB_MAT_PRESETS), compaction allowance (PB_MAT_DEFAULT_EXTRA_PCT) and yd³ -> ton
  // factor (pbMatFactor). Same order as the materials feature: the allowance is added to the yd³ first, then × density.
  // The raw (in-place) tons have their own line, rounded like the owner's supplier app: one decimal, an exact half to
  // even (510 × 2 × 0.5 ft at 130 lb/ft³ = 33.15 -> 33.2; at 110 = 28.05 -> 28.0).
  const PB_WT_LB_PER_TPY = 2000 / 27; // 1 ton/yd³ = 74.07 lb/ft³
  const PB_WT_SUP_TYPES = [['base', 'Base'], ['screen', 'Screenings'], ['clean', 'Clean stone'], ['sand', 'Sand']];
  const PB_WT_SUP_SRC = [['trap', 'Traprock'], ['lime', 'Limestone'], ['gran', 'Granite'], ['sg', 'Sand & gravel'], ['ss', 'Sandstone']];
  const PB_WT_SUP_LB = { base: [160, 138, 145, 130, 138], screen: [124, 113, 113, 112, 110], clean: [102, 96, 96, 98, 90], sand: [110, 106, 106, 110, 100] }; // lb/ft³, typical supplier values (owner, Oct 21)
  const pbWtSt = {};
  const pbWtS = (c) => pbWtSt[c] || (pbWtSt[c] = { k: '', st: '', ss: '', cv: '', cu: 'tpy', gen: 0, yd3: null });
  const pbWtTrim = (n, d) => String(Number(Number(n).toFixed(d)));
  function pbWtR1(t) {
    const x = t * 10, f = Math.floor(x), n = Math.abs(x - f - 0.5) < 1e-7 ? (f % 2 === 0 ? f : f + 1) : Math.round(x);
    return (n / 10).toFixed(1);
  }
  function pbWtDensity(S) {
    if (S.k === 'custom') {
      const raw = String(S.cv || '').trim(), v = Number(raw);
      if (raw === '') return { err: 'Type the density.' };
      if (!Number.isFinite(v) || v <= 0) return { err: 'Enter a density greater than zero.' };
      if (S.cu === 'tpy' && v >= 20) return { err: v + ' looks like lb/ft³. Tap lb/ft³.' };
      if (S.cu === 'lb' && v < 20) return { err: v + ' looks like t/yd³. Tap t/yd³.' };
      return S.cu === 'lb' ? { lb: v, tpy: v / PB_WT_LB_PER_TPY } : { tpy: v, lb: v * PB_WT_LB_PER_TPY };
    }
    if (S.k === 'sup') {
      const si = PB_WT_SUP_SRC.findIndex(x => x[0] === S.ss);
      if (!PB_WT_SUP_LB[S.st]) return { err: 'Pick the type.' };
      if (si < 0) return { err: 'Pick the rock source.' };
      const lb = PB_WT_SUP_LB[S.st][si];
      return { lb, tpy: lb * 27 / 2000 };
    }
    const p = PB_MAT_PRESETS.find(x => x.k === S.k);
    return p ? { tpy: p.density, lb: p.density * PB_WT_LB_PER_TPY } : { err: 'Pick a material to see tons.' };
  }
  function pbWtOutHtml(c) {
    const S = pbWtS(c), D = pbWtDensity(S);
    if (D.err) return '<p class="pb-answer-sub pb-wt-msg">' + escapeHtml(D.err) + '</p>';
    const f = pbMatFactor('yd3', { unit: 'ton', density_tpy: D.tpy }), a = PB_MAT_DEFAULT_EXTRA_PCT;
    const raw = S.yd3 * f, ydA = S.yd3 * (1 + a / 100), withA = ydA * f, d = pbWtTrim(D.tpy, 4);
    return '<div class="pb-answer-box pb-wt-raw"><div class="pb-answer-label">Weight, no allowance (estimate)</div><div class="pb-answer-val" data-tons="' + raw + '">≈ ' + pbWtR1(raw) + ' tons</div>'
      + '<div class="pb-answer-sub">' + escapeHtml(S.yd3.toFixed(2) + ' yd³ × ' + d + ' t/yd³ (' + pbWtTrim(D.lb, 1) + ' lb/ft³) = ' + raw.toFixed(2) + ' t') + '</div></div>'
      + '<div class="pb-answer-box pb-wt-comp"><div class="pb-answer-label">With ' + a + '% compaction allowance (estimate)</div><div class="pb-answer-val" data-tons="' + withA + '">≈ ' + pbWtR1(withA) + ' tons</div>'
      + '<div class="pb-answer-sub">' + escapeHtml('Added to the yd³ before converting: ' + S.yd3.toFixed(2) + ' + ' + a + '% = ' + ydA.toFixed(2) + ' yd³, × ' + d + ' = ' + withA.toFixed(2) + ' t') + '</div></div>'
      + '<p class="pb-answer-sub pb-wt-note">Estimate. Verify the density with your supplier.</p>';
  }
  const pbWtBtn = (c, act, val, on, main, sub) => '<button type="button" aria-pressed="' + on + '" data-wt="' + act + ':' + val + '" onclick="pbWtSet(\'' + c + '\',\'' + act + '\',\'' + val + '\')"><span class="pb-wt-n">' + escapeHtml(main) + '</span>' + (sub ? '<span class="pb-wt-d">' + escapeHtml(sub) + '</span>' : '') + '</button>';
  function pbWtPanelInner(c) {
    const S = pbWtS(c);
    let h = '<div class="pb-answer-label">Weight in tons</div><div class="pb-toggle pb-toggle-wrap pb-wt-pick" role="group" aria-label="Material">'
      + PB_MAT_PRESETS.map(p => pbWtBtn(c, 'k', p.k, S.k === p.k, p.name, pbMatDens2(p.density) + ' t/yd³ · ' + pbWtTrim(p.density * PB_WT_LB_PER_TPY, 0) + ' lb/ft³')).join('')
      + pbWtBtn(c, 'k', 'sup', S.k === 'sup', 'Typical supplier values', 'Type, then rock source') + pbWtBtn(c, 'k', 'custom', S.k === 'custom', 'Custom', 'Type a density') + '</div>';
    if (S.k === 'sup') {
      h += '<div class="pb-wt-step">Typical supplier values: type</div><div class="pb-toggle pb-toggle-wrap pb-wt-type" role="group" aria-label="Type">' + PB_WT_SUP_TYPES.map(t => pbWtBtn(c, 'st', t[0], S.st === t[0], t[1], '')).join('') + '</div>';
      if (PB_WT_SUP_LB[S.st]) h += '<div class="pb-wt-step">Rock source</div><div class="pb-toggle pb-toggle-wrap pb-wt-src" role="group" aria-label="Rock source">'
        + PB_WT_SUP_SRC.map((s, i) => { const lb = PB_WT_SUP_LB[S.st][i]; return pbWtBtn(c, 'ss', s[0], S.ss === s[0], s[1], lb + ' lb/ft³ · ' + pbMatDens2(lb * 27 / 2000) + ' t/yd³'); }).join('') + '</div>';
    }
    if (S.k === 'custom') h += '<div class="pb-wt-cust"><div class="pb-field"><label for="pbWtCv-' + c + '">Density</label><input id="pbWtCv-' + c + '" type="text" inputmode="decimal" autocomplete="off" value="' + escapeHtml(S.cv) + '" oninput="pbWtCustom(\'' + c + '\', this.value)"></div>'
      + '<div class="pb-toggle pb-wt-cu" role="group" aria-label="Density unit">' + pbWtBtn(c, 'cu', 'tpy', S.cu === 'tpy', 't/yd³', '') + pbWtBtn(c, 'cu', 'lb', S.cu === 'lb', 'lb/ft³', '') + '</div></div>';
    return h + '<div class="pb-wt-out" id="pbWtOut-' + c + '" aria-live="polite">' + pbWtOutHtml(c) + '</div>';
  }
  // A calculator's result calls this with its in-place volume; '' when there is none.
  function pbWtHtml(c, yd3) {
    const S = pbWtS(c);
    S.yd3 = Number.isFinite(yd3) && yd3 > 0 ? yd3 : null;
    if (S.yd3 === null) return '';
    pbWtLoad(c);
    return '<div class="pb-wt" id="pbWt-' + c + '">' + pbWtPanelInner(c) + '</div>';
  }
  function pbWtPaint(c) { const el = document.getElementById('pbWt-' + c); if (el && pbWtS(c).yd3 !== null) el.innerHTML = pbWtPanelInner(c); }
  function pbWtSave(c) { const S = pbWtS(c); S.gen++; pbSet('calcWeight_' + c, JSON.stringify({ k: S.k, st: S.st, ss: S.ss, cv: S.cv, cu: S.cu })); }
  // the signed-in person's last choice for this calculator (a tap made while it loads wins)
  function pbWtLoad(c) {
    const S = pbWtS(c), gen = S.gen;
    Promise.resolve(pbGet('calcWeight_' + c)).then(v => {
      if (S.gen !== gen) return;
      let o = null; try { o = v ? JSON.parse(v) : null; } catch (e) { o = null; }
      const str = (x) => typeof x === 'string' ? x.slice(0, 20) : '';
      const nk = o && typeof o === 'object' ? { k: str(o.k), st: str(o.st), ss: str(o.ss), cv: str(o.cv), cu: o.cu === 'lb' ? 'lb' : 'tpy' } : { k: '', st: '', ss: '', cv: '', cu: 'tpy' };
      if (['k', 'st', 'ss', 'cv', 'cu'].every(f => S[f] === nk[f])) return;
      Object.assign(S, nk); pbWtPaint(c);
    }).catch(() => {});
  }
  window.pbWtSet = function(c, act, val) {
    const S = pbWtS(c);
    if (act === 'k') S.k = val;
    else if (act === 'st') { if (S.st !== val) S.ss = ''; S.st = val; }
    else if (act === 'ss') S.ss = val;
    else if (act === 'cu') S.cu = val === 'lb' ? 'lb' : 'tpy';
    pbWtSave(c); pbWtPaint(c);
    if (act === 'k' && val === 'custom') { const i = document.getElementById('pbWtCv-' + c); if (i && !i.value) i.focus(); }
  };
  window.pbWtCustom = function(c, v) {
    const S = pbWtS(c); S.cv = String(v || '').slice(0, 20); pbWtSave(c);
    const o = document.getElementById('pbWtOut-' + c); if (o) o.innerHTML = pbWtOutHtml(c);
  };
  // Depth / thickness inputs say what they are in inches as you type (0.5 ft = 6 in), so feet and inches can't be mixed up.
  const PB_WT_FTIN = ['volRectD', 'volTrapD', 'volSectorD', 'volEncD', 'beddingThk'];
  function pbWtFtIn(el) {
    if (!el || !el.id || PB_WT_FTIN.indexOf(el.id) < 0 || !el.parentNode) return;
    let e = el.parentNode.querySelector('.pb-wt-ftin');
    if (!e) { e = document.createElement('div'); e.className = 'pb-wt-ftin'; e.id = el.id + 'FtIn'; e.setAttribute('aria-live', 'polite'); el.insertAdjacentElement('afterend', e); }
    const t = String(el.value || '').trim(), v = Number(t);
    e.textContent = t !== '' && Number.isFinite(v) && v > 0 ? t + ' ft = ' + pbWtTrim(v * 12, 2) + ' in' : 'In feet (6 in = 0.5 ft)';
  }
  document.addEventListener('input', (ev) => pbWtFtIn(ev.target));
  PB_WT_FTIN.forEach(id => pbWtFtIn(document.getElementById(id)));
  window.__debugWeight = () => JSON.parse(JSON.stringify(pbWtSt));
  // ==== end feat_weight ====
  const pbMatIsShade = (m) => m && m.source === 'bedding_calc' && m.use_as === 'shading';
"""))

# F04 CSS
R.append(('F04',
""".pbm-presets { display: flex; flex-wrap: wrap; gap: 6px; }""",
""".pbm-presets { display: flex; flex-wrap: wrap; gap: 6px; }
/* feat_weight: the weight picker under calculator volumes (big targets, the app's segmented control) */
#pbApp .pb-wt { margin-top: 16px; }
#pbApp .pb-wt > .pb-answer-label { margin-bottom: 8px; }
#pbApp .pb-wt .pb-toggle { margin-bottom: 10px; }
#pbApp .pb-wt .pb-toggle button { min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; }
#pbApp .pb-wt .pb-toggle-wrap button { flex: 1 1 45%; }
#pbApp .pb-wt-n { font-size: 15px; font-weight: 650; }
#pbApp .pb-wt-d { font-size: 13px; font-weight: 500; opacity: 0.85; font-variant-numeric: tabular-nums; }
#pbApp .pb-wt-step { margin: 2px 0 6px 0; font-size: 14px; font-weight: 600; color: var(--pb-text-2); }
#pbApp .pb-wt-cust { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; }
#pbApp .pb-wt-cust .pb-field { flex: 1 1 auto; min-width: 0; margin: 0; }
#pbApp .pb-wt .pb-wt-cu { flex: 0 0 auto; margin-bottom: 0; }
#pbApp .pb-wt .pb-wt-cu button { min-width: 76px; }
#pbApp .pb-wt-ftin { margin-top: 4px; font-size: 14px; color: var(--pb-text-2); font-variant-numeric: tabular-nums; }"""))

# F05 Material Volume result gets the weight panel
R.append(('F05',
"""volLastArcLabel + ': ' + volLastArcLen.toFixed(2) + ' ft' : ''}</div></div>`;""",
"""volLastArcLabel + ': ' + volLastArcLen.toFixed(2) + ' ft' : ''}</div></div>` + pbWtHtml('volume', cubicYd);"""))

# F06 Structure Bedding: optional pad size
R.append(('F06',
"""id="beddingThk" inputmode="decimal"></div>""",
"""id="beddingThk" inputmode="decimal"></div>
        <div class="pb-row">
          <div class="pb-field"><label>Pad length (ft, optional)</label><input type="number" enterkeyhint="next" step="0.1" id="beddingPadL" inputmode="decimal"></div>
          <div class="pb-field"><label>Pad width (ft, optional)</label><input type="number" enterkeyhint="next" step="0.1" id="beddingPadW" inputmode="decimal"></div>
        </div>"""))

# F07 Structure Bedding: volume + weight when the pad size is given
R.append(('F07',
"""ft down to the bottom of the manhole, ${thk.toFixed(3)} ft of bedding)`;""",
"""ft down to the bottom of the manhole, ${thk.toFixed(3)} ft of bedding)`;
    { // feat_weight: the optional pad size gives the bedding volume (in place) and its weight
      const pl = numVal('beddingPadL'), pw = numVal('beddingPadW');
      if (pl !== null || pw !== null) {
        if (pl === null || pw === null || !(pl > 0) || !(pw > 0) || !Number.isFinite(pl * pw * thk)) resultEl.insertAdjacentHTML('beforeend', '<p class="pb-answer-sub" id="beddingPadMsg">For the bedding volume, enter both pad length and width (ft, greater than zero).</p>');
        else {
          const yd3 = pl * pw * thk / 27;
          resultEl.insertAdjacentHTML('beforeend', '<div class="pb-answer-box" id="beddingVolBox"><div class="pb-answer-label">Bedding Volume (estimate)</div><div class="pb-answer-val">' + yd3.toFixed(2) + ' yd³</div><div class="pb-answer-sub">' + pl + ' ft × ' + pw + ' ft × ' + thk + ' ft thick (' + pbWtTrim(thk * 12, 2) + ' in), in place</div></div>' + pbWtHtml('bedding', yd3));
          lastBeddingResultText += `; bedding volume ${yd3.toFixed(2)} yd³ in place (pad ${pl} × ${pw} ft, estimate)`;
        }
      }
    }"""))

# F08 / F09 the weight picker only re-displays the same volume: it must not mark the calculator's answer stale
R.append(('F08',
"""    const tg = btn.closest('.pb-toggle');""",
"""    if (btn.closest('.pb-wt')) return; // feat_weight: the weight picker doesn't change the volume
    const tg = btn.closest('.pb-toggle');"""))
R.append(('F09',
"""if (cfg && !(cfg.ignore || []).some(id => el.closest('#' + id))) pbCalcSetStale(screen, true);""",
"""if (cfg && !el.closest('.pb-wt') && !(cfg.ignore || []).some(id => el.closest('#' + id))) pbCalcSetStale(screen, true);"""))


def apply(s):
    for iid, old, new in R:
        n = s.count(old)
        assert n == 1, '%s: expected exactly 1 match, found %d' % (iid, n)
        s = s.replace(old, new, 1)
    return s


if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    s = apply(open(src, encoding='utf-8').read())
    open(out, 'w', encoding='utf-8').write(s)
    print('applied feat_weight: %d replacements' % len(R))
