import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
# a Branch / Reduces-to list next to the fitting type (wye, tee, reducer); the main size is the run's Pipe ID
rep("""      + '<div class="pb-field pb-fit-angw" id="' + prefix + 'FitAngW" style="display:none;">""",
    """      + '<div class="pb-field pb-fit-brw" id="' + prefix + 'FitBrW" style="display:none;"><label for="' + prefix + 'FitBr" id="' + prefix + 'FitBrL">Branch size</label><select id="' + prefix + 'FitBr"><option value="">Pick size</option></select></div>'
      + '<div class="pb-field pb-fit-angw" id="' + prefix + 'FitAngW" style="display:none;">""")
rep("""      const show = ty === 'wye' || ty === 'tee' || ty === 'reducer' || ty === 'other';
      if (iw) iw.style.display = show ? '' : 'none';""",
    """      const show = ty === 'other';
      if (iw) iw.style.display = show ? '' : 'none';
      try { pbFitBrSync(prefix); } catch (e) { console.error(e); }""")
rep("""  window.pbFitAngSync = pbFitAngSync;""", """  window.pbFitAngSync = pbFitAngSync;
  // r16.40: wye / tee / reducer: the main size is the run's Pipe ID; the other size is picked from a list (what the
  // laying-length table has for that pipe and size first). Kept in the fitting's Sizes text as "8x6".
  const PB_FIT_BR_STD = [2, 3, 4, 6, 8, 10, 12, 15, 18, 21, 24, 27, 30, 36, 42, 48];
  function pbFitBrMain(prefix) { try { const f = getPointIdFt(prefix); return f === null ? null : pbFitSizeKey(Math.round(f * 12 * 1000) / 1000); } catch (e) { return null; } }
  function pbFitBrRead(info, ty) {
    const s = String(info || '').toUpperCase().replace(/\\u00d7/g, 'X'), ab = /(\\d+(?:\\.\\d+)?)\\s*"?\\s*X\\s*(\\d+(?:\\.\\d+)?)/.exec(s);
    if (ab) return pbFitSizeKey(ty === 'reducer' ? Math.min(Number(ab[1]), Number(ab[2])) : ab[2]);
    const lone = /^\\s*(\\d+(?:\\.\\d+)?)\\s*(?:"|IN|INCH)?\\s*$/.exec(s); return lone ? pbFitSizeKey(lone[1]) : null;
  }
  function pbFitBrSync(prefix) {
    const t = document.getElementById(prefix + 'FitType'), w = document.getElementById(prefix + 'FitBrW'), sel = document.getElementById(prefix + 'FitBr'), l = document.getElementById(prefix + 'FitBrL'), i = document.getElementById(prefix + 'FitInfo');
    if (!t || !w || !sel) return;
    const ty = t.value, on = ty === 'wye' || ty === 'tee' || ty === 'reducer';
    w.style.display = on ? '' : 'none'; if (!on) return;
    const main = pbFitBrMain(prefix), red = ty === 'reducer';
    if (l) l.textContent = red ? (main ? 'Reduces ' + main + '" to' : 'Reduces to') : (main ? 'Branch (main ' + main + '")' : 'Branch size');
    let listed = [];
    try { const pipe = pbFitLayPipe(pbFitLayPipeType()), tab = pipe && main ? (PB_FIT_LAY_INDEX[pipe] || {})[red ? 'reducer' : ty] : null; if (tab) listed = Object.keys(tab).filter(k => k.split('x')[0] === main).map(k => Number(k.split('x')[1])).filter(Number.isFinite); } catch (e) {}
    const cur = pbFitBrRead(i ? i.value : '', ty);
    let sizes = Array.from(new Set(listed.concat(PB_FIT_BR_STD.filter(n => !main || (red ? n < Number(main) : n <= Number(main)))).concat(cur ? [Number(cur)] : []))).sort((a, b) => a - b);
    const key = sizes.join(',');
    if (sel.dataset.sizes !== key) { sel.innerHTML = '<option value="">Pick size</option>' + sizes.map(n => '<option value="' + pbFitSizeKey(n) + '">' + pbFitSizeKey(n) + '"</option>').join(''); sel.dataset.sizes = key; }
    sel.value = cur && Array.from(sel.options).some(o => o.value === cur) ? cur : '';
  }
  function pbFitBrWrite(prefix) {
    const t = document.getElementById(prefix + 'FitType'), sel = document.getElementById(prefix + 'FitBr'), i = document.getElementById(prefix + 'FitInfo'); if (!t || !sel || !i) return;
    const br = sel.value, main = pbFitBrMain(prefix);
    const rest = String(i.value || '').replace(/\\d+(?:\\.\\d+)?\\s*"?\\s*[xX\\u00d7]\\s*\\d+(?:\\.\\d+)?\\s*"?/g, ' ').replace(/(?:^|\\s)\\d+(?:\\.\\d+)?\\s*(?:"|IN\\b|INCH\\b)?(?=\\s|$)/gi, ' ').replace(/\\s+/g, ' ').trim();
    const sz = br ? (main ? main + 'x' + br : br) : '';
    const v = [rest, sz].filter(Boolean).join(' ');
    if (i.value !== v) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  document.addEventListener('change', (ev) => { const m = ev.target && ev.target.id && /^(.*)FitBr$/.exec(ev.target.id); if (m) pbFitBrWrite(m[1]); }, true);
  // A run's Pipe ID changed: its wyes / tees / reducers keep their picked size with the new main size.
  ['input', 'change'].forEach(tp => document.addEventListener(tp, (ev) => {
    const m = ev.target && ev.target.id && /^(run|seg(\\d+))Id(Sel|Other)$/.exec(ev.target.id); if (!m) return;
    const n = m[2] ? parseInt(m[2], 10) : 1;
    document.querySelectorAll('#screen-input [id$="FitBr"]').forEach(sel => { const p = sel.id.slice(0, -5); try { if (pbRunOfPointId(p) !== n) return; } catch (e) { return; } if (sel.value) pbFitBrWrite(p); pbFitBrSync(p); });
  }, true));""")
# the "why blank" line for branch fittings
rep("""      else if (ty === 'other') t = '';
      else if (id === null) t = 'Choose the Pipe ID to fill this in.';""",
    """      else if (ty === 'other') t = '';
      else if (id === null) t = 'Choose the Pipe ID to fill this in.';
      else if ((ty === 'wye' || ty === 'tee' || ty === 'reducer') && !pbFitBrRead(info, ty)) t = ty === 'reducer' ? 'Choose the size it reduces to.' : 'Choose the branch size to fill this in.';""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
old = """    const v = pbFitDefaultLayFt(t ? t.value : '', i ? i.value : '', id, pbFitLayPipeType());
    if (v === null) { if (pbFitLayIsAuto(prefix))"""
new = """    const brNeed = t && /^(wye|tee|reducer)$/.test(t.value) && !pbFitBrRead(i ? i.value : '', t.value); // r16.40: no guessed branch size
    const v = brNeed ? null : pbFitDefaultLayFt(t ? t.value : '', i ? i.value : '', id, pbFitLayPipeType());
    if (v === null) { if (pbFitLayIsAuto(prefix))"""
assert s.count(old) == 1
s = s.replace(old, new)
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
old = """    if (m) pbFitAngSync(m[1]);
  }, true);"""
new = """    if (m && m[2] === 'FitType' && !/^(wye|tee|reducer)$/.test(tg.value)) { const i = document.getElementById(m[1] + 'FitInfo'); if (i && /^\\s*\\d+(?:\\.\\d+)?\\s*"?\\s*[xX\\u00d7]\\s*\\d+(?:\\.\\d+)?\\s*"?\\s*$/.test(i.value)) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } } // r16.40: a wye's 8x6 doesn't follow it to a bend
    if (m) pbFitAngSync(m[1]);
  }, true);"""
assert s.count(old) == 1
s = s.replace(old, new)
open(out, 'w', encoding='utf-8').write(s)
