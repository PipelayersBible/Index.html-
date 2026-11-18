import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt (Nov 17): check-shot entry.
# (a) architect rod: the field asked for ft-in but used the decimal keypad (digits and a point only on an iPhone), so
#     7-3 1/2 could not be typed: the full keyboard for an architect rod;
# (b) the reader takes 7-3-1/2, 7' 3-1/2", 4.36' and 4.36 ft; (c) an inches-only entry (94", 3 1/2") is inches, not feet;
# (d) a typed reading that can't be read says so (not "Type the rod reading first"), and a second Enter / tap while the
#     first save is still writing does nothing (it saved the shot twice).
rep(r"""    if (/^-?\d*\.?\d+$/.test(x)) { const v = Number(x); return isFinite(v) ? v : null; }
    const m = /^(-)?\s*(\d+)\s*(?:'|ft)?\s*[- ]?\s*(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*(?:"|in)?$/.exec(x);
    if (!m) return null;
    const ft = Number(m[2]), inch = m[3] ? Number(m[3]) : 0, fr = m[4] && Number(m[5]) ? Number(m[4]) / Number(m[5]) : 0;
    if (inch >= 12 || fr >= 1) return null;""",
r"""    const dm = /^(-?\d*\.?\d+)\s*(?:'|ft\.?|feet)?$/i.exec(x); // decimal feet: 4.36 | 4.36' | 4.36 ft
    if (dm) { const v = Number(dm[1]); return isFinite(v) ? v : null; }
    const im = /^(-)?\s*(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*(?:"|in\.?|inch(?:es)?)$/i.exec(x); // inches only: 94" | 3 1/2" | 1/2 in
    if (im && (im[2] || im[3])) { const f0 = im[3] ? (Number(im[4]) ? Number(im[3]) / Number(im[4]) : NaN) : 0; if (!(f0 < 1)) return null; const v0 = ((im[2] ? Number(im[2]) : 0) + f0) / 12; return im[1] ? -v0 : v0; }
    const m = /^(-)?\s*(\d+)\s*(?:'|ft\.?)?\s*[- ]?\s*(\d+(?:\.\d+)?)?\s*-?\s*(?:(\d+)\s*\/\s*(\d+))?\s*(?:"|in\.?)?$/i.exec(x); // 7-3 1/2 | 7'-3 1/2" | 7-3-1/2 | 7' 3.5
    if (!m) return null;
    const ft = Number(m[2]), inch = m[3] ? Number(m[3]) : 0, fr = m[4] ? (Number(m[5]) ? Number(m[4]) / Number(m[5]) : NaN) : 0;
    if (inch >= 12 || !(fr < 1)) return null;""")
rep(r"""<input type="text" inputmode="decimal" id="pbCsRod" autocomplete="off" enterkeyhint="done"></div>'""",
    r"""<input type="text" inputmode="' + (unit === 'architect' ? 'text' : 'decimal') + '" id="pbCsRod" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></div>'""")
rep(r"""    const save = async () => {
      const c = calc(); if (!c) { out.textContent = pbCsTarget(row, ref) === null ? out.textContent : 'Type the ' + (lenker ? 'elevation' : 'rod reading') + ' first.'; return; }""",
    r"""    let saving = false;
    const save = async () => {
      if (saving) return;
      const c = calc(); if (!c) { out.textContent = pbCsTarget(row, ref) === null ? out.textContent : String(inp.value || '').trim() ? 'That ' + (lenker ? 'elevation' : 'reading') + ' can’t be read. Type it like ' + (lenker ? '99.86' : unit === 'architect' ? '7-3 1/2 or 7.29' : '4.36') + '.' : 'Type the ' + (lenker ? 'elevation' : 'rod reading') + ' first.'; out.style.color = ''; return; }""")
rep(r"""      d.querySelector('#pbCsSave').disabled = true;
      const ok = await pbRunOnEntry(entry, async () => { entry.checkShots =""",
    r"""      saving = true; d.querySelector('#pbCsSave').disabled = true;
      const ok = await pbRunOnEntry(entry, async () => { entry.checkShots =""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
