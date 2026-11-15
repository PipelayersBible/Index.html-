import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:90]); s=s.replace(a,b)
# r16.31 (Tommy, Nov 15): the label a stake photo fills is the ONE thing special about the point, in this order:
# start point, end point, fitting type, lateral or manhole number, station, stake number.
rep("""    got.vals.label = pbStakeAiLabel(Object.assign({}, got.vals));""",
"""    got.vals.label = pbStakeAiSimpleLabel(prefix, got);""")
rep("""  function pbStakeAiLabel(v) {""", """  function pbStakeAiSimpleLabel(prefix, got) {
    const sg = pbStakeAiSeg(prefix), v = got.vals || {}, th = got.thought || {};
    if (sg.isStart) return 'Start point';
    if (sg.isEnd) return 'End point';
    const text = [v.offset, v.line, th.line, got.other].filter(Boolean).join(' ');
    const up = text.toUpperCase().replace(/^\\s*\\d+(?:\\.\\d+)?\\s*\\/\\s*[A-Z]+\\b/, ' ');
    try {
      const fit = /^(seg\\d+)?hub\\d+$/.test(prefix) && typeof window.pbCutsheetFitOf === 'function' ? window.pbCutsheetFitOf(text) : null;
      if (fit) {
        const ang = /(\\d+(?:\\.\\d+)?)\\u00b0/.exec(fit.info || '');
        if (fit.type === 'bend') return /\\bAP\\b/.test(fit.info || '') ? 'Angle point' : (ang ? ang[1] + '\\u00b0 bend' : 'Bend');
        if (fit.type === 'other') return fit.info ? String(fit.info).split(',')[0] : 'Fitting';
        return ({ wye: 'Wye', tee: 'Tee', reducer: 'Reducer', coupling: 'Coupling' })[fit.type] || 'Fitting';
      }
    } catch (e) {}
    const lat = /\\bLAT(?:ERAL)?\\s?-?\\s?#?\\s?(\\d{1,4}[A-Z]?)\\b/.exec(up); if (lat) return 'LAT-' + lat[1];
    const mh = /\\b(?:SS|SD|STM|SAN)?(?:MH|MANHOLE)\\s?-?\\s?#?\\s?(\\d{1,4}[A-Z]?)\\b/.exec(up); if (mh) return 'MH-' + mh[1];
    if (/\\b(?:SS|SD|STM|SAN)?(?:MH|MANHOLE)\\b/.test(up)) return 'Manhole';
    if (v.station) return 'Sta ' + v.station;
    if (v.stakeNum) return 'Stake ' + v.stakeNum;
    return '';
  }
  function pbStakeAiLabel(v) {""")
open(sys.argv[2],'w').write(s); print('ok')
