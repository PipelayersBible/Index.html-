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
(filled in below when the run finishes)
