from common import *

# ---------------------------------------------------------------------------------------------
# Shared math, copied from the app (/home/claude/index.html-/index.html) so the numbers match it.
#   fmt(n, d)    : the app's fmt(): a half rounds away from zero (only change: '' instead of an em-dash for no value)
#   toArch(n)    : the app's toArch(): decimal feet to feet-inches to the nearest 1/16 inch, reduced
#   staText(st)  : the app's pbCutsheetStaText(): 125 -> "1+25.00"
# test_tools_math.js checks these against the app's own functions.
# ---------------------------------------------------------------------------------------------
SHARED_JS = r'''
  function fmt(n, d) { if (n === null || n === undefined || (typeof n === 'string' && !n.trim()) || isNaN(n)) return ''; var p = d === undefined ? 3 : d, f = Math.pow(10, p); return (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-7) / f).toFixed(p); }
  function toArch(n) {
    if (n === null || isNaN(n)) return '';
    var sign = n < 0 ? '-' : '';
    var abs = Math.abs(n);
    var feet = Math.floor(abs);
    var inches = (abs - feet) * 12;
    var wholeIn = Math.floor(inches);
    var sixteenths = Math.round((inches - wholeIn) * 16);
    if (sixteenths === 16) { sixteenths = 0; wholeIn++; }
    if (wholeIn === 12) { wholeIn = 0; feet++; }
    var fracStr = '';
    if (sixteenths > 0) {
      var num = sixteenths, den = 16;
      while (num % 2 === 0) { num /= 2; den /= 2; }
      fracStr = ' ' + num + '/' + den + '"';
    } else fracStr = '"';
    return sign + feet + "'-" + wholeIn + fracStr;
  }
  function staText(st) {
    var c = Math.round(Math.abs(st) * 100);
    return (st < 0 && c > 0 ? '-' : '') + Math.floor(c / 10000) + '+' + ((c % 10000) / 100).toFixed(2).padStart(5, '0');
  }
'''

# Pipe data from the app: outside diameters (PB_OD_SDR35, and PB_OD_DI which the app uses for PVC C900) and the
# walls in PB_PIPE_INDEX (SDR 35 = OD / 35, C900 = OD / 18, i.e. DR18), common sizes only.
PIPES_JS = r'''
  var PIPES = {
    'sdr35-4': { name: '4" PVC SDR 35', od: 4.215, wall: 0.12 }, 'sdr35-6': { name: '6" PVC SDR 35', od: 6.275, wall: 0.18 },
    'sdr35-8': { name: '8" PVC SDR 35', od: 8.4, wall: 0.24 }, 'sdr35-10': { name: '10" PVC SDR 35', od: 10.5, wall: 0.3 },
    'sdr35-12': { name: '12" PVC SDR 35', od: 12.5, wall: 0.36 }, 'sdr35-15': { name: '15" PVC SDR 35', od: 15.3, wall: 0.437 },
    'c900-4': { name: '4" PVC C900 DR18', od: 4.8, wall: 0.267 }, 'c900-6': { name: '6" PVC C900 DR18', od: 6.9, wall: 0.383 },
    'c900-8': { name: '8" PVC C900 DR18', od: 9.05, wall: 0.503 }, 'c900-10': { name: '10" PVC C900 DR18', od: 11.1, wall: 0.617 },
    'c900-12': { name: '12" PVC C900 DR18', od: 13.2, wall: 0.733 }
  };
'''

PIPE_OPTIONS = ''.join('<option value="%s">%s</option>' % (k, v) for k, v in [
    ('sdr35-4', '4" PVC SDR 35'), ('sdr35-6', '6" PVC SDR 35'), ('sdr35-8', '8" PVC SDR 35'), ('sdr35-10', '10" PVC SDR 35'),
    ('sdr35-12', '12" PVC SDR 35'), ('sdr35-15', '15" PVC SDR 35'), ('c900-4', '4" PVC C900 DR18'), ('c900-6', '6" PVC C900 DR18'),
    ('c900-8', '8" PVC C900 DR18'), ('c900-10', '10" PVC C900 DR18'), ('c900-12', '12" PVC C900 DR18')])

# Small DOM helpers shared by the tool pages (UI only, no math)
UI_JS = r'''
  function $(id) { return document.getElementById(id); }
  function num(id) { var el = $(id); if (!el) return null; var s = String(el.value).trim(); if (s === '') return null; var v = Number(s); return Number.isFinite(v) ? v : NaN; }
  function radio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function answer(k, v, s, id) { return '<div class="answer"' + (id ? ' id="' + id + '"' : '') + '><div class="k">' + k + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>'; }
  function msg(t, bad) { return '<p class="msg' + (bad ? ' bad' : '') + '">' + t + '</p>'; }
  function live(ids, fn) { ids.forEach(function (id) { var el = $(id); if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); } }); document.querySelectorAll('input[type=radio]').forEach(function (r) { r.addEventListener('change', fn); }); fn(); }
'''


def tool_ld(path, name, desc, trail):
    return [
        ORG_LD,
        {'@type': 'WebApplication', '@id': SITE + path + '#app', 'name': name, 'url': SITE + path, 'description': desc,
         'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any (runs in a web browser)',
         'browserRequirements': 'Requires JavaScript', 'isAccessibleForFree': True,
         'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'},
         'publisher': ORG_REF, 'inLanguage': 'en-US'},
        breadcrumb_ld(trail),
    ]


def related(items):
    lis = ''.join('<li class="card"><h3><a href="%s">%s</a></h3><p>%s</p></li>' % (h, t, d) for h, t, d in items)
    return '<section class="related" aria-labelledby="rel-title"><h2 id="rel-title">Related</h2><ul class="cards">' + lis + '</ul></section>'


def script_block(math_js, ui_js):
    return ('<script id="tool-math">\n// Math only (no page access). Tested in site/tools/test_tools_math.js.\nvar PBT = (function () {\n' + math_js +
            '\n})();\n</script>\n<script>\n(function () {\n' + UI_JS + ui_js + '\n})();\n</script>')


# =============================================================================================
# a) Pipe grade calculator
# =============================================================================================
GRADE_MATH = SHARED_JS + r'''
  // Interval stations exactly as the app builds a grade sheet: every `interval` ft from 0, plus the end,
  // each rounded to 1/1000 ft, equal stations merged.
  function stations(length, interval) {
    var out = [];
    if (interval > 0) for (var d = 0; d < length; d += interval) out.push(Math.round(d * 1000) / 1000);
    out.push(Math.round(length * 1000) / 1000);
    return out.filter(function (s, i, a) { return i === 0 || s - a[i - 1] > 0.0005; });
  }
  // Elevation along a straight grade, the app's way: start + (slope / 100) x distance, rise positive.
  // dir 'down' = the pipe falls from the start (a sewer laid upstream to downstream is read this way).
  function gradeTable(start, slopePct, dir, length, interval) {
    var sign = dir === 'up' ? 1 : -1;
    var rows = stations(length, interval).map(function (d) { return { d: d, elev: start + sign * (slopePct / 100) * d }; });
    return { rows: rows, end: start + sign * (slopePct / 100) * length, change: (slopePct / 100) * length, inPerFt: slopePct * 12 / 100 };
  }
  function slopeFromDrop(drop, length) { return drop / length * 100; }
  // The app's segment slope: ((end - start) / distance) x 100, positive = rising toward the end.
  function slopeFromInverts(a, b, dist) { var s = ((b - a) / dist) * 100; return { slopePct: s, fall: a - b, inPerFt: Math.abs(s) * 12 / 100 }; }
  return { fmt: fmt, toArch: toArch, staText: staText, stations: stations, gradeTable: gradeTable, slopeFromDrop: slopeFromDrop, slopeFromInverts: slopeFromInverts };
'''

GRADE_UI = r'''
  var M = PBT, MAXROWS = 400;
  function byDrop() { return radio('g-mode') === 'drop'; }
  function calcRun() {
    var out = $('g-out');
    $('g-slope-wrap').hidden = byDrop(); $('g-drop-wrap').hidden = !byDrop();
    var start = num('g-start'), len = num('g-len'), iv = num('g-int'), sta0 = num('g-sta'), slope = num('g-slope'), drop = num('g-drop');
    if (sta0 === null) sta0 = 0;
    if (start === null || len === null || (byDrop() ? drop === null : slope === null)) { out.innerHTML = msg('Enter the start invert, the grade and the run length.'); return; }
    if ([start, len, iv, sta0, slope, drop].some(function (v) { return Number.isNaN(v); })) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (!(len > 0)) { out.innerHTML = msg('Run length must be more than 0 ft.', true); return; }
    if (iv !== null && !(iv > 0)) { out.innerHTML = msg('Interval must be more than 0 ft, or leave it empty for just the ends.', true); return; }
    if (byDrop() ? drop < 0 : slope < 0) { out.innerHTML = msg('Enter the grade as a positive number and pick falls or rises.', true); return; }
    if (iv !== null && len / iv > MAXROWS) { out.innerHTML = msg('That makes more than ' + MAXROWS + ' rows. Use a bigger interval.', true); return; }
    var pct = byDrop() ? M.slopeFromDrop(drop, len) : slope, dir = radio('g-dir');
    var g = M.gradeTable(start, pct, dir, len, iv === null ? 0 : iv), word = dir === 'up' ? 'Rise' : 'Fall';
    var h = '<div class="answers">' +
      answer('End invert', M.fmt(g.end, 2) + ' ft', M.toArch(g.end), 'g-end') +
      answer('Total ' + word.toLowerCase(), M.fmt(g.change, 2) + ' ft', M.toArch(g.change), 'g-change') +
      answer('Slope', M.fmt(pct, 2) + '%', M.fmt(g.inPerFt, 3) + ' in per ft', 'g-pct') +
      '</div>';
    h += '<div class="tbl-wrap"><table id="g-table"><caption class="sr">Invert elevation at each station</caption><thead><tr><th>Station</th><th class="num">Dist. (ft)</th><th class="num">Invert (ft)</th><th class="num">Ft-in</th></tr></thead><tbody>' +
      g.rows.map(function (r) { return '<tr><td>' + M.staText(sta0 + r.d) + '</td><td class="num">' + M.fmt(r.d, 2) + '</td><td class="num">' + M.fmt(r.elev, 2) + '</td><td class="num">' + esc(M.toArch(r.elev)) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    out.innerHTML = h;
  }
  function calcTwo() {
    var out = $('s-out'), a = num('s-a'), b = num('s-b'), d = num('s-d');
    if (a === null || b === null || d === null) { out.innerHTML = msg('Enter both inverts and the distance between them.'); return; }
    if ([a, b, d].some(function (v) { return Number.isNaN(v); })) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (!(d > 0)) { out.innerHTML = msg('Distance must be more than 0 ft.', true); return; }
    var s = M.slopeFromInverts(a, b, d), falls = s.fall > 0, flat = Math.abs(s.fall) < 1e-9;
    out.innerHTML = '<div class="answers">' +
      answer('Slope', M.fmt(Math.abs(s.slopePct), 2) + '%', flat ? 'Flat' : (falls ? 'Falls' : 'Rises') + ' from the first invert to the second', 's-pct') +
      answer(falls || flat ? 'Fall' : 'Rise', M.fmt(Math.abs(s.fall), 2) + ' ft', M.toArch(Math.abs(s.fall)), 's-fall') +
      answer('Inches per foot', M.fmt(s.inPerFt, 3) + ' in', 'per foot of run', 's-inft') + '</div>';
  }
  live(['g-start', 'g-slope', 'g-drop', 'g-len', 'g-int', 'g-sta'], calcRun);
  live(['s-a', 's-b', 's-d'], calcTwo);
'''


def grade_page():
    path = '/tools/pipe-grade-calculator/'
    title = 'Pipe Grade Calculator (Invert Elevations) | The Pipelayer\'s Bible'
    desc = 'Free pipe grade calculator: start invert, slope or elevation change, and run length give invert elevations at every station, the fall and inches per foot, in feet and feet-inches.'
    trail = [('Home', '/'), ('Free tools', '/tools/'), ('Pipe grade calculator', path)]
    body = hero(trail, 'Free tool', 'Pipe grade calculator',
                'Invert elevations along a straight grade, at whatever interval you want, plus the slope between two inverts. Feet to two decimals and feet-inches to the nearest 1/16".') + '''
<div class="content"><div class="wrap">
<section class="tool" aria-labelledby="t1">
  <h2 id="t1">Elevations along the run</h2>
  <div class="grid2">
    <div class="field"><label for="g-start">Start invert elevation <span class="hint">feet, e.g. 96.03</span></label><input id="g-start" type="number" inputmode="decimal" step="any" value="100.00"></div>
    <div class="field"><label for="g-len">Run length <span class="hint">feet</span></label><input id="g-len" type="number" inputmode="decimal" step="any" min="0" value="250"></div>
    <fieldset class="field"><legend>Grade given as</legend><div class="choices">
      <label><input type="radio" name="g-mode" value="pct" checked> Slope %</label>
      <label><input type="radio" name="g-mode" value="drop"> Elevation change (ft)</label></div></fieldset>
    <div class="field" id="g-slope-wrap"><label for="g-slope">Slope <span class="hint">percent, e.g. 0.40</span></label><input id="g-slope" type="number" inputmode="decimal" step="any" min="0" value="0.40"></div>
    <div class="field" id="g-drop-wrap" hidden><label for="g-drop">Elevation change over the run <span class="hint">feet</span></label><input id="g-drop" type="number" inputmode="decimal" step="any" min="0"></div>
    <fieldset class="field"><legend>Direction from the start</legend><div class="choices">
      <label><input type="radio" name="g-dir" value="down" checked> Falls</label>
      <label><input type="radio" name="g-dir" value="up"> Rises</label></div></fieldset>
    <div class="field"><label for="g-int">Interval <span class="hint">feet between rows (empty = just the ends)</span></label><input id="g-int" type="number" inputmode="decimal" step="any" min="0" value="25"></div>
    <div class="field"><label for="g-sta">Start station <span class="hint">feet, optional, 0 = 0+00.00</span></label><input id="g-sta" type="number" inputmode="decimal" step="any"></div>
  </div>
  <div class="results" id="g-out" aria-live="polite"></div>
</section>

<section class="tool" aria-labelledby="t2">
  <h2 id="t2">Slope from two inverts</h2>
  <div class="grid2">
    <div class="field"><label for="s-a">First invert <span class="hint">feet</span></label><input id="s-a" type="number" inputmode="decimal" step="any"></div>
    <div class="field"><label for="s-b">Second invert <span class="hint">feet</span></label><input id="s-b" type="number" inputmode="decimal" step="any"></div>
    <div class="field"><label for="s-d">Distance between them <span class="hint">feet</span></label><input id="s-d" type="number" inputmode="decimal" step="any" min="0"></div>
  </div>
  <div class="results" id="s-out" aria-live="polite"></div>
</section>

<div class="prose">
<h2>How it works</h2>
<p>A straight grade changes by the same amount every foot. Slope in percent is feet of change per 100 feet of run, so:</p>
<p class="formula">elevation at a distance = start invert &plusmn; (slope % &divide; 100) &times; distance</p>
<p class="formula">slope % = (second invert &minus; first invert) &divide; distance &times; 100</p>
<p class="formula">inches per foot = slope % &times; 12 &divide; 100</p>
<p>Example: a 250 ft run of 8" sewer at 0.40% falling from 100.00 drops 1.00 ft, so the far end is 99.00. Every 25 ft station is 0.10 ft lower than the one before it. 0.40% is 0.048 inches per foot.</p>
<p>The rows go every interval from the start, plus one at the end of the run, the same way the full app lays out a grade sheet. Elevations round to the nearest 0.01 ft, with a half rounding away from zero, and feet-inches round to the nearest 1/16". Stations print the way they read on a cut sheet: 125 ft is 1+25.00.</p>
<div class="note"><p>Check every number against the plans, the cut sheet and your own instrument before you lay pipe. This page does straight grades only. The <a href="/grade-and-cut-sheet-app/">full app</a> handles hubs, fittings, slope changes and rod readings for a whole run.</p></div>
</div>
''' + related([
        ('/tools/rod-reading-to-invert/', 'Rod reading to invert', 'Turn a benchmark, backsight and rod reading into an elevation and an invert.'),
        ('/guides/how-to-read-a-grade-stake/', 'How to read a grade stake', 'Station, offset, cut and fill, and how they get you to the invert.'),
    ]) + '''
</div></div>
''' + cta_band() + '\n' + script_block(GRADE_MATH, GRADE_UI)
    return page(path, title, desc, body, tool_ld(path, 'Pipe grade calculator', desc, trail), section='/tools/')


# =============================================================================================
# b) Rod reading to invert
# =============================================================================================
ROD_MATH = SHARED_JS + PIPES_JS + r'''
  // The app's Rod Reading -> Elevation converter: HI = known elevation + rod reading on it; elevation = HI - rod reading.
  function hi(bmElev, backsight) { return bmElev + backsight; }
  function elevFromRod(h, reading) { return h - reading; }
  // The app's pipe geometry (pbInvToTopFt, elevAtStation): wall rounded to 0.001 ft, OD / 12 in ft.
  // Top of pipe (outside) = invert + OD - wall. Bottom of pipe (outside, BOP) = invert - wall.
  function pipeFt(key) { var p = PIPES[key]; if (!p) return null; var wallFt = Math.round(p.wall / 12 * 1000) / 1000; return { name: p.name, odIn: p.od, wallIn: p.wall, wallFt: wallFt, odFt: p.od / 12, topFromInv: p.od / 12 - wallFt }; }
  // where: 'inv' (rod on the invert), 'top' (rod on top of the pipe), 'bop' (rod under the pipe, bottom outside)
  function invertFromShot(elev, where, key) {
    if (where === 'inv') return elev;
    var p = pipeFt(key); if (!p) return null;
    return where === 'top' ? elev - p.topFromInv : elev + p.wallFt;
  }
  // The rod reading to look for at the spot, to put the invert at the design elevation
  function targetReading(h, designInv, where, key) {
    if (where === 'inv') return h - designInv;
    var p = pipeFt(key); if (!p) return null;
    return where === 'top' ? h - (designInv + p.topFromInv) : h - (designInv - p.wallFt);
  }
  return { fmt: fmt, toArch: toArch, PIPES: PIPES, hi: hi, elevFromRod: elevFromRod, pipeFt: pipeFt, invertFromShot: invertFromShot, targetReading: targetReading };
'''

ROD_UI = r'''
  var M = PBT;
  function calc() {
    var out = $('r-out'), where = radio('r-where'), key = $('r-pipe').value;
    $('r-pipe-wrap').hidden = where === 'inv';
    var bm = num('r-bm'), bs = num('r-bs'), fs = num('r-fs'), des = num('r-des');
    if ([bm, bs, fs, des].some(function (v) { return Number.isNaN(v); })) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (bm === null || bs === null) { out.innerHTML = msg('Enter the benchmark elevation and the backsight reading on it.'); return; }
    if (bs < 0 || (fs !== null && fs < 0)) { out.innerHTML = msg('A rod reading can\'t be negative. A rod is read up from its foot.', true); return; }
    var h = M.hi(bm, bs), p = where === 'inv' ? null : M.pipeFt(key);
    var html = '<div class="answers">' + answer('HI (height of instrument)', M.fmt(h, 3) + ' ft', M.toArch(h), 'r-hi');
    if (fs !== null) {
      var e = M.elevFromRod(h, fs), inv = M.invertFromShot(e, where, key);
      html += answer('Elevation at the rod', M.fmt(e, 3) + ' ft', M.toArch(e), 'r-elev');
      html += answer('Invert', M.fmt(inv, 3) + ' ft', where === 'inv' ? 'Rod on the invert' : (where === 'top' ? 'Shot elevation minus ' + M.fmt(p.topFromInv, 3) + ' ft' : 'Shot elevation plus ' + M.fmt(p.wallFt, 3) + ' ft'), 'r-inv');
      if (des !== null) { var diff = inv - des; html += answer('Against design', Math.abs(diff) < 0.0005 ? 'On grade' : M.fmt(Math.abs(diff), 3) + ' ft ' + (diff > 0 ? 'high' : 'low'), M.toArch(Math.abs(diff)) + ' ' + (diff > 0 ? 'above' : diff < 0 ? 'below' : 'from') + ' the design invert', 'r-diff'); }
    }
    if (des !== null) html += answer('Rod reading to lay to', M.fmt(M.targetReading(h, des, where, key), 3) + ' ft', M.toArch(M.targetReading(h, des, where, key)) + (where === 'inv' ? ' with the rod on the invert' : where === 'top' ? ' with the rod on top of the pipe' : ' with the rod under the pipe'), 'r-target');
    html += '</div>';
    if (p) html += '<p class="msg">' + esc(p.name) + ': outside diameter ' + p.odIn + ' in, wall ' + p.wallIn + ' in (' + M.fmt(p.wallFt, 3) + ' ft). Top of pipe sits ' + M.fmt(p.topFromInv, 3) + ' ft above the invert.</p>';
    if (fs === null && des === null) html += msg('Add the rod reading at the new point, or a design invert, to keep going.');
    out.innerHTML = html;
  }
  live(['r-bm', 'r-bs', 'r-fs', 'r-des', 'r-pipe'], calc);
'''


def rod_page():
    path = '/tools/rod-reading-to-invert/'
    title = 'Rod Reading to Invert Calculator | The Pipelayer\'s Bible'
    desc = 'Free HI method calculator: benchmark plus backsight is the HI, HI minus the rod reading is the elevation, then the invert with the rod on the invert or the pipe.'
    trail = [('Home', '/'), ('Free tools', '/tools/'), ('Rod reading to invert', path)]
    body = hero(trail, 'Free tool', 'Rod reading to invert',
                'The height of instrument method for an engineer\'s rod in decimal feet: shoot a benchmark, get the HI, then turn any rod reading into an elevation and an invert.') + '''
<div class="content"><div class="wrap">
<section class="tool" aria-labelledby="t1">
  <h2 id="t1">From the benchmark to the invert</h2>
  <div class="grid2">
    <div class="field"><label for="r-bm">Benchmark elevation <span class="hint">feet, from the cut sheet or plans</span></label><input id="r-bm" type="number" inputmode="decimal" step="any" value="105.20"></div>
    <div class="field"><label for="r-bs">Backsight: rod reading on the benchmark <span class="hint">feet</span></label><input id="r-bs" type="number" inputmode="decimal" step="any" min="0" value="4.36"></div>
    <div class="field"><label for="r-fs">Rod reading at the new point <span class="hint">feet</span></label><input id="r-fs" type="number" inputmode="decimal" step="any" min="0" value="12.85"></div>
    <div class="field"><label for="r-des">Design invert at this spot <span class="hint">feet, optional</span></label><input id="r-des" type="number" inputmode="decimal" step="any" value="96.03"></div>
    <fieldset class="field"><legend>Where the rod sits</legend><div class="choices">
      <label><input type="radio" name="r-where" value="inv"> On the invert</label>
      <label><input type="radio" name="r-where" value="top" checked> On top of the pipe</label>
      <label><input type="radio" name="r-where" value="bop"> Under the pipe (BOP)</label></div></fieldset>
    <div class="field" id="r-pipe-wrap"><label for="r-pipe">Pipe <span class="hint">sets the outside diameter and wall</span></label><select id="r-pipe">''' + PIPE_OPTIONS.replace('value="sdr35-8"', 'value="sdr35-8" selected') + '''</select></div>
  </div>
  <div class="results" id="r-out" aria-live="polite"></div>
</section>

<div class="prose">
<h2>How it works</h2>
<p class="formula">HI = benchmark elevation + backsight</p>
<p class="formula">elevation = HI &minus; rod reading</p>
<p class="formula">rod reading to lay to = HI &minus; elevation you want at the foot of the rod</p>
<p>With the rod on the invert, the elevation is the invert. On top of the pipe, the foot of the rod is one outside diameter above the outside bottom, so the invert is the shot elevation minus the outside diameter plus one wall. Under the pipe (bottom of pipe, BOP), the invert is one wall higher than the shot.</p>
<p>Example with the numbers already filled in: 105.20 + 4.36 = an HI of 109.56. A reading of 12.85 on top of 8" SDR 35 is an elevation of 96.71. Take off 0.68 ft (8.4" outside diameter less a 0.24" wall) and the invert is 96.03, right on the design invert.</p>
<h2>Pipe sizes used</h2>
<p>Outside diameters and walls come from the same tables the full app uses: PVC SDR 35 sewer pipe in 4" to 15" (outside diameters per ASTM D3034, wall = outside diameter &divide; 35) and PVC C900 DR18 in 4" to 12" (ductile iron outside diameters, wall = outside diameter &divide; 18). Those are minimum walls; real pipe runs a hair thicker, a few thousandths of a foot at most on these sizes. For any other pipe, put the rod on the invert or use your pipe's spec sheet.</p>
<div class="note"><p>Shoot a second known point before you trust an HI. If two hubs give two different HIs, find out why before laying pipe. The <a href="/grade-and-cut-sheet-app/">full app</a> also handles architect's and Lenker rods and checks the HI against every hub you shoot.</p></div>
</div>
''' + related([
        ('/guides/rod-reading-to-invert-step-by-step/', 'Rod reading to invert, step by step', 'The whole setup in order, with a worked example.'),
        ('/tools/pipe-grade-calculator/', 'Pipe grade calculator', 'Invert elevations every 25 ft along a straight grade.'),
    ]) + '''
</div></div>
''' + cta_band() + '\n' + script_block(ROD_MATH, ROD_UI)
    return page(path, title, desc, body, tool_ld(path, 'Rod reading to invert calculator', desc, trail), section='/tools/')


# =============================================================================================
# c) Trench sloping (OSHA 29 CFR 1926 Subpart P, Appendix B, Table B-1)
# =============================================================================================
TRENCH_MATH = SHARED_JS + r'''
  // Table B-1, maximum allowable slopes (H:V) for excavations less than 20 feet deep. Same ratios and degrees as the
  // app's TRENCH_SLOPES (the app also lists the short-term Type A 1/2:1, which this page only describes in words).
  var SOILS = {
    rock: { name: 'Stable rock', ratio: 0, label: 'Vertical', deg: 90 },
    A: { name: 'Type A', ratio: 0.75, label: '3/4 : 1', deg: 53 },
    B: { name: 'Type B', ratio: 1.0, label: '1 : 1', deg: 45 },
    C: { name: 'Type C', ratio: 1.5, label: '1 1/2 : 1', deg: 34 }
  };
  // 20 ft or deeper: no table slope, an engineer designs it.
  function trench(depth, bottom) {
    if (!(depth > 0)) return { error: 'depth' };
    if (depth >= 20) return { pe: true };
    var rows = Object.keys(SOILS).map(function (k) {
      var s = SOILS[k], side = depth * s.ratio;
      return { key: k, name: s.name, label: s.label, deg: s.deg, ratio: s.ratio, side: side, top: bottom === null ? null : bottom + 2 * side };
    });
    return { rows: rows };
  }
  return { fmt: fmt, toArch: toArch, SOILS: SOILS, trench: trench };
'''

TRENCH_UI = r'''
  var M = PBT;
  function calc() {
    var out = $('t-out'), d = num('t-depth'), w = num('t-bottom'), soil = $('t-soil').value;
    if (d === null) { out.innerHTML = msg('Enter the trench depth.'); return; }
    if (Number.isNaN(d) || Number.isNaN(w)) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (!(d > 0)) { out.innerHTML = msg('Depth must be more than 0 ft.', true); return; }
    if (w !== null && w < 0) { out.innerHTML = msg('Bottom width can\'t be negative.', true); return; }
    var r = M.trench(d, w);
    if (r.pe) { out.innerHTML = '<div class="warn" id="t-pe"><p><strong>20 ft or deeper: a registered professional engineer must design the protective system.</strong> Table B-1 only covers excavations less than 20 feet deep, and OSHA says sloping or benching for excavations greater than 20 feet deep "shall be designed by a registered professional engineer." No slope is given here.</p></div>'; return; }
    var s = r.rows.filter(function (x) { return x.key === soil; })[0];
    var h = '<div class="answers">' + answer('Max allowable slope', s.label, s.name + ', ' + s.deg + '&deg; from horizontal', 't-slope') +
      answer('Back from the toe, each side', M.fmt(s.side, 2) + ' ft', M.toArch(s.side), 't-side') +
      (s.top === null ? '' : answer('Top width', M.fmt(s.top, 2) + ' ft', M.toArch(s.top) + ' (' + M.fmt(w, 2) + ' ft bottom + ' + M.fmt(s.side, 2) + ' ft each side)', 't-top')) + '</div>';
    h += '<div class="tbl-wrap"><table id="t-table"><caption class="sr">All soil types at this depth</caption><thead><tr><th>Soil</th><th>Slope (H:V)</th><th class="num">Each side</th>' + (w === null ? '' : '<th class="num">Top width</th>') + '</tr></thead><tbody>' +
      r.rows.map(function (x) { return '<tr' + (x.key === soil ? ' class="hl"' : '') + '><td>' + x.name + '</td><td>' + x.label + ' (' + x.deg + '&deg;)</td><td class="num">' + M.fmt(x.side, 2) + ' ft</td>' + (w === null ? '' : '<td class="num">' + M.fmt(x.top, 2) + ' ft</td>') + '</tr>'; }).join('') + '</tbody></table></div>';
    if (d < 5) h += '<p class="msg" id="t-shallow">Under 5 ft: federal OSHA does not require a protective system if a competent person examines the ground and finds no indication of a potential cave-in. Washington\'s line is 4 ft. The slope above is what applies if one is used.</p>';
    out.innerHTML = h;
  }
  live(['t-depth', 't-bottom', 't-soil'], calc);
'''


def trench_page():
    path = '/tools/trench-sloping/'
    title = 'Trench Sloping Calculator (OSHA Table B-1) | The Pipelayer\'s Bible'
    desc = 'Free trench sloping calculator from OSHA 1926 Subpart P Appendix B: maximum allowable slope for stable rock and Type A, B and C soil, and the top width of the cut.'
    trail = [('Home', '/'), ('Free tools', '/tools/'), ('Trench sloping', path)]
    body = hero(trail, 'Free tool', 'Trench sloping calculator',
                'How far back each wall has to lay at OSHA\'s maximum allowable slope, and how wide the top of the cut ends up, for excavations less than 20 feet deep.') + '''
<div class="content"><div class="wrap">
<div class="warn"><p><strong>Your competent person classifies the soil and decides the protective system.</strong> This page only does the arithmetic on OSHA's table. It doesn't classify soil, and the maximum slope is the steepest allowed, not a target.</p></div>
<section class="tool" aria-labelledby="t1">
  <h2 id="t1">Slope and top width</h2>
  <div class="grid2">
    <div class="field"><label for="t-depth">Trench depth <span class="hint">feet</span></label><input id="t-depth" type="number" inputmode="decimal" step="any" min="0" value="8"></div>
    <div class="field"><label for="t-bottom">Bottom width <span class="hint">feet, optional</span></label><input id="t-bottom" type="number" inputmode="decimal" step="any" min="0" value="3"></div>
    <div class="field"><label for="t-soil">Soil type <span class="hint">as classified by your competent person</span></label><select id="t-soil">
      <option value="rock">Stable rock: vertical (90&deg;)</option>
      <option value="A">Type A: 3/4 : 1 (53&deg;)</option>
      <option value="B" selected>Type B: 1 : 1 (45&deg;)</option>
      <option value="C">Type C: 1 1/2 : 1 (34&deg;)</option></select></div>
  </div>
  <div class="results" id="t-out" aria-live="polite"></div>
</section>

<div class="prose">
<h2>Where the numbers come from</h2>
<p>OSHA's Table B-1 in <a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppB">29 CFR 1926 Subpart P, Appendix B</a> gives the maximum allowable slopes, written horizontal to vertical (H:V), "for excavations less than 20 feet deep":</p>
<div class="tbl-wrap"><table><thead><tr><th>Soil or rock type</th><th>Maximum allowable slope (H:V)</th></tr></thead><tbody>
<tr><td>Stable rock</td><td>Vertical (90&deg;)</td></tr>
<tr><td>Type A</td><td>3/4 : 1 (53&deg;)</td></tr>
<tr><td>Type B</td><td>1 : 1 (45&deg;)</td></tr>
<tr><td>Type C</td><td>1 1/2 : 1 (34&deg;)</td></tr></tbody></table></div>
<p>The angles are degrees from horizontal, and OSHA notes they are rounded. The math is plain:</p>
<p class="formula">back from the toe, each side = depth &times; H</p>
<p class="formula">top width = bottom width + 2 &times; depth &times; H</p>
<p>Example: 8 ft deep in Type B with a 3 ft bottom. Each wall lays back 8 ft, so the top is 3 + 8 + 8 = 19 ft wide.</p>
<h2>What this page leaves out</h2>
<ul>
<li><strong>20 ft or deeper.</strong> Note 3 of the table: "Sloping or benching for excavations greater than 20 feet deep shall be designed by a registered professional engineer." This page gives no slope at 20 ft or more.</li>
<li><strong>Short-term Type A.</strong> OSHA allows 1/2 : 1 (63&deg;) in Type A only for simple slope excavations 12 feet or less deep that are open 24 hours or less. Anything deeper than 12 ft in Type A stays at 3/4 : 1. It isn't offered as a choice here.</li>
<li><strong>Benching and vertical lower walls.</strong> Appendix B shows which benching layouts are allowed and the limits on each, and they vary by soil type (no benching layout is shown for Type C). They are not worked out here.</li>
<li><strong>Distress and surcharge.</strong> If the walls show signs of distress, OSHA requires cutting back at least another 1/2 : 1 flatter. With spoil, equipment or traffic near the edge, the competent person decides how much flatter it has to be.</li>
<li><strong>Shallow trenches.</strong> Federal OSHA (<a href="https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.652">1926.652(a)(1)</a>) doesn't require a protective system in stable rock, or under 5 feet deep when a competent person examines the ground and finds no indication of a potential cave-in.</li>
</ul>
<h2>State plans can be stricter</h2>
<p>Many states run their own OSHA plan. Two examples: Washington requires a protective system starting at 4 feet instead of 5 (<a href="https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm">WAC 296-155-657</a>), and California requires a Cal/OSHA permit before workers enter a trench or excavation 5 feet deep or more (<a href="https://dir.ca.gov/Title8/341.html">Title 8, section 341</a>). Check the rules for the state the job is in.</p>
</div>
''' + related([
        ('/tools/pipe-volume-weight/', 'Pipe volume and backfill', 'Water in the pipe, bedding and backfill yards for the trench.'),
        ('/grade-and-cut-sheet-app/', 'Grade and cut sheet app', 'The run, the grade sheet and the run report on the phone.'),
    ]) + '''
</div></div>
''' + cta_band() + '\n' + script_block(TRENCH_MATH, TRENCH_UI)
    return page(path, title, desc, body, tool_ld(path, 'Trench sloping calculator', desc, trail), section='/tools/')


# =============================================================================================
# d) Pipe volume and backfill
# =============================================================================================
VOL_MATH = SHARED_JS + PIPES_JS + r'''
  var GAL_PER_CF = 7.48052; // US gallons in a cubic foot (231 cubic inches to the gallon), same figure the app uses
  // Volume of a round pipe or bore: area x length, diameter in inches, length in feet, answer in cubic feet
  function cylCf(diaIn, lengthFt) { var r = diaIn / 12 / 2; return Math.PI * r * r * lengthFt; }
  function water(idIn, lengthFt) { var cf = cylCf(idIn, lengthFt); return { cf: cf, gal: cf * GAL_PER_CF, galPerFt: cylCf(idIn, 1) * GAL_PER_CF }; }
  // Approximate inside diameter from the app's table: OD - 2 x (minimum) wall
  function idFromPipe(key) { var p = PIPES[key]; return p ? p.od - 2 * p.wall : null; }
  // Rectangular trench (vertical walls). Pipe zone = from the trench bottom to `coverIn` above the top of the pipe,
  // with `bedIn` of bedding under it. Everything in place (bank) volume: no swell or compaction factor.
  function trench(w, d, len, odIn, bedIn, coverIn) {
    var total = w * d * len, pipe = cylCf(odIn, len);
    var zoneH = (bedIn + odIn + coverIn) / 12;
    if (zoneH > d) return { error: 'zone', zoneH: zoneH };
    if (odIn / 12 > w) return { error: 'wide' };
    var zone = w * zoneH * len - pipe, above = w * (d - zoneH) * len;
    return { totalCf: total, pipeCf: pipe, zoneCf: zone, aboveCf: above, fillCf: total - pipe, zoneH: zoneH };
  }
  function yd(cf) { return cf / 27; }
  return { fmt: fmt, toArch: toArch, PIPES: PIPES, GAL_PER_CF: GAL_PER_CF, cylCf: cylCf, water: water, idFromPipe: idFromPipe, trench: trench, yd: yd };
'''

VOL_UI = r'''
  var M = PBT;
  $('w-pipe').addEventListener('change', function () { var v = $('w-pipe').value; if (v) { $('w-id').value = M.fmt(M.idFromPipe(v), 3); calcW(); } });
  $('b-pipe').addEventListener('change', function () { var v = $('b-pipe').value; if (v) { $('b-od').value = M.PIPES[v].od; calcB(); } });
  function bad(a) { return a.some(function (v) { return Number.isNaN(v); }); }
  function calcW() {
    var out = $('w-out'), id = num('w-id'), len = num('w-len');
    if (id === null || len === null) { out.innerHTML = msg('Enter the inside diameter and the length.'); return; }
    if (bad([id, len])) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (!(id > 0) || !(len > 0)) { out.innerHTML = msg('Diameter and length must be more than 0.', true); return; }
    var r = M.water(id, len);
    out.innerHTML = '<div class="answers">' + answer('Water to fill it', M.fmt(r.gal, 1) + ' gal', 'US gallons', 'w-gal') + answer('Volume', M.fmt(r.cf, 2) + ' ft&sup3;', M.fmt(M.yd(r.cf), 2) + ' yd&sup3;', 'w-cf') + answer('Per foot of pipe', M.fmt(r.galPerFt, 3) + ' gal', 'per linear foot', 'w-perft') + '</div>';
  }
  function calcB() {
    var out = $('b-out'), w = num('b-w'), d = num('b-d'), len = num('b-len'), od = num('b-od'), bed = num('b-bed'), cov = num('b-cov');
    if (bed === null) bed = 0; if (cov === null) cov = 0;
    if (w === null || d === null || len === null || od === null) { out.innerHTML = msg('Enter the trench width, depth, length and the pipe outside diameter.'); return; }
    if (bad([w, d, len, od, bed, cov])) { out.innerHTML = msg('Check the numbers: one of them is not a number.', true); return; }
    if (!(w > 0) || !(d > 0) || !(len > 0) || !(od > 0) || bed < 0 || cov < 0) { out.innerHTML = msg('Width, depth, length and diameter must be more than 0, and bedding and cover can\'t be negative.', true); return; }
    var r = M.trench(w, d, len, od, bed, cov);
    if (r.error === 'zone') { out.innerHTML = msg('Bedding + pipe + cover is ' + M.fmt(r.zoneH, 2) + ' ft, deeper than the trench.', true); return; }
    if (r.error === 'wide') { out.innerHTML = msg('The pipe is wider than the trench.', true); return; }
    out.innerHTML = '<div class="answers">' +
      answer('Pipe zone material', M.fmt(M.yd(r.zoneCf), 2) + ' yd&sup3;', 'Bedding + cover, ' + M.fmt(r.zoneH, 2) + ' ft deep, less the pipe', 'b-zone') +
      answer('Backfill above it', M.fmt(M.yd(r.aboveCf), 2) + ' yd&sup3;', 'Top of the pipe zone to the top of the trench', 'b-above') +
      answer('Trench, less the pipe', M.fmt(M.yd(r.fillCf), 2) + ' yd&sup3;', 'All the fill, both of the above', 'b-fill') +
      answer('Trench volume', M.fmt(M.yd(r.totalCf), 2) + ' yd&sup3;', M.fmt(r.totalCf, 1) + ' ft&sup3; dug', 'b-total') +
      answer('Pipe takes up', M.fmt(M.yd(r.pipeCf), 2) + ' yd&sup3;', M.fmt(r.pipeCf, 1) + ' ft&sup3;', 'b-pipecf') + '</div>';
  }
  live(['w-id', 'w-len'], calcW);
  live(['b-w', 'b-d', 'b-len', 'b-od', 'b-bed', 'b-cov'], calcB);
'''


def vol_page():
    path = '/tools/pipe-volume-weight/'
    title = 'Pipe Volume and Backfill Calculator | The Pipelayer\'s Bible'
    desc = 'Free calculator: gallons of water in a pipe run, and cubic yards of bedding and backfill for a trench, less the space the pipe takes up. Formulas shown.'
    trail = [('Home', '/'), ('Free tools', '/tools/'), ('Pipe volume and backfill', path)]
    body = hero(trail, 'Free tool', 'Pipe volume and backfill',
                'Gallons to fill a line for flushing or a test, and cubic yards of bedding and backfill for a trench with the pipe taken out.') + '''
<div class="content"><div class="wrap">
<section class="tool" aria-labelledby="t1">
  <h2 id="t1">Water in the pipe</h2>
  <div class="grid2">
    <div class="field"><label for="w-id">Inside diameter <span class="hint">inches</span></label><input id="w-id" type="number" inputmode="decimal" step="any" min="0" value="8"></div>
    <div class="field"><label for="w-len">Length of the run <span class="hint">feet</span></label><input id="w-len" type="number" inputmode="decimal" step="any" min="0" value="100"></div>
    <div class="field"><label for="w-pipe">Or fill the inside diameter from a pipe <span class="hint">outside diameter less two minimum walls</span></label><select id="w-pipe"><option value="">Choose a pipe (optional)</option>''' + PIPE_OPTIONS + '''</select></div>
  </div>
  <div class="results" id="w-out" aria-live="polite"></div>
</section>

<section class="tool" aria-labelledby="t2">
  <h2 id="t2">Bedding and backfill</h2>
  <div class="grid2">
    <div class="field"><label for="b-w">Trench width <span class="hint">feet</span></label><input id="b-w" type="number" inputmode="decimal" step="any" min="0" value="3"></div>
    <div class="field"><label for="b-d">Trench depth <span class="hint">feet, to the trench bottom</span></label><input id="b-d" type="number" inputmode="decimal" step="any" min="0" value="6"></div>
    <div class="field"><label for="b-len">Trench length <span class="hint">feet</span></label><input id="b-len" type="number" inputmode="decimal" step="any" min="0" value="100"></div>
    <div class="field"><label for="b-od">Pipe outside diameter <span class="hint">inches</span></label><input id="b-od" type="number" inputmode="decimal" step="any" min="0" value="8.4"></div>
    <div class="field"><label for="b-pipe">Or fill the outside diameter from a pipe</label><select id="b-pipe"><option value="">Choose a pipe (optional)</option>''' + PIPE_OPTIONS + '''</select></div>
    <div class="field"><label for="b-bed">Bedding under the pipe <span class="hint">inches</span></label><input id="b-bed" type="number" inputmode="decimal" step="any" min="0" value="6"></div>
    <div class="field"><label for="b-cov">Cover over the top of the pipe <span class="hint">inches of pipe zone material</span></label><input id="b-cov" type="number" inputmode="decimal" step="any" min="0" value="12"></div>
  </div>
  <div class="results" id="b-out" aria-live="polite"></div>
</section>

<div class="prose">
<h2>The formulas</h2>
<p class="formula">pipe volume (ft&sup3;) = &pi; &times; (diameter in inches &divide; 12 &divide; 2)&sup2; &times; length in feet</p>
<p class="formula">gallons = ft&sup3; &times; 7.48052</p>
<p class="formula">trench (ft&sup3;) = width &times; depth &times; length</p>
<p class="formula">pipe zone (ft&sup3;) = width &times; (bedding + OD + cover) &divide; 12 &times; length &minus; pipe volume (by OD)</p>
<p class="formula">backfill above (ft&sup3;) = width &times; (depth &minus; pipe zone height) &times; length</p>
<p class="formula">cubic yards = ft&sup3; &divide; 27</p>
<p>A US gallon is 231 cubic inches, and a cubic foot is 1,728, so there are 7.48052 gallons in a cubic foot. Water uses the inside diameter. Bedding and backfill take out the space the pipe fills, so they use the outside diameter.</p>
<p>Example with the numbers already filled in: 100 ft of 8" inside diameter holds 34.91 ft&sup3;, about 261 gallons (2.611 gallons a foot). A 3 ft wide, 6 ft deep, 100 ft trench is 66.67 yd&sup3;. 8" SDR 35 (8.4" outside) takes up 1.43 yd&sup3; of it. With 6" of bedding and 12" of cover the pipe zone is 2.2 ft deep: 23.02 yd&sup3; of pipe zone material and 42.22 yd&sup3; of backfill above it.</p>
<div class="note"><p>These are in-place volumes for a trench with vertical walls. They don't add swell, compaction, waste, or the extra width of a sloped or benched cut, and inside diameters picked from the list are estimates. Use the pipe maker's numbers when they matter.</p></div>
</div>
''' + related([
        ('/tools/trench-sloping/', 'Trench sloping', 'OSHA Table B-1 slopes and the top width of the cut.'),
        ('/tools/pipe-grade-calculator/', 'Pipe grade calculator', 'Invert elevations every 25 ft along a straight grade.'),
    ]) + '''
</div></div>
''' + cta_band() + '\n' + script_block(VOL_MATH, VOL_UI)
    return page(path, title, desc, body, tool_ld(path, 'Pipe volume and backfill calculator', desc, trail), section='/tools/')


TOOLS = [
    ('/tools/pipe-grade-calculator/', 'Pipe grade calculator', 'Start invert, slope or drop, and length: invert elevations at every station, the fall and inches per foot. Plus the slope between two inverts.'),
    ('/tools/rod-reading-to-invert/', 'Rod reading to invert', 'Benchmark plus backsight is the HI. HI minus the rod reading is the elevation. Then the invert, with the rod on the invert, on top of the pipe or under it.'),
    ('/tools/trench-sloping/', 'Trench sloping', 'OSHA Table B-1 maximum allowable slopes for stable rock and Type A, B and C soil, and the top width of the cut.'),
    ('/tools/pipe-volume-weight/', 'Pipe volume and backfill', 'Gallons of water in a run, and cubic yards of bedding and backfill for the trench with the pipe taken out.'),
]


def tools_index():
    path = '/tools/'
    title = 'Free Calculators for Pipe Crews | The Pipelayer\'s Bible'
    desc = 'Free pipe grade, rod reading to invert, trench sloping and pipe volume calculators for underground pipe crews. They work on a phone, right in the browser.'
    trail = [('Home', '/'), ('Free tools', path)]
    cards = ''.join('<li class="card"><h2><a href="%s">%s</a></h2><p>%s</p><a class="go" href="%s" aria-hidden="true" tabindex="-1">Open the calculator</a></li>' % (h, t, d, h) for h, t, d in TOOLS)
    body = hero(trail, 'Free tools', 'Free tools for pipe crews',
                'Calculators for the math that comes up in the trench. They run on the phone in the browser and nothing you type leaves it.') + '''
<div class="content"><div class="wrap">
<ul class="cards">''' + cards + '''</ul>
<div class="prose" style="margin-top:32px">
<p>The math on these pages comes from the same functions as <a href="/">The Pipelayer's Bible</a> app: the same rounding, the same feet-inches to the nearest 1/16", and the same pipe tables. The app does a lot more with it: a whole run with hubs and fittings, the grade sheet, the run report, and the daily report.</p>
<p>New to the math? Start with the <a href="/guides/">guides</a>.</p>
</div>
</div></div>
''' + cta_band()
    ld = [ORG_LD, {'@type': 'CollectionPage', 'name': 'Free tools for pipe crews', 'url': SITE + path, 'description': desc, 'publisher': ORG_REF,
                   'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': SITE + h, 'name': t} for i, (h, t, d) in enumerate(TOOLS)]}},
          breadcrumb_ld(trail)]
    return page(path, title, desc, body, ld, section='/tools/')
