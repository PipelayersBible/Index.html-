# Survey marks & staking by state — findings (Nov 21, 2026; saved by lead from the helper's report)

App is mostly sound: unreadable things are refused, not guessed (metric rows, bare +/- rows, ft-in rows).

## Worst first
1. SAFETY: stake photo reader fills cut/fill when the stake shows only a sign ("-4.68"), an arrow, or no C/F letter; agencies use ± differently (NCDOT ± on slope/ditch stakes = offset stake above/below intercept). Metric "C 1.250 m" filled as 1.25 ft. FIX STAGED s3 (leave empty unless C/F/CUT/FILL; 21-case node test; t103, t119 OK).
2. Cutsheet import loses LT/RT offsets ("LT 15.00", "15.00 RT", "O/S 15.00 RT", "R15.00"): line type becomes Other/Reference. Reproduced on live. FIX STAGED s1.
3. SAFETY: no warning about NAVD 88 vs NGVD 29 (diff about -1.3 to +4.9 ft); Miami-Dade plans may be on NGVD 29, NAVD 88 or City of Miami datum. STAGED s5 (Education) + Ask cards.
4. "L/O" means "lath offset" (server stake vocabulary) vs "line only" (glossary, Ask sym-4) vs app Education "lath offsets". s5 fixes app text; server line proposed.
5. Cutsheet rows "C 4.60" / "CUT 4.60" unreadable. STAGED s2 (letter/word only; bare sign still refused; refuses run-together rows).
6. Blue tops vary: WSDOT blue = subgrade hubs, red = base rock, yellow = top course; Ask stake-read-30 says finished grade. s5 + WA card.
7. Flagging colors vary (WSDOT ROW red; NCDOT pipe stakes blue; Caltrans ROW white/yellow); Ask only knew CA. WA, NC cards added.
8. Slope converter lacks ft/ft and H:V. STAGED s4 (display only).
9. Glossary "Grade & Survey" had 7 words; s5 adds 12 with regional notes.
10. US survey foot vs international foot not mentioned (0.01 ft/mile; matters for coordinates; TDOT still uses survey feet). Cards staged.
Also: server stake glossary's 811 lines are California-only — for the 811 work.

## Staged
patches s1-s5 (each alone on r17.13; stack s1→s5); tests/t_survey.js (passes stacked, fails live); existing grade/t05_csparse, grade2 cutsheet, t02_pdf_stations, t103, t119 pass. Full regression not run. s5 text English only.
lib_survey.jsonl: 8 cards (survey foot; NAVD/NGVD; NAPGD2022 unconfirmed; WA flagging/tops (medium); NC; FL Miami-Dade; TN units; AZ slope stakes). lib_kb 0 errors; 4/4 retrieval.
PROPOSED_stake_prompt_lines.txt: server stake prompt edits (needs an AI test round).

## For Tommy
1. Ask 3-4 out-of-state contractors (East Coast/DOT, PNW, FL, TX) for 2 sample cutsheets + 10 stake photos each (LT/RT sheets, survey feet / NGVD 29, +/- or arrow-only stakes).
2. Ask for their surveyor's staking legend (flag colors, top colors).
3. Ship s3 (recommend yes).
4. Ship s1, s2, s4, s5 (recommend yes).
5. Get current WSDOT M 22-97 and MnDOT surveying manual.

## DONE
