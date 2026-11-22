# Ask promotion package: trench + 811 consolidation (consol1, Nov 21 2026)

Live now (read on the server Nov 21, SELECT only): code slot `live` = `d881cb695137`, prompt row `teacher_v2` md5 `c0aa8fed6c3f15584aa9db8abea0a864` (v8, same as `teacher_v2@next`),
library `b3e91f6c47d2` **3,270 rows, md5 of ord:lib:chunk `eb05d565cacc0e0b64a848aa41a5496f`**, shelf 50 (md5 `f9472660...`, not touched). Nothing here has been applied to live.

## What goes live (order 1 -> 2 -> 3)
| Step | Thing | Exact value |
|---|---|---|
| 1 | Precheck (SELECT only) | `20_precheck.sql`: expect rows 3270, max_ord 3269, kb_n 3270, all_md5 `eb05d565cacc0e0b64a848aa41a5496f`, touched_ok 40, new_ids_there 0. (Same check run on the server Nov 21 in compact form: rows 3270, all_md5 eb05d565..., the 40 touched rows' md5 `4bb65b05...` = the local copy's, new ids 0.) |
| 2 | Library: one guarded transaction | `21_load.sql`: deletes 31 retired cards, changes 9 rows in place, renumbers the survivors 0..3238 (same order, no gap), adds 4 cards at 3239..3242 -> **3,243 rows, md5 `a9af05ee01c9f8d4be6054b27f48bfb8`**, kb_versions.n 3243, saved index dropped (rebuilt once by the next cold start, about 2 s). Runs only on md5 eb05d565...; a second run says "already applied". Run `20_precheck.sql` again: rows 3243, all_md5 a9af05ee..., new_ids_there 4. |
| 3 | Ask build (slot `live`), right after step 2 | **`e661cb967ceb5d97910f3a7bc65ac3c9ef85e59ebe0b14481879a61e68a0b3dc`**, `https://raw.githubusercontent.com/PipelayersBible/Index.html-/64a8a02c2fedd2dbd1662ca1b189e6f05b0bbc47/data/ask/b-e661cb967ceb.txt` (consol1-live: d881 source + `src_patch/apply_patch_consol.py`, **empty overlay**). Same code as ai-next `3f9c941db076`, which carries the library change as an in-memory overlay. |

Install step 3: `select net.http_get('<URL>');` then `select pb_ai.code_install('live', <req id>, '<sha256 above>', '<URL>');` (expect `installed live e661cb967ceb (...)`).
Prompt row: **no change.** Warm workers keep the old library until they cold-start.

**Order matters a little:** the new build with the OLD library still works (the forced table cards are simply not found, so it behaves like d881). The OLD build with the NEW library also works
(it just never forces the table cards). So either order is safe; library first, then build, is the tested combination.

**Rollback, each step on its own:** library -> `91_rollback.sql` (guarded: runs only on md5 a9af05ee...; restores 3,270 rows and md5 eb05d565... exactly; tested); build -> `d881cb695137`
(`https://raw.githubusercontent.com/PipelayersBible/Index.html-/0458f4b39a1111dacfddfc355a51bc8b23290e17/data/ask/b-d881cb695137.txt`, sha256 `d881cb6951377365a4edb2986ea289b20b22fe45f13e905f62b1afab1ca0828e`).

**Local test** (`tools/local_test.sh`, log `work/local_test.log`; Postgres 16 copy at /var/lib/postgresql/askmerge_pg, snapshot `consol_live_3270.dump`, md5 = the server's eb05d565...):
precheck 3270 / eb05d565 / touched 40 / new 0; load -> 3243, md5 a9af05ee, kb_versions 3243 {app 238, osha 278, field 2727}, saved index rows 0; load again -> "already applied";
**loaded rows = `work/after_rows.jsonl` row for row** (the rows the free check and the ai-next overlay used); rollback -> **3270 | eb05d565cacc0e0b64a848aa41a5496f exactly**, kb_versions back to
3270 {app 238, osha 278, field 2754}; rollback again -> "already rolled back"; load refuses when any live row changed (nothing written); rollback refuses on a changed result.

Smoke after promotion (about $0.40 cold): "At what depth does a trench need a trench box?" in Spokane WA (4 ft, stricter than federal), San Antonio TX (federal 5 ft), Fresno CA (5 ft + Cal/OSHA permit);
"How long is my locate ticket good for?" in Cleveland OH (no expiry given, not confirmed).

## Results
RESULTS_PLACEHOLDER
