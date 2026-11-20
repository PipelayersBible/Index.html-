# taper_calc_nov20 - Taper & Cone Spacing calculator (staged, not released)

Nov 20 2026. Base: `_src/index.html` r17.11 (copied to `work/base.html`, never edited). Nothing deployed or committed.

## What is built
- `p_taper.py` - exact-once rep() patch: `python3 p_taper.py in.html out.html` (inlines `taper_math.js`). Page +16 KB.
- New calculator **Taper & Cone Spacing** under Calculators > new **Traffic Control** category (6th category chip,
  section with a cone icon), searchable from More ("cone", "taper", "flagger", "lane closure"...), Add to Home works.
- Inputs: posted speed (mph), taper type (merging / shifting / shoulder closed / flagger one-lane two-way / downstream),
  lane or shoulder width (ft, starts at 12; hidden for flagger and downstream), road type for sign spacing, job state.
- Answers as you type (the app's calclive engine, so Copy calculation, the quiet bad-entry line and kept entries work
  like the other calculators): taper length with the formula worked out, cones in the taper and spacing, cone spacing
  along the work (2 x speed), buffer length, flagger station distance (flagger type), advance warning signs A / B / C and
  how far back the first sign is. A state line, a "Where the numbers come from" fold, and the last line on the page:
  "Your competent person / traffic control plan decides on site. Follow the approved TCP if there is one."
  Top banner: "Minimums from the national manual (MUTCD). Not a traffic control plan. The approved plan or permit comes first."
- Job state default (same sources as the 811 / trench rules): current job (picked or its address) -> company state ->
  where this phone is (12 h) -> not set (national numbers). Says where it came from; a pick is kept.
- State rules: only **California** differs and is confirmed (lib_traffic_nov20): city street sign spacing by speed
  (CA MUTCD 2026 Table 6B-1: 25 or less 100 ft, 30: 150, 35: 200, 40: 250, 45: 300, 50+: 350) shown as
  "California rule". CA tapers (Table 6B-3(CA)) equal the national formula, checked value by value in the unit test.
  **Alaska** (added on the coordinator's follow-up, medium confidence): 2026 ATMS Table 6B-1 sets city low speed = 40 mph
  or less (100 ft), 45+ high (350 ft), so on city streets the app picks the row by speed and says "Alaska rule"; rural and
  freeway rows are national. Note: flaggers on state highways certified (Std Spec 643), paddle 24 in / 8 in letters except
  local roads 25 mph or less, "Check the state manual." **Massachusetts** (medium): national numbers + note: MassDOT-certified
  flaggers, airhorn, radios when working together, cones at least 36 in, "Check the state manual."
  Every other state: national numbers + "<State> may have its own manual or supplement with different numbers; check it."
- Offline: all numbers are in the page; no network call.

## Sources (checked Nov 20 2026)
- MUTCD 11th Edition, FHWA, Dec 2023 (Revision 1, Dec 2025), Part 6 - https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/part6.pdf
  (read with WebFetch today: Tables 6B-1, 6B-2, 6B-3, 6B-4 and Section 6K.01 para. 04; same values as lib_traffic_nov20's
  two-pass read incl. Rev. 1).
  - Taper: Section 6B.08, Table 6B-3 (merging >= L, shifting >= 0.5 L, shoulder >= 0.33 L, one-lane two-way and
    downstream 50-100 ft, devices ~20 ft apart) and Table 6B-4 (L = WS^2/60 at 40 mph or less, L = WS at 45 or more).
  - Device spacing: Section 6K.01 para. 04 (Guidance): <= 1 x speed limit (ft) in tapers, <= 2 x in tangents.
  - Sign spacing: Section 6B.04, Table 6B-1 (urban low 100/100/100, urban high 350/350/350, rural 500/500/500,
    expressway/freeway 1000/1500/2640; the agency sets low/high speed).
  - Buffer: Section 6B.06, Table 6B-2 (stopping sight distance 20-75 mph); flagger station, Section 6D.06.
- **Numbering note:** the brief said Tables 6C-1 / 6C-2. Those are the 2009 numbers; in the 11th Edition they are
  **Table 6B-1** (sign spacing) and **Table 6B-2** (stopping sight distance). The app cites the 11th Edition numbers.
  Also: Table 6B-3 says downstream taper "50 ft minimum, 100 ft maximum" - not "per lane", so the app does not say per lane.
- 2026 Alaska Traffic Manual Supplement Rev. 0 (eff. Jan 20 2026), Table 6B-1, 6D.01, 6D.02, and Massachusetts Amendments to
  the MUTCD 11th Ed. (Jan 2026), 6C.05, 6D.01, 6D.05, 6D.06, 6K.01 - via lib_traffic_nov20 v2 `tc-ak-ttc-1`, `tc-ma-ttc-1`
  (read through the summarizer; confirm in the printed manuals).
- CA MUTCD 2026 (Caltrans, eff. Jan 18 2026), Tables 6B-1 and 6B-3(CA), via lib_traffic_nov20 `tc-ca-signspacing-1`, `tc-ca-taper-1`.

## Rounding and edge rules
Lengths rounded up to the whole foot (shift 122.5 -> 123, shoulder 81.7 -> 82: matches CA's printed table). Cones =
ceil(L / speed) + 1, so the gap is never over 1 x speed (245 ft at 35 mph = 8 cones; 540 at 45 = 13; same counts as
Oregon OTTCH Table 2-3). Speed 20-75 mph only (the tables' range); a speed between rows uses the next row up for the
buffer and CA signs; 41-44 mph uses L = W x S (the longer formula). Shoulder uses 1/3 L (a hair over 0.33 L).

## Tests (all pass)
- `tests/unit_math.js` (node, 58 checks): 45 mph 12 ft -> 540 ft; 35 -> 245; 55 -> 660; the whole 12 ft CA table
  (merge/shift/shoulder, 20-75 mph); 10/11 ft and 8 ft shoulder examples; cone counts vs MUTCD/OTTCH; gap <= speed for
  every speed/type/width; Table 6B-2 at every row; Table 6B-1 rows; CA city rows; AK city rows by speed; MA national; bad entries.
- `tests/t_taper_ui.js` (fake server rig, port 10350, 43 checks): phone 390 and computer 1280 (dark mode), category +
  row + search, cursor in speed, live answers, each taper type, CA vs TX, AK (40 / 45 mph) and MA notes, bad entry line, Copy calculation, Add to Home,
  state default from phone location / company / kept pick, offline answer, no overflow, no page errors.
  Screenshots in `work/`.
- Existing tests touching Calculators: `staged/simplify_nov19/tests/t_sim2_calc.js` - all "after" checks pass; its 2
  "before" checks fail because r17.11 already has that change (not this patch). `staged/critic_nov19/tests/t_cr1_pill.js`
  - same 6 fails on the unpatched base (an unapplied staged patch's test). `staged/spanish2_nov20/tests/t_es_screens.js
  fm_calcHub,fm_tools` - base already fails (Send feedback etc.); this patch adds 4 English pieces in Spanish mode (below).

## Decisions for Tommy
1. **Spanish.** The new screen and its Calculators row are English only in Spanish mode. Recommend: the Spanish helper
   adds them to pbI18nDict next pass (the safety line needs a careful translation), ship the English now.
2. **Road type must be picked for sign spacing** (no guess from speed, since the national table leaves low/high speed to
   the road agency). Recommend keep: one tap, and no silent wrong distance.
3. **New "Traffic Control" category** (6th chip on Calculators) rather than tucking it under another group. Recommend yes;
   later traffic tools (sign card, flagger helper, cone count sheet) go there too.
4. **Only California and Alaska get a state rule now** (Massachusetts a note only). Oregon's table read was not clean (medium confidence); Texas/Ohio manuals
   not reached. Recommend ship with CA, AK, MA notes + "check your state" for the rest; add states as lib_traffic confirms them.
5. **Speed limited to 20-75 mph** (the MUTCD tables' range). Recommend keep; below 20 or above 75 the TCP/engineer decides.

## DONE
