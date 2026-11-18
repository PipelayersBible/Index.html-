# Security sweep 2 (Nov 17–18 2026) — summary
No cross-company read or write found (278 public RPCs x 11 roles, ~26,700 hostile calls; 192 tables RLS on; storage policies).
1. [high if pb_ai exposed] pb_ai.eval_start callable by any signed-in account (starts a paid Ask eval run). FIXED Nov 18: revoke from public/anon/authenticated (migration eval_start_owner_only_nov18); verified authenticated=false, postgres=true.
2. [medium] New functions get EXECUTE TO PUBLIC by default in every schema; 61 pb_* functions executable by anon (unreachable today without schema USAGE). Fix: 01_eval_start_and_pb_function_acl.sql (mass revoke + global default privilege). NOT applied: owner decision.
3. [medium-low] Unlimited uploads by any signed-in account to run-photos / run-seals / cutsheet-sources. Fix: 02_storage_upload_caps.sql (400/100/50 per day; run-seals needs a company). NOT applied: owner decision.
4. Info: pb_daily.reports insert policy uses pb_prod.is_foreman_of (fails closed); OTP expiry advisor; ai-next gate not checked.
