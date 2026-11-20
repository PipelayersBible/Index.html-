# r17.11 candidate: helper tests on the combined page (Nov 20)

Candidate: `/tmp/claude-0/r1711/src.html` (+ `sw2.js`). Checked by rebuilding it: r17.10 `_src/index.html` + the 24
page patches in the stated order + build stamp + spanish2 01 (switch hidden) = `src.html` byte for byte; SW_01 on
the repo `sw.js` + stamp = `sw2.js`; `build.py src.html` = `ship/index.html` byte for byte (same four pbx parts).

## Result

**No real bug found in the combined page.** 39 helper test runs: 37 pass as written, 1 needed a one-word update
(another patch's wording), 1 fails by design (a proposal that was never patched). No patch was needed, so there is
no `patches/` folder.

Things the lead should know (none blocks the release):

1. **Spanish must stay hidden until its word list is brought up to date.** As shipped (switch off) it is clean:
   `t_es_hidden` 120 checks, English untouched. With the switch turned ON on the combined page, 65 of 79 Spanish
   screens show some English: 72 strings added or reworded by the other patch sets are not in the dictionary
   (the new permit form alone is 52 of them; "Send feedback" label on every screen; the Terms "In short" line;
   Home/declutter lines; "Send Now"). List: `es_untranslated_with_switch_on.txt`. Nothing else fails with Spanish
   on (no page errors, nothing off-screen, switch test 55/55). The reviewer link (`#es-review`) shows this mix.
2. `ship/` publishes `terms_es.html` and `privacy_es.html` (marked DRAFT, say English controls). Nothing in the
   shipped app links to them while the switch is off, but they are reachable by address. Lead's call.
3. The lead's earlier run (`/tmp/claude-0/r1711/newtests.log`) failed for harness reasons only: hook tests were
   pointed at a page without hooks, before/after tests had no `base.html`, and the offline/daily libs need
   `PB_ROOT` + `PG` (+ `PB_SITE`). Commands that work are below. The "hook anchor found 0 times" warnings in
   `reg.log` are harmless: `hooks/index.html` already has the four hooks built in (checked: one each).
4. One flake, not from this release: `t_es_hidden` once reported "Read All Stake Photos" missing on one page
   (2 checks) while the regression was loading the box; it passed twice when run again alone. That button is
   added 200 ms after load or when Run Setup opens (same code in r17.10).

## How it was run

Served one folder on port 9500: `cur.html` = candidate, `base.html` = r17.10 `_src/index.html`, `hk.html` and
`hk/cur.html` = candidate + runner hooks (`node hunt_nov19/tests/mkhk.js`), `hk/base.html`, `b.html` + `pbx/`
(`python3 hunt_nov19/tests/mkparts.py`), and `es/` = `base.html` (candidate without the Spanish patch),
`hidden.html` (= candidate), `cur.html` (`PB_ES_ENABLED=1`), `nolink.html` (`PB_ES_REVIEW_LINK=0`), the four legal pages.
All with `NODE_PATH=/opt/npm-tools/node_modules`, one browser at a time. Tests that write screenshots next to
themselves (`t_fb2_states`) were run from a scratch copy of the folder so nothing outside this folder changed.

## Table

Category: a = harness (how it is run), b = expected interaction between patch sets, c = real bug.

| Test | How | Result on the combined candidate | Cat. | Action |
|---|---|---|---|---|
| hunt_nov19 `t_h01_reload_unsaved` | `PB_URL=.../cur.html` | 6/6 pass | - | none |
| hunt_nov19 `t_h02_dayshift_open_run` | `PB_ROOT=.../ PG=hk.html PB_OUT=<dir>` | 8/8 pass | a | lead's run had no PB_ROOT/hook page |
| hunt_nov19 `t_h03_pdf_part_retry` | `PB_URL=.../b.html` (mkparts) | 3/3 pass | - | none |
| hunt_nov19 `t_h04_sw_parts` | `SRC=src.html SW=sw2.js HTTPS_PORT=9502 PB_OUT=<dir>` | 6/6 pass | - | none |
| hunt_nov19 `t_h05_update_line_cover` | `PB_URL=.../cur.html` | 12/12 pass | - | none |
| hunt_nov19 `t_h06_quick_run_tab` | `PB_URL=.../cur.html` | 6/6 pass | - | none |
| hunt_nov19 `t_h07_sbjs_pin` | `node t_h07 src.html` | 1 pass, 2 FAIL | - | expected: a proposal, not patched (login library still `@2`, no fingerprint); same on r17.10 |
| hunt_nov19 `t_h08_missing_photo_office_copy` | `PB_URL=.../hk.html` | 5/5 pass | a | needs the hook page |
| legal_nov19 `t_legal_wording` | from `tests/`, `PB_URL=.../cur.html` | 20/20 pass | - | none |
| permit_short `t_ps1_form` | `PB_URL` + `PB_BASE=.../base.html` | 33/33 pass | a | needs base.html |
| permit_short `t_ps2_records` | `PB_ROOT=.../hk/ PB_OUT=<dir>` | 24/24 pass | a | needs hk/cur.html + hk/base.html |
| permit_short `t_ps3_olddraft` | `PB_URL` + `PB_BASE` | 13/13 pass | a | needs base.html |
| simplify `t_sim2_calc` | `PB_URL` + `PB_BASE` | 19/19 pass | a | needs base.html |
| simplify `t_sim3_permit` | `PB_URL` + `PB_BASE` | 14/14 pass (written for patch 02+03; 02 dropped, its checks still hold on the new permit form) | a | needs base.html |
| simplify `t_sim4_words` | `PB_URL` + `PB_BASE` | 6 pass, 1 FAIL: "My production: nothing else changed" | b | the screen's top bar now holds the word "Feedback" (feedback_btn 01). Copy `tests/t_sim4_words.js` allows that one word: 7/7 pass |
| simplify `t_sim1_home` | - | not run | - | patch 01 dropped |
| critic `t_cr1_pill` | - | not run | - | patch 01 dropped. The 02 + 03 checks cut out into `tests/t_cr23_kept.js`: 4/4 pass |
| declutter `t_dc1_home` | `PB_PORT=9500` | 99/99 pass (with the 3 s rotation and the header Feedback button) | a | needs base.html |
| declutter `t_dc2_more_settings` | `PB_PORT=9500` | 25/25 pass | a | needs base.html |
| feedback_btn `t_fb1_header` (foreman) | `PB_URL`, `HEIGHTS=../t/h_r1710.json` | 8568 pass, 0 fail (constCalc at 375 px: the known leftover in its notes) | - | none |
| feedback_btn `t_fb1_header` (office) | + `MGR=1 VPS=390x844,1280x800` | 4284 pass, 0 fail | - | none |
| feedback_btn `t_fb2_states` | `PB_URL` + `PB_BASE` | 10 pass, 0 fail | a | prints "PASS n FAIL n" (no per-line PASS); exits 0 either way, read the last line |
| hunt2 `t_r01_reducer_reload` | `PB_ROOT=.../ PG=hk.html` | 15/15 pass | a | hook page |
| hunt2 `t_p02_missing_photo_notice` | `PB_URL=.../hk.html` | 8/8 pass | a | hook page |
| hunt2 `t_c03_permit_last_night` | `PB_ROOT=.../ PG=hk.html` | 11/11 pass (on the shortened permit form) | a | hook page |
| hunt2 `t_s04_signin_code_words` | `PB_URL=.../cur.html` | 7/7 pass | - | none |
| hunt2 `t_o05_clock_ahead_run_time` | `PB_ROOT=.../ PG=hk.html PB_SITE=<served folder>` | 6/6 pass | a | needs PB_SITE |
| hunt2 `grade3/run3.js 0 60` | `PB_ROOT=.../ PG=hk.html` | 60 scenarios, 33,835 values, 0 mismatches | a | hook page (ran 60 of the 480 seeds) |
| spanish2 `t_es_hidden` | `PB_ROOT=.../es/ PB_SITE=<es folder>` | 118 pass, 2 FAIL first run; the failing screen run again twice: 22/22 both | a | flake under load (note 4); base = candidate without the Spanish patch |
| spanish2 `t_es_english` on hidden | `PB_URL=.../es/hidden.html PB_BASE=.../es/base.html` | 54/54 pass | - | none |
| spanish2 `t_es_english` on Spanish-offered | `PB_URL=.../es/cur.html` | 54/54 pass | - | none |
| spanish2 `t_es_switch` | `PB_URL=.../es/cur.html` | 55/55 pass | - | none |
| spanish2 `t_es_screens` p1, p2a-p2d | `PB_URL=.../es/cur.html PB_OUT=<dir>` | 257 pass, 65 FAIL, every one "no English left over" | b | not a shipped state (switch is off). Test left as is: the fix is new dictionary words, not a looser test. List in `es_untranslated_with_switch_on.txt` |
| On `ship/index.html` (minified): h03, h05, h06, legal, ps1, s04, dc2 | `PB_URL=<ship>/index.html` | all pass (3, 12, 6, 20, 33, 7, 25) | - | none |
| On `hooks/index.html`: h02, h08, c03, o05 | `PG=index.html` / `PB_URL` | all pass (8, 5, 11, 6) | - | none |

Skipped as told: `shots*.js`, `m_*.js`, `x_*probe.js`, the Spanish `harvest*.js` (they collect, assert nothing).

## Files here
- `tests/t_sim4_words.js`: copy of the simplify test, allows the header word "Feedback". Run like the original.
- `tests/t_cr23_kept.js`: the critic 02 + 03 checks only. `PB_URL=.../cur.html`.
- `es_untranslated_with_switch_on.txt`: the 72 strings (with how many screens each shows on).

Nothing outside this folder was changed; nothing committed, deployed or sent.

## DONE
