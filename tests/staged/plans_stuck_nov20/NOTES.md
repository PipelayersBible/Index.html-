# Plan sets stuck at "reading" — fixed live Nov 20 ~6:45 PM
- Cause 1: a sheet left "reading" by a worker that died was only re-queued when the worker was running, but the cron only starts
  the worker when a sheet is queued. Fix: pb_plans_svc_more() is also true for a sheet "reading" for over 6 minutes.
- Cause 2: a set only turned "ready" when its LAST open sheet was read OK; if it failed, the set stayed "reading".
  Fix: pb_plans.finish_sets(), called from svc_fail and svc_take.
- Rolled-back test on live: Wildomar onsite Street Plans -> ready (8 done, 1 failed); the 2 stale sheets re-queued; removed set untouched.
- Applied: migration plans_stuck_reading_fix_nov20 (01_plans_stuck.sql md5 df48c272...).
- Other dashboard items checked: the expired 811 ticket 81659831 (job 26014) is DIG Civil's test data — left for Tommy to close in the app.
  The 51 dead push sign-ups are all Tommy's own test logins, already marked dead (the sender skips them); nothing to clean.
  Note: tfontaine@digcivil.com and tommyfontaine1@live.com have no working push sign-up now (turn notifications on again in the app).
