-- Local stand-in of the live objects pb_owner_dashboard reads (column lists and function bodies copied from live, read-only, Nov 20).
create role anon; create role authenticated; create role service_role;
create schema auth; create schema storage; create schema pb_billing; create schema pb_support; create schema pb_crew; create schema pb_onboard;
create schema pb_prod; create schema pb_daily; create schema pb_safety; create schema pb_plans; create schema pb_pm; create schema pb_mat;
create schema pb_push; create schema pb_backup; create schema pb_audit; create schema pb_reports; create schema pb_legal; create schema pb_ai;
create table public.companies (id uuid, name text, owner_user_id uuid, status text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, plan text, trial_ends_at timestamp with time zone);
create table public.company_members (id uuid, company_id uuid, user_id uuid, role text, created_at timestamp with time zone, joined_at timestamp with time zone, title text);
create table public.ai_usage (user_id uuid, day date, feature text, count integer);
create table public.subscriptions (id uuid, user_id uuid, tier text, status text, stripe_customer_id text, stripe_subscription_id text, current_period_end timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone);
create table pb_billing.accounts (company_id uuid, legal_name text, billing_email text, billing_contact text, billing_address jsonb, tax_status text, seller_legal_name text, seats_paid integer, base_seats integer, base_cents integer, seat_cents integer, billing_interval text, yearly_months integer, collection text, plan_reading boolean, plan_reading_cents integer, state text, period_start date, paid_through date, grace_days integer, cancel_at timestamp with time zone, founder_until date, founder_set_by uuid, founder_set_at timestamp with time zone, order_signed_by text, order_signed_at timestamp with time zone, terms_version text, stripe_customer_id text, stripe_subscription_id text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, beta_ended_at timestamp with time zone);
create table pb_billing.ai_cost (day date, user_id uuid, feature text, n integer, usd numeric);
create table pb_billing.ai_pool (owner_key text, day date, n integer, usd numeric);
create table pb_billing.usage (day date, user_id uuid, company_id uuid, ev text, n integer);
create table pb_billing.individual_accounts (user_id uuid, cents integer, year_cents integer, billing_interval text, period_start date, paid_through date, grace_days integer, state text, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone);
create table pb_billing.limit_overrides (company_id uuid, limits jsonb, note text, created_at timestamp with time zone);
create table pb_billing.settings (key text, value jsonb, note text, updated_at timestamp with time zone, updated_by uuid);
create table pb_billing.events (id bigint, company_id uuid, user_id uuid, kind text, detail jsonb, stripe_event_id text, actor uuid, at timestamp with time zone);
create table pb_support.admins (user_id uuid);
create table pb_support.messages (id uuid, user_id uuid, client_message_id text, body text, app_build text, screen text, status text, created_at timestamp with time zone, kind text, notified_at timestamp with time zone, company_id uuid, triaged_at timestamp with time zone, triage text, phone text);
create table pb_support.trial_requests (id uuid, created_at timestamp with time zone, name text, company text, role text, email text, phone text, crew_size text, message text, ip_hash text, user_agent text, status text, notified_at timestamp with time zone, notes text);
create table pb_crew.audit (id bigint, at timestamp with time zone, company_id uuid, actor uuid, action text, target_user uuid, target_email text, old_value jsonb, new_value jsonb, outcome text, code text, ref_id bigint);
create table pb_crew.invitations (id uuid, company_id uuid, user_id uuid, role text, invited_by uuid, status text, created_at timestamp with time zone, decided_at timestamp with time zone, title text);
create table pb_onboard.links (id uuid, kind text, company_id uuid, role text, label text, for_user uuid, pair_foreman uuid, replaces_user uuid, token_hash bytea, code text, created_by uuid, created_at timestamp with time zone, expires_at timestamp with time zone, claimed_until timestamp with time zone, used_at timestamp with time zone, used_by uuid, revoked_at timestamp with time zone, revoked_by uuid);
create table pb_onboard.misses (at timestamp with time zone, kind text);
create table pb_prod.run_records (id uuid, company_id uuid, user_id uuid, entry_id text, run_ref text, job_number text, job_key text, jobsite text, label text, locked_at timestamp with time zone, work_date date, ended boolean, ended_early boolean, distance_ft numeric, laid_ft numeric, photo_count integer, record jsonb, record_md5 text, version integer, created_at timestamp with time zone, updated_at timestamp with time zone, ended_at timestamp with time zone, sent_at timestamp with time zone, sent_how text, reviewed_at timestamp with time zone, reviewed_by uuid, nudged_at timestamp with time zone, sent_back_at timestamp with time zone, sent_back_by uuid, sent_back_note text, removed_at timestamp with time zone, removed_by uuid, removed_reason text, for_foreman uuid, corrected_at timestamp with time zone);
create table pb_prod.entries (id uuid, user_id uuid, company_id uuid, client_entry_id text, kind text, job_number text, job_key text, jobsite text, work_date date, saved_at timestamp with time zone, record jsonb, version integer, voided boolean, created_at timestamp with time zone, updated_at timestamp with time zone);
create table pb_prod.pass_errors (id bigint, at timestamp with time zone, place text, state text, message text, detail text);
create table pb_prod.run_seal_checks (id bigint, seal_id uuid, server_sha256 text, matches boolean, bytes integer, tsa jsonb, checked_at timestamp with time zone);
create table pb_prod.run_photo_checks (name text, server_sha256 text, matches boolean, bytes integer, uploaded_at timestamp with time zone, checked_at timestamp with time zone);
create table pb_prod.legacy_write_days (day date, user_id uuid, tbl text, ins integer, upd integer);
create table pb_prod.legacy_rpc_days (day date, tbl text, n integer);
create table pb_prod.locates (id uuid, company_id uuid, job_key text, job_number text, ticket_no text, called_at date, expires_at date, note text, created_by uuid, created_at timestamp with time zone, updated_by uuid, updated_at timestamp with time zone, closed boolean, closed_at timestamp with time zone, closed_by uuid, version integer, renewed_at date, renewals integer);
create table pb_prod.locate_runs (company_id uuid, local_date date, ran_at timestamp with time zone, sent integer);
create table pb_prod.site_log (id uuid, user_id uuid, company_id uuid, client_item_id text, kind text, session_ref text, run_ref text, job_number text, job_key text, jobsite text, work_date date, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone);
create table pb_prod.state_rules (code text, name text, rules jsonb, checked date, recheck_by date, updated_at timestamp with time zone);
create table pb_daily.reports (id uuid, company_id uuid, job_key text, job_number text, jobsite text, work_date date, foreman_uid uuid, version integer, received_at timestamp with time zone);
create table pb_daily.events (id uuid, company_id uuid, job_key text, job_number text, report_id uuid, client_event_id text, work_date date, kind text, reason text, detail text, status text, superseded_at timestamp with time zone, created_at timestamp with time zone);
create table pb_daily.wx_runs (company_id uuid, kind text, local_date date, tries integer, claimed_at timestamp with time zone, done_at timestamp with time zone, jobs integer, failed integer, sent integer);
create table pb_safety.permits (id uuid, user_id uuid, company_id uuid, client_permit_id text, space text, jobsite text, job_number text, closed_at timestamp with time zone, first_backed_up_at timestamp with time zone, last_backed_up_at timestamp with time zone, version_count integer, bytes_total bigint);
create table pb_safety.open_permits (user_id uuid, client_permit_id text, company_id uuid, space text, jobsite text, job_number text, snapshot jsonb, record_sha256 text, bytes integer, saves integer, first_saved_at timestamp with time zone, saved_at timestamp with time zone);
create table pb_safety.em_notices (id bigint, permit_user uuid, company_id uuid, permit_ref text, space text, job_number text, start_ms bigint, started_at timestamp with time zone, recipient uuid, role text, outbox_id uuid, source text, created_at timestamp with time zone);
create table pb_safety.em_refused (token_hash text, user_id uuid, client_permit_id text, at timestamp with time zone);
create table pb_plans.sets (id uuid, company_id uuid, owner_user uuid, created_by uuid, job_key text, job_number text, title text, pages integer, sha256 text, state text, usd numeric, created_at timestamp with time zone, ready_at timestamp with time zone, removed_at timestamp with time zone);
create table pb_pm.email_budget (id bigint, at timestamp with time zone, kind text, n integer);
create table pb_pm.email_outbox (id bigint, company_id uuid, user_id uuid, kind text, created_at timestamp with time zone, sent_at timestamp with time zone, given_up_at timestamp with time zone, last_error text);
create table pb_pm.digest_runs (company_id uuid, local_date date, built_at timestamp with time zone, jobs integer, emails integer);
create table pb_mat.orderby_runs (company_id uuid, local_date date, ran_at timestamp with time zone, sent integer);
create table pb_push.outbox (id uuid, user_id uuid, type text, created_at timestamp with time zone, sent_at timestamp with time zone, attempts integer, given_up_at timestamp with time zone);
create table pb_push.subscriptions (id uuid, user_id uuid, created_at timestamp with time zone, dead_at timestamp with time zone);
create table pb_backup.runs (id bigint, started_at timestamp with time zone, finished_at timestamp with time zone, status text, files integer, bytes bigint, rows bigint, error text, alerted_at timestamp with time zone);
create table pb_backup.offsite_runs (id bigint, at timestamp with time zone, copied integer, failed integer, bytes bigint, note text);
create table pb_backup.offsite (bucket text, name text, bytes bigint, sha256 text, lock_mode text, lock_until timestamp with time zone, copied_at timestamp with time zone);
create table pb_audit.admin_log (id bigint, at timestamp with time zone, kind text, company_id uuid, user_id uuid, actor uuid, detail jsonb);
create table pb_reports.reports (id uuid, company_id uuid, category text, body text, is_anonymous boolean, status text, created_at timestamp with time zone);
create table pb_legal.acceptances (id bigint, user_id uuid, terms_version text, privacy_version text, accepted_at timestamp with time zone, app_build text, company_id uuid);
create table pb_ai.gaps (id bigint, created_at timestamp with time zone, source text, question text, q_hash text, topic jsonb, reason text, answer text, note text, level text, kb_version text, status text, batch text, hits integer);
create table pb_ai.kb_versions (version text, built timestamp with time zone, n integer, counts jsonb, active boolean);
create table auth.users (id uuid, email character varying(255), created_at timestamp with time zone, last_sign_in_at timestamp with time zone);
create table auth.sessions (id uuid, user_id uuid, created_at timestamp with time zone, aal text, not_after timestamp with time zone, user_agent text);
create table auth.mfa_factors (id uuid, user_id uuid, factor_type text, status text, created_at timestamp with time zone);
create table auth.audit_log_entries (instance_id uuid, id uuid, payload json, created_at timestamp with time zone);
create table storage.objects (id uuid, bucket_id text, name text, created_at timestamp with time zone, metadata jsonb);

-- auth.uid() / auth.jwt() from request settings, as on Supabase
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;

create function pb_crew.invitation_expired(p_created timestamp with time zone) returns boolean language sql stable set search_path to '' as $$ select p_created < now() - interval '7 days' $$;
create function pb_crew.display_name(p_company uuid, p_user uuid) returns text language sql stable set search_path to '' as $$ select null::text $$;
create function pb_support.admin_ok(p_uid uuid, p_aal text) returns boolean language sql stable security definer set search_path to '' as $$
  select p_uid is not null and exists (select 1 from pb_support.admins a where a.user_id = p_uid)
    and (coalesce(p_aal, '') = 'aal2' or not exists (select 1 from auth.mfa_factors f where f.user_id = p_uid and f.status = 'verified')) $$;
create function pb_billing.plan_limits() returns jsonb language sql immutable set search_path to '' as $$ select '{
    "member": {"day": 25, "month": 150}, "owner": {"day": 5, "month": 30}, "individual": {"day": 15, "month": 50, "usd_month": 2.50, "storage_gb": 1},
    "company": {"day_per_person": 12, "month_per_person": 60, "usd_base": 22.00, "usd_per_extra": 3.25, "storage_gb_base": 10, "storage_gb_per_extra": 1},
    "beta": {"usd_month": 30.00, "photos_day": 150, "storage_gb": 10}, "none": {"photos_day": 10, "storage_gb": 0.1},
    "plan_reading": {"sheets_month": 150, "usd_month": 45, "sets_day": 3, "pages_set": 150, "cost_sheet": 0.28}}'::jsonb $$;
create function pb_billing.setting(p_key text) returns jsonb language sql stable security definer set search_path to '' as $$ select s.value from pb_billing.settings s where s.key = p_key $$;
create function pb_billing.setting_int(p_key text, p_default integer) returns integer language sql stable security definer set search_path to '' as $$
  select coalesce(case when jsonb_typeof(s.value) = 'number' then (s.value #>> '{}')::integer end, p_default) from (select pb_billing.setting(p_key) value) s $$;
create function pb_billing.paid_people(p_company uuid) returns integer language sql stable security definer set search_path to '' as $$
  select greatest(coalesce((select a.seats_paid from pb_billing.accounts a where a.company_id = p_company), 0), pb_billing.setting_int('base_seats', 5)) $$;
create function pb_billing.seats_used(p_company uuid) returns integer language sql stable security definer set search_path to '' as $$
  select (select count(*)::int from public.company_members m where m.company_id = p_company)
       + (select count(*)::int from pb_crew.invitations i where i.company_id = p_company and i.status = 'pending' and not pb_crew.invitation_expired(i.created_at)
            and not exists (select 1 from public.company_members m2 where m2.user_id = i.user_id and m2.company_id = p_company)) $$;
create function pb_billing.state_of(a pb_billing.accounts) returns text language sql stable set search_path to '' as $$
  select case when a.state = 'canceled' then 'canceled' when a.state = 'read_only' then 'read_only'
              when current_date >= a.paid_through + a.grace_days then 'read_only' when current_date >= a.paid_through then 'past_due' else 'active' end $$;
create function pb_billing.amount_cents(a pb_billing.accounts, p_seats integer) returns integer language sql immutable set search_path to '' as $$
  select ((a.base_cents + greatest(0, p_seats - a.base_seats) * a.seat_cents + case when a.plan_reading then coalesce(a.plan_reading_cents, 0) else 0 end)
          * case when a.billing_interval = 'year' then a.yearly_months else 1 end)::int $$;
create function pb_billing.limits_of(p_company uuid) returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce((select jsonb_object_agg(e.k, case when jsonb_typeof(o.limits->e.k) = 'object' then e.v || (o.limits->e.k) else e.v end)
       from pb_billing.limit_overrides o, jsonb_each(pb_billing.plan_limits()) e(k, v) where o.company_id = p_company), pb_billing.plan_limits()) $$;
create function pb_backup.health(p_now timestamp with time zone default now()) returns text language sql stable security definer set search_path to '' as $$
  select case when not exists (select 1 from pb_backup.runs b where b.started_at > p_now - interval '26 hours') then 'no backup run in the last 26 hours'
              when (select b.status from pb_backup.runs b order by b.id desc limit 1) = 'failed' then 'failed: test' end $$;
insert into pb_support.admins values ('aaaaaaaa-0000-4000-8000-0000000000a0');
