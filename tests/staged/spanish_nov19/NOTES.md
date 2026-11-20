# Spanish setting, phase 1 (staged on r17.10, Nov 19 2026)

STATUS: in progress. Nothing committed, deployed, or changed on Supabase. _src/index.html not edited.

Files so far (all in tests/staged/spanish_nov19/):
- engine.js: the translation layer (display-only; the app's own code keeps reading English).
- strings_src.py: the Spanish, by screen (edit here). build.py -> strings_es.json (the strings file), dict.json, safety_review.md.
- patches/01_spanish.py in.html out.html: adds engine + dictionary after <body>, and Settings > Preferences > Language / Idioma.
- mk.sh: build + write the test page /tmp/claude-0/es19/site/cur.html (server: python3 -m http.server 9300 there).
- tests/lib.js (scenarios), tests/harvest.js (lists English on a screen that has no Spanish yet).
To do: tests (switch, leftovers, 390 px, English identical, goldens), glossary.md, second pass, estimate, final notes.
