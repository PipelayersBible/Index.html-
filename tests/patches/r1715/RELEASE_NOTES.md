# r17.15 · Nov 22, 2026

Fixes from the Nov 21 review chats (records, 811 dates, first week, Ask safety, design, security). Built by
`sh tests/staged/r1715_candidate/build.sh` (stack order and every patch are listed there).

## Records and lost work
- **"Not sent" now counts everything that hasn't reached the company:** runs the company hasn't accepted, run photos
  still owed, and permits not backed up.
- **Deleting an unsent run asks twice.** A run with photos still owed can't be deleted. A permit that isn't backed up and
  was closed less than a year ago shows "Back It Up First" (company managers can still delete).
- **No false "no cloud copy" warning:** tries with no signal no longer count as failures, and runs already marked are
  retried quietly when signal comes back.
- **Old runs reach the company:** any run the company hasn't accepted goes, if it was locked in the last 21 days, after
  the person joined this company, or the company already has a version of it. Never runs from before he joined.
- **Can't log out with work unsent** on an account with no email or password (and Lock This Phone, which logs out too).
- "Add to Home Screen so this phone keeps your work" on the Not sent line; storage advice matches which store is full.
- **Office-filled daily report PDF** no longer reads "SIGNED BY" the foreman; the office person's name comes from their
  account. Removing a run asks for a reason. Export for Records: Exhibit 1 lines dated, paragraph 9 corrected.

## 811 dates and crossings
- 811 center holidays: North Carolina Christmas (a Mon Dec 21 call digs Wed Dec 30) and Good Friday; Virginia,
  Massachusetts/Maine, Rhode Island, Vermont, New Hampshire, Hawaii, Texas, Tennessee.
- Call time counted in states that count hours; weekend calls fixed in 20 states; Texas Saturday; Oregon after 5 PM;
  Utah 8 AM expiry; Arizona Thursday and the 10-day note.
- Water/sewer crossings: more words recognized as water, a "This run carries" choice, "Water Too Close Above Sewer"
  with the gap, Arizona's rule. Colorado permit wording; spec card by state; CO limit line reworded (25 ppm, the
  strictest; federal OSHA's is 50).

## First week
- iPhone Add to Home Screen steps for iOS 26 (the ••• menu).
- Home trial line says "Trial"; the day count shows only to the office. When a trial ends, foremen and pipelayers see
  "Your company's trial has ended. Your records are safe. Your office decides what's next." with no price or buttons.
- Log In screen links to the trial form; clearer "in use on another device" message; an expired join link says so and
  offers "Ask for a New Link".

## Ask
- The emergency answer (space, open hole, gas, power; English and Spanish) works on the phone with no plan, no limit
  and no signal. Every "Ask can't answer" message ends with "Emergency? Call 911." (not the stake/ticket readers).

## Design (behaviour; the new look waits on Tommy)
- The lit tab is the one you came from; Back arrows on 7 screens that had none; the Current job stays after End Run and
  opens in Log Work Without a Run and Plans; field tickets start with the time; End Run says who the report goes to and
  then "Report sent ✓"; the run report no longer shows twice on Home; fonts ship with the app (work offline); 4 dead
  calculator screens removed; blank icons on Confined Space fixed.
- Permit: Check In shows grey "entry not allowed" when entry isn't allowed (still logged if tapped); the form is checked
  before the acknowledgment; close-out defaults to "Evacuated / Prohibited Condition" after a bad reading or EMERGENCY;
  a red EMERGENCY bar stays pinned once the button scrolls away; "Set reminder" readable in daylight.
- Show password on Log In and Set Password; screen readers skip the ALL-CAPS kickers.

## Security
- Content Security Policy: the app can load scripts and send data only to its own servers and the few services it uses.

## Tests
- Focused: records 0 FAIL, design p1/p1b 0 FAIL, dates/crossings ALL PASS, first week ALL PASS, Ask emergency ALL OK,
  CSP smoke 11/11 with no violations.
- Full regression on the combined build: 220 pass, 15 skipped; 1 fail (f06_breakend, time-of-day, fails the same on r17.14). Live page md5 67a8a7f2 = tested build. Published Nov 22 ~12 AM (commit e9131f4).
- Server rule "a run removal needs a reason" (records A9) waits until at least Nov 29.
