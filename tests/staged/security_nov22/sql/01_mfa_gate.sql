-- security_nov22 01 (review finding 1, HIGH): two-step login is enforced by the server, not only by the app's code sheet.
-- Before: public.pb_session_gate() (the PostgREST pre-request check on every app request) never looked at the session's
-- assurance level, so a password-only (aal1) session of a login that has two-step login on could call every company
-- function (pb_crew_list, pb_ai_company_overview, run records ...) straight from the API.
-- After: such a session is refused on every API request with the error the app already treats as "not now, nothing filed,
-- try again later" (pb:signed_out, HTTP 401) and detail 'code_needed'. The app does NOT sign out on it (its one-device
-- handler only acts on other_device / moved / ended / in_use / full), so the code sheet stays up; once the code is
-- entered the session is aal2 and everything goes through. The code sheet itself uses only the Auth API
-- (mfa.getAuthenticatorAssuranceLevel / listFactors / challengeAndVerify), which this gate never sees.
-- Also adds public.pb_session_ok(): a no-op RPC edge functions call with the caller's own token so the same gate
-- (two-step code, device lock, ended sessions) applies to them (edge/crew-admin, edge/weather).
-- Run as postgres, in one transaction (the whole file). Safe to run twice. Undo: undo/99_undo_01.sql.

-- (00_guard.sql is included here by mk.py for the apply copy: apply/01_mfa_gate.apply.sql)
select pb_sec.guard('nov22_01', 'public.pb_session_gate()', '86427e6a38841f324615c92e515d8673');

CREATE OR REPLACE FUNCTION public.pb_session_gate()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_txt text := current_setting('request.jwt.claims', true); v_claims jsonb; v_s text; v_sid uuid; v_uid uuid; v_reason text; h record; v_kind text;
begin
  if v_txt is null or v_txt = '' or left(v_txt, 1) <> '{' then return; end if;
  v_claims := v_txt::jsonb;
  if v_claims->>'role' is distinct from 'authenticated' then return; end if;
  v_s := v_claims->>'session_id';
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
  v_sid := v_s::uuid;
  select l.end_reason into v_reason from pb_auth.sessions_log l where l.session_id = v_sid;
  if not exists (select 1 from auth.sessions s where s.id = v_sid) then
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = coalesce(v_reason, 'ended');
  end if;
  if v_reason = 'in_use' then raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'in_use'; end if;
  v_s := v_claims->>'sub';
  if v_s is null or v_s !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return; end if;
  v_uid := v_s::uuid;
  -- security_nov22 01: two-step login on and the code not entered in this session (aal1): nothing but the code sheet.
  -- Same shape the app's queues already wait on (nothing filed, tried again later); 'code_needed' never signs the app out.
  if coalesce(v_claims->>'aal', '') <> 'aal2'
     and exists (select 1 from auth.mfa_factors f where f.user_id = v_uid and f.status = 'verified') then
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'code_needed';
  end if;
  if v_reason = 'full' then
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'full',
      hint = coalesce((select string_agg(x.kind || '|' || floor(extract(epoch from x.act))::bigint, ',') from pb_auth.slots(v_uid, v_sid) x), '');
  end if;
  select hh.session_id, hh.device_id, hh.last_at into h from pb_auth.holder hh where hh.user_id = v_uid;
  if not found or h.session_id is null or h.session_id = v_sid then return; end if;
  if not exists (select 1 from auth.sessions s where s.id = h.session_id) then return; end if;
  if not pb_auth.one_at_a_time(v_uid) then return; end if;
  if h.last_at > now() - interval '5 minutes' then
    select d.kind into v_kind from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id;
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'locked',
      hint = coalesce(v_kind, 'phone') || '|' || greatest(1, ceil(extract(epoch from (h.last_at + interval '5 minutes' - now())))::integer) || '|0';
  elsif pb_auth.permit_open(v_uid) then
    select d.kind into v_kind from pb_auth.devices d where d.user_id = v_uid and d.device_id = h.device_id;
    raise exception using errcode = 'PT401', message = 'pb:signed_out', detail = 'locked', hint = coalesce(v_kind, 'phone') || '|0|1';
  end if;
end $function$;

-- edge functions call this with the caller's own token; the gate above runs first (PostgREST pre-request), so a
-- refused session gets the gate's answer (pb:signed_out + code_needed / locked / ended ...), a good one gets true.
create or replace function public.pb_session_ok() returns boolean
language sql stable set search_path = '' as $f$ select auth.uid() is not null $f$;
revoke all on function public.pb_session_ok() from public;
revoke all on function public.pb_session_ok() from anon;
grant execute on function public.pb_session_ok() to authenticated;
