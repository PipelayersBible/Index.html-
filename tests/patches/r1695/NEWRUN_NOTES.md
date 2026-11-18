# New Run short form — notes
Started. cur.html = copy of r16.94 index.html. Port 8871.
- patches/01_newrun_short.py written + applies to r16.94; syntax OK
- Design: ONE "More settings" fold (details#runSecMore, class pb-runsec) between "1 Job & Pipe" and "2 Points & Instrument":
  Rod Unit, Instrument (HI), Pipe Wall & Laying Length (runWTRow + Remember), Intervals card, Trench design card, The Run (totalDist).
  "Additional runs" small fold (details#runSegGroup) at the bottom of Points wraps Add Additional Run + "Same HI only" hint.
  hiCrossCheckBox moved OUT of the HI box to just above Start Point (never folded). Hubs/crossings stay up front (they sit between Start and End).
- t123 written: tests/t123_newrunshort.js — ALL PASS (height 3805 -> 2957 at 390px).
- Fixes during build: r16.53 sub-card re-ordering pulled Intervals/Trench back out -> patched (move into More before ordering).
  New-form settle window (700 ms): a fresh form closes both folds, decides after the app has filled it (avoids a transient
  totalDist/endSta mismatch keeping More open). Resume / Edit Run Data / kept draft / Reuse: folds holding values re-open even if closed by hand.
- CSS parity added: .pb-lay-help stays hidden in More (it was hidden in Job & Pipe).
- Screenshots in shots/: before_{light,dark}.png, after_{light,dark}.png (fixed tab bar / pill hidden only for full-page capture),
  after_*_more_open.png, after_*_viewport.png, after_light_hicross_sim.png (simulated HI disagreement card above Start).
- Regression runner: reg/run.sh <page> <outdir>; copies in reg/copies (URL -> 8871, output files -> out/). Baseline (base.html = r16.94) in reg/base: all exit 0.

## Regression (patched build served at http://127.0.0.1:8871/cur.html; baseline = base.html, unpatched r16.94, same rig)
All 25 exit 0, no page errors, output identical to baseline except run ids / photo hashes / clock times:
t101 ok, t102 ok, t103 ok, t104 ok (cpError line as expected, same as baseline), t105 ok, t106 ok, t107 ok, t108 ok, t109 ok,
t110 ok, t111 ok, t112 ok, t113 ok, t114 ok, t115 ok, t116 ok, t117 ok, t118 ok, t119 ok, t120 ok, t121 ok, t122 ok, t90 ok, t91 ok, t95 ok.
(Full run in reg/cur, baseline reg/base, compare with reg/cmp.sh. After the last CSS-only change: t123 + t115/t118/t122/t90 re-run in reg/final, all same.)
Runner notes: t95 builds its URL from argv (runner passes the page name only to t95); t106 uses argv[2] as a mode, so nothing is passed to it.
No repo test needed changing: none of them fills a folded field (they use job #, jobsite, pipe size, stake reading, AI photos, pbAddHub).

## DONE
Up front (unchanged): Import Cutsheet, 1 Job & Pipe (Job details; Pipe details = pipe size + pipe type + custom ID),
2 Points & Instrument (Read All Stake Photos, Start, Hubs/Crossings, End), Review & Calculate. The HI cross-check warning
moved from the Instrument box to just above Start Point so it can never be folded away.
Folded: "More settings" (between sections 1 and 2) = Rod Unit, Instrument / HI method, Pipe Wall & Laying Length (+ Remember),
Intervals, Trench design (bedding/shading/width/materials), The Run total distance (mirror of the End distance).
"Additional runs" small fold at the bottom = Add Additional Run + "Same HI only" hint.
Closed line of More states: rod unit · HI method (or typed / benchmark HI) · wall (auto/typed) · laying length if any · interval /
laying rule · trench · total distance only if it differs from the End distance. Wraps, never truncated.
Opens by itself on: a value not this phone's normal start (typed, Resume, Edit Run Data, kept draft, Reuse, cutsheet import;
remembered rod/wall/laying and app-filled "auto" values count as normal), a flagged field, a showing warning, focus,
pbGoToField (already opened every folded parent), Add Hub / Add Additional Run (any folded parent opens). Closed by hand it
stays closed until something in it changes; Resume / Edit Run Data re-open it; a new run starts closed.
Height of the empty New Run at 390 px: 3,805 px -> 2,957 px (-848 px, -22%); visible inputs 20 -> 14, dropdowns 4 -> 4,
buttons 27 -> 18 (checkVisibility count; the critique's 23+6 used a looser count). No id moved, renamed or removed (425 ids checked).
Remember: rod unit, laying length/"use for intervals" and (opt-in) wall + ID were already remembered; HI method and interval
deliberately reset per run in the existing code (HI is per setup), so nothing new was added there.
Not folded, on purpose: Hubs/Crossings (they sit between Start and End and are common on sewer runs; folding cost a tap per run),
Import Cutsheet (a whole-run entry path), point label/photos (the AI stake-read review shows there), Job details extras
(pipelayer/foreman/notes are repositioned every 3 s by existing who-row code; moving them would fight it).
Tests changed: none. New: tests/t123_newrunshort.js (ALL PASS). Screenshots: shots/before_*, after_*, after_*_more_open, after_*_viewport.
