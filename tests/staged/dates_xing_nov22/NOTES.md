# dates_xing_nov22: 811 dates, call time, crossings (Nov 22, 2026)

Base: r17.14 `_src/index.html` (md5 25adfdd9...). Patched page: `index.src.html` (md5 c9945807...).
Rebuild: `sh tests/staged/dates_xing_nov22/build.sh` (stacks `patches/d1..d8`, exact-once `rep()`; the table rows
are re-serialized with `_sr.py` and marked `checked: 2026-11-22`). No release built. Georgia not touched.

## Verified (sources read Nov 21-22, 2026)

| # | Reviewer point | Result | Source |
|---|---|---|---|
| 1 | NC Christmas Eve + Good Friday | **TRUE, and worse:** NC811 also lists "Christmas Day After" (Dec 28 2026). NC call Mon Dec 21 2026: app Mon Dec 28, law **Wed Dec 30** (reviewer said Tue Dec 29: they missed Dec 28) | nc811.org/education/calendars.html ("State Holidays ... are excluded from and not part of the three (3) working day notice"); oshr.nc.gov holiday list 2026-2028 |
| 1 | VA Election Day (+ Columbus) | TRUE (Columbus was already counted) | va811.com holiday list |
| 1 | MA/ME Patriots' Day, RI Victory Day, VT Bennington, NH Election Day (even years) | TRUE | digsafe.com/faqs + Dig Safe Excavator Manual Nov 2025 |
| 1 | HI Kuhio, Good Friday, Kamehameha, Statehood, Election Day | TRUE (law: working day excludes "any federal or state holiday") | Hawaii excavator guide / HRS 269E-7 |
| 1 | TX Christmas Eve, Dec 26, other Texas holidays | TRUE by law: 251.002(9) "legal holiday" = Gov Code 662 Subch. B: Jan 19, Mar 2, Apr 21, Jun 19, Aug 27, day after Thanksgiving, Dec 24, Dec 26 | texas.public.law 251.002, 662.003 |
| 1 | TN Good Friday, Christmas Eve | **Unconfirmed** (TN811 list not found). Law excludes "national and legal state holidays": applied to be safe | TCA 65-31-102(26) |
| 2 | Hour states show no time | TRUE. Also found: **TN is hour-based** too (a working day "shall commence at the time the ... call is received") | TCA 65-31-102(26) |
| 3 | Oregon after 5 PM | TRUE (already in the row's text, not in the math) | row's existing Oregon 811 FAQ source |
| 4 | Utah 8 AM on day 21 | TRUE: "All requests expire at 8 AM on the 21st calendar day". The app's day was right; the time was missing | Blue Stakes Excavator's Guide; Utah Code 54-8a-4(6)(a) |
| 5 | Weekend calls a day late | TRUE (MN Sat Dec 5 -> app Thu Dec 10, law Wed Dec 9). **Oregon is a false alarm**: a call after hours counts as the next business day, so a Saturday call is Monday's call (Thu is right) | GSOC; Blue Stakes (UT clock starts 8 AM first business day after notice) |
| 6 | TX Saturday before 11:59 AM | TRUE: Tue 11:59 AM, Wed if Monday is a holiday | Utilities Code 251.151(b), 251.002(14) |
| 7 | AZ two full working days; 10 days apartments / mobile home parks | TRUE (the 10 days are the landlord's response time for its own lines) | azcc.gov 811 page ("two full working days"); A.R.S. 40-360.22(B) |
| 8 | Water rule skipped for Waterline/WTR/W/WL/8" W, our water pipe in HDPE etc. | TRUE for Waterline/WTR/W/WL/8" W/WM. **"DW" was already matched** (false alarm). Our HDPE/steel/Sch 40 water pipe: TRUE | page test |
| 9 | Heading "Water Below Sewer" when water is above | TRUE | page test |
| 10 | AZ R18-5-502 | TRUE as quoted (2 ft above unless extra protection; never within 2 ft below; force mains 2 ft V / 6 ft H, encased within 6 ft) | law.cornell.edu A.A.C. R18-5-502(C) |
| 11 | CO label says "the Cal/OSHA limit" everywhere | TRUE | page |
| 12 | Spec card names the Greenbook | TRUE (r17.14 still had "the Greenbook in Southern California" for everyone) | page |

## Change table

| State | Field | Old | New | Source |
|---|---|---|---|---|
| NC | wait holidays | federal only | + Good Friday, 3 NC Christmas days (2026: Dec 24, 25, 28) | NC811 calendar |
| VA | wait holidays | federal | + Election Day | VA811 |
| MA, ME | wait holidays | federal | + Patriots' Day | Dig Safe |
| RI / VT / NH | wait holidays | federal | + Victory Day / Bennington Battle Day / Election Day (even years) | Dig Safe |
| HI | wait holidays | federal | + Kuhio, Good Friday, Kamehameha, Statehood, Election Day (even years) | HRS 269E |
| TX | wait holidays | federal | + Jan 19, Mar 2, Apr 21, Jun 19, Aug 27, Dec 24, Dec 26, Good Friday (unconfirmed) | Gov Code 662.003 |
| TN | wait holidays | federal | + Good Friday, Christmas Eve (unconfirmed) | TCA 65-31-102 |
| MN IA SD VA UT LA FL WA CO KY NC SC IN KS NE WY AR CT OK AZ | weekend / holiday call | moved to Mon, then full wait | Mon counts as day 1 (Sat call -> Wed; NC, SC Thu) | each row's wording |
| AZ | notice.n | 2 (Mon -> Wed) | 3 (Mon -> Thu) + apartment / mobile home park sentence | azcc.gov; ARS 40-360.22 |
| TX WV MA ME NH RI VT MI TN DC | dig time | date only | date + call time ("Wed Jun 3, 2:00 PM"; none: "after the time you called") | each row |
| TX | Saturday call | Wed always | before 11:59 AM: Tue 11:59 AM (Wed if Mon holiday); afternoon: Wed. Text: "A Saturday call made before noon..." | 251.151(b) |
| OR | call at/after 5 PM | ignored | next business day is the call day (Mon 6 PM -> Fri) | row source |
| UT IA VA LA IN CA | dig time | date only | + start hour from their own text (8 / 6 / 7 AM) | rows |
| UT | expiry | "Expires Sun Nov 22", "Expires today" | "Expires Sun Nov 22, 8 AM", "Expires 8 AM today" -> "Expired 8 AM today" + Don't dig | Blue Stakes |
| AZ | crossing rule | Ten States 18 in | water >= 2 ft above sewer (extra protection noted), never below; force main 2 ft | R18-5-502 |
| all | crossing words | water / dw / potable | + waterline, water main, WTR, WL, WM, W | - |
| all | run setting | (guess from pipe type) | "This run carries": Sewer / Storm drain / Water / Other (blank = pipe type, shown) | - |
| all | Check Before Locking | "Water Below Sewer" | "Water Too Close Above Sewer" / "...Below Sewer" / "Water Below Sewer" + "Gap 12.1 in, needs 24 in." | - |
| all | permit CO label / check | "the Cal/OSHA limit" | "blank uses 25 ppm (the strictest limit; federal OSHA's is 50)"; check names Cal/OSHA only on a CA job (es dict updated) | - |
| CA / AZ / TX | spec book card | Greenbook for all | CA Greenbook, AZ MAG, TX NCTCOG / TxDOT, others no example (company state, else phone) | - |

Row text diffs: `results/d1_changes.md`, `d3_changes.md`, `d4_changes.md`.

## Tests (port 10770, results/)

- `tests/t_dates_xing.js` (new; reviewers' examples): math 22/22, ui 14/14 (PB_FAKE_NOW=2026-06-22T09:00), xing 21/21: ALL PASS. On r17.14 it fails (no call-time math).
- t130_staterules: repo copy on patched page 4 FAIL, all expected (TX row changed vs JSON fixture; AZ Nov 25 -> Dec 2; TX Dec 24 is a Texas holiday -> Dec 30; AZ checked day). Updated copy `test_updates/tests/r1706/staterules/tests/t130_staterules.js`: 97/97 PASS (r17.14: 3 expected FAIL).
- t_811_audit (copy, TX holX now 8 days): ALL PASS. t_xing_state: PASS (unchanged). t_r1713: 1 expected FAIL (re-checked rows dated Nov 22); copy updated: ALL PASS.
- 390 px TX ticket form: no sideways scroll (`results/locform_tx_390.png`).
- Not tested in a browser: Lock / Resume / Reuse carrying `runCarries` (code read only); Spanish not added for new lines.

## Decisions for Tommy (max 5)

1. **NC Christmas: Dec 30 or Dec 29?** NC811 marks "Christmas Day After" (Dec 28) with a * ("NC811 remains open") but says all listed state holidays are excluded from the 3-day count. I used the strict reading (Mon Dec 21 call digs **Wed Dec 30**). Recommend: keep, or a 1-minute call to NC811 (336-855-5760) before Dec 21.
2. **Call time is kept only on the phone that entered it** (the server's `called_at` is a date). Recommend: add a `called_time` column to `pb_prod_locate_set` / locates so the office and other phones see "2:00 PM" (until then they see "after the time you called").
3. **Texas Rosh Hashanah / Yom Kippur** are Texas optional legal holidays too (662.003(c)); not added (Hebrew calendar). Good Friday is added. Recommend: ask Texas811 whether they count optional holidays; add a small date list if yes.
4. **Weekend calls in CA, NV, NY, OH, IL, NM** ("not including the date of notification") left as is per your CA note. Recommend: ask DigAlert / USA North how a Saturday online ticket counts; if Mon is day 1, add these states to the same fix.
5. **TN Good Friday + Christmas Eve** applied unconfirmed (strictest). Recommend: keep until TN811 confirms its holiday list.

## Memory note for the lead
Nothing new about Tommy learned here.

## DONE
