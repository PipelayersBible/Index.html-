#!/usr/bin/env python3
"""fittings_live 02: the office Today table. Fittings fills from the phones' live status until the daily is signed;
a foreman with nothing sent gets one clean grey line. python3 p02_today_fittings_idle.py in.html out.html (needs p01 only on phones; any order)"""
import sys, os
H = os.path.dirname(os.path.abspath(__file__))
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)
# 1. each row adds up what its runs of today report
rep("daily: null, fittings: null, tickets: [],", "daily: null, fittings: null, fitLive: null, fitOf: 0, fitBy: { tw: 0, b: 0, s: 0, o: 0 }, fitTyped: true, tickets: [],")
rep("      R.runs.push({ p, r, ft, today }); if (r.ended) R.ended++;",
    "      const fit = today ? pbOvFitOfStatus(s) : null; /* fittings_live */\n"
    "      if (fit) { R.fitLive = (R.fitLive || 0) + fit.n; R.fitOf += fit.of; if (fit.by) Object.keys(R.fitBy).forEach(k => { R.fitBy[k] += fit.by[k]; }); else R.fitTyped = false; }\n"
    "      R.runs.push({ p, r, ft, today, fit }); if (r.ended) R.ended++;")
# 2. helpers, before the builder
A = "  // The rows: one per crew (its foreman) and job. Pure: the board, the feed, the people, the jobs in; rows out.\n"
rep(A, r"""  // ---- fittings_live (Nov 20): the Fittings column fills during the day from what the phones send ("fit" on a run's status) ----
  const pbOvWhole = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 500 && Math.floor(v) === v ? v : null;
  function pbOvFitOfStatus(s) { // one run's count, read as strictly as the server keeps it; anything odd: no count
    const f = s && s.fit && typeof s.fit === 'object' && !Array.isArray(s.fit) ? s.fit : null, n = f ? pbOvWhole(f.n) : null; if (n === null) return null;
    const of = pbOvWhole(f.of), by = { tw: pbOvWhole(f.tw) || 0, b: pbOvWhole(f.b) || 0, s: pbOvWhole(f.s) || 0, o: pbOvWhole(f.o) || 0 };
    const typed = ['tw', 'b', 's', 'o'].some(k => pbOvWhole(f[k]) !== null) && by.tw + by.b + by.s + by.o === n;
    return { n, of: of !== null && of >= n ? of : n, by: typed ? by : null };
  }
  function pbOvFitWords(by) { // "2 tees/wyes, 1 bend"
    if (!by) return '';
    return [[by.tw, 'tee/wye', 'tees/wyes'], [by.b, 'bend', 'bends'], [by.s, 'manhole/structure', 'manholes/structures'], [by.o, 'other', 'other']].filter(x => x[0] > 0).map(x => x[0] + ' ' + (x[0] === 1 ? x[1] : x[2])).join(', ');
  }
  // What the Fittings cell shows. Until the daily is signed: the phones' count. Signed: the count on the daily. (A signed
  // daily that counted none, while the crew's phones report some, keeps the phones' count: the daily counts only the
  // runs on the signer's own phone.)
  function pbOvFit(r) {
    const signed = r.daily && r.fittings !== null && r.fittings !== undefined && Number.isFinite(Number(r.fittings)) ? Number(r.fittings) : null, live = r.fitLive;
    if (signed !== null && (signed > 0 || !(live > 0))) return { n: signed, src: 'signed', tip: 'Counted by the app on the signed daily report.' };
    if (live === null || live === undefined) return null;
    const words = r.fitTyped ? pbOvFitWords(r.fitBy) : '';
    return { n: live, src: 'live', words, sub: signed !== null ? 'on runs' : 'so far',
      tip: live + ' of ' + r.fitOf + ' fitting' + (r.fitOf === 1 ? '' : 's') + ' on today’s runs marked laid, as the crew’s phones last sent.' + (words ? ' ' + words + '.' : '') + (signed !== null ? ' The signed daily report counted none.' : ' The signed daily report’s count takes over once it is signed.') };
  }
  window.__pbOvFit = pbOvFit; // tests
""" + A)
# 3. heading tip, sorting, the cell
rep("['fittings', 'Fittings', 'Counted by the app on the signed daily report. Shows once the daily is signed.']",
    "['fittings', 'Fittings', 'Fittings marked laid on today’s runs, as the crew’s phones last sent. Once the daily report is signed: the count on it.']")
rep("k === 'fittings' ? (r.fittings === null ? -1 : r.fittings)", "k === 'fittings' ? (pbOvFit(r) ? pbOvFit(r).n : -1)")
rep("        r.fittings !== null && r.fittings !== undefined ? pbCxE(pbProdQtyText(r.fittings)) : dash,",
    "        (() => { const F = pbOvFit(r); return !F ? dash : '<span class=\"ov-fit\" data-src=\"' + F.src + '\" title=\"' + pbCxE(F.tip) + '\">' + pbCxE(pbProdQtyText(F.n)) + '</span>' + (F.src === 'live' ? '<span class=\"ov-sub\">' + pbCxE(F.sub) + '</span>' : ''); })(), /* fittings_live */")
# 4. a foreman with nothing sent: the name, then ONE quiet line across the empty columns (no row of dashes)
rep(" onclick=\"pbOvToggle(this.dataset.key, event)\">' + cells.map((c, j) => '<td class=\"ov-c-' + PB_OV_COLS[j][0] + '\">' + c + '</td>').join('') + '</tr>'",
    " onclick=\"pbOvToggle(this.dataset.key, event)\">' + (r.idle ? '<td class=\"ov-c-crew\">' + cells[0] + '</td><td class=\"ov-idle-note\" colspan=\"' + (PB_OV_COLS.length - 1) + '\">Nothing sent today</td>' : cells.map((c, j) => '<td class=\"ov-c-' + PB_OV_COLS[j][0] + '\">' + c + '</td>').join('')) + '</tr>'")
# 5. the opened row: each run's fittings, and the day's by type
rep("(ft > 0 ? ' · today ' + pbProdQtyText(ft) + ' ft' : '') + ' · last update '",
    "(ft > 0 ? ' · today ' + pbProdQtyText(ft) + ' ft' : '') + (fit ? ' · fittings ' + fit.n + ' of ' + fit.of + ' laid' : '') + ' · last update '")
rep("r.runs.map(({ p, r: run, ft }) => {", "r.runs.map(({ p, r: run, ft, fit }) => {")
rep(".join('') + '</ul>' : '<p class=\"ov-dim\">No runs sent today.</p>') + '</div>';",
    ".join('') + '</ul>' + (r.fitLive !== null && r.fitLive !== undefined ? '<p class=\"ov-dim ov-fitline\">' + pbCxE('Fittings laid today: ' + r.fitLive + ' of ' + r.fitOf + (r.fitTyped && pbOvFitWords(r.fitBy) ? ' (' + pbOvFitWords(r.fitBy) + ')' : '')) + '</p>' : '') : '<p class=\"ov-dim\">No runs sent today.</p>') + '</div>';")
# 6. the styles
css = open(os.path.join(H, 'fl.css'), encoding='utf-8').read()
A = '<style id="cpTopStyle">'
rep(A, css + A)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
