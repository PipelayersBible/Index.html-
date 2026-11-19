# r17.06 State rules + Office + Daily report (live Nov 19, commit b7f8254)

Status: released. Server: state rules, office3 35/36 and daily3 01/02 applied before release (migration office3_daily3_staterules_additive_nov19). office3 32 (job info / PMs version check) and 37 (permit secret apart) applied right after release (migration office3_32_37_version_check_permit_secret_nov19); old app saves now get pb:update_app.

Tests: suites r1706_plain and r1706_hook in tests/runner/suites.js (13 tests, 214 checks), folders tests/r1706/{staterules,office3,daily3}. Full regression 192 pass + 5 expected golden updates (critic/w1, cs2/l1, office/c1_crew, office/s1_smoke, safety/d2), 1 known xfail (grade step, fixed in r17.07).

Note: decision #45 is applied per person: each crew member defaults to 8 h unless the crew first-start to last-stop span is longer.

The helper notes below were written before release; "nothing applied" and tests/staged paths in them are out of date (now tests/r1706/).

---

# staterules: job-state rules, nationwide (decisions #33 and #64)

Built on r17.04 (`index.html`, md5 3c4b7b05…). One patch, one staged SQL file, one new test. Nothing is applied,
deployed, committed or pushed.

Note: the Projects tool wasn't available to this helper, so `claude/Decisions_Nov18_Answers.md` wasn't read. This
work follows the task text and Tommy's notes as quoted in it: #33 "Do it immediately. I want everything applicable to
location being ready for everywhere nationwide.", and #64 is a verified per-state table that is re-checked every year.

## What was built

### 1. The state table: `data/state_rules.json`, built by `data/build_state_rules.py`
- 51 rows (50 states + DC). Each row has:
  - the 811 center or centers (name, area, site, phone)
  - the wait before digging, and the latest start where the law sets one
  - ticket life (n, working or calendar days, counted from the call or from the first legal dig day)
  - renewal
  - tolerance zone and white lining
  - emergency rule
  - OSHA coverage (state plan, public-only plan, or federal) and the protective-system depth
  - Cal/OSHA permit (CA)
  - a note where values are missing
  - **sources** and **checked 2026-11-19**
- The file says `recheck_by: 2027-11-19`.
- A value I could not confirm is `null`. The app then fills in no date and says **"Check your state's 811 rules"**.
- Each row's `level` field: `law` means the values came from the statute or regulation text. `center` means they came
  from the official one-call center or state agency (Dig Safe for MA/NH/RI/VT, SC811). `partial` means some fields
  are null.
- The ten priority states (CA, AZ, NV, OR, WA, TX, UT, CO, NM, ID) are fully filled from the law: wait, ticket life,
  tolerance and trench depth.

| Field | Null for |
|---|---|
| wait (notice) | AR, GA, LA, MS, MT, ND, PA, VA |
| ticket life | AK, NY, OH, RI, WI (the law sets no fixed life; the note says what it does say), NE, MO, SD, WV (not confirmed), AR, LA, MT, PA (nothing confirmed) |
| tolerance | AL, AR, CT, HI, IL, IN, KS, KY, LA, MO, MT, NJ, NC, ND, OK, TN, VA, WV |
| trench depth | Full state plans I did not read: AK, HI, IN, IA, KY, MD, MI, MN, NC, SC, TN, VT, VA, WY. The app uses the federal 5 ft floor and says "we have not checked whether this plan is stricter". |

**Regulatory facts I found during the check, worth knowing:**
- **California has two centers.** USA North 811 covers Northern California and DigAlert covers Southern California.
  The app used to say "DigAlert" for all of California.
- **Washington:** the protective system is still required from 4 ft (WAC 296-155-657, not amended). A new rule
  effective June 1, 2026 (WSR 26-09-113) adds a written trench work plan whenever a protective system is required,
  and requires a competent person on site during trench work. Both are in WA's trench text.
- **Washington:** from Jan 1, 2026, digging may not start until every operator gives a positive response (UTC).
- **Arizona:** a 2026 law (ch. 147, SB 1137) re-did the definitions and large-project rules. The 15 working days, the
  white lining and the 24 in hand-dig rule are unchanged.
- **Alabama:** a 2026 law (SB 205), effective Jan 1, 2027, sets an 18 in + facility-width tolerance zone. It is noted
  in AL's row; the yearly check should pick it up.
- **Delaware law:** 3 business days and a 12-business-day ticket. The March 2026 center directory still says 2 and 10.
- **North Carolina:** a ticket now lasts 28 calendar days after the start date.
- **Mississippi:** 20 days from July 1, 2025.
- **Illinois:** 25 days, from Jan 1, 2025.
- **South Dakota:** a new 48-hour rule (2026 SB 9).
- **Ohio:** the manual for the law effective June 2026 states no ticket expiry.

**Sources.** Each row lists the exact URLs it was read from. The main ones:

| Topic | Source |
|---|---|
| CA one-call law | Gov. Code 4216 and 4216.2 (california.public.law, codes.findlaw.com) |
| CA trench and permit | 8 CCR 1541.1 and 8 CCR 341 (dir.ca.gov) |
| AZ | A.R.S. 40-360.22 (azleg.gov) and 2026 Laws ch. 147 |
| NV | NRS 455.082/.105/.110 (leg.state.nv.us, nevada.public.law) and the USA North 811 Nevada 2025 handbook |
| OR | Oregon 811 FAQ (OAR 952-001-0040/0050/0060/0090) and OAR 952-001-0070 |
| WA | RCW 19.122.020/.030 (leg.wa.gov), the UTC 2025 notice, WAC 296-155-657 and WSR 26-09-113 |
| TX | Utilities Code 251.151 and 16 TAC ch. 18 (RRC PDF), the RRC brochure ("tickets expire in 14 working days") and the Texas811 FAQ |
| UT | Utah Code 54-8a-2 and 54-8a-4 (le.utah.gov) and the Blue Stakes state-law page |
| CO | C.R.S. 9-1.5-103 |
| NM | 18.60.5 NMAC (srca.nm.gov) |
| ID | Idaho DOPL Guide to Safe Digging 2026-27 (Idaho Code 55-2205/2207) and the DOPL one-call center list |
| Which states have OSHA plans | https://www.osha.gov/stateplans |
| State plans that adopt 29 CFR 1926 (5 ft) | AZ R20-5-601, UT R614-1-4, OR OAR 437-003-0001(16), NM 11.5.3.9 NMAC, Nevada OSHA letter of 2024-01-30 |
| Center names (cross-check only) | Underground Infrastructure one-call directory, March 2026. Its notice and ticket-life figures were **not** used: several are out of date. |

### 2. App: `patches/01_state_rules.py` (r17.05 staterules)
The patch applies to r17.04. It reads `data/state_rules.json` (about 60 KB minified) and embeds it in the page.

**The job's state.** The app looks for it in this order:
1. Picked for the job: Locates screen, **Change State**.
2. Read from the job address, for example "…, Phoenix, AZ 85004", "…, Reno, NV", or "…, Boise, Idaho".
3. The company's state: Settings › Company › **811 rules state**. This row replaces "Tickets are good for N days
   (DigAlert: 28)".
4. California.

Old tickets keep their stored dates; nothing saved is recomputed. California jobs get exactly the dates they got
before: the same holiday list, 2 working days, start within 14 days, 28 days.

**Where the rules are used:**
- **"Can dig from"** and **"Start work by"** on every ticket card and in the form.
- The foreman's Home line ("not valid until…", "start work by…"), through `pbLocStat`.
- The daily report's 811 line ("isn't valid until…"), through `pbLc811State`.
- **The default expiry** of a new ticket, a renewal, or a changed call-in day. A state whose ticket life isn't
  confirmed gets no date, and Save asks for the date on the ticket.
- The form's help lines, for example "Arizona: Marks are good for 15 working days…" or "…Check your state's 811 rules."
- **The Locates header:** "Arizona rules (from the job address). Call 811: Arizona 811.", with the **Rules for
  Arizona** and **Change State** buttons.
- **The Rules view.** For any state it shows:
  - center, site and phone
  - wait, latest start, ticket life and renewal
  - tolerance, white lining and emergency rule
  - trench protection, permit and OSHA plan
  - the sources
  - "Checked Nov 19, 2026. Rules change. If your ticket or 811 center says something different, go by them. The app
    records what you enter."

  It has a state picker, Escape closes it, and focus goes back to the button that opened it.
- **Trench depth.** The run's deep-trench flag (`pbCaveTrig`) now reads the table: WA 4 ft, others 5 ft, and a state
  not known on the phone still gets the strictest, 4 ft. Results are unchanged. A **state note** sits under the
  Trench Sloping result: that state's protective-system rule and the CA permit line, a bold line when the depth is
  at or over the state's depth, and **Rules for <State>**. When the state isn't known it says "Federal OSHA and most
  states 5 ft, Washington 4 ft".

**How the dates are counted (conservative):**
- California keeps its own holiday list.
- Other states:
  - **Wait:** federal holidays plus the day after Thanksgiving count as days off. The dig date can come out later
    than the real one, never earlier.
  - **Ticket life in working days:** only the six holidays every state keeps count as days off (New Year's, Memorial
    Day, July 4, Labor Day, Thanksgiving, Christmas). The expiry can come out earlier, never later.
- **Laws that count from the ticket's start date or the marking date** (AL, AZ, KS, MD, MI, MN, NC, ND, OK, SC, TN)
  are counted from the call or the first legal dig day. The help text says so.
- **Iowa** counts its first day as day 1. **Utah** tickets expire at 8 AM on day 21.

**Offline.** The table is inside the page, so everything works with no signal. A pick made with no signal is kept on
the phone (`localStorage pbSr:<uid>`) and sent once the server has the update and there is signal.

**Server calls.** `pb_state_rules_get` runs at most once every 5 minutes while the Locates screen or Settings ›
Company is open. `pb_job_state_set` runs on a pick. If the server doesn't have the functions yet ("Could not find
the function"), the app stops calling them for the session. The pick stays on that phone, and Settings says "Saved
on this phone only. The company server needs an update before your crews get it."

**Shared code touched (narrow, single-line anchors):**
- `pbLocStat`, `pbLocDatesHtml` and `pbLc811State`: two lines, which now pass the ticket.
- The `pbLocRender` header line.
- The default-expiry lines in `pbLocAdd`, `pbLocEdit`, `pbLocRenew`, `pbLocRenewWire` and `pbLocFormWire`.
- The pb_prod_locates loader's form refresh.
- `pbLocExpHelp` and the `locRuleHelp` line.
- `pbCaveTrig`.
- The locates CSS block.
- Two blocks are replaced whole:
  - The California rule block, from the feat_locate28 comment up to `pbLocDayW`.
  - The Settings › Company locate-days block, from its comment up to "B. materials".

`pb_company_locate_days_set` is no longer called. `pb_pm.settings.locate_days` stays on the server, unused.

**Stacks cleanly with the other staged patches:**
- office3 01-09 apply on top of this build, and office3 04 (office locate alerts, the same area) works in both orders.
- daily3, askgrade, onboard and onboard2 apply on top of it.

The patches that fail (speed2 03 and SW_01, betasummary, billing0) fail on bare r17.04 too.

### 3. Server: `sql/01_state_rules.sql` (staged)
Built by `sql/build_sql.py` from the same JSON as head + seed + tail. It changes no existing function or table.

**Why this shape.** The server doesn't compute expiry: `pb_prod.locates.expires_at` comes from the phone. The alert
pass (`locate_pass` / `locate_send`) only compares that date, and its wording ("Call 811 for a refresh") is right in
every state. What the server needs is *which state* each job is in, so every phone of the company uses the same
rules.

**What it adds:**
- `pb_prod.state_rules`: the 51 rows, seeded from the JSON. RLS is on, with no grants.
- `pb_prod.job_states`: (company_id, job_key, state). `job_key ''` is the company's state. RLS is on, with no grants.
- `public.pb_state_rules_get()`: the company account, PMs and foremen get the company's state, the job states,
  `can_set_company` and `checked`.
- `public.pb_job_state_set(p_job_number, p_state, p_expect_uid)`:
  - A job can be set by the company account, a PM or a foreman, like adding locate tickets.
  - The company's state (`p_job_number` empty) can be set only by the company account or its managers.
  - A state not in the table is refused (`pb:bad_state`).
  - `p_state` null clears it.
  - The cap is 5000 rows per company.
- Both are SECURITY DEFINER with `set search_path to ''`, granted to authenticated and revoked from public and anon.

**Tests:**
- `sql/01_test.sql` is the rolled-back test, ending in `RESULT`.
- **Live** (rogfassochneycezecxa): the migration with a 4-row seed plus the test, in one rolled-back call:
  `RESULT: rows=4;bad_rows=0;co_set=AZ;job_set=j-100:NV;bad_state=pb:bad_state;wrong_uid=pb:wrong_account;get_owner=AZ,NV,true,2026-11-19;get_fm=AZ,false;fm_job=UT;fm_co=pb:not_company_account;fm_clear=null;j100_rows=0;crew_get=pb:foremen_only;grant_auth=true,true;grant_anon=false,false;table_auth=false;`
  Afterwards `to_regclass('pb_prod.state_rules')` is null, so nothing persisted.
- **The full 51-row seed** was run on a throwaway local Postgres 16, with stand-ins for `locate_company` /
  `managed_company` / `companies`: `MIGRATION_OK`, then the same `RESULT` with `rows=51;bad_rows=0`.

## Tests
`tests/t130_staterules.js` (Playwright, the repo rig): **all pass**.

**A. The table:**
- 51 rows, DC included.
- Every row has checked 2026-11-19, https sources and centers. Every value is well formed or null.
- The ten priority states are fully filled from the law.
- WA is the only 4 ft state.
- The page carries the same table.

**B. Date math, hand-checked:**

| State | Case | Result |
|---|---|---|
| CA | Fri Nov 20 call | dig Tue Nov 24, start by Dec 4, expires Dec 18 |
| CA | Wed Nov 25 call (Thanksgiving and the day after off) | dig Tue Dec 1 |
| CA | Saturday call | dig Wed Nov 25 |
| AZ | Wed Nov 25 call | dig Dec 1 |
| AZ | Nov 20 call, 15 working days (Thanksgiving off, the Friday after counted) | Dec 14 |
| TX | Dec 21 call, 14 working days across Christmas and New Year | Jan 12, 2027 |
| TX | Thu Dec 24 call | dig Tue Dec 29 |
| CO | due Tue Nov 24, +30 days | Dec 24 |
| NM | Jul 2 call, wait ends Jul 7 (Jul 3 off), +15 working days | Jul 28 |
| WA | Nov 20 call | 45 days: Jan 4; start within 10 business days: Dec 7 |
| NV | Nov 20 call | Dec 18 |
| OR | Nov 20 call | Jan 4 |
| UT | Nov 20 call | Dec 11 |
| ID | Nov 20 call | expires Dec 18, start by Dec 11 |
| IA | day 1 = Nov 24 | Dec 18 |
| DE | Nov 20 call, 12 business days | Dec 9 |
| MD | wait to Nov 25, +12 business days | Dec 14 |
| DC | 96 hours | Nov 30 |
| AR | | no date |
| ND | wait unknown | from the call: Dec 11 |
| unknown state | | no date |

**C. The state in an address:** 11 addresses, including "Washington, DC 20001", "Seattle, Washington", lowercase
"tx 78701", "…, USA", and two with no state.

**D. Locates screen at 390 px:**
- An Arizona job from its address: header, expiry from AZ's rule, help lines, a changed call-in day recomputes.
- Change State to Nevada: 28 days, start within 28 days.
- Arkansas: no date, "Check your state's 811 rules" on both lines, "Can dig from" shows a dash, Save asks for the date.
- Back to the address.
- Rules view, light and dark: fits 390 px with no sideways scroll; focus, Escape and focus return work; CA shows
  both centers and the permit; MT shows "Check…".
- An old ticket keeps Dec 8.
- No signal: pick and Rules view work, nothing is sent, the pick is kept.
- Server present: the company state (CO) and a job's picked state (TX) are read from it, and a new pick is accepted.

**E. Trench note:**
- WA 4.5 ft: 4 ft rule, "needed" line.
- CA 4.5 ft: no line, permit shown.
- Unknown state, 5.5 ft: "needed" line.
- All fit 390 px. Table depth for the run flag: WA 4, NV 5, HI null.
- No page errors in any run.

**Screenshots:** `tests/shots/` (`rules_az_light`, `rules_nv_dark`, `locates_az_light`, `locates_nv_dark`,
`trench_wa`, `trench_ca`).

Run it: `PB_URL=http://127.0.0.1:<port>/cur.html NODE_PATH=/opt/npm-tools/node_modules node tests/t130_staterules.js`
(serve the patched build as cur.html).

**Full regression on the patched build:** see the result at the end of this file.

## What's left
- **The nulls in the table.** Read the statutes of the states with gaps, or call their centers. Some statute sites
  wouldn't load here: Montana's code, Arkansas 14-271, Pennsylvania 73 P.S. 176, Louisiana 40:1749.13, Georgia's
  "notice period", and the full text of the state plans for trench depth.
- **The yearly check (#64).** Re-run `data/build_state_rules.py` after the check, then `sql/build_sql.py`, and re-apply
  the patch (it embeds the JSON). AL changes Jan 1, 2027.
- **An optional "Start date on ticket" field.** It would give exact dates for the laws that count from the start
  date; today the app counts from the earliest legal day.
- **Per-state holiday lists.** Today the holidays are conservative, as described above.
- **Not touched:** the Ask/education text about tolerance zones (it already says "your state's tolerance zone"), the
  run PDF's depth wording (CA and WA texts only, which matches the table), and the server push wording.

## Decisions for Tommy
1. **No default expiry where the state's ticket life isn't confirmed.** The old company setting "tickets are good for
   N days" is retired and replaced by the company's state. For AR, LA, MT and the others, the foreman types the date
   from the ticket. *Recommend: yes.* A guessed date is worse than an empty box that says "check your state's 811
   rules".
2. **Apply `sql/01_state_rules.sql` with this release.** Without it, each phone keeps its own picks, and the office
   and the foremen can disagree on a job's state. Jobs with a state in the address agree either way. *Recommend: yes,
   same release.*
3. **Second pass on the gaps.** Statute-read the 8 states with no wait and the 13 with no ticket life (or phone their
   centers). Start with the next states you'll sell in. *Recommend: yes, before marketing outside the West.*
4. **Add "Start date on ticket" for the start-date states** (AL, KS, MD, MI, MN, NC, ND, OK, SC, TN). *Recommend:
   later. The current earliest-day count never runs late, it only runs a little early.*
5. **Put the yearly re-check on the calendar** (recheck_by 2027-11-19), as a scheduled task that re-reads every
   row's sources and flags changes. *Recommend: yes.*

## Full regression result
`tests/run_all.sh --build <patched site>/index.html --jobs 2`: **pass 190, FAIL 6, xfail 1, skip 15 (of 212)**. None of
the 6 come from this patch:

| Test | What happened | Verdict |
|---|---|---|
| bughunt_nov17/cs2/s1.js | | Environment: the test used the node clock while the page clock is pinned to Nov 18. Fixed in the repo (commit 0315676, per the coordinator). Not re-run. |
| bughunt_nov17/safety/p6.js | Same failure on bare r17.04 ("Nov 18" expected, "Nov 19" got) | Environment (clock) |
| bughunt_nov17/safety/d2.js | Same failure on bare r17.04 ("2 reports attached" expected, got 1) | Environment |
| bughunt_nov17/offline/rig/t10_quota.js | Same failure on bare r17.04 | Environment |
| bughunt_nov17/offline/rig/t00_smoke.js | Fails on bare r17.04 in 2 of 3 runs (RPC call order, line 12). Passed and failed once each on this build. | Flaky in the environment |
| t93_livecam.js | Failed 2 of 3 times on this build with a load average of 7 to 9 on the 2-core box (other helpers running), at different lines each time (review2, batch). Then passed 4 of 4 with `--jobs 1`. Passed on bare r17.04 too. | Timing flake. This patch doesn't touch the camera or batch code. |

Logs: `<scratchpad>/staterules_work/reg/logs`.

## DONE


---

# office3: office and records decisions #30, #31, #32, #34, #35, #36, #37, #38, #39

Base: r17.04 (`/home/claude/index.html-/index.html`, sha256 dc8e0433bb17...). Patches in `patches/` (exact-once `rep()`,
`python3 NN.py in.html out.html`). Each applies alone to r17.04 and all apply in number order; the combined build passes
`node --check` on the main script (combined build sha256 561ea76e194f...). SQL in `sql/` (nothing applied, deployed,
committed or pushed). Tests in `tests/` (see tests/README.md). Rolled-back SQL results in `sql/RESULTS.md`.

Deploy order: SQL 32, 35, 36, 37 first, then the app. The app falls back to the old calls while 32 and 37 are missing,
and says "isn't ready on the company server yet" for 35 and 36.

## What was built

**#30 Responder link before it reaches the server** (patch 01). The emergency panel's line "Responders can open
e.pipelayersbible.com/?XXXX..." now ends "(not on the server yet)" while the server hasn't filed the code (no successful
upload carrying it, and pb_em_view hasn't answered for it). It goes away by itself when the open-permit upload succeeds
or the server answers. Display only.

**#31 Check-ins on the office board** (patch 02). Permit phone: a roster repaint asks the live-permit sender to look
400 ms later (one pending look at a time; it only sends when the status changed). Measured: check-in sent 406 ms after
the tap (was up to 60 s). Office board: while a reported permit has someone inside, it reloads about every 20 s (looks
every 10 s, reloads when its copy is 18 s old); otherwise the old 60 s. Emergencies were already immediate.

**#32 Server-side version check** (sql/32 + patch 03).
- `pb_prod.job_info.info_ver` (new column, 0 for all rows); `pb_prod_job_info_get(job)` returns the details and version;
  `pb_prod_job_info_set(..., p_expect_ver)` refuses a stale save with `{ok:false, code:'pb:changed', now:{...}}`; a save
  that changes nothing makes no new version.
- PMs & supers: version worked out from the permanent `pb_pm.job_pms` rows (rows + ended rows, only grows; new private
  `pb_pm.job_ver`); `pb_job_pms_get` returns `ver`; `pb_job_pms_set(..., p_expect_ver)` refuses with the current list.
- The old signatures (`pb_prod_job_info_set` with 5 args, `pb_job_pms_set` with 3) now raise `pb:update_app`.
- App: reads the version right before saving, merges as before (office2 01/02), saves with the version; on `pb:changed`
  merges once more onto what came back and saves again, or shows the clash ("Someone else changed the job name meanwhile
  (now "...")"). PMs: re-applies this manager's own ticks to the list as it is now.

**#34 Locate expiry alert for the office** (patch 04, no server change). `pb_prod_locates_mine` already returns every
open company ticket to managers; the app now asks it for the company account, PMs, supers and managers too.
- Office Home, Needs attention: "3 locate tickets expired or expiring" with each job: ticket and days, "Don't dig on an
  expired ticket until a new one is valid." and Locates buttons per job (red when any is expired or 2 days or less).
- Job cards (Company production / Home): red "811 ticket expired" / "811 ticket: 2 days left", amber up to 7 days.
- **The one expiry function is `pbLocExpiry(ticket)`** (`window.pbLocExpiry`), returning `{ left, lv, text, due }`.
  The Home line and the job-card flag read only that (through `pbLocOfficeRows(jobKey)`). It uses the existing
  `pbLocLeft` / `pbLocLevel` / `pbLocLeftText` / `pbLocDueText`; the state-rules helper (#33) plugs in there.

**#35 Leave Company and handover** (sql/35 + patch 05).
- `pb_crew_leave(p_expect_uid, p_expect_company)`: deletes the caller's own membership row (all the existing removal
  triggers run: the "no longer part of" note with the individual-plan offer, run reports moving, report key rotation,
  PM assignments), ends their crew links now, logs 'leave', pushes the owner. The owner can't leave this way.
- `pb_crew_handover(p_from, p_to, p_expect_uid)` (company account / PM / super / manager): from a foreman who is no
  longer a foreman here to a current foreman: his waiting crew runs (crew_state 'pending', assigned to him) are
  re-assigned with an 'assign' crew action; his still-open links are ended; pipelayers whose link to him ended in the
  last 30 days, are still pipelayers and have no foreman get a new link to the new foreman. Run reports follow the link.
  Logs 'handover', pushes the new foreman. `pb_crew.audit`'s action check gets 'leave' and 'handover'.
- App: Settings shows members "You are in <company> as <role>." and Leave Company (what it does / doesn't do, Stay /
  Leave Company); after leaving the plan and company screens are checked again. Crew members: after removing a foreman,
  "Who takes Rick's crew runs that are waiting for a foreman, and the pipelayers who were on his crew?" with the other
  foremen (Not Now / Hand Over); the line then says what moved and that the new foreman was told.

**#36 First bulk exports** (sql/36 + patch 06). A "Spreadsheets" panel on the job page:
- Production by day (CSV: Job number, Job name, Date, Item, Unit, Quantity, Entries) from `pb_prod_export_days` with the
  same counting rule as the job page and Home (tested live: job 26014 pipe total 1756.0 = the dashboard's). No signal:
  the job page's own last 14 days, file name ends "-phone-copy", and the alert says that is all the phone holds.
- Crew hours for payroll (CSV: Date, Job number, Jobsite, Foreman (signed), Person, Hours, Report version, Signed at)
  from `pb_prod_export_hours`: the signed daily reports' crew lists (the foreman's own numbers), newest version only.
- Both: date range (default last 30 days, at most 400), the app's existing CSV writer (UTF-8 BOM, formula-safe).

**#37 Permit fingerprints** (sql/37 + patch 07). New closed permits carry `"emSecretApart": true`; for them the record
that is backed up, fingerprinted and exported leaves out `permit.emLink.s`, and the backup sends the secret beside it
(`pb_permit_backup(..., p_em_secret)`, which files the link with it and stores nothing). Tested: export JSON SHA-256 =
PDF fingerprint, and the jsonb text of what is sent = the export. Records without the flag (closed before, or by an old
app) are built byte for byte as before: same text, same fingerprint, same server versions, and they keep r16.98's note
about the masked secret. Open-permit snapshots still carry the secret (not records; needed to file the link early).

**#38 Pre-filled production feet** (patch 08). Save Production stores `foreman.prefilled` (e.g. `['feetPipeInstalled',
'feetBackfill']`): boxes still holding the app's number from the laid marks, never typed over. A later Save keeps a box
listed while it holds the same saved number; a box typed over drops out. No list when nothing was pre-filled. Run PDF:
"Each quantity marked "filled by the app" was filled in from the laid marks and saved as filled; the others were typed."
and "60.0 ft (filled by the app from the laid marks)". Records without the list keep the r17.04 wording (no guess).

**#39 Check marks on PDFs** (patch 09). Four glyphs (U+2713, U+2714, U+2717, U+2718) drawn as simple outlines and added
to both embedded PDF fonts (no outlines copied from another font, so no new licence); the coverage list gets them and the
rewrite to "yes"/"no" is gone from the embedded-font path. "Gas test (X) retest Fri, vent (check)" prints as typed
(pdftotext reads the marks back; rendered check: o3_39_direct.pdf). The no-font fallback (built-in PDF font) still
writes words, since it can't draw the marks. Patch 09 needs fontTools when applied; its output is deterministic.

## Test results
- New browser tests (patched build): t_o3_30_31_permit 8/8, t_o3_31_board 3/3, t_o3_32_jobinfo_pms 9/9,
  t_o3_34_36_office 27/27 (light and dark, 400 px), t_o3_35_leave_handover 15/15, t_o3_37_38_39_records 20/20.
  On r17.04 every one of them fails (4, 5, 10, 5 and 14 FAIL lines; checked).
- Rolled-back SQL, live (sql/RESULTS.md): 32 and 37 and 36 all as expected, grants authenticated only (anon false).
- **35's SQL test was not run**: the run was cancelled by the client's confirmation step (the batch contains DELETE and
  DROP CONSTRAINT); nothing ran. `sql/35_test.sql` is ready to run the same way as the others.
- Full regression: see "## Regression" below.

## What's left
- Run sql/35's rolled-back test (above), then review and apply 32, 35, 36, 37.
- Add the six tests to `tests/runner/suites.js` when the patches go into a release.
- #36: the daily-report ZIP per job and date range (the third export in the office2 list) is not built.
- #35: the handover is offered right after the removal only; there is no later "hand over" button (the RPC allows it
  for 30 days after the links ended, so a button on the crew list could come later).
- #31: the office board still polls (no push to the office for check-ins), as decided.

## Shared code touched (for the other helpers)
pbTxRender / pbEmSrvCheck (01), renderRosterList and the board's poll (02), pbCxInfoSave and pbPmJobSave (03),
pbLocHomeAttention, pbLocMineLoad, pbLocBoot, pbCxJobFlags (04), pbCmAct 'remove' and the Settings HTML after the crew
invitation block (05), pbCxOverviewHtml (one line after the Job book row) and downloadCSV (window.pbDownloadCSV) (06),
the closed-permit entry, pbPermitBackupRecord and the permit backup pass (07), pbSaveForemanData and the run PDF's
Foreman production section (08), PB_RPT_FONT and pbPdfSafeFor (09).

## Decisions (with recommendations)
1. **Old app copies and the version check (#32).** The old signatures now refuse with pb:update_app, so an app from
   before this release can't save Job details or PMs & supers until it updates (it shows "Couldn't load." with "Nothing was
   saved" / "Nothing was changed"). That is the only way to stop an old copy overwriting. Recommendation: keep the refusal; beta users update
   within a day, and it only affects these two office saves.
2. **Leave Company for PMs and supers (#35).** As built, any member with a membership row can leave, PMs and supers too.
   Recommendation: keep it (the owner is pushed, and can add them back).
3. **Handover window (#35).** Pipelayers are re-linked only if their link to the removed foreman ended within 30 days and
   they have no foreman now. Recommendation: keep 30 days; add a "Hand over" button on the crew list later if needed.
4. **Crew hours export source (#36).** It uses the signed daily reports' "Crew on site" hours (the foreman's call, per
   #44), not the run crew logs. Recommendation: keep; add the run crew-log hours as a separate column only if payroll asks.
5. **Office locate alert window (#34).** The office sees tickets expired or expiring within 7 days (red at 2 days or
   expired), the same thresholds as the job page. Recommendation: keep; revisit with #33 if a state's tickets are shorter.

## Regression
Full run: `tests/run_all.sh --build <patched site>/index.html --jobs 2` (197 run, 15 skipped): pass 185, FAIL 11, xfail 1
(the known grade2 t04_step_exact). Every failure was checked:
- 4 fail the same way on r17.04 (run on r17.04 with --only): offline/rig/t09_bigweek, offline/rig/t10_quota,
  safety/d2, safety/p6 (date and environment, not these patches).
- 4 were load noise: critic/w3, critic/w4, cs2/s1, sync/t03_roles pass on the patched build when rerun (--jobs 2, 7 tests).
  new/a4 (break timing, "~900s" vs "~901s") passes alone on the patched build.
- 2 are intended changes, new expected output in `expect/` (copy into tests/expect/ with the release):
  office/c1_crew (removing the only foreman now adds "There is no other foreman to hand his waiting runs and crew to
  yet: ..."), office/s1_smoke (the company account now also calls pb_prod_locates_mine, #34).
The full run was on the build before one last change in patch 02 (the office board looks every 10 s instead of 20 s,
reloading at 18 s); the 7 reruns, t_o3_31_board and the other office3 tests ran on the final build.

## DONE


---

# daily3: daily report decisions #44-#50 (staged on r17.04)

Tommy's answers (Nov 18) for the daily report, built and staged here. Nothing is applied, deployed or committed.

| # | Decision | What was built |
|---|---|---|
| 44 | Break stays off the daily's hours (the foreman decides) | No change. The new default below does not take a Break off. |
| 45 | Crew hours default: 8 h, unless the crew's first start to last stop that day is more than 8 h; then that | patch 02 |
| 46 | Second job the same day: keep r17.00's way | Kept; works on top of the new default (tested) |
| 47 | Night shift: runs started after midnight stay with the shift's report | patch 01 |
| 48 | Job Book near misses, incidents, stop-work on that day's daily and its PDF; plus a company-side search | patches 03, 04; sql/01 |
| 49 | Customer signature on extra work (field tickets) | patch 05; sql/02 |
| 50 | New run offers the last run's crew in one tap | patch 06 |

## How to build and apply

    tests/staged/daily3/build.sh /tmp/somewhere      # patches 01-06 on index.html (r17.04), node --check, hooked copy
    # -> /tmp/somewhere/site/index.html (the release) and /tmp/somewhere/serve/hk/curT.html (for the tests)

Patches are `python3 patch.py in.html out.html`, exact-once anchors, in this order: 01 (night shift) is first because
02 uses its `pbDlyRunDay`. Each one also applies alone on r17.04 except 02 (needs 01 for the night shift; without it,
it falls back to the start day) and 05/06 (independent).

SQL (apply with the release, either order; both rolled-back tested live, see Tests):
- `sql/01_safety_search.sql`: `public.pb_jb_safety_search(...)` + a partial index. SECURITY DEFINER, `search_path ''`,
  execute revoked from public/anon, granted to authenticated. Managers only (`pb_prod.managed_company`).
- `sql/02_customer_signed.sql`: `pb_daily.event_json` adds `customer_signed` and `amended_after_signature` (read from
  the signed report's own snapshot; no new column, `events_store` untouched). Grants unchanged.
The app works before the SQL is applied: the search says "The company server isn't ready for this search yet", the Home
tile stays hidden, and the office list shows no signature tag (the key is missing, so it says nothing).

## What was built

### #47 Night shift (patch 01)
- A run's report day (`pbDlyRunDay`): runs on this phone (any job), in start order. A run that starts before noon
  (company zone) belongs to the day before when that day's shift is still going: it starts no more than 4 h after the
  shift's last stop, or while one of the shift's runs is still open. Once the shift's report for that run's job was
  signed (signed before the run started), a later run starts the new day as before. Memoized per archive/report state.
- Used everywhere the daily decides "runs of this day": the runs it pulls in (and so the crew log, materials, run notes,
  the crew fill, the "changed after signed" check), the jobs list for a day, r17.00's open-on-the-shift's-day, and the
  missing-reports list. The open note now says "your shift started then, and its runs after midnight are on this report".
  The PDF's runs source line says the rule.

### #45 / #46 Crew hours default (patch 02)
- Everyone's box on Crew Today starts at the crew's day: 8 h, or first start to last stop when that is longer (to the
  half hour, at most 24). First start / last stop = this phone's runs reported on that day (any job, so a two-job day is
  one day; a night shift crosses midnight), the crew's check-ins/outs on them, his crew's runs, an office fill-in's runs.
- Before, a person on the Crew log got his logged run time (setup, travel and gaps dropped). The logged time is still
  on the signed report (`log_h`), the snapshot gets `crew_today.day_default {hours, first_start, last_stop, rule}`.
- A line under Crew Today says why: "Hours start at the crew's day: first start 7:00 AM to last stop 5:30 PM, 10.5 h.
  Change any box that is wrong." (or "Hours start at 8 h ..."). "Auto" after an edit goes back to the default.
- #46 unchanged in logic: default less the hours on his other signed report(s) that day. With the day now being the
  whole day across jobs, the two reports add up to the crew's day (tested: 12 h day, 24-017 signed Joe 9 / foreman 10.5,
  24-020 defaults Joe 3 / foreman 1.5).
- Equipment keeps its own default (unchanged).

### #48 Job Book safety on the daily (patch 03)
- New snapshot section `safety_events {source, items[]}`: the job's Job Book safety events dated that day (all five
  kinds; a night shift's events after midnight up to the shift's last stop go with the shift). With signal the job's
  list is loaded again (merged the Job Book's way, higher version wins); without, the phone's copy plus entries not sent
  yet ("saved on this phone, not sent yet").
- Screen: a "Safety (Job Book)" card (left out when none). Incident and Stop work also show under Needs attention (card
  and PDF). PDF: "Safety events (Job Book)" section + a line in the summary. Before signing, a change is named
  ("safety events (Job Book)"); on a signed day, a later change gets r16.98's "changed after you signed" warning.
- The office copy is the same snapshot and the same PDF builder, so it shows there too.

### #48 Company search (patch 04, sql/01)
- Office Home tile "Safety events" (count of the last 30 days; hot when an Incident or Stop work is in the last 7).
- Screen "Safety events": Job (jobs that have events), Type (the five kinds, any number), From / To (default the last
  90 days), Who (logged by, or a name under People involved). Newest first, 50 a page, Show More. Each row: kind, date,
  time, job, what happened, what was done, people, logged by, open/closed, photos, and Open Job Book (Safety tab; Back
  returns to the search with its filters). No signal: the last search kept on the phone, with its time.
- Foremen get "The company account, managers and PMs search safety events" (server refuses them too).

### #49 Customer signature on extra work (patch 05, sql/02)
- An Extra work entry (one he typed, not one from run notes) gets "Customer Signs": a full-screen sheet with what is
  signed (reason, detail, hours, crew, equipment, photos, job, day), "By signing, you confirm this extra work was done as
  described above.", a pad, Customer name (required), Title (optional), Sign / Cancel.
- Stored with the entry (`cust_sig`): name, title, ISO time, the phone's zone, the drawn PNG (600x200) and its SHA-256,
  and the SHA-256 of the entry as signed (jsonb text form, like the app's other fingerprints). Kept in the daily's draft
  (critical store), so it works with no signal and survives a closed app; it goes to the company inside the signed
  daily report (snapshot `events[].cust_sig`, covered by the report's fingerprint), like the entry's photos.
- A signed entry is a record: no Change or Remove (Remove explains why). Amend keeps every signed version on the entry
  (`prior[]`, with its signature, at most 5) and the changed entry needs a new signature; an unchanged "amend" is refused.
  Removing a machine from the day does not touch a signed entry. An amendment of the daily keeps the signatures.
- Ticket PDF (on the entry, and on the signed daily's card): Extra Work Ticket with the work, the signature image, who /
  title / when, the fingerprint check, earlier signed versions, integrity section. The daily PDF: "Customer: signed by
  ..." in the entries table, and a "Customer signatures" block with each image and earlier versions.
- Size guard: signing the daily is held if the signatures pass 240 KB (the server takes snapshots up to 400 KB).
- Office Delays & extra work list: "Customer signed · Pat Owner" / "No customer signature" (after sql/02).

### #50 Last run's crew (patch 06)
- On a run that hasn't ended, the Crew & Equipment Log shows "Last run (today): Joe Laborer, Sam Operator, Mini Ex #4"
  and a 48 px "Same Crew as Last Run (3)". One tap adds everyone from this phone's previous run who isn't on this run
  yet (type, category, Rental mark kept), checked in now, in one save (reverted if the save fails). Works offline.

## Tests

Browser tests (tests/, verdict style, `tests/run.sh http://127.0.0.1:PORT/hk/ OUTDIR` against a build's serve folder (logs, PDFs and 390 px light/dark screenshots of the last run in tests/out/);
they use the daily2 audit helpers, 390 px, light and dark screenshots, offline steps, PDF text via pdftotext):

| test | checks | result |
|---|---|---|
| t01_crew_default.js | 8 h on a short day (Joe logged 2 h); 10.5 h first start to last stop; the line; typed 9 h wins; log_h and day_default on the signed report; #46 second job 12-9=3 / 12-10.5=1.5; offline same; 390 light/dark | 13 PASS |
| t02_night_shift.js | 00:30 run (same job) and 03:30 run (other job) on the shift's day; offline opens Mon on the last run's job with the note; Mon 24-017 has both runs (160 LF); crew day 19:00-05:00 = 10 h; Tue has none; signed; PDF lists both runs and the rule; a run after the signed report goes to Tue; afternoon run own day; 390 light/dark | 12 PASS |
| t03_safety_daily.js | card: today's near miss + stop work only; done/people; Needs attention; offline: phone's copy + unsent First aid; sign offline; snapshot 3 events in order; PDF section, Needs attention, rows, unsent mark; sent with signal; event after signing -> "changed after you signed"; 390 light/dark | 12 PASS |
| t04_safety_search.js | Home tile; opens screen; first search; job filter list; filters sent; result fields; chips; Open Job Book on Safety + Back keeps filters; Show More; offline last search; server without the function; 390 light/dark | 15 PASS |
| t05_customer_signature.js | sheet content; needs drawing and name; offline: stored with entry (name, title, time, zone, PNG, SHA-256s) and in the stored draft; record (no Change/Remove, Amend); Remove refused; ticket PDF text + image; Amend keeps signed version, unchanged amend refused; re-sign; daily signed offline keeps both; daily PDF signatures + earlier version + fingerprint; signed card ticket PDF; sent with signal; daily amendment keeps it; office tags; foreman can't open the search; 390 light/dark | 26 PASS |
| t06_last_run_crew.js | first run no offer; offer names 3 and when; 48 px; one tap adds 3 with type/category/Rental, checked in, offline; offer gone; only who is missing; not on an ended run; 390 light/dark | 9 PASS |

The daily2 audit suite (t01 two jobs, t02 night shift, t03 undo, t04 changed after signing) passes on this build.

SQL, rolled back (function + DO block in one query, ends in `raise exception 'RESULT: ...'`; checked afterwards that
neither function change nor any test row was left):
- `sql/t01_safety_search_test.sql`: `RESULT: PASS  all=3 job1=2 kinds=2 range=1 who(people)=1 page=1/3 jobs=2
  badkind=pb:bad_kind baddates=pb:bad_dates wronguid=pb:wrong_account foreman=pb:not_company_account otherco=1
  anon=pb:signed_out` (void and non-safety rows left out, other company isolated, grants: no anon, authenticated yes).
- `sql/t02_customer_signed_test.sql` (a foreman signs through the real `pb_daily_submit`, the office reads
  `pb_daily_events_list`): `RESULT: PASS  submit=true/ events=3 e1=Pat Owner/Owner's rep e2=null e3=true/null`
  (no PNG in the list; every older event still reads).

Full regression on this build (`tests/run_all.sh --build <build>/site/index.html --jobs 2`, 212 entries): pass 190, FAIL 6,
xfail 1 (the known grade2 one), skip 15. Summary in `test_updates/regression_summary.txt`. The 6:
- 3 intended changes, new expected files in `test_updates/expect/` (copy into tests/expect/ with the release):
  `critic/w1.js` (the screen list has `screen-safetySearch`), `office/s1_smoke.js` (the RPC list has
  `pb_jb_safety_search`, called by the Home tile), `safety/d2.js` (the runs' source line now says the night shift rule).
- 2 fail the same way on the live r17.04 build (checked on it today): `safety/p6.js` (permit window date: the golden
  says Nov 18, today is Nov 19) and `offline/rig/t10_quota.js` (one extra "Save failed (room)" console line).
- 1 timing: `cs2/s1.js` failed in the 2-worker run (permit window "Not started"), passes alone on this build and on live.
The daily2 suite (two jobs, night shift, undo, changed after signing) passes.

## Found, not mine (pre-existing)
- A daily built with signal and signed with none shows "The day's records changed since you opened this report.
  Changed: other crews' production." once: `pbDlyOtherProd`'s source text differs with and without signal ("could not
  be loaded" vs "not loaded (no signal...)"), and the pre-sign check compares the whole pulled-in text. One extra tap,
  but it reads like something changed. Fix: keep that source line the same (my safety section already does). Seen in
  t05 (the test signs twice when it shows).

## What's left
- The server's own missing-reports list (`pb_daily_missing`) and crew members' runs (`pbFmCrewRunsFor`, keyed by the
  pipelayer's `workDate`) still use the calendar day; a night shift can show Tuesday "missing" on the office side or a
  pipelayer's after-midnight run on Tuesday. Needs the same rule server-side (run records have start/end).
- The customer's signature reaches the company only with the signed daily (decision 1 below).
- Job Book rework hours are still not on the daily (only run-note rework); not asked for.
- The ticket PDF is saved on the phone; a Share to the customer is not built (decision 2).

## Decisions for Tommy (recommendations)
1. **Send a signed ticket to the company right away** (before the daily is signed), so the office sees it the same hour
   and it isn't lost with a phone. Recommend: yes, as a small follow-up (one RPC + a queue like the Job Book's).
2. **Give the customer a copy on the spot**: a Share button on the ticket (text or email the PDF from the phone).
   Recommend: yes; it's the PDF that already exists.
3. **Night shift window**: a run before noon within 4 h of the shift's last stop stays with the shift. Recommend: keep
   4 h / noon; a crew that works past noon after a night start is rare, and the foreman can still pick the date.
4. **Equipment hours default**: leave machines on their own default (logged / 8 h less down), not the crew's day.
   Recommend: leave it.
5. **Safety on the daily**: all five Job Book kinds are listed; only Incident and Stop work go under Needs attention.
   Recommend: keep (first aid and property damage still show, without the red flag).

## DONE


---

