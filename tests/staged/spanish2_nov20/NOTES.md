# Spanish setting, phase 2 (staged on r17.10, Nov 20 2026)

Builds on `tests/staged/spanish_nov19` (phase 1). This folder is complete by itself: it carries phase 1's strings, a
newer engine, and ONE patch that replaces phase 1's patch (do not stack both).

Nothing committed, pushed or deployed. Nothing changed on Supabase. `_src/index.html` is not edited. Client-only.

**Still true: before Spanish is turned on for real crews, a fluent Spanish speaker who works in the trade must read the
safety screens.** I wrote and re-read every line, but nobody fluent has checked it. `safety_review.md` now lists 492
safety-critical strings (English next to Spanish); the REVIEW list at the end of `glossary.md` has the 22 word choices.

## The switch (ships hidden this week)

`patches/01_spanish.py`, top of the file:

    PB_ES_ENABLED = False      # <- flip to True when the safety Spanish has been reviewed
    PB_ES_REVIEW_LINK = True   # while hidden: #es-review turns Spanish on for one phone (for the reviewer)

With `PB_ES_ENABLED = False`:
- no Language row in Settings (it is in the page with `display:none`), no "¿Ver la app en español?" bar;
- a phone whose language is Spanish, even one that has an old saved "Español" choice, gets English;
- `pbSetLang('es')` does nothing; the layer never switches on; the Spanish words sit in a data block
  (`<script type="application/json">`) that the browser does not run and the app never reads;
- the shipped file is the r17.10 source plus the inserted blocks, byte for byte (tested).

Cost in English: the page is 252 KB bigger (9.03 MB → 9.29 MB source; mostly the 222 KB of Spanish words, which compress
well). No code runs for it beyond reading one saved setting. If even the size is not wanted this week, set
`PB_ES_REVIEW_LINK = False` too: the page then carries no Spanish words at all (+29 KB, the dormant layer only).

**The reviewer's link.** While hidden, opening the app once at `…/#es-review` turns the Language row on for that one
phone (saved on the phone), so the fluent reviewer can read the real screens this week without a special build.
`…/#es-review-off` undoes it. It is a decision for Tommy (below); it has its own constant.

## What is built

| File | What it is |
|---|---|
| `patches/01_spanish.py in.html out.html` | The one patch (3 exact-once `rep()` edits): dictionary data + layer + 7 Spanish CSS lines right after `<body>`, and the hidden Language row in Settings > Preferences. Replaces phase 1's. |
| `patches/02_laid_toast_width_en_OPTIONAL.py` | Optional, changes English: one CSS value so the "Laid to 10.0 (2 rows)" toast is not cut at half the screen in English either. Spanish has it already. |
| `engine.js` | The translation layer (about 403 lines). |
| `words.py` | **The two open word choices, one edit each:** `WORD_ATTENDANT = 'asistente'` (or `'vigilante'`), `WORD_GRADE = 'nivel'` (or `'grade'`). Then `sh mk.sh`. Both choices build clean. |
| `strings_src.py` | Phase 1 strings (second read applied). |
| `strings_p2_a.py … strings_p2_g.py`, `strings_p2_hand.py` | Phase 2 strings by screen. Edit these. |
| `build.py` | Checks the strings; writes `strings_es.json`, `dict.json`, `safety_review.md`. |
| `strings_es.json` | The strings file: 2,416 entries (id, screen, English, Spanish, `safety`, notes). |
| `safety_review.md` | The 492 safety-critical strings for the fluent reviewer. |
| `glossary.md` | Terms, why, alternatives, and the REVIEW list in one place. |
| `terms_es.html`, `privacy_es.html` | Spanish courtesy copies of the live Terms v1.0 and Privacy v1.0. DRAFT for the lawyer. |
| `tests/` | `t_es_switch.js`, `t_es_screens.js`, `t_es_english.js`, `t_es_hidden.js` (new), `lib.js`, harvest tools. |
| `shots/` | 390 px screenshots of every tested screen in Spanish. |
| `work/` | How the phase 2 strings were made (key lists, my Spanish by number, the join script). Not needed to build. |
| `mk.sh` | Builds everything into `/tmp/claude-0/es20/site` (cur = Spanish offered, hidden = as shipped, nolink, base). |

To ship hidden: `python3 build.py && python3 patches/01_spanish.py <in> <out>`, and put `terms_es.html` and
`privacy_es.html` next to `terms.html` (harmless while hidden; nothing links to them in English).

## What changed in the layer since phase 1

1. The switch and the reviewer link (above). The dictionary is plain data, read only when Spanish is turned on.
2. **Dates in Spanish.** "Thu, Nov 19" → "jue 19 nov"; "Nov 19, 2026, 10:02 PM" → "19 nov 2026, 10:02 PM"; "November 19,
   2026" → "19 de noviembre de 2026". Clock times stay "10:02 PM" (as on the phone and on the records). All-number dates
   (11/19/2026) stay month/day/year, the US way and the same as the English records. Display only.
3. **The CSS-drawn words.** "Release: laid" / "Release: undo" → "Suelte: instalado" / "Suelte: deshacer"; Rod Elevation
   at large text: "Reading" → "Lectura" ("Elev." is the same in Spanish).
4. **Records.** Phase 1 left every Records screen untouched. Now the Records LISTS are Spanish (headings, filters, row
   labels, status chips, buttons) and the CONTENTS of a record stay as written: the PDF viewer, an opened management
   report, a report receipt, and every block of report text (`<pre>`) are never translated.
5. **Terms links.** In Spanish the Terms / Privacy links open `terms_es.html` / `privacy_es.html`; the tick line no
   longer says "(en inglés)". The app's own code still sees the English addresses.
6. Hints inside empty text boxes are translated (what a person typed never is).
7. The app's own code now also reads English for hints and labels it copies (a box's hint, a screen's HTML, a cloned
   part of a screen). One real case was found by the tests; see "Found along the way".

## Strings: done / total

**2,416 strings done** (phase 1: 550; phase 2: +1,866). 492 are marked safety-critical. 162 are patterns with values.

| Area (phase 2, in the order asked) | New strings |
|---|---|
| Daily report (form, hours and sign, crew, equipment, delays) | 44 |
| Field tickets (list, ticket form, company tickets) | 63 |
| Crew screens (crew members, crew runs, My production, work without a run, foreman Home) | 175 |
| Calculators (all 15, with their results), the Calculators / Tools lists, the shortcuts editor | 362 |
| Settings, Notifications, Feedback, Report to management, hints in text boxes | 182 |
| Notices, errors, "not saved" messages (every one-sentence alert and confirm in the code: 418) and the run dialogs (delay, utility found, rework, equipment, end run) | 491 |
| Records list labels (not the record contents) | 85 |
| Confined space: the permit setup form, close-out, emergency leftovers, the confined space hub | 177 |
| Run Setup and Run Results leftovers, cutsheet import, jobs, stats, job summary, inspections | 277 |
| The bar that takes you back to open work ("Tramo en curso", "LA EMERGENCIA SIGUE ABIERTA") | 10 |
| **Phase 2 total** | **1,866** |

How complete, measured on the page:
- The app page holds 3,370 pieces of fixed text across its 91 screens. **851 are still English: 794 on the
  Education & Reference screens** (lessons, glossary, formulas, reference tables), 56 on Ask / Plans / Toolbox Talks /
  Company logo, 1 is a name. Every other screen's fixed text is in Spanish.
- On the 79 screen states the tests open (below), no English is left except units, names and typed values.
- Dialogs: the code has 761 places that open a message. The 341 that are one fixed sentence are done. The rest build
  their sentence from parts; the ones on the main run, permit, daily report and calculator paths are done as patterns
  (160). **A few hundred less common built-up messages still show in English** (they fall back; nothing breaks).

What is left (not done, in my suggested order):
1. Built-up messages off the main paths (about 300 to 400 shapes): office approvals, billing, plan reading, sync details.
2. Ask (its screen chrome is small, 27 pieces; the answers themselves come from the server in English), Plans, Toolbox
   Talks library (about 1,200 long strings), Education & Reference (794 pieces plus lesson bodies).
3. Office / owner screens: billing, beta accounts, dashboards' inner tables, admin log.
4. Records contents, PDFs, company reports, emails and texts the app sends, push notification text: English by decision.
5. Per-account language (it is per phone now), text size Large / Extra Large in Spanish beyond Settings, a real
   iPhone / Android check, a screen reader check.

## Second read

Every phase 1 and phase 2 line was read again as a pipelayer would. Changed: "Uniéndose…" → "Entrando a la cuadrilla…";
"salirse de eso" → "salirse del arbitraje"; "en la bolsa" → "en el bolsillo"; the laid toast "Hasta 10.0" → "Inst. hasta
10.0"; "encimar" (my first word for overwrite) → "reemplazar" everywhere; "un lugar que se paga" → "un usuario pagado";
"Peón" → "Ayudante"; the status "Mandado" → "Enviado" (in Mexico "mandado" is also an errand; the verb stays "mandar");
inspection "Marcar revisión" → "Anotar resultado"; "Reclamos" → "Tramos tomados"; "plancha" → "base"; "tierra negra" →
"tierra franca"; the permit "falta: X" line reworded. The REVIEW list in `glossary.md` is current (22 items).

## Spanish Terms and Privacy

`terms_es.html` and `privacy_es.html` translate the LIVE documents (Terms v1.0 and Privacy v1.0, effective Nov 17 2026),
section for section (checked: same 19 / 12 sections, same numbered paragraphs, list items and table rows). Each has, at
the top, in a box: "Traducción de cortesía. La versión en inglés es la que vale." with the same sentence in English and
a link to the English original, then a dashed **BORRADOR / DRAFT** box ("not yet reviewed by a lawyer"). The draft box
sits between `<!-- DRAFT-BANNER-START -->` and `<!-- DRAFT-BANNER-END -->`: remove it after the lawyer's review. The
pages are `noindex`.

For the lawyer (questions, not conclusions): (a) is the "English version controls" line enough for the arbitration
opt-out and the liability sections when the person agreed on a Spanish screen; (b) the opt-out words are quoted in
English ("I opt out of arbitration") with a Spanish gloss: should a Spanish sentence also be accepted; (c) when Terms
v1.1 (`claude/Legal_v1.1_Drafts`) goes live, the Spanish copies must be updated the same day or taken down.

## Tests (all on the patched copy of r17.10, 390 px)

Run: `sh mk.sh`, serve `/tmp/claude-0/es20/site` on a port, then
`NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node tests/<file>`.
(`t_es_hidden.js` takes `PB_ROOT=http://127.0.0.1:<port>/` instead. `t_es_screens.js` takes a set name: p1, p2a, p2b, p2c, p2d.)

| Test | Result | What it shows |
|---|---|---|
| `t_es_hidden.js` (new) | 120 / 120 pass | **The switch off, as it ships.** The shipped file minus the inserted blocks is the r17.10 source byte for byte. On 8 screen states (Log In, join, Home, Settings, a locked run, Active Permit, Trench Sloping, Records), for an English phone and for a Spanish phone that has an old saved "Español": `<html lang="en">`, no offer bar, no Language row, the layer off, the dictionary never read, the page's own text functions untouched, `pbSetLang('es')` does nothing, every text and label on the whole page (about 3,700 pieces, shown or hidden) equal to unpatched r17.10, no Spanish words, no Spanish CSS. The reviewer link turns it on for one phone and off again; a build with the link off ignores it. |
| `t_es_english.js` on `hidden.html` | 54 / 54 pass | 18 screen states left in English draw the same HTML as unpatched r17.10. |
| `t_es_english.js` on `cur.html` | 54 / 54 pass | Same with Spanish offered and English chosen (only difference: the Language row). |
| `t_es_switch.js` | 55 / 55 pass | Phase 1's 39 checks (switch, switch back with every text restored, offered once to a Spanish phone, join works in Spanish, a run locked in Spanish sends the same record word for word) plus 16 new: 12 date shapes; "Marcar 5" is not a date; "Suelte: instalado / deshacer"; the laid toast whole and on screen ("Inst. hasta 10.0 (2 filas)" + Deshacer); Rod Elevation "Lectura"; Terms links go to the Spanish copies and back; report text, an opened report and typed text are never translated; text-box hints are; the two Spanish legal pages open, say the English version controls, are marked DRAFT, fit 390 px. |
| `t_es_screens.js` p1 | 121 / 121 pass | Phase 1's 29 screen states on the new layer and strings. |
| `t_es_screens.js` p2a to p2d | 201 / 201 pass | 50 new screen states in Spanish: foreman Home, Settings, Notifications, daily report (empty, filled, hours), tickets, ticket form, crew members, crew runs, My production (foreman and pipelayer), work without a run, jobs, stats, job summary, report to management, feedback, shortcuts, tools, calculator list, all 15 calculators with numbers in, confined space hub, the permit setup form, cutsheet import, Records lists (pipelayer with a locked run, foreman with a closed permit), delay / utility / end-run panels, close-out. Each: opens with no page error, no English left over except units, names and typed values, nothing off-screen or cut at 390 px that English does not already cut. |
| Goldens on the shipped build, one at a time (`tests/run_all.sh --build hidden.html --only <id>`) | 3 / 3 match | `t104_permitack`, `t103_aireads`, `t100_runpdf`. |

Totals: 79 screen states in Spanish; 2,879 pieces of text on them, 2,741 in Spanish, the rest numbers, units, names
and typed values. (Counts are from the last full run; 10 strings for the "Tramo en curso" bar were added after it and
the affected screens, the hidden test and the switch test were run again.)

Not run: the full regression (shared machine rule). Not tested: a real phone, a screen reader.

## Known limits (honest list)

1. Something a person typed that is exactly an app word is shown in Spanish (a job named "Storm" reads "Drenaje
   pluvial"). Display only; the saved value and the records are unchanged. More words are covered now, so this can
   happen a little more often than in phase 1.
2. Searching the tool list works on the English names (the app reads English from the page). The Spanish hint says so:
   "p. ej. volume, grade, report (en inglés)".
3. All-number dates stay month/day/year.
4. On a phone whose own language is Spanish, r17.10 itself already draws many on-screen dates in Spanish (it formats
   them with the phone's language: 100+ `toLocale…(undefined, …)` calls). The PDF reports use US English on purpose
   (`pbRptFmt`, `_src/index.html:49831`). I did not check whether any saved record text takes a date from the phone's
   language. Not caused by this patch; true with the switch off too.
5. Built-up messages I did not meet fall back to English, sometimes half a sentence.
6. The 911 script stays English (read to a 911 operator), with the Spanish heading that says so.

## Found along the way

1. **The app could read Spanish back from the page in one place, and two more of the same kind were possible.** Seen
   in the tests: the cutsheet paste box is rebuilt by copying its hint (`_src/index.html:52267`,
   `fresh.placeholder = old.placeholder`), so the Spanish hint became the "English" one. Not seen but the same kind: a
   screen's HTML read back with its labels, and parts of a screen cloned with their labels. All three are closed in the
   layer (no change to English code); switching back to English restores every text and label (tested).
2. **Phase 1 never swapped anything inside a sentence with bold words or links** except the words. So the Terms links
   and any label on a bold word were skipped. Fixed (needed for the Spanish Terms links).
3. The laid toast is cut at half the screen in English too (`_src/index.html:10031`): optional one-value patch 02.
4. The tool search works on English names only (limit 2 above). Making it search Spanish names would be a small change
   to English code (`pbDestSearch`), not done.

## Decisions for Tommy

1. **Reviewer link while hidden (`#es-review`).** Built, on by default, one constant. Recommend keeping it: the fluent
   reviewer can read the real screens on their own phone this week, and nobody else sees Spanish. If you would rather
   ship nothing at all, set `PB_ES_REVIEW_LINK = False` (the page then carries no Spanish words, +29 KB).
2. **asistente / vigilante and nivel / grade.** One edit each in `words.py` when your crews answer. Recommend also
   asking them about "tubero", "tramo", "regla" and "instalado" (items 3, 5, 6, 7 of the REVIEW list): those four are
   on almost every screen.
3. **All-number dates stay 11/19/2026 (month first).** Recommend keeping, so the screen matches the records and PDFs.
4. **Spanish Terms and Privacy.** Recommend the lawyer reads the two drafts and the three questions above before the
   switch is turned on; until then the DRAFT box stays on them.
5. **What next.** Recommend, in this order: the fluent review of `safety_review.md` (492 lines); then the built-up
   messages off the main paths; Education & Reference and the toolbox talks last, and only if crews ask for them.

## DONE
