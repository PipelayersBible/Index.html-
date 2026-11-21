# r17.14 · Nov 20, 2026

## 811: the first dig day is no longer a day early
In many states the law says the call day doesn't count ("2 full working days", "starting the next business day"). The
app counted it, so a Monday call showed Wednesday when the law means Thursday. The "ticket isn't valid yet" warning
used the same date. Fixed:
- **Confirmed in writing:** Minnesota (a Tuesday ticket digs Friday), Iowa, Indiana, South Dakota, Oklahoma: Monday call
  digs Thursday. South Carolina: Monday call digs Friday.
- **Same words in the law ("full" working or business days), strictest reading used:** Arkansas, Colorado, Connecticut,
  Florida, Kansas, Kentucky, Nebraska, Oregon, Washington, Wyoming and Utah: Monday call digs Thursday. North Carolina:
  Friday.
- The "call in the renewal by" day moves with it where a renewal is a new notice (MN, IA, IN, CT, OR, WA, AR, NC).
- **811 center holidays** now skipped in the wait: Nevada Day (NV), Pioneer Day and Christmas Eve (UT), Confederate
  Memorial Day, Christmas Eve and Dec 26 (SC).
- **California, Nevada, New York, Ohio, Illinois, New Mexico not changed yet:** waiting on one California ticket's
  "Legal Start" to settle how the call day counts.
- Georgia not changed (waiting on a phone call).

## 811: hit a line, and the right state
- **New "Hit a line" section** on every state's Rules screen: stop, call 911 for gas or liquid or danger, tell the
  owner right away (even a nick), tell 811, don't bury or repair it. Plus the state's own deadline where we read it
  (California, Texas, Washington, Pennsylvania, Florida, Arizona, New Mexico, West Virginia).
- Illinois emergency tickets: wait at least 2 hours. Emergency and white-lining rows filled for 10 more states.
- **The job's state now falls back to where the phone is** (after the job and the company) before the California
  default. A Texas crew with no state on the job gets Texas dates, not California's.

## Safety by state
- **Report a serious injury:** 12 more states have their own line (Maryland, Minnesota, Nevada, South Carolina and
  Iowa with their phone numbers; Arizona, Indiana, North Carolina, New Mexico, Tennessee, Vermont and Wyoming use the
  federal 8 / 24 hours). No more "report within 8 hours to be safe" for these.
- **Trench lines** for 8 more states (Alaska, Hawaii, North Carolina, Tennessee, Virginia, Indiana, South Carolina,
  Maryland) and a fuller California trench permit line.
- **Rules screen:** Heat for every state, plus Toolbox talks and First aid for California and Washington, and Flaggers.
- **Talk schedule:** a line says Washington needs weekly talks and California every 10 working days. Five talks
  corrected (First Aid, Utility Strike, two traffic talks, Flagging).
- **Confined space permit:** Michigan's rule named; California's Jan 1, 2026 changes shown on the form.

## Water and sewer crossings follow the job's state
The crossing check used California's rule (water 1 ft above the sewer, "Title 22") everywhere. Now:
California 1 ft above; Texas water above, 2 ft over gravity sewer (6 in over pressure pipe); Florida 6 in above or
12 in below (12 in either way for force mains); Montana 18 in; other states 18 in (Ten States) with "check your state's
own rule". **Job state not known: the strictest rule is used** (water above, at least 2 ft), labeled "Job state not
known — strictest rule used". Your own Min. clearance still applies; the bigger one wins.
Also: "Add your spec books" no longer names only the Greenbook, and the test Details example fits the test type.

## Survey and cutsheets
- Cutsheets with LT / RT offsets ("LT 15.00", "15.00 RT", "O/S 15.00 RT", "R15.00") now keep the offset and line.
- Cutsheet rows written "C 4.60" or "CUT 4.60" are read. A bare "+" or "-" is still not guessed.
- **Stake photos:** cut / fill is filled in only when the stake says C, F, CUT or FILL. A stake with only a sign or an
  arrow is left empty for the crew to pick.
- Slope converter also shows feet per foot and horizontal : vertical (2:1).
- Education: 12 more survey words, and notes on vertical datums (NAVD 88 / NGVD 29) and the survey foot.

## Daily report and run report PDFs
The crew hours section says: "Job record, not a time card: meal and rest breaks are not shown here."

## Spanish (still switched off)
Spanish added for the 12 new injury lines. Other new lines are English for now (list in NOTES.md).
