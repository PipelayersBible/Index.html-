# office3 tests (#30, #31, #32, #34, #35, #36, #37, #38, #39)

Build the page: from `tests/staged/office3/patches`, apply every patch in number order to r17.04's `index.html`
(`python3 NN_x.py in.html out.html`, each one also applies alone). Patch 09 needs fontTools (`python3 -c "import fontTools"`).
Serve a folder with the built page as `cur.html` (plus the repo's other files) and the hook page made by
`tests/runner/hooks.js` as `hk/cur.html`. Then, with `NODE_PATH=/opt/npm-tools/node_modules`:

| test | page (PB_URL) | covers |
|---|---|---|
| t_o3_30_31_permit.js | .../hk/cur.html | #30 "(not on the server yet)" on the emergency panel and its going away; #31 check-in / check-out sent to the board within 5 s, nothing sent for a repaint |
| t_o3_31_board.js | .../cur.html | #31 office board: reload about every 20 s while someone is inside, 60 s otherwise |
| t_o3_32_jobinfo_pms.js | .../cur.html | #32 version on Job details and PMs & supers: merge, race (refused then merged and saved), clash, older server |
| t_o3_34_36_office.js | .../cur.html | #34 office Home line and job-card flags; #36 production-by-day and crew-hours CSVs, offline copy, light + dark, 400 px |
| t_o3_35_leave_handover.js | .../cur.html | #35 handover after removing a foreman; Leave Company in Settings; none for the company account |
| t_o3_37_38_39_records.js | .../hk/cur.html | #37 export = fingerprint = server text, secret beside the record; #38 prefilled boxes recorded and printed; #39 check marks in permit PDF and both fonts |

Each prints PASS/FAIL lines and exits 1 on a failure. All fail on r17.04 (checked) and pass on the patched build.
`lib.js` holds the shared helpers (default page http://127.0.0.1:8953/cur.html; PB_OUT for screenshots and PDFs).
To add them to the regression, put them in a suite in `tests/runner/suites.js` (variant 'hook' for the two hk tests).
