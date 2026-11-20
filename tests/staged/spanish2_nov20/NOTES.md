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
