#!/usr/bin/env python3
"""fittings_live 01: the phone's live run status carries the fittings laid so far ("fit"). python3 p01_live_fittings_phone.py in.html out.html"""
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)
# 1. the count, beside the status builder
A = "  function pbLiveStatusOf(entry) {\n"
rep(A, r"""  // ==== fittings_live (owner, Nov 20 2026): "The app should automatically fill out the fittings it can." ====
  // This session's fittings laid so far, for the office's Today table: n = laid, of = fittings on this session's part of
  // the run, then by type: tw = tees and wyes, b = bends, s = manholes / structures (an "Other" fitting named so), o = the rest.
  // The same rule as the daily report's "counted by the app" (pbFitCount), except that a run still in progress with no
  // laid marks counts none yet (the daily counts them all once the run is ended). No fittings on the run: no field.
  // A server from before this update drops the field (pb_prod.clean_status keeps only what it knows).
  function pbLiveFitOf(entry, S) {
    try {
      const rows = S && Array.isArray(S.rows) ? S.rows : [], early = S && Array.isArray(S.early) ? S.early : [], ended = !!(entry.completed || entry.incomplete);
      let anyLaid = !!(S && S.laid && S.laid.some((t, i) => t !== null && t !== undefined && !early[i]));
      if (!anyLaid && entry.resumedFromId !== undefined && entry.resumedFromId !== null) { try { anyLaid = pbLaidEarlier(entry).times.size > 0; } catch (e) {} }
      let cap = null; try { cap = pbLaidStopCap(entry); } catch (e) { cap = null; }
      let of = 0, n = 0, tw = 0, b = 0, st = 0;
      rows.forEach((r, i) => {
        const f = pbFitOf(entry, r); if (!f || early[i]) return;
        of++;
        if (anyLaid) { if (!(S.laid[i] !== null && S.laid[i] !== undefined)) return; }
        else if (!ended || (cap !== null && Number(r && r.stationFt) > cap + 0.005)) return;
        n++;
        if (f.type === 'tee' || f.type === 'wye') tw++; else if (f.type === 'bend') b++;
        else if (f.type === 'other' && /manhole|\bmh\b|structure|catch basin|inlet|vault|clean[ -]?out/i.test(String(f.info || ''))) st++;
      });
      if (!of || of > 500) return {};
      return { fit: { n, of, tw, b, s: st, o: n - tw - b - st } };
    } catch (e) { return {}; }
  }
  window.__pbLiveFitOf = (entry) => pbLiveFitOf(entry, pbLaidSummary(entry)); // tests
""" + A)
# 2. into the status the phone already sends
A = "      pipe: pbLvPipeOf(entry, S), pipeType:"
rep(A, "      pipe: pbLvPipeOf(entry, S), ...pbLiveFitOf(entry, S), /* fittings_live */ pipeType:")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
