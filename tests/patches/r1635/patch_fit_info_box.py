import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.35 (Tommy, Nov 15): the Size / angle box only shows when it does something, named for what it holds:
# Wye / Tee / Reducer = "Sizes" (8x6; it picks the laying length), Other = "What is it" (gate valve). Bend uses the
# Bend angle list instead (AP stays noted behind it); Coupling and Choose hide it.
rep("""      + '<div class="pb-field"><label for="' + prefix + 'FitInfo">Size / angle</label><input""",
"""      + '<div class="pb-field pb-fit-infow" id="' + prefix + 'FitInfoW" style="display:none;"><label for="' + prefix + 'FitInfo" id="' + prefix + 'FitInfoL">Sizes</label><input""")
rep("""    const bend = t.value === 'bend'; w.style.display = bend ? '' : 'none';""",
"""    const bend = t.value === 'bend'; w.style.display = bend ? '' : 'none';
    { const iw = document.getElementById(prefix + 'FitInfoW'), il = document.getElementById(prefix + 'FitInfoL'), ty = t.value;
      const show = ty === 'wye' || ty === 'tee' || ty === 'reducer' || ty === 'other';
      if (iw) iw.style.display = show ? '' : 'none';
      if (il) il.textContent = ty === 'other' ? 'What is it' : 'Sizes';
      if (i) i.placeholder = ty === 'other' ? 'e.g. gate valve' : ty === 'reducer' ? 'e.g. 12x8' : 'e.g. 8x6'; }""")
# switching away from Bend drops what only meant something for a bend (AP, an angle)
rep("""    m = /^(.*)(FitType|FitInfo|FitOn)$/.exec(tg.id); if (m) pbFitAngSync(m[1]);""", """    m = /^(.*)(FitType|FitInfo|FitOn)$/.exec(tg.id);
    if (m && m[2] === 'FitType' && tg.value !== 'bend') { const i = document.getElementById(m[1] + 'FitInfo'); if (i && /^\\s*(?:AP\\b)?\\s*(?:\\d+(?:\\.\\d+)?\\s*\\u00b0?)?\\s*$/i.test(i.value) && i.value.trim()) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); } }
    if (m) pbFitAngSync(m[1]);""")
open(sys.argv[2],'w').write(s); print('ok')
