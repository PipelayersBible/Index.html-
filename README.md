# The Pipelayer's Bible — workbench

The build chain and the release test suite for the app in `PipelayersBible/Index.html-` (one file: `index.html` on `main`). This is the `workbench` branch of that repo: an orphan branch, no shared history with `main`. Nothing here ships; users never see this branch (GitHub Pages serves only `main`). No keys live here (the app's publishable key is in the app itself; everything secret is in Supabase vault / Edge Function secrets).

## Layout (mirrors the workspace it was built in)
Tests `require()` each other by absolute path `/home/claude/...`, so **check this repo out at `/home/claude`** (the files land beside anything else there):

```bash
cd /home/claude && git clone -b workbench --single-branch https://github.com/PipelayersBible/Index.html-.git _wb && cp -a _wb/. . && rm -rf _wb
cd /home/claude && git clone https://github.com/PipelayersBible/Index.html-.git index.html-
bash setup.sh          # checks node, playwright/chromium, pdftoppm, pdftotext, python3
```

- `test/` — `lib.js` (Playwright helpers), `run.sh` (serves a site dir, runs one test), `instrument.py` (adds the `__debug*` hooks to make `app.html`, the copy the tests drive; the deliverable `index.html` never gets them).
- `hunt/build_live.py LIVE.html SITE_DIR` — makes `SITE_DIR/index.html` (deliverable), `app.html` (instrumented) and syntax-checks every inline script.
- `batch29/ROLES/tests/run_t.sh SITE_DIR TEST.js PORT` — one test, waiting for free memory.
- `suite.txt` — the release suite (89 tests, relative paths). `run_suite.sh SITE_DIR` runs it in 3 lanes (~20 min) and writes `suite_result.txt`.
- `feat_*/tests`, `batch*/…/tests`, `test/hunt*`, `gpt/…` — the tests and their helper libraries (`pd_lib.js`, `lf_lib.js`, `cs_lib.js`, `nr_lib*.js`, `daily_lib.js`, `h.js`…). Helper libs mock the Supabase RPCs; no test touches the real server.
- `feat_pdf/tests/t_pdf_capture.js` — `KEEP=1` writes every PDF the app makes to `feat_pdf/out` for a visual pass (`pdftoppm -r 70 -png`).

## A release, step by step
1. `cd /home/claude/index.html- && git pull` — the live page is the base. Build **from the live file**, never from an older copy.
2. Put the change in a patch file `feat_<name>/patch.py`: a list of `(name, old, new, count)` exact-string replacements with asserted counts (see any `feat_*/patch.py`). Keep comments inside one-line replacements as `/* … */`, never `//` (a `//` swallows the rest of the line).
3. `python3 feat_<name>/patch.py index.html-/index.html m.html`, bump `PB_APP_BUILD = 'r15.NN · YYYY-MM-DD'` (exactly one occurrence), then `python3 hunt/build_live.py m.html site`.
4. Write the test for the change (`feat_<name>/tests/t_<name>.js`), run it alone, then add it to `suite.txt` and run the whole suite. Known flakes under load: `ux01_stale_answers`, `b14_t_live` (pass alone).
5. Only with the owner's go-ahead: `cp site/index.html index.html-/index.html`, commit as the owner (`-c user.name="Tommy Fontaine" -c user.email="tfontaine@digcivil.com"`, message `r15.NN: …` plus the Co-Authored-By / Claude-Session lines), push, then poll `gh api repos/PipelayersBible/Index.html-/deployments` until the new sha's status is `success`.

## Server side
- Supabase project `rogfassochneycezecxa`; schemas `pb_*`; migrations through the Supabase MCP (`apply_migration`). The MCP silently **cancels** any SQL containing DROP / DELETE / REVOKE / UPDATE (even in comments) — those go into an owner-paste file the owner runs himself.
- Server errors: `select * from pb_prod.pass_errors order by at desc`. Client crash reports: Sentry org `pipelayers-bible`, project `javascript`. User reports: `pb_support.messages`.
- Nightly backup: schema `pb_backup`, bucket `pb-backups` (see the project doc *Nightly Backup and Restore*).

## Standing rules (the owner's)
- A one-line heads-up to the owner before anything goes live (a push or a migration). The daily triage run never pushes.
- Never paste or store keys. Ask before anything that costs money or deletes his data.
- Keep the modern look; he dislikes repetition in the UI. Test everything; put tested builds live.
