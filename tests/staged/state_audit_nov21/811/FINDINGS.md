# 811 / one-call audit, 50 states + DC (r17.13, Nov 20 2026)

Read-only on the live app and server. Nothing applied, published or committed. Georgia not touched (on hold).
Base: `_src/index.html` r17.13 (md5 4f2101b2...). Earlier work reused: lib_811_nov20, renewby_nov20, r1713_candidate.
Web budget used: 13 searches + about 27 page reads.

## The 10 most important problems (worst first)

1. **The "Can dig from" date is one working day EARLY in many states (safety + legal).** The app counts the call day as
   day 0 and lets you dig ON working day n. Laws that say "not counting the day of the call", "full working days", or
   "the clock starts the next business day" mean the whole days must pass first, so a Monday call is a Thursday dig,
   not Wednesday. The run's "ticket isn't valid yet" warning uses the same date, so it stays quiet on the illegal day.
   - **Confirmed in writing and fixed (p1):** MN (Gopher State: "submit a ticket on Tuesday, you can start digging on
     Friday"; app said Thursday), IA (Iowa Code 480.1(6): the 48 hours begin 6 AM the next business day), IN (Ind. Code
     8-1-26-16: 7 AM after the two full working days), SD (2026 SB 9: from 12:01 AM the next day), OK (48 hours not
     counting the notice day), SC (3 full working days not counting the call day: Friday, app said Thursday).
     Proof on live r17.13: `results/t_811_audit_live.txt` (MN Tue Jun 2 -> app Jun 4; correct Jun 5).
   - **Same words, no worked example found (p2, recommend ship: strictest wins):** "2 full business/working days" in
     AR, CO, CT, FL, KS, KY, NE, OR, WA, WY; NC "3 full working days" (Fri, not Thu); UT (the row's own text says the
     clock starts 8 AM the next business day).
   - **"Not including the date of notification" (p3, check one ticket first):** CA, NV, NY, OH, IL, NM. CA Gov. Code
     4216(l): "Legal excavation start date and time means two working days, not including the date of notification";
     read strictly that is Thursday 7 AM for a Monday call. The app (since feat_locate28) says Wednesday.
2. **California itself (home state) is in doubt.** Tommy can settle it in 10 seconds: the "Legal Start" on any USA North
   or DigAlert ticket called in on a Monday. Thursday -> apply p3. Wednesday -> skip p3 (and p2 still stands on "full").
3. **811 center holidays: the wait skipped days the center doesn't count (fixed for 3 states, p1).** NV: Nevada Day
   (last Friday of October) on USA North's list, missing in the app (a Wed Oct 28 2026 call showed Fri Oct 30, the
   holiday itself). UT: Pioneer Day and Christmas Eve (Blue Stakes: "System treats as closed for all date and time
   calculations"). SC: Confederate Memorial Day, Christmas Eve, the day after Christmas. Added for the WAIT only, so a
   ticket's expiry never gets later. Not checked (no budget): the other centers' lists. Likely gaps: HI (Prince Kuhio,
   Kamehameha, Statehood Day, Good Friday), LA (Mardi Gras, Good Friday), MA/ME (Patriots' Day), VT (Town Meeting Day,
   Bennington), AK (Seward's Day, Alaska Day), DC (Emancipation Day Apr 16), TX (state holidays), NC/KY/TN/IN/DE/NJ/CT
   (Good Friday, Christmas Eve / Dec 26). California's list in the app matches USA North's CA list exactly.
4. **Out-of-state crews get California dates (credibility, legal).** The job's state comes from: picked state, then the
   job address, then the company state, then **California** (labelled "no state in the job address"). Tommy's rule
   (job, company, then phone location) is not followed: the phone's location is never used for 811. p5 adds it before
   the California default. A Texas crew with no state on the job and no company state now gets Texas rules.
   Decision for Tommy: whether the last fallback should stay California or become "pick your state" (not built).
5. **No "what to do if you hit a line" in the app (safety).** Every one of the 51 laws read has the same core (stop;
   gas or liquid or danger -> 911; tell the owner right away, even for a nick; tell 811; don't bury or repair it), and
   some add a deadline (CA tell the center within 48 h; TX pipeline: 811 within 1 h, Railroad Commission TDRF within
   30 days; WA UTC report within 45 days; PA report within 30 days; FL high-priority line: State Fire Marshal 24 h; AZ
   leave the hole open; NM stay until released; WV non-emergency damage: 811 within 24 h). p4 adds a "Hit a line"
   section to the Rules view.
6. **Calling "811" from out of state reaches the wrong center (practical).** 811 is routed by where the phone is. The
   app shows "Phone 811" for every center. A Nevada crew planning a Utah job reaches USA North, not Blue Stakes. The
   website link is right for all 51; the long toll-free numbers were not verified (call list), so not added.
7. **Positive response is shown for only 3 states (IL, VA, WA)** but is required or built into the system in most
   (CA, NV, FL, CO, GA, MD, DE, NY, NC, SC, OK, IA, MN, IN since 2025, OH, PA's KARL, MI, UT, NM). The Locates screen
   says "Wait for every utility to respond" only on a last-renewal ticket. Proposed (not built): one line under "Wait
   before digging" for every state: "Check that every utility on the ticket has marked or cleared before you dig."
8. **Blank rows that still say "Check your state's 811 rules".** Tolerance zone: AR, CT, HI, IN, KS, KY (text only),
   MO, TN, VA, WV, ND, MT, AL (until 2027). White lining: AR, CT, DC, HI, LA, NE, SD, WV (p4 fills OK, WY, KY, MO).
   Emergency: AR, IN, LA, MO, NE, SD, TN (p4 fills IL, NC, PA, AL, VA, MD). Wait: MS, ND, MT, GA. Montana: everything.
9. **Illinois emergency rule was missing:** "a minimum wait time of 2 hours after an emergency request" (220 ILCS 50/6),
   and the emergency ticket expires in 10 days. A crew could dig the minute it calls. Filled by p4.
10. **California center areas are vague (minor).** "USA North 811 (Northern California)" / "DigAlert (Southern
   California)": USA North also covers central California (Kern, Fresno...). The county split was not re-read; both answer
   811 by location, so only the web link could mislead. Suggested words after a check: "USA North 811 (central and
   northern California)", "DigAlert (Imperial, Inyo, Los Angeles, Orange, Riverside, San Bernardino, San Diego, Santa
   Barbara, Ventura)". Not built.

Also: Oregon's 30-day ticket life is now on Oregon 811's own page ("should no longer be used after 30 days"): the
doubt in the Ask card is gone (new card). OHIO811's site moved from oups.org to ohio811.org (p1).

## Per state (r17.13 as it is now)

How the app picks the center: by the job's state only (no county logic). Multi-center states list every center with
its area: CA (USA North / DigAlert), ID (Digline / Dig Safe North Idaho 811 / North Idaho 811, by county), IL (JULIE /
Chicago 811), NY (UDig NY / New York 811, NYC and Long Island). Washington has one center (Washington 811). Nevada is
USA North only. Every center name and website was cross-checked against the March 2026 one-call directory by r17.05;
GA unchanged. The "your area's rule" sheet (Locates > "<State> rule") shows the wait, life, renewing (with the Renew-by
working days) and centers; the full Rules view adds tolerance, white lining, emergency, trench, permit, OSHA, injury.

Not stored by the app at all (by design: Ask answers these from the library, lib_811_nov20 staged + cards here):
marking colors (APWA everywhere; Dig Safe suggests pink pre-marks on snow; IL and AK allow black on snow), penalties,
damage-report deadlines (now partly in "Hit a line"), design and large-project/meet tickets, exemptions (farm tilling,
homeowner hand digging depths), who must call (always the excavator doing the work; homeowner exemptions vary).

| St | Center(s) | Wait n (app) | Wait verdict | Life (app) | Renew | Tol in | White | Emergency | Note |
|---|---|---|---|---|---|---|---|---|---|
| AK | Alaska 811 | 2wd | UNCONFIRMED: "at least 2 working days": call-day counting not stated | - | yes | 24 | recommended | yes |  |
| AL | Alabama 811 | 2wd | UNCONFIRMED: "at least two working days prior": counting not stated | 20wd/dig | yes | text | conditional | MISSING |  |
| AR | Arkansas 811 | 2wd | WRONG (strict): "2 full working days": Mon call -> Thu; app Wed. p2 | 20wd/call | yes | MISSING | MISSING | MISSING | The law text we read is current to March 2024. We could not confirm Arkansas’s tolerance.  |
| AZ | Arizona 811 | 2wd | UNCONFIRMED: marks due within 2 working days; counting not stated | 15wd/call | yes | 24 | required | yes |  |
| CA | USA North 811 (Northern California); DigAlert (Southern California) | 2wd | LIKELY WRONG: 4216(l) "two working days, not including the date of notification" -> Thu; app Wed. p3 after Tommy checks a ticket | 28cd/call | yes | 24 | required | yes |  |
| CO | Colorado 811 | 2wd | WRONG (strict): law: 2 business days not counting call day -> Thu; center page says allow 3 full days (Fri). p2 | 30cd/dig | yes | 18 | conditional | yes |  |
| CT | Call Before You Dig (CBYD) | 2wd | WRONG (strict): "2 full days" -> Thu; app Wed. p2 | 30cd/call | yes | MISSING | MISSING | yes |  |
| DC | Miss Utility | 4wd | OK: 96 hours = Fri for a Mon call | 15wd/call | yes | 24 | MISSING | yes |  |
| DE | Miss Utility of Delmarva | 3wd | UNCONFIRMED: "not less than 3 business days": counting not stated | 12wd/call | yes | 24 | recommended | yes |  |
| FL | Sunshine 811 | 2wd | WRONG (strict): "2 full business days" -> Thu; app Wed. p2 | 30cd/call | yes | 24 | conditional | yes |  |
| GA | Georgia 811 | - | ON HOLD: Tommy is calling | 30cd/call | yes | 18 | conditional | MISSING | Georgia’s wait is set as a "notice period" we could not confirm. Check Georgia 811. |
| HI | Hawaii One Call Center | 5wd | UNCONFIRMED: 5 working days; Hawaii state holidays not in the app | 28cd/call | yes | MISSING | MISSING | yes |  |
| IA | Iowa One Call | 2wd | WRONG, FIXED p1: 480.1(6): 48 h start 6 AM next business day -> Thu; app Wed | 25cd/dig | yes | 18 | required | yes |  |
| ID | Digline (Most of Idaho); Dig Safe North Idaho 811 (Bonner, Boundary, Kootenai); North Idaho 811 (Benewah, Shoshone) | 2wd | UNCONFIRMED: "not less than 2 business days": counting not stated | 28cd/call | yes | 24 | required | yes |  |
| IL | JULIE (Illinois outside Chicago); Chicago 811 (DIGGER) (City of Chicago) | 2wd | WRONG (strict): "Day" excludes the notice day -> Thu; app Wed. p3 | 25wd/call | yes | 18 | required | MISSING | Illinois: since Jan 1, 2026, check that every operator has posted a positive response befo |
| IN | Indiana 811 | 2wd | WRONG, FIXED p1: statute: 7 AM after 2 full working days -> Thu; app Wed | 20cd/call | yes | MISSING | conditional | MISSING |  |
| KS | Kansas 811 | 2wd | WRONG (strict): "2 full working days" -> Thu. p2 | 20cd/dig | yes | MISSING | conditional | yes |  |
| KY | Kentucky 811 | 2wd | WRONG (strict): "2 full working days" -> Thu. p2 | 21cd/call | yes | text | MISSING | yes | Operator didn’t answer in time: send a second notice. |
| LA | Louisiana 811 | 3wd | OK: 48 h from 7 AM next working day -> Thu | 20cd/call | yes | 18 | MISSING | MISSING |  |
| MA | Dig Safe | 3wd | OK: 72 h -> Thu | 30cd/call | yes | 18 | required | yes |  |
| MD | Miss Utility | 3wd | OK: start date >= 3 business days after -> Thu | 12wd/dig | yes | 18 | recommended | MISSING |  |
| ME | Dig Safe | 3wd | OK: 72 h / 3 business days -> Thu | 60cd/call | yes | 18 | required | yes |  |
| MI | MISS DIG 811 | 3wd | OK: 72 h -> Thu | 21cd/dig | yes | 48 | conditional | yes |  |
| MN | Gopher State One Call | 2wd | WRONG, FIXED p1: GSOC: Tue ticket -> Fri; app Thu | 14cd/dig | yes | 24 | required | yes |  |
| MO | Missouri 811 | 2wd | UNCONFIRMED: "at least two working days": counting not stated | 21cd/dig | yes | MISSING | MISSING | MISSING | Line unmarked or marked wrong: tell Missouri 811. The owner must contact you or mark it wi |
| MS | Mississippi 811 | - | MISSING: wait not confirmed (null) | 20cd/call | yes | 18 | required | yes | We could not confirm Mississippi’s wait before digging. Check Mississippi 811. |
| MT | Montana 811 | - | MISSING: nothing confirmed | - | MISSING | MISSING | MISSING | MISSING | We could not read Montana’s current statute. Check Montana 811. |
| NC | NC811 | 3wd | WRONG (strict): "3 full working days" -> Fri; app Thu. p2 | 28cd/dig | yes | 24 | conditional | MISSING |  |
| ND | North Dakota One Call | - | MISSING: null (decision 2 of r17.13) | 21cd/dig | yes | MISSING | conditional | yes | We could not confirm North Dakota’s wait before digging. Check ND One Call. |
| NE | Nebraska 811 | 2wd | WRONG (strict): "2 full business days" -> Thu. p2 | - | yes | 18 | MISSING | MISSING |  |
| NH | Dig Safe | 3wd | OK: 72 h | 30cd/call | yes | 18 | required | yes |  |
| NJ | New Jersey One Call | 3wd | UNCONFIRMED: "no less than three business days before" | 45wd/call | yes | MISSING | recommended | yes |  |
| NM | New Mexico 811 | 2wd | WRONG (strict): 2 working days not counting notice day -> Thu. p3 | 15wd/dig | yes | 18 | required | yes |  |
| NV | USA North 811 | 2wd | LIKELY WRONG + holiday FIXED p1: same wording as CA (p3); Nevada Day added (p1) | 28cd/call | yes | 24 | required | yes |  |
| NY | UDig NY (New York outside NYC and Long Island); New York 811 (New York City and Long Island) | 2wd | WRONG (strict): "not including the date of the call" -> Thu; National Grid: "two full working days". p3 | - | yes | 24 | conditional | yes |  |
| OH | OHIO811 | 2wd | WRONG (strict): "not including the day of the notification" -> Thu. p3 | - | yes | 18 | required | yes |  |
| OK | OKIE811 | 2wd | WRONG, FIXED p1: 48 h not counting notice day -> Thu; app Wed | 14cd/dig | yes | 24 | MISSING | yes |  |
| OR | Oregon 811 (Oregon Utility Notification Center) | 2wd | WRONG (strict): "2 full business days" -> Thu. p2 | 30cd/call | yes | 24 | required | yes |  |
| PA | Pennsylvania 811 | 3wd | OK: 3 business days -> Thu (r17.13) | - | yes | 18 | conditional | MISSING | Pennsylvania’s law sets no ticket life. Check Pennsylvania 811 for your ticket’s dates. |
| RI | Dig Safe | 3wd | OK: 72 h | - | yes | 18 | required | yes |  |
| SC | SC811 | 3wd | WRONG, FIXED p1: 3 full working days not counting call day -> Fri; app Thu; SC811 holidays added | 15wd/dig | yes | 24 | conditional | yes |  |
| SD | South Dakota 811 | 2wd | WRONG, FIXED p1: 48 h from 12:01 AM next day -> Thu; app Wed | 21cd/dig | yes | 18 | MISSING | MISSING |  |
| TN | Tennessee 811 | 3wd | UNCONFIRMED: "at least three working days prior" | 15cd/dig | yes | MISSING | required | MISSING |  |
| TX | Texas811 | 2wd | OK: 48 h from the call -> Wed | 14wd/call | yes | 18 | conditional | yes |  |
| UT | Blue Stakes of Utah 811 | 2wd | WRONG (strict) + holiday FIXED p1: row's own text: clock starts 8 AM next business day -> Thu (p2); Pioneer Day, Dec 24 added (p1) | 21cd/call | yes | 24 | conditional | yes |  |
| VA | VA811 | 3wd | OK: 48 h from 7 AM next working day -> Thu | 15wd/call | yes | MISSING | conditional | MISSING | Virginia: dig only after every operator has marked or posted a positive response. |
| VT | Dig Safe | 3wd | OK: 72 h | 30cd/call | yes | 18 | required | yes |  |
| WA | Washington 811 | 2wd | WRONG (strict): "2 full business days" -> Thu. p2 | 45cd/call | yes | 24 | required | yes |  |
| WI | Diggers Hotline | 3wd | UNCONFIRMED: "not less than 3 working days before" | - | yes | 18 | MISSING | yes |  |
| WV | WV811 | 2wd | OK: 48 h from the call -> Wed | 15wd/call | yes | MISSING | MISSING | yes |  |
| WY | Wyoming 811 | 2wd | WRONG (strict): "2 full business days" -> Thu. p2 | 14wd/call | yes | 24 | MISSING | yes |  |

p4 fills emergency for IL, NC, PA, AL, VA, MD and white lining for OK, WY (required), KY (conditional), MO (may use).
"Renew: yes" means the row has a renew line; its accuracy was checked by renewby_nov20 (its call list still open).
Ticket-life verdicts: unchanged from lib_811 / renewby (OR now confirmed by the center's page; MT, NE-after-start, AK,
OH, NY, PA, RI, WI have no life in the app on purpose: none in the law or not confirmed).

## What was staged (`patches/`, each applies alone on r17.13 and stacked in any order; both orders give the same file)
| Patch | What | Recommend |
|---|---|---|
| `p1_wait_days_confirmed.py` | MN, IA, IN, SD, OK wait 2 -> 3; SC 3 -> 4; Renew-by MN, IA, IN 2 -> 3; holidays NV, UT, SC (wait only); OR source; OHIO811 URL | Ship |
| `p2_wait_full_days.py` | AR, CO, CT, FL, KS, KY, NE, OR, WA, WY, UT 2 -> 3; NC 3 -> 4; Renew-by CT, OR, WA, AR 2 -> 3, NC 3 -> 4 | Ship (strictest wins), confirm WA/FL/CO by phone |
| `p3_wait_not_call_day.py` | CA, NV, NY, OH, IL, NM 2 -> 3; Renew-by NM 2 -> 3 | Only after Tommy checks a CA ticket |
| `p4_rules_hit_line_fills.py` | "Hit a line" section (every state + 8 state extras); 10 blank fields filled | Ship |
| `p5_state_phone_location.py` | 811 state: job, company, then phone location, then the California default | Ship |
Changed rows (old/new/source): `results/p1_changes.md` .. `p4_changes.md`.

Tests (`tests/t_811_audit.js`, one browser, 390 px; pages served on 10520): **ALL PASS** on live (baseline), p1, p2,
p3, p4, p5 and all five stacked (`results/t_811_audit_*.txt`). Regression: t130_staterules passes unchanged on p4 and p5;
on p1 one pinned Iowa expiry moves (Dec 18 -> Dec 19), on all five six pinned lines move (CA x3, CO, NM, IA): updated
copies made by `test_updates/update_t130.py <in> <out> p1 [p2] [p3]` pass (`results/t130_runs.txt`). The r17.13 feature
test t_r1713.js passes 39/39 on all five stacked. Staged tests that pin the Renew-by table (locate_round3, renewby,
locate_form, locate_research) are not in the regression and were not updated.

Ask cards (`lib/audit811_dig.jsonl`, 9 core cards, lib_kb 0 errors; 4 eval cases, 0 errors): dig-mn/ia/in/sd/ok/sc-wait-1
(when can I dig, with the weekday example), dig-nv-holidays-1, dig-ut-holidays-1, dig-or-tickets-2 (supersedes
lib_811's dig-or-tickets-1: 30 days confirmed). For the lead: drop "so the current number is not confirmed" from
lib_811's dig-or-overview-1; load lib_811 so the old one-card-per-state `dig-<st>` rows (built from the app table) go.
No cards were written for the p2/p3 states until the counting is confirmed (the lib_811 cards give no weekday example
there, so they are not wrong).

## DONE
