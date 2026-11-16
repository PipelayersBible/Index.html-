import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.34 (Tommy, Nov 15): a Bend gets a "Bend angle" pick list (90, 45, 22.5, 11.25). Picking one writes it into
# Size / angle (keeping AP and any size) and fills the laying length.
rep("""      + '<div class="pb-field"><label for="' + prefix + 'FitLay">Laying length (ft)</label>""",
"""      + '<div class="pb-field pb-fit-angw" id="' + prefix + 'FitAngW" style="display:none;"><label for="' + prefix + 'FitAng">Bend angle</label><select id="' + prefix + 'FitAng"><option value="">Pick angle</option><option value="90">90\\u00b0</option><option value="45">45\\u00b0</option><option value="22.5">22.5\\u00b0</option><option value="11.25">11.25\\u00b0</option></select></div>'
      + '<div class="pb-field"><label for="' + prefix + 'FitLay">Laying length (ft)</label>""")
rep("""  function pbFitSnap(prefix) {""", """  // The Bend angle list follows the fitting type and Size / angle (both ways).
  function pbFitAngSync(prefix) {
    const t = document.getElementById(prefix + 'FitType'), w = document.getElementById(prefix + 'FitAngW'), a = document.getElementById(prefix + 'FitAng'), i = document.getElementById(prefix + 'FitInfo');
    if (!t || !w || !a) return;
    const bend = t.value === 'bend'; w.style.display = bend ? '' : 'none';
    if (!bend) return;
    let ang = null; try { ang = pbFitAngleOf(String(i ? i.value : '').toUpperCase()); } catch (e) {}
    const v = ang === null ? '' : String(ang);
    a.value = Array.from(a.options).some(o => o.value === v) ? v : '';
  }
  window.pbFitAngSync = pbFitAngSync;
  function pbFitAngAll() { document.querySelectorAll('#screen-input [id$="FitAng"]').forEach(a => pbFitAngSync(a.id.slice(0, -6))); }
  document.addEventListener('change', (ev) => {
    const tg = ev.target; if (!tg || !tg.id) return;
    let m = /^(.*)FitAng$/.exec(tg.id);
    if (m) {
      const p = m[1], i = document.getElementById(p + 'FitInfo'); if (!i) return;
      const rest = String(i.value || '').replace(/\\b\\d+(?:\\.\\d+)?\\s*(?:\\u00b0|DEG\\b)/gi, '').replace(/(?:^|[\\s,])(?:90|45|22\\.5|11\\.25|22|11)(?=$|[\\s,])/g, ' ').replace(/\\s+/g, ' ').trim();
      i.value = tg.value ? (rest ? rest + ' ' : '') + tg.value + '\\u00b0' : rest;
      i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    m = /^(.*)(FitType|FitInfo|FitOn)$/.exec(tg.id); if (m) pbFitAngSync(m[1]);
  }, true);
  document.addEventListener('input', (ev) => { const m = /^(.*)FitInfo$/.exec((ev.target && ev.target.id) || ''); if (m) pbFitAngSync(m[1]); }, true);
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(pbFitAngAll, 0); });
  function pbFitSnap(prefix) {""")
rep("""    try { pbFitLayHint(prefix); } catch (e) {} /* feat_fitlen */
  }""", """    try { pbFitLayHint(prefix); } catch (e) {} /* feat_fitlen */
    try { pbFitAngSync(prefix); } catch (e) {}
  }""")
open(sys.argv[2],'w').write(s); print('ok')
