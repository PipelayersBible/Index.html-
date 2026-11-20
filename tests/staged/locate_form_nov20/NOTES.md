# 811 forms: the state rule applied, not shown (staged Nov 20 2026, NOT shipped)

Tommy, Nov 20: "I don't want the app showing each state's renewal rules. I want it to just know which rule to use and
then they can see which rule their area uses."

One app patch on the r17.11 candidate, no server change. Nothing live was touched; `_src/index.html` was not edited.

- Patch: `patches/p01_locate_state_rule.py` (`python3 p01… in.html out.html`, 16 exact-once replacements). Base:
  `/tmp/claude-0/r1711/src.html`.
- Test: `tests/t_loc_form_state_rule.js` → `ALL PASS 58/58` (Playwright, 390 px, the locate811 fake server).
- Screens: `out/renew_ca_390.png`, `out/renew_tx_390.png`, `out/nevada_third_390.png`, `out/rule_sheet_ca_390.png`,
  `out/new_ticket_ca_390.png`, `out/locates_390.png`.

## What changed for the crew

| Where | Before | Now |
|---|---|---|
| Renew form | Date boxes + "California, from the renewal day: A ticket is good for 28 days…" | Date boxes filled in, no rule text. One small link: **California rule ›** |
| New ticket form | Two rule paragraphs (ticket life; wait before digging) | No paragraphs. "Can dig from / Start work by" dates stay. Same link. |
| Ticket card | – | The same small link under the dates (open tickets only) |
| The link | – | One short sheet for that job's state only: Before digging, Ticket life, Renewing, Call 811, "Where this comes from" (folded), the day checked. No state list. |
| Utah renewal | 21 days from the renewal day (up to 7 days short) | 21 days from the **old expiry**; changing the renewal day does not move it |
| Dig-day states, renewal | notice wait added again, then the life | the life from the renewal day (new tickets unchanged: still from the first legal dig day) |
| Nevada, third renewal | form opened | "Nevada allows two renewals on a ticket, and this one has had both. Call in a new ticket and add it here." Nothing sent. |
| CT FL IN ME MN NC NJ OK OR TN TX WA | Renew kept the old number | Renew asks for **New ticket number** (blank; required), date box reads "Called in again". Same ticket row; History shows "old → new". |

Lines the forms still say, because the crew has to act on them: "Your own date. Clear it to use Utah's rule.",
"Enter the expiry on your ticket." / "Enter the new expiry 811 gave you." (the 13 states with no confirmed life),
"Ask 811 when you can dig." (states with no confirmed wait). "Check your state's 811 rules." is gone from the forms.

The header's existing "Rules for <state>" / "Change State" buttons (r17.05) are untouched; Change State is still how a
wrong state is fixed. Saves are unchanged: a renewal is the 10-argument `pb_prod_locate_set` (the usual nine +
`p_renewed_at`), a plain add / edit the 9-argument one (both checked by key count in the test).

Also fixed in passing: on the Renew form, clearing a typed expiry put the state date back but still said "Your own
date" (the date box fires a second event). It now counts as the state's date again.

## The rule per state, and what it rests on

The dates still come from the app's one table (`PB_SR`, checked Nov 19 2026). The patch adds a 14-entry list
(`PB_LOC_REN`) on top: Utah = from the old expiry, Nevada = 2 renewals, 12 states = new number.

- **Utah, confirmed (law).** Utah Code 54-8a-4(6)(c): "A notice under Subsection (6)(b) is valid for 21 days from the
  day on which the previous notice expires." https://le.utah.gov/xcode/Title54/Chapter8A/C54-8a-S4_2024050120240501.html
  The 7-day / 48-hour window in (6)(b) is not enforced by the form; it is on the Utah sheet.
- **Nevada, confirmed (center handbook).** USA North 811 Nevada 2025 handbook: tickets can be renewed two times, then
  a new ticket (NAC 455.165). https://usanorth811.org/assets/PDF/Nevada-2025-Handbook.pdf It does not say where the
  renewed 28 days start; the app counts from the renewal day. The limit is in the phone only; the server does not
  refuse a third.
- **Dig-day states (AL CO IA KS MD MI MN NC ND NM OK SC TN): NOT confirmed state by state.** I read the table's
  sources for AL, CO, IA, KS, MI, MN, NC, NM, OK, SC, TN. None says where a renewed or repeated notice's life starts,
  and none says a renewal gets the notice wait again (AL 37-15-4, CO 9-1.5-103, KS 66-1804, TN 65-31-106, NC 87-122,
  OK 63-142.6, IA 480.4, MCL 460.725, 18.60.5 NMAC and the SC811 manual are all silent on it). MD and ND were not read.
  So the app takes the earliest reading: the life from the renewal day, no wait added. The test checks, for all 38
  states with a ticket life, that this is never later than a new ticket called in the same day. It can be a few
  days short of what 811 gives; the date can be typed.
- **New-number states.** From the table's own "renew" lines ("call in again", "give a new notice", "send a new locate
  request") for CT FL IN ME MN NC NJ OK OR TN WA, and Texas811's FAQ for TX (an update is saved as "Update – (previous
  ticket number)", https://www.texas811.org/faq). The laws say "new notice"; **that 811 issues a new number is not
  written in any source I read** (the Texas FAQ, Oregon 811 FAQ and Fla. Stat. 556.105 do not say it outright). If a
  center keeps the number, the foreman types the same number again and it saves.
- Not in the list, on purpose: SC ("a remark gets a new ticket", an extension is not said to), DE, ID, MI, VA.
  They renew with the number kept, from the renewal day.

## Tests run

| Test | Page | Result |
|---|---|---|
| `tests/t_loc_form_state_rule.js` (new) | patched source | **58/58** |
| `r1706/office3/tests/t_o3_34_36_office.js` (`run_all.sh --only`, hooks build) | minified + hooks | pass, 27 |
| `bughunt_nov17/office/s1_smoke.js` (`--only`, hooks build) | minified + hooks | pass, matches golden |
| `r1706/staterules/tests/t130_staterules.js` (`--only`, hooks build) | minified + hooks | **3 checks fail, by design**: they look for the rule paragraphs on the new-ticket form ("Arizona: Marks are good for…", "Arizona: Call at least…", Arkansas "Check your state's 811 rules") |
| the same with `tests/update_t130_staterules.py` applied (rewrites those 3 checks) | patched source | all pass |
| `staged/locate811_nov20/tests/t_loc811_renew_history.js` | patched source | 30/31; the one is "the help line names the state's rule", by design |

Hooks build made as asked (repo's non-test files + `build.py <page> <outdir> --hooks`). The full regression was not run.
`bughunt_nov17/critic/big.js` also touches these forms but is not in the runner; not run.

## For the lead

1. Apply `patches/p01_locate_state_rule.py` after the r17.11 stack.
2. Run `python3 tests/update_t130_staterules.py tests/r1706/staterules/tests/t130_staterules.js <same file>` and drop
   or reword the one "help line names the state's rule" check in the locate811 test (it should now expect an empty
   help line and `#locRuleLink`).
3. Add `t_loc_form_state_rule.js` to a suite (plain page, no hooks needed).
4. New English strings (not in any Spanish table): "New ticket number", "From 811", "Called in again", "<State> rule ›",
   "<State> 811 rule", "Before digging", "Renewing", "Where this comes from", the Nevada message, "Enter the new ticket
   number from 811.", "Ask 811 when you can dig.", the two "The app counts a renewal…" / "The app asks for the new
   ticket number…" sheet lines.

## Not done / known limits

- A renewed ticket's card still shows "Can dig from / Start work by" (and the "Start work by" chip) counted from the
  original call-in day (seen in `out/locates_390.png`; already noted in locate811). Most visible in new-number states.
- In new-number states the ticket keeps its original "Called in" day; the new call day is stored as the renewal day.
- An Edit of a renewed Utah ticket, expiry cleared, falls back to 21 days from the renewal day (the Edit form does
  not know the old expiry). Earlier than the law's date, never later.
- The "My tickets" list outside a job was not given the link.

## Decisions for Tommy

1. **Ship this in r17.11?** Recommend **yes**. It is what you asked for: the form knows the rule, one small link shows it.
2. **New-number states: make the new number required** (as built), or optional with the old number left in?
   Recommend **required**: a blank box is the only way nobody skips it, and typing the same number works if 811 kept it.
3. **Dig-day states: count a renewal from the renewal day** (as built, can be a few days short), or keep adding the
   wait (can be a few days long)? Recommend **as built**: a date that is early costs a phone call; one that is late
   costs a dig on a dead ticket.
4. **Nevada: block the third renewal on the phone** (as built) or only warn? Recommend **block**; Add Dig Ticket is one tap away.
5. **Renewed tickets still show "Start work by" from the first call-in.** Hide those two dates once a ticket is
   renewed? Recommend **yes, next release** (small, separate patch; not built).

## DONE
