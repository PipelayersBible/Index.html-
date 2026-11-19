# Rolled-back SQL test results (live project, each run ended with raise exception 'RESULT: ...'; checked afterwards that nothing stayed)

## 32_version_check.sql + 32_test.sql
RESULT: get ver=0 name=Sundance Sewer Improvement | A ok=true ver=1 | B ok=false code=pb:changed now=Renamed by A/1 | B2 ok=true ver=2 | same=true ver=2 | old5=pb:update_app | 26043 ver=0 || pms ver=1 n=1 | A ok=true ver=2 n=0 | B ok=false code=pb:changed n=0 ver=2 | B2 ok=true n=1 ver=3 | old3=pb:update_app || grants: get=true set6=true pms4=true anon_set6=false anon_pms4=false jobver_auth=false
After: job_info.info_ver column absent, pb_prod_job_info_get absent (rolled back).

## 37_permit_secret_apart.sql + 37_test.sql
RESULT: new ok=true stored_has_s=false sha_matches_sent=true filed=true refused=false | apart+s=pb:bad_record | old ok=true filed=true | wrong-secret ok=true filed=false refused=true | again same=true | grants auth=true anon=false
(new record: filed with the secret beside it, stored record has no secret, server SHA = SHA of the text sent; a flagged record still carrying the secret is refused; an old record through the 3-arg call still files; a wrong secret files nothing and is recorded as refused; resend is "same".)

## 36_exports.sql (test block inline in the run; same body as the file, then the DO block below)
RESULT: days ok=true rows=30 first={"key": "_equiphours", "qty": 16, "date": "2026-10-28", "unit": "h", "entries": 1} pipe_total=1756.0 dashboard_pipe_done=1756.0 job=Sundance Sewer Improvement | hours ok=true rows=16 reports=5 first={"n": 1, "date": "2026-10-30", "name": "Mike Smith", "hours": 8, "linked": true, "foreman": "Brandon Jones", ...} | all jobs rows=16 | long=pb:bad_range | pipelayer=pb:not_company_account | grants days=true hours=true anon=false/false
(the export's pipe total for job 26014 equals the dashboard's cat_sums "done" for pipe: 1756.0 ft.)

## 35_leave_handover.sql + 35_test.sql: NOT RUN LIVE
The run was cancelled by the client's confirmation step 0.8 s after it was sent (the batch has DELETE / DROP CONSTRAINT
statements, which ask for a confirmation here); nothing ran. The test file is ready: paste the body of
35_leave_handover.sql (without begin/commit) followed by 35_test.sql into one execute_sql call. It ends with
raise exception 'RESULT: ...', so nothing stays.
