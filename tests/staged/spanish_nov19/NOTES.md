# Spanish setting, phase 1 (staged on r17.10, Nov 19 2026)

Tommy: "Start the process of making a Spanish setting. Don't just use Google Translate or whatever, I want it to be
proper for everyday Spanish speaking."

Nothing committed, pushed, deployed, or changed on Supabase. `_src/index.html` is not edited. Client-only.

**Before Spanish is turned on for real crews, a fluent Spanish speaker who works in the trade must read the safety
screens.** I wrote the Spanish carefully and read it twice, but I am not a pipelayer and nobody fluent has checked it.
`safety_review.md` lists the 188 safety-critical strings (English next to Spanish) so that person can start there.
The words marked REVIEW in `glossary.md` (attendant, grade, rod, laid, lock, hub, invert, foreman...) are the ones
most likely to need changing.

## What is built

| File | What it is |
|---|---|
| `patches/01_spanish.py in.html out.html` | The one patch. Adds the translation layer right after `<body>`, a 4-line Spanish CSS block, and Settings > Preferences > **Language / Idioma** (English / Español). Three `rep()` edits, each exact-once. |
| `engine.js` | The translation layer (about 330 lines, no build tools, works offline). |
| `strings_src.py` | The Spanish, by screen. Edit here. |
| `build.py` | Checks the strings and writes `strings_es.json`, `dict.json`, `safety_review.md`. |
| `strings_es.json` | The strings file: 550 entries with id, screen, English, Spanish, `safety: true/false`, notes. |
| `safety_review.md` | Only the safety-critical ones, for the fluent reviewer. |
| `glossary.md` | English term → Spanish used → why / alternatives, with the sources for the safety words. |
| `tests/` | `t_es_switch.js`, `t_es_screens.js`, `t_es_english.js`, `lib.js` (how each screen is opened), `harvest.js` (lists English on a screen that has no Spanish yet). |
| `shots/` | A 390 px screenshot of every translated screen in Spanish (`es_*.png`). |
| `mk.sh` | Build + apply to a copy of `_src/index.html` at `/tmp/claude-0/es19/site/cur.html`. |

Apply: `python3 build.py && python3 patches/01_spanish.py _src/index.html out.html`. Page size: +61 KB minified
(`tests/r1708/speed2/build/build.py` builds it; the minified page passes the Spanish screen test too).

## How it works (and one thing that is different from the brief)

The brief said "strings looked up by key with English as the fallback". It is that, with **the English text as the key**
(the way gettext does it), and the lookup happens where the text is drawn, not at each place in the code that writes it:

- English phone: the layer does nothing. It reads one saved setting and stops. The page's own code is not touched.
- Spanish: when the app draws text, the layer looks the English up in the dictionary and paints the Spanish. No entry:
  the English stays. So untranslated parts show English, and a wording change by another patch just falls back to English
  until its Spanish is added (the screen test then lists it).
- The app's own code still **reads English** from the page while Spanish is painted (text, HTML, option text and values,
  the labels it reads back, copies it makes). So its logic, the records it saves, the PDFs and the texts it sends are the
  same as on an English phone. This matters: the code compares screen text in about 60 places, for example
  `_src/index.html:28815` closes a sheet only if its title is exactly `Air Test Due`.
- Records, Reports and the PDF viewer screens are never translated (the company's official record stays as written).

Why not wrap every string in the code with `t('key')`: the app has roughly 11,000 pieces of wording in one 9 MB file,
four people were patching wording in it today, and every wrapped string is a change to English code that can break
English. One block added in one place cannot. `window.pbT(english)` exists for code that wants a string directly later.

Known limits of this approach:
1. Words drawn by CSS, not text (5 found): `Fold` / `Open` on Run Setup sections and `Calcs` on a narrow tab bar are
   handled with Spanish CSS. `Release: laid`, `Release: undo` (press-and-hold on a row) and `Reading` / `Elev.` (Rod
   Elevation calculator at large text) stay English: they sit inside media rules I did not want to copy blind.
2. Something a person typed that is exactly an app word (a job named "Home") would be shown in Spanish. Display only;
   the saved value is unchanged.
3. Dates and clock times are still English ("Nov 19, 10:02 PM"), except weekday names in the join-link line.
4. The app's sentences built from several parts need one pattern per shape. Shapes I did not hit in testing fall back
   to English (for example a permit window that is a full 24 hours, or a reading stamped later than the phone's clock).

## Where Spanish is offered

- Settings > Preferences > Language / Idioma: English | Español. Switches at once, no reload, saved on the phone
  (`localStorage pbLang`, per phone, not per account).
- A phone whose own language is Spanish (`navigator.language` starts with `es`) and that has not chosen yet gets one
  bar at the bottom of the screen: "¿Ver la app en español?" [Español] [English]. It shows on first open, Log In and
  the join screen, and goes away for good after either tap.

## What is translated (in the order asked)

| Screen | Entries |
|---|---|
| Shared words (Cancel, Continue, tab bar...) | 39 |
| Log In, Forgot password | 14 |
| Join screen (Android and iPhone "Step 1 of 2"), Terms tick, "What your company sees", join code, weekday names | 38 |
| Set Up Your Account, Choose / Set Password, Terms sheet | 18 |
| Home Screen step (iPhone Safari and Android Chrome) | 21 |
| Home (pipelayer) and tab bar | 30 |
| Run Setup | 95 |
| Check Before Locking, "Which Job Is This Run On?" | 33 |
| Run Results: grade sheet, mark laid, undo, run notes, end run | 60 |
| Quick Run | 20 |
| Active Permit: roster, check in / out, status, logs, permit details, close out | 102 |
| Air test entry and out-of-limit warnings | 24 |
| DO NOT ENTER / Permit Does Not Allow Entry sheets | 20 |
| Emergency panel | 36 |
| **Total** | **550** (188 marked safety-critical; 71 are patterns with values filled in) |

Not translated on purpose: the app's name; BOP / INV / TOP / HI; C and F as written on stakes; units and stations;
O2 / LEL / H2S / CO; what people type; **the 911 script** ("Read this to the dispatcher" stays English with a Spanish
heading that says so); the permit setup form the supervisor fills in (phase 2).

## Second pass (reading every line as a Spanish-speaking pipelayer)

Changed after the first draft: "Lo invitaron" → "Le llegó una invitación" (no guess at gender); "Boleta de campo" →
"Ticket de campo"; "Enviar" → "Mandar"; "Prepare su cuenta" → "Configure su cuenta"; "Toca prueba de aire" → "Hora de la
prueba de aire"; "Se terminó normal" → "Terminó normalmente"; the backflow sentence rewritten ("va en contrapendiente
(al revés)"); the attendant-restriction paragraph tightened by 50 letters. That last one mattered: in the first draft the
DO NOT ENTER sheet was 20 px too tall on a 390 x 844 phone, so the question "¿... entró de todos modos?" was below the
fold, above buttons that answer it. The test now checks that every safety sheet shows whole without scrolling.
Shortened to fit: "Hide laid" → "Ocultar" (the button has room for about 9 letters), "Run details" → "Detalles",
row tags "Laid 10:08 PM" → "Inst. 10:08 PM", "Next" → "Sigue".

Quotes from OSHA rules inside messages (1926.1209(d), 1926.1204(f), 1926.652(a)(1)) and the NIOSH line are **my
translation of the English text**, not an official Spanish text. They are marked in the strings file.

## Tests (all on the patched copy of r17.10, 390 px)

Run: `sh mk.sh`, serve `/tmp/claude-0/es19/site` on a port, then
`NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node tests/<file>`.

| Test | Result | What it shows |
|---|---|---|
| `t_es_switch.js` | 39 / 39 pass | Default English and the layer is not switched on at all. Settings toggle turns Spanish on at once and saves it; survives reopening. Back to English: every text and label on the whole page (3,448 pieces, shown or hidden) is exactly what it was, and the Settings HTML is identical. Spanish phone is asked once on Log In and on both join screens; English phone is not. Join works in Spanish (button off until the Terms box is ticked, then joins). A run locked on a Spanish phone sends the same record as on an English phone, word for word (113 text values, including the report text). |
| `t_es_screens.js` | 121 / 121 pass | 29 screen states in Spanish: opens with no page error, no English left over except the intended terms, nothing off-screen / clipped / cut with "…" that English does not already cut, safety sheets show whole. 1,329 of 1,467 pieces on these screens are Spanish; the rest are numbers, units, names and typed values. |
| `t_es_english.js` | 30 / 30 pass | Left in English, the patched page draws the same HTML as unpatched r17.10 on 10 screen states (Log In, join, password, Home, Settings, Run Setup, review, locked run, Active Permit, out-of-limit reading). Only difference: the new Language row. |
| Goldens, one at a time: `tests/run_all.sh --build <patched> --only <id>` | 7 / 7 match | `t104_permitack`, `t103_aireads`, `t100_runpdf`, `safety/p1`, `grade/g1`, `cs2/l1`, `critic/w1`. |

Not run: the full regression (shared machine rule). A golden that prints the whole Settings screen would show the new
Language row; I did not find one in the seven I ran.
Speed: switching the whole page (7,365 elements) to Spanish took 68 ms on this machine, back to English 20 ms.
Not tested: a real iPhone or Android phone, a screen reader, text size Large / Extra Large in Spanish.

## Things I found along the way

1. **The iPhone and Chrome button names.** The Home Screen steps tell people to tap "Share", "Add to Home Screen",
   "Install app". On a phone set to Spanish those buttons say something else. I used "Compartir", "Agregar a Inicio",
   "Agregar a pantalla principal", "Instalar app" from memory of Latin American iOS / Chrome; I could not open Apple's
   page to confirm. Check on one iPhone and one Android set to Spanish before launch.
2. **The Terms and Privacy pages are English only.** The Spanish tick line says "Leí y acepto los Términos de Uso y la
   Política de Privacidad (en inglés)". A person who reads only Spanish is agreeing to a document they cannot read.
3. **Attendant** is "asistente" in the two OSHA Spanish fact sheets I read (OSHA 4491; the confined space permit fact
   sheet), so I used it. Many trainers say "vigilante". It should match the company's own Spanish training.
4. The laid-rows toast ("Laid to 10.0 (2 rows)" + Undo) can only be half the screen wide because of how it is centred
   (`_src/index.html:10031`, `left: 50%` with no width). Long English is cut the same way. Spanish gets
   `width: max-content` in the Spanish CSS; the same one line would fix English.

## Remaining work (estimate)

Rough count from the source: about 1,750 pieces of text in the page HTML and about 9,700 wording fragments in the code
(about 85,000 words), plus about 1,200 long strings in the toolbox-talk library. Some of that is PDF / report text that
stays English. Call it **about 10,000 pieces; 550 are done (5 to 6%)**. Of the roughly 90 screens, 10 are done in their
main states.

What a pipelayer actually sees day to day is much smaller, my guess 1,500 to 2,000 pieces, so that part is
roughly a third done. Suggested order for phase 2:
1. The rest of the run screens: every warning and question on lock, check shot, break, corrections, end run,
   crossings, hubs, the stake-photo reader (about 400).
2. Confined space: permit setup form, close-out, reassign attendant, comm check, reminders, the less common entry
   warnings (about 350). Safety review again.
3. Crew runs today, My production, Settings, Notifications, Feedback (about 250).
4. Trench Sloping and the other calculators (about 800), then Records, daily report, tickets.
5. Office / manager screens, Ask, toolbox talks, lessons: last, and only if Tommy wants them.
Also phase 2: dates in Spanish, the 5 CSS-drawn words, per-account language (so it follows the person to a new phone).

## Decisions for Tommy

1. **Who reviews the safety Spanish?** Recommend: one fluent foreman or safety trainer reads `safety_review.md`
   (188 lines) and the REVIEW words in the glossary before any crew gets the setting. Until then keep it off for crews.
2. **Official record language.** Built: records, reports to the company, PDFs and the 911 script stay English no matter
   the phone's setting. Recommend keeping that, at least until a company asks for Spanish PDFs.
3. **Terms and Privacy in Spanish.** Recommend a Spanish courtesy copy with "the English version controls", reviewed
   by the lawyer, before Spanish is offered on the join screen. Until then the tick line says "(en inglés)".
4. **"Attendant": asistente or vigilante**, and **"grade": nivel or keep "grade"**. Recommend asking two or three
   Spanish-speaking pipelayers on Tommy's own crews which words they say; the glossary lists the choices.
5. **The 911 script.** It is read to a 911 operator, so I left it English with a Spanish heading. Recommend keeping it
   English and adding one Spanish line under it in phase 2 ("Si no habla inglés, diga: Spanish, please").

## DONE
