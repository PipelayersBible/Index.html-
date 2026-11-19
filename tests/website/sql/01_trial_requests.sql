-- 01_trial_requests.sql (staged Nov 18 2026, NOT applied): trial requests from the website form (pipelayersbible.com).
--
-- The edge function `trial-request` calls public.pb_trial_request_add with the service role. Same pattern as the existing
-- service functions (pb_feedback_claim, pb_push_svc_cron_secret): SECURITY DEFINER, search_path '', EXECUTE for
-- service_role only. Why an RPC and not a direct insert: pb_support is not one of the schemas the REST API serves, and the
-- per-IP limit and the insert happen under one lock, so two fast requests can't both slip under the limit.
--
-- Nobody else can read or write it: RLS on with no policies, and no table or function grants for anon / authenticated.
-- Thomas reads rows in the SQL editor for now (see NOTES.md for showing them in Beta Accounts later).

create table if not exists pb_support.trial_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 100),
  company     text not null check (char_length(company) between 1 and 120),
  role        text not null check (role in ('Owner', 'PM', 'Superintendent', 'Foreman', 'Other')),
  email       text not null check (char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone       text check (phone is null or char_length(phone) <= 40),
  crew_size   text check (crew_size is null or char_length(crew_size) <= 40),
  message     text check (message is null or char_length(message) <= 2000),
  ip_hash     text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{16,64}$'),
  user_agent  text check (user_agent is null or char_length(user_agent) <= 300),
  status      text not null default 'new' check (status in ('new', 'contacted', 'set_up', 'declined', 'spam')),
  notified_at timestamptz,          -- when the email to Thomas was accepted by Resend (null: not emailed)
  notes       text check (notes is null or char_length(notes) <= 2000)  -- Thomas's own notes
);
create index if not exists trial_requests_ip_recent on pb_support.trial_requests (ip_hash, created_at desc);
create index if not exists trial_requests_recent on pb_support.trial_requests (created_at desc);

alter table pb_support.trial_requests enable row level security;
revoke all on table pb_support.trial_requests from public, anon, authenticated;

-- Add one request. Limits: 5 an hour from one (hashed) IP, 200 a day in all. Returns {ok:true,id} or {ok:false,error}.
create or replace function public.pb_trial_request_add(
  p_name text, p_company text, p_role text, p_email text,
  p_phone text default null, p_crew_size text default null, p_message text default null,
  p_ip_hash text default null, p_user_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := nullif(lower(btrim(coalesce(p_ip_hash, ''))), '');
  n_ip int := 0;
  n_all int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('pb_trial_request:' || coalesce(v_ip, '-'), 0));
  if v_ip is not null then
    select count(*) into n_ip from pb_support.trial_requests where ip_hash = v_ip and created_at > now() - interval '1 hour';
    if n_ip >= 5 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  end if;
  select count(*) into n_all from pb_support.trial_requests where created_at > now() - interval '1 day';
  if n_all >= 200 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;

  insert into pb_support.trial_requests (name, company, role, email, phone, crew_size, message, ip_hash, user_agent)
  values (btrim(p_name), btrim(p_company), btrim(p_role), lower(btrim(p_email)),
          nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_crew_size, '')), ''),
          nullif(btrim(coalesce(p_message, '')), ''), v_ip, left(nullif(btrim(coalesce(p_user_agent, '')), ''), 300))
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when check_violation or not_null_violation or string_data_right_truncation then
    return jsonb_build_object('ok', false, 'error', 'invalid');
end;
$$;

-- Mark a request as emailed (called by the edge function after Resend accepts the email).
create or replace function public.pb_trial_request_notified(p_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with u as (update pb_support.trial_requests set notified_at = now() where id = p_id and notified_at is null returning id)
  select jsonb_build_object('ok', exists (select 1 from u));
$$;

revoke all on function public.pb_trial_request_add(text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.pb_trial_request_notified(uuid) from public, anon, authenticated;
grant execute on function public.pb_trial_request_add(text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.pb_trial_request_notified(uuid) to service_role;

comment on table pb_support.trial_requests is 'Free-trial requests from the website form (edge function trial-request). Service role only.';
