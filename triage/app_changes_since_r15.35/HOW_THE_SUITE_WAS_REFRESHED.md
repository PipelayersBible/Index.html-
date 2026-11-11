# Brief: bring stale release-suite tests up to date with the current app (Nov 11, 2026)

## Situation
- App: one-file HTML app, live file `/home/claude/index.html-/index.html` (r16.21, main). The build under test is r16.22 at
  `/home/claude/feat_triage_2026-11-10/site/` (`app.html` = instrumented copy the tests drive). r16.22 only changed the
  plan-set upload (pbPlansRenderPage / pbPlansPutAll / pbPlansEta); nothing you are fixing touches that.
- The suite on this workbench (`/home/claude/suite.txt`) was last synced for r15.35 (Oct 24). ~85 releases shipped since
  (r15.36 → r16.21). Your tests fail because the APP changed on purpose (wording, layout, flows, defaults), because a helper
  lib's fake server is behind the real server's shape, or — possibly — because of a real regression. Your job: make each of
  your tests pass against the current app WITHOUT weakening what it proves.
- What changed since r15.35: read `/home/claude/_notes/*.md` (release notes) and `/home/claude/_notes/git_log_*.txt`
  (the app's own commit messages r15.65 → r16.21). The app's git history: `cd /home/claude/index.html- && git log`
  (starts at r15.65; `git log -S'<string>' -- index.html` finds the release that changed a string).
- Harness: `/home/claude/README.md`. `test/lib.js` = Playwright helpers (`lockRun` was already fixed today: points start on
  "Survey Stake" since r15.65, so it clicks Invert Elevation first — `elevMode`). Helper libs mock Supabase
  (`test/hunt6/confined/mock5.js`, `batch20/HOME/tests/pd_lib.js`, `batch14/F/tests/lf_lib.js`, …); no test touches the real
  server. cdn.jsdelivr.net and fonts.googleapis.com are BLOCKED in this sandbox (mock5.newCtx aborts them anyway).

## Run one test
```
cd /home/claude && PB_TEST_DIR=/home/claude/feat_triage_2026-11-10/site PB_TEST_PORT=<your port> bash test/run.sh /home/claude/<test path> 300 2>&1 | grep -v agent-proxy
```
Use ONLY the port range you were given (other agents run in parallel; run.sh refuses a busy port). Wait for ≥2 GB free
(`awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo`) before each run; never run two tests at once.
Debug by writing a throwaway probe script under `/home/claude/test/_probe_<yourname>.js` (same require paths) and
deleting it after. `page.evaluate` can read the live DOM; `document.querySelector('.screen.active')?.innerText` shows the
screen. Screenshots: `page.screenshot({ path: '/home/claude/_shots/<name>.png' })` then view the PNG.

## Rules
1. Fix the TEST (or its helper lib) to the app's current intended behaviour. Never edit the app
   (`index.html-/index.html`, `feat_triage_2026-11-10/site/*`, `m.html`, any `patch.py`).
2. Never weaken a check into a no-op: no `check(x, true)`, no deleting a check because it is inconvenient, no widening a
   selector to "anything". Each check must still prove the thing its label says. If a feature was removed on purpose (e.g.
   crew/equipment hour boxes left the production form in r16.07), change the check to assert the NEW intended behaviour
   (the boxes are gone and the daily report has them) and say so in a one-line comment with the release number.
3. Decide "intended change" vs "regression" with evidence: a release note or commit message that describes the new
   behaviour, or app code that clearly implements it on purpose (a comment with a release number, a deliberate wording
   change applied consistently). If you cannot find that evidence and the old behaviour looks like what a user would want,
   do NOT paper over it: leave the check failing, and report it as a SUSPECTED REGRESSION with the exact check, what the app
   does now, what it did, and the code location. Safety areas (confined space permits, air tests, roster, emergency,
   alarms): never relax a check there; report instead.
4. Helper libs are shared. Before editing one, re-read the lines you change (another agent may have edited it); keep
   edits minimal and additive (new RPC answers, new fields); do not reformat. Libs you may edit are listed in your task.
5. Time-of-day: tests whose fake server uses the UTC date can fail after 5 pm Pacific (t_pace). Make such a test
   robust (use the app's own local date) rather than skipping it.
6. Keep each test's style; comments as `// r16.xx: …` naming the release that changed the behaviour.
7. Do not commit, do not push, do not touch git. Do not call any network service.

## Report (your final message)
For each test: `PASS` (ok=N) with a one-line summary of what you changed and why (release), or `STILL FAILING` with the
suspected-regression details, or `BLOCKED` with the reason. List every file you edited.
