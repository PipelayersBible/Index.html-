# Spanish setting, phase 2 (staged on r17.10) — IN PROGRESS
Started Nov 19/20. Builds on tests/staged/spanish_nov19 (copied engine.js, build.py, strings_src.py, patch, tests here).
Plan: PB_ES_ENABLED switch (ships hidden), dates in Spanish, CSS-drawn words, phase 2 strings, terms_es/privacy_es, second read, tests.
Status log (newest last):
- folder created, phase 1 files copied.
- engine.js: PB_ES_ENABLED switch + #es-review link, dictionary as plain data (read only when Spanish is on), Spanish dates, href swap to terms_es/privacy_es. patches/01_spanish.py rewritten (replaces phase 1's). words.py = the two word constants. Phase 1 switch test passes on the new engine.
- next: harvest per screen (tests/harvest_all.js -> /tmp/claude-0/es20/h_fm.json), translate, terms_es/privacy_es, tests.
- batch a (daily report, tickets, crew, production, home fm, jobs, stats) written: work/es_a.txt -> strings_p2_a.py
- batch b (settings, notifications, feedback/report to management, shortcuts, tools, calc hub) -> strings_p2_b.py
- batch c (calculators 1) -> strings_p2_c.py
- batch d (calculators 2, confined hub, run results/setup leftovers, active permit leftovers, job/inspection screens) -> strings_p2_d.py; strings_p2_hand.py started (patterns)
- batch e (permit setup form, cutsheet import) -> strings_p2_e.py
- batch f (312 literal alerts + 29 confirms from the source: errors, not-saved notices) -> strings_p2_f.py
- batch g (Records LIST labels; record contents stay English: engine now skips only #screen-pdfView, #rrBody, #myReportsDetail, #inboxDetail and every <pre>) -> strings_p2_g.py
- next: runtime harvest of dialogs/toasts on main flows (tests/harvest.js with scenarios), terms_es/privacy_es, tests, second read, glossary, final NOTES.
- terms_es.html written (courtesy copy of live Terms v1.0, English controls, DRAFT banner)
- privacy_es.html written (same structure as privacy.html v1.0: checked h2/tr/li/td counts)
- strings at 2359 (152 patterns). Hand file has calculator results, run dialogs (delay/utility/rework/equipment/end run), permit reminders, work-without-a-run form, shortcuts editor.
- Spanish tick lines no longer say "(en inglés)"; engine swaps the links to terms_es.html / privacy_es.html in Spanish.
- next: tests (lib.js phase 2 scenarios, t_es_screens extended, t_es_hidden.js new, t_es_english on hidden.html), second read, glossary, final NOTES.
- tests: phase 2 screen sets p2a-p2d pass (56 scenarios); textarea hints now translated; daily report filled states added
- tests/t_es_hidden.js written (not yet run); phase 1 screens first half pass on new engine; engine: placeholder/title props + innerHTML attrs answer English
- second read done (fixes applied by script), glossary.md updated with phase 2 words + REVIEW list
