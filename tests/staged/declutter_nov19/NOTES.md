# Declutter (staged on r17.10, Nov 19) — IN PROGRESS
Role: declutter. `_src/index.html` not edited. Nothing committed/pushed/deployed. No server writes.
Status log:
- started; reading Home / More / Settings markup.
- harness built: tests/_lib.js (roles pl/fm/pm/owner), tests/shots.js before|after -> shots/ + shots/counts_*.json. Server: scratchpad/dc on port 9350 (base.html = _src, cur.html = patched).
- before counts taken (shots/counts_before.json, before_*.png).
- plan: 01 home layer (role order, one notice, empty tiles collapse, >=14px, Start work rows distinct), 02 company home (tiles, duplicate New job, one Tools group), 03 More/Settings, 04 words.
- BUILT patches/01_home_layer.py (role order, zero cards -> short lines, one notice + "Also:" line, New -> "New record", norun not listed twice, 14px floor) and patches/02_company_home.py (one Tools group, New job once on a computer + side-menu button styled). Apply: sh patches/apply_all.sh _src/index.html out.html
- TODO: 03 More/Settings, tests t_dc*.js, existing-test subset, goldens list, final notes.
- BUILT patches/03_more_settings.py (More groups "On the job"/"Learn" + Account & Settings row; Settings 6 cards -> 4). tests/t_dc1_home.js and tests/t_dc2_more_settings.js: ALL PASS (run with PB_PORT=9350 and the server in scratchpad/dc).
- TODO: after shots, existing tests subset (run_all.sh --only), goldens list, stack check with simplify/critic patches, final notes.
