import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.95 newrun-short (owner, Nov 17: "I'm okay with shortening the New Run form if it's still everything we need").
# The empty New Run showed every setting before a single number (3,805 px at 390 px wide). Up front now: job, pipe size
# and type, the stake photos button, Start / Hubs / End, Review & Calculate. Behind ONE fold, "More settings", between
# Job & Pipe and Points: Rod unit, Instrument (HI method), Pipe wall & laying length, Intervals, Trench design and the
# run's Total distance (the same number as the End Point's distance box, which mirrors it). "Add Additional Run" sits in
# its own small fold at the bottom. NOTHING is removed and no id moves or changes; elements are moved, not rebuilt.
# Safety: (1) the closed fold's line states every setting that changes the numbers: rod unit, HI method, wall (auto or
# typed), laying length, interval, trench, so nobody runs with a wrong setting unseen; (2) a fold opens by itself when it
# holds a value that is not this person's normal starting value (typed, or put there by Resume, Edit Run Data, a draft,
# Reuse, a cutsheet import), a field to fix, a showing warning, or focus; pbGoToField already opens every folded parent;
# (3) the HI cross-check warning ("stake shots disagree") moves out of the fold, to just above the Start Point, so it is
# never folded away. "Normal starting value" = what a new form starts with on this phone: the remembered rod unit, the
# remembered laying length / "Use laying length", the remembered wall thickness (when Remember is on), interval 10 ft,
# HI from stakes, no trench values; an app-filled (auto) wall or laying length counts as normal and its line says (auto).
# A fold the person closes stays closed until something in it changes; a new run starts with both folds closed.

# --- 1. Rod Unit leaves Job & Pipe (r16.48 moved it into Points at run time; now it lives in More settings) ---
rep("""    <div class="pb-section">
      <div class="pb-tag">Rod Unit</div>
      <div class="pb-body">
        <div class="pb-toggle pb-rodseg" id="rodToggle">
          <button data-val="lenker">Lenker<span class="pb-sr"> Rod</span></button>
          <button data-val="engineer" class="active">Engineer's<span class="pb-sr"> Rod</span></button>
          <button data-val="architect">Architect's<span class="pb-sr"> Rod</span></button>
        </div>
      </div>
    </div>

    <div class="pb-section" id="runPipeSection">""", """    <div class="pb-section" id="runPipeSection">""")

# --- 2. Wall thickness / laying length row and Remember leave Pipe details ---
rep("""        <div class="pb-row pb-pipepair pb-pipe-auto" id="runWTRow">
          <div class="pb-field"><label for="runWT">Wall thickness<span class="pb-sr"> (ft)</span></label><div class="pb-unitbox"><input type="number" enterkeyhint="next" step="0.001" id="runWT" inputmode="decimal" placeholder="e.g. 0.08" aria-required="true"><span class="pb-unit" aria-hidden="true">ft</span></div></div>
        </div>
        <label class="pb-checkrow pb-remember" style="display:flex; align-items:center; gap:8px; margin:8px 16px 0 16px; cursor:pointer;">
          <input type="checkbox" id="runRememberWtId" style="margin-top:0;">
          <span class="pb-help" style="margin:0;">Remember wall thickness and pipe ID for the next run</span>
        </label>
      </div>
    </div>

    </details>
""", """      </div>
    </div>

    </details>

    <details class="pb-runsec pb-nr-more" id="runSecMore"><!-- r16.95 newrun-short: settings the common run leaves as they are -->
      <summary class="pb-runsec-head"><span class="pb-runsec-title">More settings</span><span class="pb-runsec-sum" id="runSecMoreSum"></span><span class="pb-runsec-flag" id="runSecMoreFlag"></span></summary>
    <div class="pb-section">
      <div class="pb-tag">Rod Unit</div>
      <div class="pb-body">
        <div class="pb-toggle pb-rodseg" id="rodToggle">
          <button data-val="lenker">Lenker<span class="pb-sr"> Rod</span></button>
          <button data-val="engineer" class="active">Engineer's<span class="pb-sr"> Rod</span></button>
          <button data-val="architect">Architect's<span class="pb-sr"> Rod</span></button>
        </div>
      </div>
    </div>
    <div class="pb-section" id="runHiSection">
      <div class="pb-tag">Instrument</div>
      <div class="pb-body">
        <div id="hiFields" style="margin-top:10px; border-top:1px solid var(--paper-2); padding-top:10px;">
          <label class="pb-b3-sublabel" style="display:block; font-size:12px; font-weight:600; color:var(--ink-soft); margin-bottom:6px;">Height of Instrument (HI)</label>
          <div class="pb-toggle" id="hiToggle">
            <button data-val="stakes" class="active">Calculate from Stakes</button>
            <button data-val="bm">Benchmark + Backsight</button>
            <button data-val="direct">I know my HI</button>
          </div>
          <div id="hiStakesFields">
            <div class="pb-derived" id="hiStakesDerived" style="display:none !important;"></div>
          </div>
          <div id="hiBmFields" style="display:none;">
            <div class="pb-row" id="hiBmRow"></div>
            <div class="pb-derived" id="hiBmDerived" style="display:none !important;"></div>
          </div>
          <div id="hiDirectFields" style="display:none;">
            <div id="hiDirectRow"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="pb-section" id="runWallSection">
      <div class="pb-tag">Pipe Wall &amp; Laying Length</div>
      <div class="pb-body">
        <div class="pb-row pb-pipepair pb-pipe-auto" id="runWTRow">
          <div class="pb-field"><label for="runWT">Wall thickness<span class="pb-sr"> (ft)</span></label><div class="pb-unitbox"><input type="number" enterkeyhint="next" step="0.001" id="runWT" inputmode="decimal" placeholder="e.g. 0.08" aria-required="true"><span class="pb-unit" aria-hidden="true">ft</span></div></div>
        </div>
        <label class="pb-checkrow pb-remember" style="display:flex; align-items:center; gap:8px; margin:8px 16px 0 16px; cursor:pointer;">
          <input type="checkbox" id="runRememberWtId" style="margin-top:0;">
          <span class="pb-help" style="margin:0;">Remember wall thickness and pipe ID for the next run</span>
        </label>
      </div>
    </div>
    <div class="pb-section" id="runLengthSection">
      <div class="pb-tag">The Run</div>
      <div class="pb-body">
        <div class="pb-row">
          <div class="pb-field"><label>Total distance (ft)</label><input type="number" enterkeyhint="next" step="0.1" id="totalDist" inputmode="decimal" placeholder="e.g. 150"><input type="hidden" id="runTurnAt" value=""></div>
          <div class="pb-field"><label>Interval (ft)</label><input type="number" enterkeyhint="next" step="0.5" id="interval" value="10" inputmode="decimal"></div>
        </div>
      </div>
    </div>
    </details>
""")

# --- 3. The Instrument box leaves Points (into More settings, above); its HI cross-check warning stays in Points ---
rep("""    <div class="pb-section" id="runHiSection">
      <div class="pb-tag">Instrument</div>
      <div class="pb-body">
        <div id="hiCrossCheckBox"></div>
        <div id="hiFields" style="margin-top:10px; border-top:1px solid var(--paper-2); padding-top:10px;">
          <label class="pb-b3-sublabel" style="display:block; font-size:12px; font-weight:600; color:var(--ink-soft); margin-bottom:6px;">Height of Instrument (HI)</label>
          <div class="pb-toggle" id="hiToggle">
            <button data-val="stakes" class="active">Calculate from Stakes</button>
            <button data-val="bm">Benchmark + Backsight</button>
            <button data-val="direct">I know my HI</button>
          </div>
          <div id="hiStakesFields">
            <div class="pb-derived" id="hiStakesDerived" style="display:none !important;"></div>
          </div>
          <div id="hiBmFields" style="display:none;">
            <div class="pb-row" id="hiBmRow"></div>
            <div class="pb-derived" id="hiBmDerived" style="display:none !important;"></div>
          </div>
          <div id="hiDirectFields" style="display:none;">
            <div id="hiDirectRow"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="pb-section start pb-pt">
      <div class="pb-tag">Start Point</div>""", """    <div id="hiCrossCheckBox"></div><!-- r16.95 newrun-short: the HI cross-check is never folded away -->

    <div class="pb-section start pb-pt">
      <div class="pb-tag">Start Point</div>""")

# --- 4. The Run (total distance + interval) moves into More settings (above); r16.53 moves the interval to Intervals ---
rep("""    <div class="pb-section" id="runLengthSection">
      <div class="pb-tag">The Run</div>
      <div class="pb-body">
        <div class="pb-row">
          <div class="pb-field"><label>Total distance (ft)</label><input type="number" enterkeyhint="next" step="0.1" id="totalDist" inputmode="decimal" placeholder="e.g. 150"><input type="hidden" id="runTurnAt" value=""></div>
          <div class="pb-field"><label>Interval (ft)</label><input type="number" enterkeyhint="next" step="0.5" id="interval" value="10" inputmode="decimal"></div>
        </div>
      </div>
    </div>

    <div class="pb-btn-wrap" id="addReducerBtnWrap"><button class="pb-btn secondary" onclick="pbAddReducerSegment()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-plus"/></svg>Add Additional Run</button></div>
    <p class="pb-help pb-b3-lead">Same HI only. Moved the instrument? Lock this run and start a New Run.</p>
""", """    <details class="pb-subrow pb-nr-seg" id="runSegGroup"><summary><span class="pb-subrow-t">Additional runs</span><span class="pb-subrow-sum" id="runSegGroupSum">None &middot; same HI only</span></summary><!-- r16.95 newrun-short -->
    <div class="pb-btn-wrap" id="addReducerBtnWrap"><button class="pb-btn secondary" onclick="pbAddReducerSegment()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-plus"/></svg>Add Additional Run</button></div>
    <p class="pb-help pb-b3-lead">Same HI only. Moved the instrument? Lock this run and start a New Run.</p>
    </details>
""")

# --- 5. r16.48 / r16.53 run-time layout: don't pull the rod, Intervals or Trench design back out of More settings ---
rep("""      if (rodSec && pts && rodSec.parentNode !== pts) { var sm = pts.querySelector(':scope > summary'); if (sm) pts.insertBefore(rodSec, sm.nextSibling); }""",
    """      if (rodSec && pts && rodSec.parentNode !== pts && !rodSec.closest('#runSecMore')) { var sm = pts.querySelector(':scope > summary'); if (sm) pts.insertBefore(rodSec, sm.nextSibling); } /* r16.95: More settings keeps it */""")
rep("""      var order = [grp, pc, ic, bed].filter(Boolean);""",
    """      var mo = document.getElementById('runSecMore'), ls = document.getElementById('runLengthSection'); /* r16.95: Intervals and Trench design live in More settings */
      if (mo && ls && ls.parentNode === mo) [ic, bed].forEach(function (x) { if (x && x.parentNode !== mo) mo.insertBefore(x, ls); });
      var order = [grp, pc, ic, bed].filter(function (x) { return x && !x.closest('#runSecMore'); });""")

# --- 6. The folds' logic (inside the run-form code: it reads the form, never writes a value) ---
rep("""  window.pbRunSecOpenAll = function() { PB_RUN_SECS.forEach(id => { const d = document.getElementById(id); if (d) d.open = true; }); pbRunSecSchedule(); };""",
    """  window.pbRunSecOpenAll = function() { PB_RUN_SECS.forEach(id => { const d = document.getElementById(id); if (d) d.open = true; }); pbRunSecSchedule(); };
  // r16.95 newrun-short: "More settings" and "Additional runs" (see the patch notes). Display only: reads the form for the
  // closed lines and opens a fold; never writes a field, a toggle or the run.
  (function() {
    const FOLDS = ['runSecMore', 'runSegGroup'];
    let nrGen = null, nrWtMem = null, nrWtGen = null, nrSig = {}, nrTimer = null, nrSettle = 0;
    const v = (id) => { const el = document.getElementById(id); return el ? String(el.value == null ? '' : el.value).trim() : ''; };
    const same = (a, b) => a === null ? b === null : (b !== null && Math.abs(a - b) < 0.0005);
    function nrMem() {
      const g = pbFormGen; if (nrWtGen === g) return;
      nrWtGen = g; nrWtMem = undefined;
      try { Promise.resolve(pbGet('lastWallThickness')).then(x => { if (nrWtGen === g) { nrWtMem = x == null ? '' : String(x).trim(); nrSchedule(); } }).catch(() => { nrWtMem = ''; }); } catch (e) { nrWtMem = ''; }
    }
    // What the More settings fold holds that is not this phone's normal start for a new run (each one opens it).
    function nrMoreOdd() {
      const odd = [], rodV = activeVal('rodToggle');
      if (rodV !== 'lenker' && activeVal('hiToggle') !== 'stakes') odd.push('hi');
      const wt = v('runWT');
      if (wt !== '' && !pbPiAIsAuto('runWT') && nrWtMem !== undefined) {
        const rem = document.getElementById('runRememberWtId');
        if (!(rem && rem.checked && nrWtMem !== '' && Number(wt) === Number(nrWtMem))) odd.push('wt:' + wt);
      }
      const c = pbLayCfg(1), r = pbLayRemembered || { on: false, len: null, div: 'halves' };
      if (c.len !== null && !c.lenAuto && !same(c.len, r.len)) odd.push('len:' + c.len);
      if (c.on !== !!r.on || (c.on && c.div !== (r.div || 'halves'))) odd.push('lay:' + c.on + c.div);
      const iv = document.getElementById('interval');
      if (iv && v('interval') !== '10' && !(iv.dataset.rsAuto !== undefined && iv.value === iv.dataset.rsAuto)) odd.push('iv:' + v('interval'));
      const bs = document.getElementById('runBeddingSection');
      if (bs) bs.querySelectorAll('input, select').forEach(el => {
        if (el.type === 'hidden' || el.type === 'file') return;
        if (el.tagName === 'SELECT') { const d = Array.from(el.options).findIndex(o => o.defaultSelected); if (el.selectedIndex !== (d < 0 ? 0 : d)) odd.push('tr:' + el.id); }
        else if (String(el.value || '').trim() !== '') odd.push('tr:' + (el.id || el.className));
      });
      if (!same(numVal('totalDist'), numVal('endSta'))) odd.push('tot:' + v('totalDist'));
      return odd;
    }
    function nrSegOdd() { const a = []; for (let n = 2; n <= MAX_SEG; n++) if (segIsActive(n)) a.push(n); return a; }
    function nrMoreSum() {
      const rodV = activeVal('rodToggle'), sep = ' \\u00b7 ', p = [];
      p.push({ lenker: 'Lenker rod', engineer: 'Engineer\\u2019s rod', architect: 'Architect\\u2019s rod' }[rodV] || 'Rod unit not chosen');
      if (rodV !== 'lenker') {
        const src = activeVal('hiToggle');
        if (src === 'stakes') p.push('HI from stake shots');
        else if (src === 'bm') { let hi = null; try { hi = computeHI(); } catch (e) {} p.push(hi !== null && isFinite(hi) ? 'HI ' + fmtReading(hi, rodV) + ' (benchmark)' : 'HI from benchmark, not entered'); }
        else { let hi = null; try { hi = getElevVal('hiDirect'); } catch (e) {} p.push(hi !== null && isFinite(hi) ? 'HI ' + (isArch() ? toArch(hi) : fmt(hi, 2)) + ' (typed)' : 'HI typed, not entered'); }
      }
      const wt = v('runWT'); p.push(wt ? wt + ' ft wall' + pbPiAWord(pbPiAIsAuto('runWT')) : 'wall thickness not entered');
      const c = pbLayCfg(1);
      if (c.len !== null) p.push(c.len + ' ft laying length' + pbPiAWord(c.lenAuto));
      p.push(pbLayRunSecWords() || (v('interval') ? v('interval') + ' ft interval' : 'interval not entered'));
      const bed = document.getElementById('runBedRowSum'), bt = bed ? String(bed.textContent || '').trim() : '';
      p.push(bt && bt !== 'Not set' ? 'Trench: ' + bt : 'trench not set');
      if (!same(numVal('totalDist'), numVal('endSta'))) p.push(v('totalDist') ? 'total ' + v('totalDist') + ' ft' : 'total distance not entered');
      return p.join(sep);
    }
    function nrShownWarn(f) { return Array.from(f.querySelectorAll('.pb-inline-warn, .pb-warn')).filter(w => pbRunSecShown(w, f)).length; }
    function nrCheck() {
      nrTimer = null;
      try {
        const more = document.getElementById('runSecMore'), seg = document.getElementById('runSegGroup');
        if (!more || !seg) return;
        nrMem();
        const fresh = nrGen !== pbFormGen; // a new form (new run, resumed run, Edit Run Data): both folds start closed
        if (fresh) { nrGen = pbFormGen; nrSig = {}; nrSettle = Date.now() + 700; FOLDS.forEach(id => { const d = document.getElementById(id); if (d && d.open) d.open = false; }); }
        const settling = Date.now() < nrSettle; // a new form is still being filled by the app: decide once it has settled
        const set = (id, t) => { const el = document.getElementById(id); if (el && el.textContent !== t) el.textContent = t; };
        set('runSecMoreSum', nrMoreSum());
        const sg = nrSegOdd(); set('runSegGroupSum', sg.length ? (sg.length === 1 ? 'Run ' + sg[0] : 'Runs ' + sg[0] + '\\u2013' + sg[sg.length - 1]) + ' added below' : 'None \\u00b7 same HI only');
        [[more, nrMoreOdd()], [seg, sg]].forEach(([f, odd]) => {
          const bad = f.querySelectorAll('[aria-invalid="true"]').length, warn = nrShownWarn(f);
          if (f === more) set('runSecMoreFlag', [bad ? bad + (bad === 1 ? ' field to fix' : ' fields to fix') : '', warn ? warn + (warn === 1 ? ' warning' : ' warnings') : ''].filter(Boolean).join(' \\u00b7 '));
          const sig = JSON.stringify([odd, bad, warn]), want = odd.length || bad || warn;
          if (settling) { if (bad && !f.open) f.open = true; if (settling) return; }
          if (want && sig !== nrSig[f.id] && !f.open) f.open = true; // something new in it: shown, never folded away unseen
          nrSig[f.id] = sig;
        });
      } catch (e) { console.error('r16.95 newrun-short', e); }
    }
    function nrSchedule() { if (!nrTimer) nrTimer = setTimeout(nrCheck, Math.max(60, nrSettle - Date.now() + 20)); }
    window.pbNrFoldCheck = nrCheck;
    function nrWire() {
      FOLDS.forEach(id => {
        const d = document.getElementById(id); if (!d || d.dataset.nrWired) return; d.dataset.nrWired = '1';
        d.addEventListener('focusin', (ev) => { if (!d.open && ev.target && !ev.target.closest('summary')) d.open = true; }, true);
        new MutationObserver(() => { if (!d.open && d.querySelector('[aria-invalid="true"]')) d.open = true; }).observe(d, { subtree: true, attributes: true, attributeFilter: ['aria-invalid'] });
        d.addEventListener('toggle', () => { try { nrCheck(); } catch (e) {} });
      });
    }
    ['input', 'change', 'click'].forEach(t => document.addEventListener(t, (ev) => { const tg = ev.target; if (tg && tg.closest && tg.closest('#screen-input')) nrSchedule(); }, true));
    (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push((name) => { if (name === 'input') { nrWire(); nrSchedule(); setTimeout(nrCheck, 450); } });
    setInterval(() => { try { if (pbCurrentScreen === 'input') nrCheck(); } catch (e) {} }, 800); // Resume, drafts, Reuse and imports fill the form without events
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', nrWire); else nrWire();
    // A hub, crossing or run added anywhere is shown: every folded section around it opens.
    const nrOpenAround = (el) => { for (let d = el && el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) if (!d.open) d.open = true; };
    [['pbAddHub', () => document.querySelector('#hubsContainer > [data-hub-id]:last-child')], ['pbAddHub2', () => document.querySelector('#hubsContainer2 > [data-hub-id]:last-child')],
     ['pbAddHubN', (n) => document.querySelector('#hubsContainer' + n + ' > [data-hub-id]:last-child')], ['pbAddReducerSegment', () => document.getElementById('reducerSegmentWrap')],
     ['pbAddSeg', (n) => document.getElementById('seg' + n + 'Wrap')]].forEach(([name, find]) => {
      const f0 = window[name]; if (typeof f0 !== 'function' || f0.__nr) return;
      const f1 = function() { const r = f0.apply(this, arguments); try { nrOpenAround(find.apply(null, arguments)); nrSchedule(); } catch (e) {} return r; };
      f1.__nr = true; window[name] = f1;
    });
    // Resume, Edit Run Data, a kept draft and Reuse show everything the run used: a fold holding any of it opens again,
    // even one the person had closed.
    const nrReveal = () => { nrSig = {}; nrCheck(); };
    window.addEventListener('load', () => setTimeout(() => {
      ['pbEditRunData', 'pbResumeIncompleteRun', 'pbRdContinue', 'pbApplyDuplicateRun', 'pbResumeRunFromRecord'].forEach(name => {
        const f0 = window[name]; if (typeof f0 !== 'function' || f0.__nrR) return;
        const f1 = function() { const r = f0.apply(this, arguments); setTimeout(nrReveal, 300); setTimeout(nrReveal, 1500); try { if (r && typeof r.then === 'function') r.then(() => setTimeout(nrReveal, 300), () => {}); } catch (e) {} return r; };
        f1.__nrR = true; window[name] = f1;
      });
    }, 0));
  })();""")

# --- 7. Styles: the closed line wraps (never cut off: it states the rod unit and the settings), glove-sized heads ---
rep("""<!-- r16.48:runsetup-layout -->""", """<style>
/* r16.95 newrun-short */
#pbApp#pbApp #screen-input #runSecMore > summary.pb-runsec-head { min-height: 56px; }
#pbApp#pbApp #screen-input #runSecMore:not([open]) .pb-runsec-sum { display: block; white-space: normal; overflow: visible; text-overflow: clip; overflow-wrap: anywhere; line-height: 1.4; }
#pbApp#pbApp #screen-input #runSecMore[open] .pb-runsec-sum { display: none; }
#pbApp#pbApp #screen-input #runSecMore .pb-runsec-flag:empty { display: none; }
#pbApp#pbApp #screen-input #runSecMore > details.pb-subrow { margin: 12px 16px 12px 16px; }
#pbApp#pbApp #screen-input #runSecMore > details.pb-subrow + .pb-section { border-top: 1px solid var(--pb-divider); }
#pbApp#pbApp #screen-input #runWallSection .pb-field { margin-bottom: 8px; }
#pbApp#pbApp #screen-input #runSegGroup { margin: 12px 16px 12px 16px; }
#pbApp#pbApp #screen-input #runSegGroup > summary { min-height: 52px; }
#pbApp#pbApp #screen-input #runSegGroup > .pb-btn-wrap { padding-top: 4px; }
#pbApp#pbApp #screen-input #runSecPoints > #hiCrossCheckBox:not(:empty) { margin: 12px 16px 0 16px; }
#pbApp#pbApp #screen-input #runSecMore .pb-lay-help { display: none; } /* as it was in Job & Pipe */
#pbApp#pbApp #screen-input #runSecMore details[open] > summary .pb-subrow-sum { display: none; }
</style>
<!-- r16.48:runsetup-layout -->""")

open(out, 'w', encoding='utf-8').write(s)
