# Running the browser tests

One command runs every browser test against a build and tells you what passed:

    tests/run_all.sh                       # the live build: index.html next to tests/

It copies the build into a temp folder, adds the test hooks the audit tests need, serves it on a free port, runs the tests
several at a time, prints one line per test as it finishes and a summary table at the end, and exits 1 if any test
really failed (0 when everything passed or is a known, listed failure). The server and the temp folder are removed at the end.

## Options

| option | what it does |
|---|---|
| `--build FILE` | the page to test (default `../index.html`). Its folder's other files (sw.js, icons, data/, manifest, terms/privacy) are served next to it. |
| `--base FILE` | a "before" build for before/after tests, served as `base.html` (`PB_BASE`). Only t123 uses it; without it t123 compares against the r16.94 numbers saved in `fixtures/t123_before_r16.94.json`. |
| `--only REGEX` | run the tests whose id (path under tests/) matches, e.g. `--only 't11[0-9]'`, `--only 'bughunt_nov17/pdfs/'` |
| `--suite a,b` | run whole suites (names in `runner/suites.js`: main, py, main_older, beta, critic, cs2, daily2, grade, grade2, new, office, office2, offline, pdfs, safety, sync, tonight) |
| `--jobs N` | tests at a time (default: 2.5 x cores, capped by memory; 5 on the 2-core box) |
| `--timeout S` | per-test limit in seconds (default 300; a few tests set their own). A test that times out is run once more; passing on the second try is reported as `flaky`. Other failures are not retried. |
| `--update-golden` | write the normalized output of the golden-judged tests that exit 0 as their new expected output (see below). Use with `--only`. |
| `--keep` | keep the temp folder (served site + each test's scratch folder under `out/`) |
| `--list` | list the tests, their suite and how each is judged, without running |

Results: `tests/.results/summary.txt` (the table), `tests/.results/results.json`, and each test's full output in
`tests/.results/logs/<id>.txt` (git-ignored; `--out DIR` puts them elsewhere).

## How long it takes

Measured on the 2-core / 8 GB box, live build r17.01, 209 entries (194 run, 15 skipped). The tests add up to about
73 min of run time, almost all of it fixed waits inside the page, so they parallelize nearly linearly:

| workers | wall time | notes |
|---|---|---|
| 1 (serial) | ~73 min | the old way (plus a server that died after 2 h) |
| 4 | 18.5 min | |
| 5 (default here) | 15 min | clean in every run |
| 8 | 10 min | load ~6 on 2 cores; one size measurement wobbled. Use it when you are in a hurry. |

The default is 2.5 workers per core, capped by memory (~1.2 GB per test at peak) and at 8. One test takes 4-110 s; the
longest are the grade2 property runs, t124 (crew view), cs2/r1, office/b1 and the export/seal tests.

## What the page under test is

- `http://127.0.0.1:PORT/cur.html` and `/index.html`: the build as given (suites `main`, `main_older`, `py`).
- `http://127.0.0.1:PORT/hk/cur.html` (and `curT.html`): the build plus four one-line test hooks, added automatically by
  `runner/hooks.js`: `window.__ev` and `window.__dbg` (eval inside the app's closure), `window.__dEval` (same, near
  runArchive), `window.__ra / __save / __cur` (the run archive). The audit suites (bughunt_nov17/*) use this page. If a
  future build moves an anchor line, the run prints a WARNING and the tests that need that hook fail with a clear error.
- `/base.html`: the `--base` build.

Every test gets these environment variables (the rig and the tests read them; each one falls back to the old fixed value
so a test still runs by hand the old way, with a server on 8843):

| variable | value |
|---|---|
| `PB_ROOT` | the folder URL of the page set, e.g. `http://127.0.0.1:41234/hk/` |
| `PB_URL` | the page under test (`PB_ROOT` + `cur.html`) |
| `PB_BASE` | the before page (only with `--base`) |
| `PB_OUT` | a scratch folder of its own for screenshots, PDFs, export zips (tests no longer overwrite each other's files) |
| `PB_SITE` | the served folder on disk (offline/t07_sw copies it to fake app updates) |
| `PB_NOTICE_VER`, `PB_BASE_NOTICE_VER` | the crew-notice version the build asks for, read from the page; `rig/co.js` marks it seen, so a notice bump no longer breaks every test |
| `PB_BUILD_FILE` | the build file on disk (permit_active_screen.py opens it from disk) |
| `NODE_PATH` | `/opt/npm-tools/node_modules` when it exists (Playwright) |

## How a test is judged

- **verdict**: the test prints `PASS ...` / `FAIL ...` lines and/or exits non-zero on failure. It fails if it exits
  non-zero or prints a line starting with `FAIL` (or `BUG`). Chosen automatically when the test or a `./lib` it requires
  contains PASS/FAIL or process.exit.
- **golden**: the older tests that only print what they saw (most of t101-t122, the audit `w*`, `g*`, `a*` scripts). Its
  output, normalized by `runner/normalize.js` (clock times, dates, ids, hashes, build stamps, the server port, timings
  become tokens; proxy and font noise is dropped), must equal `tests/expect/<id>.txt`, and it must exit 0. A difference
  prints the first differing line; the full output is in the log. The expected files were recorded on r17.01 after
  reading each output (NOTES has the review). When a change is intended (new wording, a new modal), look at the diff, then
  `tests/run_all.sh --only '<id>' --update-golden` and commit the new expect file with the change.
- Per-test extra normalization (a value that legitimately varies, such as the byte size of a zip that carries a timestamp)
  goes in `NORMALIZE` in `runner/suites.js`, never by editing the test's checks.
- The normalized output of every golden test is written next to its log as `<id>.norm.txt`, so
  `diff tests/expect/<id>.txt tests/.results/logs/<id>.norm.txt` shows the whole difference.
- Golden tests run with the page clock starting at `FAKE_NOW` (2026-11-18 09:30 Pacific, in `runner/suites.js`) and
  running on in real time, so values computed from the fixtures' fixed dates ("23 days left", "active this week") and the
  width of clock times in truncated lines do not change from day to day. `rig/env.js` shifts `Date`, `File.lastModified`
  (the app stamps only photos picked in the last 3 min) and GPS fix times by the same offset. A golden test that compares
  node-side times with the page goes in `REAL_CLOCK`. Verdict tests always see the real clock. All tests run with
  `TZ=America/Los_Angeles` (override with `PB_TZ`).

`SKIP` in `runner/suites.js` lists tests that are not run, each with its reason; `XFAIL` lists tests that fail on the live
build because of an open app bug (they show as `xfail` and do not fail the run; if one starts passing it shows as `XPASS`,
so move it out of the list). Summary statuses: pass, flaky (timed out once, passed on the retry), fail, xfail, XPASS, skip.

Not run by run_all.sh: `tests/rig/legacy/*` (the Nov 9-era walk scripts with the old fake Supabase; kept for reference),
`tests/staged/*` (tests for features not in the build yet; run them with their own notes), `tests/patches/*/t*.js`
(one-off checks shipped with old patches).

## Adding a test

1. Put it in `tests/` (main regression) or a folder of its own, and require the rig relative to the file:
   `const boot=require(__dirname+'/rig/boot'), co=require(__dirname+'/rig/co'), F=require(__dirname+'/rig/flow');`
   (`'/../../rig/...'` from bughunt_nov17/<folder>/). `rig/env.js` has `E.URL`, `E.ROOT`, `E.out(def)`, `E.FIX`, `E.NOTICE`.
2. Open the page with `boot(process.env.PB_URL||'http://127.0.0.1:8843/cur.html', {init: co})`; build other page URLs
   from `process.env.PB_ROOT`. Write scratch files under `process.env.PB_OUT`. Put fixtures in `tests/fixtures/`.
   Never hard-code /tmp paths, ports or /home/claude/rig. If you copy an old script in, `python3 tests/runner/portabilize.py file.js`
   does the mechanical rewrite.
3. Prefer explicit checks: print `PASS <what>` / `FAIL <what>` and `process.exit(fails?1:0)`. Check what the app shows or
   stores, not build stamps or version numbers (read those from the page or `rig/env.js` if you need them).
4. Add the file to its suite in `runner/suites.js` (`variant: 'hook'` if it uses window.__ev / __dbg / __dEval / __ra).
5. Run it alone: `tests/run_all.sh --only '<name>'`. For a print-only (golden) test, check the log, then record it with
   `--update-golden` and commit `tests/expect/<id>.txt`.

## Files

- `run_all.sh` / `runner/run_all.js`: the runner. `runner/suites.js`: suites, SKIP, XFAIL, JUDGE, NORMALIZE.
  `runner/hooks.js`: the hook lines. `runner/normalize.js`: golden normalizer. `runner/portabilize.py`: rewrite helper.
- `rig/`: the browser rig (Playwright; fake Supabase in fakesb.js; co.js = signed-in foreman with a company, mgr.js =
  owner/manager, co_pl/co_fm/co2/co3 variants, flow.js helpers, mkrun/resume run builders). `rig/legacy/`: the old rig.
- `fixtures/`: stake photos, daily.json, the t123 r16.94 numbers. `expect/`: golden outputs.
