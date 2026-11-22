# Daily report permission fix (Nov 22, 2026, lead)

Found while testing records Phase B on live: a foreman's daily report insert failed with "permission denied for function
is_foreman_of", and the office-fill path of pb_daily_submit failed with "permission denied for schema pb_prod".
Cause: the insert policy daily_reports_add and pb_daily_submit (runs as the caller) call pb_prod.is_foreman_of and
pb_pm.settings_of, which the authenticated role can't execute. Postgres checks EXECUTE on every function in a policy
expression, even the branch a foreman never reaches. Last real daily report on the server: Nov 7. The app's test rig uses
a fake server, so the regression suite could not see it.

Applied (each tested rolled-back on live first):
- 01_office_fill_policy.apply.sql (md5 d991d510…): definer wrapper pb_daily.office_fill_for; policy uses it. records
  test blocks t02-t05 went from 1 fail to 0 fail with it.
- 02_office_fill_submit.apply.sql (md5 81123e5f…): pb_daily.company_tz wrapper; pb_daily_submit patched (2 pieces, each
  exactly once, live text saved for undo). block_t02: without fix 0/3, with fix 3/3, after apply 3/3.
Undo: 99_undo_02.sql then 99_undo.sql.

Sweeps after the fix (all empty): policies for authenticated calling a function it can't execute; policies naming a pb_
schema it has no USAGE on; caller-rights functions the app may run that call a function it can't execute or a schema it
can't use.
Follow-up: run these three sweeps after every server change (add to the nightly backup check).
