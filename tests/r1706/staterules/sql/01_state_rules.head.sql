-- r17.05 staterules (decisions #33, #64): the state rules table and the job's / company's state on the company server.
-- STAGED, NOT APPLIED. Built by sql/build_sql.py from data/state_rules.json (head + seed + tail).
--
-- Why the server needs it: a locate ticket's expiry is computed on the phone and stored (pb_prod.locates.expires_at);
-- the server's alert pass (pb_prod.locate_pass / locate_send) only reads the stored date, and its text says
-- "Call 811 for a refresh", which is right in every state. So nothing on the server recomputes expiry. What the
-- server must hold is WHICH state a job is in, so every phone of the company (the office and each foreman) uses the
-- same rules: pb_prod.job_states (job_key '' = the company's state), read with pb_state_rules_get and set with
-- pb_job_state_set. pb_prod.state_rules holds the same table the app carries (with sources and the checked day),
-- so a state code is checked against it and a later server pass can use the same rows.
-- Nothing existing is changed: no existing function or table is altered (pb_prod_locates, pb_company_settings_get and
-- pb_company_locate_days_set stay as they are; pb_pm.settings.locate_days is no longer read by the app).

create table if not exists pb_prod.state_rules (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  rules jsonb not null,
  checked date not null,
  recheck_by date not null,
  updated_at timestamptz not null default now()
);
alter table pb_prod.state_rules enable row level security;
revoke all on table pb_prod.state_rules from public, anon, authenticated;

create table if not exists pb_prod.job_states (
  company_id uuid not null references public.companies(id) on delete cascade,
  job_key text not null check (job_key = '' or job_key = left(lower(btrim(job_key)), 60)),
  state text not null references pb_prod.state_rules(code),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (company_id, job_key)
);
comment on table pb_prod.job_states is 'r17.05: the state a job is in (811 and trench rules). job_key '''' is the company''s state, used when a job address has no state.';
alter table pb_prod.job_states enable row level security;
revoke all on table pb_prod.job_states from public, anon, authenticated;

