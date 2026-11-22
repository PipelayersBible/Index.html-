# Confined space in construction: the six unchecked state plans + Maryland's supplement (Nov 21, 2026)

Tommy (Nov 21): "Can you check them". Base: live library `b3e91f6c47d2`, **3,240 rows, md5 131904c2de6b687c14ff4d68ccaea531** (read on the server
with one SELECT, Nov 21, after the cs consolidation load), live build 4776ad1c5afb. Nothing was written to live tables, slots or the prompt row. No model spend.
About 23 web searches. Every source is in `sources.csv` (URL, section, date read 2026-11-21).

## Verdicts
| State | Subpart AA adopted? | Effective | State additions to the CS rule | General industry |
|---|---|---|---|---|
| Indiana (IOSHA) | Yes, identical (OSHA adoption table; OSHA's IN page: "adopts all OSHA standards ... except ... a unique excavations standard") | 2016-02-04 (OSHA table) | None found | 1910.146 (all OSHA standards adopted) |
| Kentucky (KY OSH) | Yes, by reference: **803 KAR 2:445** Sec. 2, only KY definitions added (Sec. 1) | 2015-10-02 (OSHA table); current text eff. 2022-10-04 | None (definitions only) | 1910.146 via 803 KAR 2:309 (adopts 1910 Subpart J; its Sec. 3 exceptions not read - not about 1910.146 as far as seen) |
| South Carolina (SC OSHA) | Yes, identical: S.C. Code Regs. ch. 71 Subarticle 7 (1926.1200-1213 per 80 FR 25366) | **2015-08-28** (State Register Vol 39 No 8 Doc 4582) | None (SC's 1926 changes are 1926.20(a), 1926.30-.32, 1926.650(b) competent person) | 1910.146 (identically adopted) |
| Iowa (Iowa OSHA) | Yes, by reference: **875 IAC 26.1** adds 80 FR 25518 (ARC 2136C) | **2015-10-21** (ARC; OSHA table says 9/9/2015) | None ("does not go beyond federal law") | 1910.146 (Iowa adopted OSHA's standards) |
| Vermont (VOSHA) | Yes, by reference: **Code Vt. R. 24-050-003** | 2016-02-20 (SOS log #16-003; OSHA table same) | None in the CS rule. **Caveat:** VOSHA keeps its own PEL table (Table Z-1-A: CO 35 ppm TWA / 200 ceiling; H2S 10 / 15 STEL); the posted table names only 29 CFR 1910, so for construction it is **not confirmed** | 1910.146 by reference; hazardous-atmosphere PEL there = Vermont's table (35 ppm CO) - inference, not confirmed |
| Wyoming (WY OSHA) | Yes, identical: WY OSHA Construction **chapter 27 (AA)**; OSHA's WY page: adopts all federal standards identically, cannot be more stringent | 2015-08-03 (OSHA table) | None (by statute WY cannot be stricter); ch. 27 text itself not read (page failed) | 1910.146 (identical) |
| Maryland (MOSH) | Yes, by reference (adopted 2016-12-23), old COMAR 09.12.35 repealed | 2017-01-02 | **None.** The "Maryland Specific Supplements" entry "29 CFR 1926.1201-1213 Confined Space in Construction" links to OSHA's own Subpart AA PDF; adoption page names no change | 1910.146 (MOSH adopts 1910 by reference; COMAR 09.12.31 not re-read today) |

No state truly differs, so **no exception card was written**. Vermont's PEL caveat went into the table line (not confirmed for construction).

## Library change (tools/build.py; 3 rows in place, no add / delete / renumber)
- `osha-pl-cs-states-2` (ord 3239): "Not checked" line removed; IN, IA (875 IAC 26.1), KY (803 KAR 2:445), MD (by reference, Jan 2, 2017), SC (Aug 28, 2015),
  VT (Vt. rule 24-050-003), WY (chapter 27) moved into "Uses the federal rule, no state change found"; one Vermont PEL caveat line. 1,160 chars (core limit 1,200).
- `sp-md-who-1` (ord 3007): "supplement's own text was not read ... not confirmed" -> the supplement entry links to the federal Subpart AA text; no Maryland change. `unconfirmed` dropped.
- `sp-md-trench-1` (ord 3215): "+ with no Maryland change found".
- lib_kb: 3 chunks, **0 errors, 0 warnings** (`work/check_batch.jsonl`, supersedes = own id for the check only). 7 cases: `cases_cs_states.jsonl`, 0 errors.

## Free retrieval check (tools/retr_all.sh; live 4776 search code, before = live rows, after = edited rows; work/retr_compare_p0/p2.txt)
| Set | Result (PLAIN_MIN 0 and 2 the same) |
|---|---|
| 700 existing core | 0 worse, 0 rank changes |
| 204 trench / 811 state | 0 worse |
| 113 confined space state (cases_cs.jsonl) | 113/113 chunk + facts, 0 worse |
| 127 text | 117 -> 117, 0 worse |
| 7 new | chunk 7/7 both; card facts 1 -> 7 (IN, KY, SC, IA, VT, WY now in the excerpts); lib-sc-confined-1 rank 1 -> 3 (still in) |

## SQL (sql/, tested on a private Postgres 16 copy with the 5 live constraints; work/local_test.log)
Copy: own cluster `/var/lib/postgresql/cs_states_pg` port 55471, `live_3240.dump` = cs_live_3243.dump + the consolidation 21_load -> 3240 / 131904c2 (= live).
| File | What | Local result |
|---|---|---|
| `20_precheck.sql` | SELECT only | before: 3240 3239 3240 131904c2... old_rows_ok 3 new_rows_ok 0; after: ... **a9e67ec6527df46b665cbc03bdb6ca6c** 0 3 |
| `21t_live_test.sql` | rolled-back live test: one DO block, load -> md5 -> rollback -> md5 -> RAISE | `ERROR: CS STATES ROLLBACK TEST OK: before 3240 / 131904c2..., after load 3240 / a9e67ec6..., after rollback 3240 / 131904c2...`; copy unchanged; on an already-loaded library it says FAIL |
| `21_load.sql` | one transaction, 3 guarded in-place updates, drops saved index, kb_versions stays 3240 | applied; second run "already applied"; loaded rows = work/after_rows.jsonl exactly; refuses if a row changed |
| `91_rollback.sql` | exact undo | back to 3240 / 131904c2; second run "already rolled back"; refuses on a changed result |

**Live check (Nov 21, SELECT only):** 3240 rows, max ord 3239, kb_n 3240, md5 131904c2de6b687c14ff4d68ccaea531 - the package matches live.

## App (_src/index.html, live r17.14)
The permit screen / PDF rule line (`pbCpRuleText`, line ~30278) for IN, KY, SC, IA, VT, WY, MD reads "Permit items: federal OSHA 29 CFR 1926.1206." - **correct, no wording change.**
The Rules screen state records have no confined space field. Only a code comment (line 30264) says "Maryland: no supplement (MOSH list)": optional comment-only patch
`src_patch/p_cs_states_comment.py` (exact-once, diff in `p_cs_states_comment.diff`), no user-visible change.

## For the lead to apply
1. Run `sql/21t_live_test.sql` (expect `CS STATES ROLLBACK TEST OK ...`).
2. Run `sql/21_load.sql`, then `sql/20_precheck.sql` (expect md5 a9e67ec6..., new_rows_ok 3). No build change needed (4776 already forces the table card).
3. Rollback: `sql/91_rollback.sql`.
4. Optional: the comment-only app patch.

## Still open
- Hawaii is still "taken as federal (not confirmed)" in the table (not in this task).
- Vermont PELs in construction: ask VOSHA, or read the VOSHA PEL rule's scope.
- Wyoming chapter 27 text and Kentucky 803 KAR 2:309 Sec. 3 were not read word for word.
- Indiana has a unique excavations standard per OSHA's IN page, but the app and library say IOSHA uses the federal trench rule (620 IAC 1-1-30). That is a trench item, outside this task, worth a check.

## DONE
