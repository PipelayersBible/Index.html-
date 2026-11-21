# Ask library merge: state audit cards (Nov 21, 2026). Staged only, nothing applied

Built on LIVE: Ask build `d881cb695137` (slot live, checked), library `pb_ai.kb_chunks` version `b3e91f6c47d2`, **3,236 rows, md5 `347ae4d8eee91b042fc1ff49baf0fd60`**
(read on the server Nov 20 21:00 PT, read-only), shelf 47 rows (md5 `fa1033ce...`), eval_set 876 (160 active). Model spend: $0.

## Counts
| | |
|---|---|
| New core cards (insert, ord 3236..3269) | 34 |
| Replaced in place (supersedes) | 1: `dig-or-tickets-2` takes ord 2857 from `dig-or-tickets-1` |
| Live cards edited in place (same id, same ord) | 10 |
| New shelf cards (`pb_ai.kb_shelf`) | 3 (`fed-ngs-napgd2022-1`, `spec-tn-dot-survey-units-1`, `spec-az-dot-slope-stakes-1`) |
| Library after | **3,270 rows** (field 2,754, app 238, osha 278), shelf 50 |
| New eval cases (inactive) | 24 (12 renamed `...-sa-N`: their ids clashed with existing library cases, e.g. `lib-ca-sp-1`) |

Sources merged: survey 8, safety 15, specs_permits 6, 811 9 (= 38 cards). lib_kb.py: **0 errors** (3 warnings: MN/NV/SC report cards cite a page, not a section).

## What changed in live cards
| Card (ord) | Change | Why |
|---|---|---|
| `dig-or-overview-1` (2821) | "not confirmed" sentence out; "Ticket life: 30 calendar days" + Oregon 811's own page; `unconfirmed` removed | 811 audit: 30 days now on Oregon 811's homeowner page |
| `dig-or-tickets-1` (2857) | replaced by `dig-or-tickets-2` (30 days confirmed) | 811 audit |
| `emp-state-or-3` (598) | Private work: weekly OT only (kept). Public works: OT after 8 h/day Mon-Fri, after 10 on a set 4-10, all Sat/Sun + 6 holidays, travel/shop counts, written schedule, base x 1.5 + fringe | Time records item 4. BOLI "Work schedules and overtime on prevailing wage projects", read Nov 20. Confidence medium (agency page) |
| `emp-state-wa-3` (648) | Private work statement kept. Public works: 8 h day, 1.5x over 8 (RCW 49.28.010); 4-10 only with a signed, dated, per-project voluntary agreement (or CBA), kept 3 yrs, max 10 h (WAC 296-127-022, RCW 49.28.065); weekends/holidays per ch. 39.12; >40 always OT | Time records item 4. WAC 296-127-022 (leg.wa.gov) and RCW 49.28 chapter PDF read Nov 20 |
| `emp-states-summary-2` (405) | "every other state: weekly overtime only" now says "on private work" + OR/WA public works daily OT | would contradict the two fixes above when both are in the excerpts |
| `stake-read-30` (2255) | "blue tops for finished grade" -> top colors vary by agency; on many jobs blue = finish grade, WSDOT blue = subgrade, red = base rock, yellow = top course | Survey item 6 |
| `sym-4` (2312) | L/O "usually line only; some surveyors write it for lath offset, check the legend" | Survey item 4 (same words as app patch s5). No official source exists for either meaning |
| `separation-cover-marking-1/-2` (1926/1927) | source line only: Ten States 38.31 / 38.32 for the common rule, 12VAC5-590-1150 named as "one state's rule" | Specs item 9. **The live build does NOT hide these by state**: `otherStateOnly` is dead code in d881 and `chunkStates` reads them as general; checked with the free search: shown on TX, OH, CO jobs; hidden only on CA jobs (Ten States rule, intended). So the fix is accuracy of the citation, not visibility |
| `sp-ca-trench-1` (2979) | "341 was not re-read / not confirmed" -> 341(d)(5)(A) permit at 5 ft that a person must descend into, emergency repair exempt 341(e); confidence high | new `sp-ca-permit-341-1` confirms 341; two cards must not disagree |
| `dig-sc-tickets-1` (2900) | title adds "and fines" (its text ends with the fine sentence) | free check: new `dig-sc-wait-1` pushed it out of `lib-sc-dig-4` |
| new `dig-ok-wait-1` | dropped "as the OKIE811 Excavator Guide prints the law" (in the source line) and the expiry sentence (already in `dig-ok-overview-1`) | free check: it pushed the overview out of `lib-ok-dig-3` |

Staged lib_osha replacements: `sp-mi-confined-1` and `sp-in-who-1` were **not** loaded live (not in kb_chunks or kb_shelf), so `sp-mi-confined-2` and `sp-in-trench-1` go in as new cards with no `supersedes`.
Lead notes were taken out of the chunk JSON (listed in `merged_report.txt`).

## Checks
- **Free retrieval check** (live build's search, `tools/retr_all.sh`): 676 existing core library cases: chunk found 627 -> 627, facts 654 -> 655, **0 worse**, 1 better (`lib-in-sp-1`);
  5 keep their chunk at a lower rank (still in the excerpts). 127 existing text cases: every fact 116 -> 117, **0 worse**. New cases: **24 / 24** chunk and facts.
  (Superseded id mapped `dig-or-tickets-1` -> `-2` in the after run; update `chunks` in library_load_nov20/out/cases.jsonl when merging case files.)
- **Local SQL test** (`tools/local_test.sh`, Postgres 16 copy at /var/lib/postgresql/askmerge_pg, md5 = server's; server is PG 17, md5s matched on the server too):
  precheck ok; load -> 3,270 rows, ords 0..3269, ids unique, n 3270, saved index dropped; **second run "already applied", nothing changed**; rollback -> **3236 | 347ae4d8eee91b042fc1ff49baf0fd60, shelf 47 | fa1033ce... exactly**; second rollback no-op;
  load refuses when a touched row changed; rollback refuses on a changed state; eval SQL twice -> 24 rows, all inactive.
- **Precheck run on the server (SELECT only, Nov 20)**: rows 3236, touched_ok 11/11, touched_md5 `1732d842b4664a3d0caf3b85b6d7c9ee`, new ids 0, shelf 47, eval ids 0.

## Apply order (lead)
1. `sql/10_precheck.sql` - expect rows 3236, kb_n 3236, new_ids_there 0, shelf_rows 47, shelf_new_there 0, touched_ok 11, touched_md5 `1732d842...`.
2. `sql/11_load.sql` - one transaction, guarded (touched-row md5s, 3,236 rows, no new ids yet). Drops the saved index (one ~2 s rebuild).
3. `sql/10_precheck.sql` again - expect rows 3270, kb_n 3270, new_ids_there 34, shelf 50 / 3, touched_md5 `dc04fe34412ba2be8650a33893e6d226`, new_md5 `a601ba6e4e5441f241200a10877eed04`, shelf_md5 `f9472660e426ccf74cb756211ed527c8`.
4. `sql/12_eval_cases_inactive.sql` - its first select must say 0; inserts 24 inactive cases (server columns; no lead/complex).
Rollback: `sql/91_rollback.sql` (library + shelf), and the `delete` line at the end of 12 for the cases. Warm workers keep the old library until they cold-start.

## Decisions for Tommy / the lead
1. **California state-plan core cards: 13 after this load (budget 10).** The 4 new CA cards (341 permit, tailgate every 10 working days, first aid, 2026 confined space) have no other coverage, and the free check shows no CA case lost. Recommend: keep all 4 core.
2. **Four changes beyond the list** (sp-ca-trench-1, emp-states-summary-2, dig-sc-tickets-1 title, dig-ok-wait-1 trim): each stops a contradiction or a retrieval loss the free check found. Recommend: keep.
3. **Other Virginia-sourced general cards** (`quick-reference-12`, `water-distribution-25`) were not in scope and are left as is; they are not hidden either. Recommend: fix the source lines in the next library round.
4. **L/O**: Ask now says "usually line only, sometimes lath offset", the same as app patch s5; the server stake prompt still says "lath offset" (PROPOSED_stake_prompt_lines.txt needs an ai-next round). Also a question with "L/O" does not reach `sym-4` (the search drops the short token). Recommend: ship the stake prompt line with the next ai-next round.
5. **Public works overtime for CA, NY, MA, NV was not checked** (only OR and WA). Recommend: one short pass before the time-sheet feature or out-of-state marketing to those states.

## Files
`tools/merge.py` (cards + edits + cases -> merged_core/shelf, edits, cases .jsonl, merged_report.txt), `tools/mk_sql.py` (SQL), `tools/local_test.sh`, `tools/retr_all.sh`
(+ `retr.mjs`, `regress.mjs` copied from library_load_nov20, `try.mjs`). `work/`: live_rows.jsonl (live copy, 4 MB), kb_before/after.json, retr_*.json, retr_compare.txt, local_test.log, expected.json.

## DONE
