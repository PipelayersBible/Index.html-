import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.90 (owner, Nov 17): TRUE OUTSIDE DIAMETERS. A run's "Pipe ID" box holds the NOMINAL size (15 in SDR 35 is 15.30 in
# outside, 14.43 in inside), so TOP = INV + size + wall was off by up to about 1/2 in on 15 in SDR 35, 12 in DI and C900.
# TOP is now BOP + the pipe's real OD for its type and size; the same OD is used for the pipe taken out of the backfill
# and the materials record. No OD for the type / size (vitrified clay, Other, a size not listed): size + 2 walls, as before.
# The box is called "Pipe size" now, and records say '15" pipe', not '15" ID'.
rep("""  window.pbPipeLookup = pbPipeLookup;
""", """  window.pbPipeLookup = pbPipeLookup;
  // r16.90: real outside diameters (in) by pipe type and nominal size. Sources as pipeOD in the calculators:
  //  DI: AWWA C151 (C900 and DIPS HDPE are made in DI ODs). PVC SDR 35: ASTM D3034 4-15 in, ASTM F679 (PS46) 18-48 in.
  //  IPS: ASME B36.10 / ASTM F714 / D1785. Corrugated HDPE: Prinsco OD column (its sizes are the inside diameter).
  //  Concrete (ASTM C76): nominal = inside diameter, so OD = size + 2 walls. Vitrified clay: ODs differ by maker: no table.
  var PB_OD_DI = { 4: 4.8, 6: 6.9, 8: 9.05, 10: 11.1, 12: 13.2, 14: 15.3, 16: 17.4, 18: 19.5, 20: 21.6, 24: 25.8, 30: 32, 36: 38.3, 42: 44.5, 48: 50.8 };
  var PB_OD_SDR35 = { 4: 4.215, 6: 6.275, 8: 8.4, 10: 10.5, 12: 12.5, 15: 15.3, 18: 18.701, 21: 22.047, 24: 24.803, 27: 27.953, 30: 32, 36: 38.3, 42: 44.5, 48: 50.8 };
  var PB_OD_IPS = { 1.5: 1.9, 2: 2.375, 2.5: 2.875, 3: 3.5, 4: 4.5, 5: 5.563, 6: 6.625, 8: 8.625, 10: 10.75, 12: 12.75, 14: 14, 16: 16, 18: 18, 20: 20, 24: 24, 30: 30, 36: 36 };
  var PB_OD_CORR = { 4: 4.8, 6: 7.1, 8: 9.3, 10: 11.9, 12: 14.7, 15: 17.6, 18: 21.4, 24: 28.2, 30: 34.7, 36: 40.6, 42: 47.5, 48: 54.1, 60: 66.8 };
  // OD in inches for a pipe type (Run Setup's Pipe type; blank = PVC SDR 35) and nominal size, or null when not known.
  function pbPipeOdIn(type, sizeIn, wFt) {
    const t = String(type || ''), d = Math.round(Number(sizeIn) * 1000) / 1000; if (!(d > 0)) return null;
    const g = (tbl, max) => (tbl[d] && (!max || d <= max)) ? tbl[d] : null;
    let od = null;
    if (t === '' || t === 'PVC SDR 35') od = g(PB_OD_SDR35);
    else if (t === 'Ductile Iron') od = g(PB_OD_DI);
    else if (t === 'PVC C900') od = g(PB_OD_DI, 30);
    else if (/hdpe/i.test(t) && /dips/i.test(t)) od = g(PB_OD_DI, 24);
    else if (t === 'Solid-Wall HDPE') od = (d >= 4 && d <= 24) ? g(PB_OD_IPS) : null;
    else if (t === 'Corrugated HDPE') od = g(PB_OD_CORR);
    else if (t === 'Steel') od = (d >= 4 && d <= 36 && d !== 30) ? g(PB_OD_IPS) : null;
    else if (t === 'PVC Sch 40') od = d <= 18 ? g(PB_OD_IPS) : null;
    else if (t === 'PVC Sch 80') od = d <= 12 ? g(PB_OD_IPS) : null;
    else if (t === 'Concrete') { const w = Number(wFt); od = w > 0 ? d + 2 * w * 12 : null; }
    return od;
  }
  // A grade point's pipe: OD in ft from its nominal size (idFt) and wall (ft): the table OD for the run's Pipe type, else
  // size + 2 walls. A table OD that leaves no inside (a typed wall far too thick) falls back too.
  function pbPipeOdFt(idFt, wt) {
    if (idFt === null || idFt === undefined || !Number.isFinite(idFt) || !(idFt > 0)) return null;
    const w = (wt === null || wt === undefined || !Number.isFinite(wt)) ? null : wt;
    let t = ''; try { t = pbFitLayPipeType(); } catch (e) { t = ''; }
    const od = pbPipeOdIn(t, idFt * 12, w);
    if (od && (w === null || od / 12 - 2 * w > 0)) return od / 12;
    return w === null ? null : idFt + 2 * w;
  }
  // Invert (inside bottom) to outside top, ft: OD - wall. null without a wall or a size.
  function pbInvToTopFt(idFt, wt) { const od = pbPipeOdFt(idFt, wt); return (od === null || wt === null || wt === undefined || !Number.isFinite(wt)) ? null : od - wt; }
  window.pbPipeOdIn = pbPipeOdIn; window.pbPipeOdFt = pbPipeOdFt; window.pbInvToTopFt = pbInvToTopFt;
""")
# the calculators' pipeOD: one table (falls back to its own when the main script isn't there)
rep("""    const r3 = (x) => String(Math.round(x * 1000) / 1000);
    let od = null;
    if (t === '' || t === 'PVC SDR 35') od = pick(D3034, [4, 6, 8, 10, 12, 15], d);""",
"""    const r3 = (x) => String(Math.round(x * 1000) / 1000);
    if (typeof window.pbPipeOdIn === 'function') { const v = window.pbPipeOdIn(t, d, wFt); return v ? r3(v) : ''; } // r16.90: the app's one OD table
    let od = null;
    if (t === '' || t === 'PVC SDR 35') od = pick(D3034, [4, 6, 8, 10, 12, 15], d);""")
# grade sheet TOP: elevations and readings
rep("""      const result = { pi: p.pi, bp, tp: (wtOk && idOk) ? p.pi + p.idFt + p.wt : null,""",
    """      const result = { pi: p.pi, bp, tp: (wtOk && idOk) ? p.pi + pbInvToTopFt(p.idFt, p.wt) : null,""")
rep("""        result.topReading = (wtOk && idOk) ? p.reading - (p.idFt + p.wt) : null;""",
    """        result.topReading = (wtOk && idOk) ? p.reading - pbInvToTopFt(p.idFt, p.wt) : null;""")
rep("""      const topOfR = p => (p.wt !== null && p.idFt !== null) ? p.reading - (p.idFt + p.wt) : null;""",
    """      const topOfR = p => (p.wt !== null && p.idFt !== null) ? p.reading - pbInvToTopFt(p.idFt, p.wt) : null;""")
rep("""      const topOf = p => (p.wt !== null && p.idFt !== null) ? p.reading - (p.idFt + p.wt) : null;""",
    """      const topOf = p => (p.wt !== null && p.idFt !== null) ? p.reading - pbInvToTopFt(p.idFt, p.wt) : null;""")
rep("""    const result = { pi, bp, tp: (wtOk && idOk) ? pi + seg.idFt + seg.wt : null,""",
    """    const result = { pi, bp, tp: (wtOk && idOk) ? pi + pbInvToTopFt(seg.idFt, seg.wt) : null,""")
rep("""      result.topReading = (wtOk && idOk) ? reading - (seg.idFt + seg.wt) : null;""",
    """      result.topReading = (wtOk && idOk) ? reading - pbInvToTopFt(seg.idFt, seg.wt) : null;""")
rep("""field === 'top' ? ((wtOk && idOk) ? point.pi + point.idFt + point.wt : null)""",
    """field === 'top' ? ((wtOk && idOk) ? point.pi + pbInvToTopFt(point.idFt, point.wt) : null)""")
rep("""field === 'top' ? ((wtOk && idOk) ? point.reading - (point.idFt + point.wt) : null)""",
    """field === 'top' ? ((wtOk && idOk) ? point.reading - pbInvToTopFt(point.idFt, point.wt) : null)""")
# backfill: the pipe taken out is its real OD
rep("""        const odFt = ownSeg.idFt + 2 * ownSeg.wt;""",
    """        const odFt = pbPipeOdFt(ownSeg.idFt, ownSeg.wt); // r16.90: real OD""")
# materials record
rep("""        od_in: idIn !== null && wt !== null ? +(idIn + 2 * wt * 12).toFixed(4) : null });""",
    """        od_in: idIn !== null && wt !== null ? +(pbPipeOdFt(idIn / 12, wt) * 12).toFixed(4) : null });""")
# record: the OD used for TOP
rep("""      idIn: r.point.idFt !== null ? r.point.idFt * 12 : null,
      beddingFt:""", """      idIn: r.point.idFt !== null ? r.point.idFt * 12 : null,
      ...((() => { const o = r.point.idFt !== null && r.point.wt !== null ? pbPipeOdFt(r.point.idFt, r.point.wt) : null; return o !== null ? { odIn: Math.round(o * 12 * 1000) / 1000 } : {}; })()), /* r16.90: OD used for TOP */
      beddingFt:""")
# wording: "Pipe size", '15" pipe'
for n in ['run', 'seg2', 'seg3', 'seg4', 'seg5']:
    rep('<label for="%sIdSel">Pipe ID<span class="pb-sr"> (inches)</span></label>' % n,
        '<label for="%sIdSel">Pipe size<span class="pb-sr"> (inches, nominal)</span></label>' % n)
rep("""Pipe ID</div><div class="v">${r.point.idFt !== null ? fmt(r.point.idFt*12,2) : '\\u2014'}\"""",
    """Pipe size</div><div class="v">${r.point.idFt !== null ? fmt(r.point.idFt*12,2) : '\\u2014'}\"""")
rep("""\\u2014 Pipe ID</div>""", """\\u2014 Pipe size</div>""")
rep("""'Pipe ID must be greater than zero""", """'Pipe size must be greater than zero""")
rep("""'Pipe ID is missing — TOP can""", """'Pipe size is missing — TOP can""")
rep("""t = 'Choose the Pipe ID to fill this in.';""", """t = 'Choose the Pipe size to fill this in.';""")
rep("""'Pipe after this point: ' + sel.value + '" ID'""", """'Pipe after this point: ' + sel.value + '" pipe'""")
rep("""', then ' + x.idIn + '" ID'""", """', then ' + x.idIn + '" pipe'""")
rep("""(p.idIn !== null ? p.idIn.toFixed(2) + '" ID' : 'ID missing'));""",
    """(p.idIn !== null ? p.idIn.toFixed(2) + '" pipe' + (typeof p.odIn === 'number' ? ' (' + p.odIn.toFixed(3) + '" OD)' : '') : 'size missing'));""")
rep("""(p.idIn !== null && p.idIn !== undefined ? p.idIn.toFixed(2) + '" ID' : 'ID not recorded')""",
    """(p.idIn !== null && p.idIn !== undefined ? p.idIn.toFixed(2) + '" pipe' + (typeof p.odIn === 'number' ? ' (' + p.odIn.toFixed(3) + '" OD, used for TOP)' : '') : 'size not recorded')""")
rep("""(s.id_in !== null ? s.id_in + '" ID' : 'size not recorded')""", """(s.id_in !== null ? s.id_in + '" pipe' : 'size not recorded')""")
rep("""(s.id_in !== null ? s.id_in + '" ID ' : '')""", """(s.id_in !== null ? s.id_in + '" pipe ' : '')""")
open(out, 'w', encoding='utf-8').write(s)
