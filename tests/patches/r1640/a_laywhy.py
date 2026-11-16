import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""<span class="pb-fit-auto" id="' + prefix + 'FitLayAuto" hidden>auto</span></div></div>' /* feat_fitlen */""",
    """<span class="pb-fit-auto" id="' + prefix + 'FitLayAuto" hidden>auto</span></div><p class="pb-ai-hint" id="' + prefix + 'FitLayWhy" hidden></p></div>' /* feat_fitlen; r16.40: why it's blank */""")
rep("""    const v = pbFitDefaultLayFt(t ? t.value : '', i ? i.value : '', id, pbFitLayPipeType());
    if (v === null) { if (pbFitLayIsAuto(prefix)) { el.value = ''; pbFitLaySetAuto(prefix, false); } return; }
    el.value = fmt(v, 2); pbFitLaySetAuto(prefix, true);
  }""", """    const v = pbFitDefaultLayFt(t ? t.value : '', i ? i.value : '', id, pbFitLayPipeType());
    if (v === null) { if (pbFitLayIsAuto(prefix)) { el.value = ''; pbFitLaySetAuto(prefix, false); } pbFitLayWhy(prefix); return; }
    el.value = fmt(v, 2); pbFitLaySetAuto(prefix, true); pbFitLayWhy(prefix);
  }
  // r16.40: a blank laying length says why it wasn't filled in.
  function pbFitLayWhy(prefix) {
    const w = document.getElementById(prefix + 'FitLayWhy'), el = document.getElementById(prefix + 'FitLay'); if (!w || !el) return;
    let t = '';
    if (pbFitSnap(prefix) && String(el.value || '').trim() === '') {
      const ty = (document.getElementById(prefix + 'FitType') || {}).value || '', info = (document.getElementById(prefix + 'FitInfo') || {}).value || '';
      let id = null; try { const f = getPointIdFt(prefix); id = f === null ? null : f * 12; } catch (e) {}
      const pipe = pbFitLayPipeType();
      if (!ty) t = 'Choose the fitting type to fill this in.';
      else if (ty === 'bend' && pbFitAngleOf(String(info).toUpperCase()) === null) t = 'Choose the bend angle to fill this in.';
      else if (ty === 'other') t = '';
      else if (id === null) t = 'Choose the Pipe ID to fill this in.';
      else if (pbFitDefaultLayFt(ty, info, id, pipe) === null) t = 'No laying length on file for this ' + (pipe && pipe !== 'Other' ? pipe + ' ' : '') + 'fitting. Type it from the fitting.';
    }
    w.textContent = t; w.hidden = !t;
  }
  document.addEventListener('input', (ev) => { const m = ev.target && ev.target.id && /^(.+)FitLay$/.exec(ev.target.id); if (m) pbFitLayWhy(m[1]); }, true);""")
# also refresh the hint whenever the angle sync runs (type / angle / size changes)
rep("""    if (!bend) return;
    let ang = null; try { ang = pbFitAngleOf(String(i ? i.value : '').toUpperCase()); } catch (e) {}""",
    """    try { setTimeout(() => pbFitLayWhy(prefix), 0); } catch (e) {}
    if (!bend) return;
    let ang = null; try { ang = pbFitAngleOf(String(i ? i.value : '').toUpperCase()); } catch (e) {}""")
open(out, 'w', encoding='utf-8').write(s)
