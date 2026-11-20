-- locate811 #01 (Nov 20 2026): the server half of 811 Renew and History (feat_locrenew). STAGED, not applied.
-- The app (r17.10, _src/index.html "feat_locrenew") already has both; it shows Renew when a ticket comes with a
-- "renewals" number and History when it comes with "log_n" > 0, and it sends p_renewed_at with a renewal.
--
-- What this adds (additive; nothing is dropped, old calls keep working):
--   1. pb_prod.locates: renewed_at (the day 811 renewed it) and renewals (how many times).
--   2. pb_prod.locate_log: one permanent row per add, edit, renewal, close and reopen of a ticket (who, when, the
--      ticket as it was left, what changed with old and new values). Written by a trigger on pb_prod.locates, so every
--      way a ticket changes is recorded. Row security on, no policy, no grants: like every other pb_prod table it is
--      only reached through the functions below, which check the caller's company.
--   3. pb_prod.locate_json: + renewed_at, renewals, log_n (every list of tickets the app gets is built with it:
--      pb_prod_locates, pb_prod_locates_mine, pb_prod_job_detail, pb_prod_foreman_scope, pb_prod_locate_set).
--   4. public.pb_prod_locate_set with a 10th argument p_renewed_at. The 9-argument one stays (same grants) and now
--      hands over to it, so a save without a renewal is the same call as before. Two functions and no defaults, so
--      the API picks by the argument names sent (the pb_permit_backup 3/4-argument pattern of office3 #37).
--   5. public.pb_prod_locate_log(p_job_number, p_id): a ticket's history, newest first (50 at most, with the total).
-- A ticket's "expired" is a date passing, not a change anyone made, so it is not a history row.

begin;

alter table pb_prod.locates add column renewed_at date, add column renewals integer not null default 0;
alter table pb_prod.locates add constraint locates_renewed_check check (renewed_at is null or (renewed_at >= called_at and renewed_at <= expires_at));
alter table pb_prod.locates add constraint locates_renewals_check check (renewals >= 0);

create table pb_prod.locate_log (
  id bigint generated always as identity primary key,
  locate_id uuid not null references pb_prod.locates(id),
  company_id uuid not null references public.companies(id),
  job_key text not null,
  action text not null check (action in ('added', 'edited', 'renewed', 'closed', 'reopened', 'on_file')),
  by_user uuid,                       -- who (auth.uid() of the save); null for a change made outside the app
  at timestamptz not null default now(),
  version integer,                    -- the ticket's version after this change
  ticket_no text not null, called_at date not null, expires_at date not null, renewed_at date, closed boolean not null, -- the ticket as this change left it
  expires_was date,                   -- the expiry before this change (null on the first row)
  changes jsonb not null default '{}'::jsonb -- {"field": [old, new]} for ticket_no, called_at, expires_at, renewed_at, note
);
create index locate_log_locate_idx on pb_prod.locate_log (locate_id, id desc);
alter table pb_prod.locate_log enable row level security;
revoke all on table pb_prod.locate_log from public, anon, authenticated;

-- the tickets already on file get one "On file" row: the ticket as it was last saved, by whom and when
insert into pb_prod.locate_log (locate_id, company_id, job_key, action, by_user, at, version, ticket_no, called_at, expires_at, renewed_at, closed)
  select l.id, l.company_id, l.job_key, 'on_file', coalesce(l.updated_by, l.created_by), l.updated_at, l.version, l.ticket_no, l.called_at, l.expires_at, l.renewed_at, l.closed
  from pb_prod.locates l order by l.created_at;

-- history is permanent, and a change made outside the app shows in the admin log (as on the other history tables)
create trigger locate_log_locked before delete or update on pb_prod.locate_log for each row execute function pb_prod.versions_locked();
create trigger locate_log_no_truncate before truncate on pb_prod.locate_log for each statement execute function pb_prod.versions_locked();
create trigger zz_pb_audit after insert or delete or update on pb_prod.locate_log for each row execute function pb_audit.direct_write();

create or replace function pb_prod.locate_log_write()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_act text; v_ch jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_act := 'added';
  else
    if new.ticket_no is distinct from old.ticket_no then v_ch := v_ch || jsonb_build_object('ticket_no', jsonb_build_array(old.ticket_no, new.ticket_no)); end if;
    if new.called_at is distinct from old.called_at then v_ch := v_ch || jsonb_build_object('called_at', jsonb_build_array(old.called_at, new.called_at)); end if;
    if new.expires_at is distinct from old.expires_at then v_ch := v_ch || jsonb_build_object('expires_at', jsonb_build_array(old.expires_at, new.expires_at)); end if;
    if new.renewed_at is distinct from old.renewed_at then v_ch := v_ch || jsonb_build_object('renewed_at', jsonb_build_array(old.renewed_at, new.renewed_at)); end if;
    if new.note is distinct from old.note then v_ch := v_ch || jsonb_build_object('note', jsonb_build_array(old.note, new.note)); end if;
    v_act := case when new.closed and not old.closed then 'closed' when old.closed and not new.closed then 'reopened'
                  when new.renewals > old.renewals then 'renewed' when v_ch <> '{}'::jsonb then 'edited' end;
    if v_act is null then return null; end if; -- nothing a person would read as a change (the job number's spelling, the version)
  end if;
  insert into pb_prod.locate_log (locate_id, company_id, job_key, action, by_user, version, ticket_no, called_at, expires_at, renewed_at, closed, expires_was, changes)
    values (new.id, new.company_id, new.job_key, v_act, auth.uid(), new.version, new.ticket_no, new.called_at, new.expires_at, new.renewed_at, new.closed,
            case when tg_op = 'UPDATE' then old.expires_at end, v_ch);
  return null;
end $function$;
revoke all on function pb_prod.locate_log_write() from public, anon, authenticated;
create trigger locates_zz_log after insert or update on pb_prod.locates for each row execute function pb_prod.locate_log_write();

create or replace function pb_prod.locate_json(l pb_prod.locates)
 returns jsonb language sql stable set search_path to '' as $function$
  select jsonb_build_object('id', l.id, 'job_key', l.job_key, 'job_number', l.job_number, 'ticket_no', l.ticket_no,
    'called_at', l.called_at, 'expires_at', l.expires_at, 'note', l.note, 'closed', l.closed, 'closed_at', l.closed_at,
    'created_at', l.created_at, 'updated_at', l.updated_at, 'version', l.version,
    'by_name', pb_prod.member_name(l.company_id, coalesce(l.updated_by, l.created_by)),
    'renewed_at', l.renewed_at, 'renewals', l.renewals, /* feat_locrenew: the app shows Renew when "renewals" comes */
    'log_n', (select count(*) from pb_prod.locate_log g where g.locate_id = l.id)) /* and History when this is > 0 */
$function$;

create or replace function public.pb_prod_locate_set(p_job_number text, p_id uuid, p_ticket_no text, p_called_at date, p_expires_at date, p_note text, p_closed boolean, p_expect_version integer, p_expect_uid uuid, p_renewed_at date)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); v_job text := left(btrim(coalesce(p_job_number, '')), 60);
  cur pb_prod.locates; nw pb_prod.locates; v_no text; v_note text; v_n integer; v_closed boolean;
  v_ren date;                  -- the renewal day the ticket ends up with (p_renewed_at null: the one it has is kept)
  v_renewal boolean := false;  -- this save is a renewal: a renewal day later than the one on file
begin
  if v_uid is null then raise exception 'pb:signed_out'; end if;
  if p_expect_uid is null or v_uid <> p_expect_uid then raise exception 'pb:wrong_account'; end if;
  v_company := pb_prod.locate_company(v_uid, true);
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_id is null then raise exception 'pb:bad_request'; end if;
  v_no := left(btrim(regexp_replace(coalesce(p_ticket_no, ''), '\s+', ' ', 'g')), 40);
  if v_no = '' then raise exception 'pb:bad_ticket_no'; end if;
  if p_called_at is null or p_expires_at is null or p_called_at < current_date - 3650 or p_called_at > current_date + 30
     or p_expires_at < p_called_at then raise exception 'pb:bad_date'; end if;
  if p_renewed_at is not null and p_renewed_at > current_date + 1 then raise exception 'pb:bad_date'; end if; -- not in the future (+1: the server's day is UTC)
  v_note := nullif(left(btrim(regexp_replace(coalesce(p_note, ''), '\s+', ' ', 'g')), 300), '');
  perform pg_advisory_xact_lock(hashtextextended('pb_loc|' || v_company::text || '|' || v_key, 0));
  select * into cur from pb_prod.locates l where l.id = p_id for update;
  if found then
    if cur.company_id <> v_company then raise exception 'pb:not_found'; end if;
    if cur.job_key <> v_key then raise exception 'pb:bad_job'; end if;
    v_ren := coalesce(p_renewed_at, cur.renewed_at);
    v_renewal := p_renewed_at is not null and (cur.renewed_at is null or p_renewed_at > cur.renewed_at);
  else
    v_ren := p_renewed_at; v_renewal := p_renewed_at is not null; -- added and renewed on a phone before it had signal: one save
  end if;
  -- renewed on or after the call-in day and on or before the expiry; the expiry at most a year after the call-in or the renewal
  if v_ren is not null and (v_ren < p_called_at or p_expires_at < v_ren) then raise exception 'pb:bad_date'; end if;
  if p_expires_at > greatest(p_called_at, coalesce(v_ren, p_called_at)) + 365 then raise exception 'pb:bad_date'; end if;
  if cur.id is not null then
    v_closed := coalesce(p_closed, cur.closed);
    if not v_closed and cur.closed then -- a reopen counts against the open limit too
      select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.job_key = v_key and not l.closed;
      if v_n >= 40 then raise exception 'pb:quota'; end if;
    end if;
    if p_expect_version is distinct from cur.version
       and (v_no, p_called_at, p_expires_at, v_note, v_closed, v_ren) is distinct from (cur.ticket_no, cur.called_at, cur.expires_at, cur.note, cur.closed, cur.renewed_at) then
      return jsonb_build_object('ok', false, 'stale', true, 'code', 'pb:stale', 'locate', pb_prod.locate_json(cur), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
    end if;
    -- 811 renews a ticket only before it expires: a renewal dated after the expiry on file is a new ticket
    if v_renewal and p_renewed_at > cur.expires_at then raise exception 'pb:renew_late'; end if;
    update pb_prod.locates set ticket_no = v_no, called_at = p_called_at, expires_at = p_expires_at, note = v_note, job_number = v_job,
        renewed_at = v_ren, renewals = cur.renewals + case when v_renewal then 1 else 0 end,
        closed = v_closed, closed_at = case when v_closed and not cur.closed then now() when not v_closed then null else cur.closed_at end,
        closed_by = case when v_closed and not cur.closed then v_uid when not v_closed then null else cur.closed_by end,
        updated_by = v_uid, updated_at = now(), version = cur.version + 1
      where id = cur.id returning * into nw;
    if to_jsonb(nw) - '{version,updated_at,updated_by}'::text[] = to_jsonb(cur) - '{version,updated_at,updated_by}'::text[] then
      nw := cur; -- nothing changed: the row stays as it was (the update above, and its history row, are rolled back with the exception below)
      raise exception 'pb:no_change';
    end if;
    -- one ticket takes 60 changes a day (the history is permanent; this keeps a stuck or hostile phone from filling it)
    select count(*) into v_n from pb_prod.locate_log g where g.locate_id = cur.id and g.at > now() - interval '1 day';
    if v_n > 60 then raise exception 'pb:quota'; end if;
  else
    select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.created_at > now() - interval '1 day';
    if v_n >= 200 then raise exception 'pb:quota'; end if;
    select count(*) into v_n from pb_prod.locates l where l.company_id = v_company and l.job_key = v_key and not l.closed;
    if v_n >= 40 then raise exception 'pb:quota'; end if;
    if not exists (select 1 from pb_prod.job_info i where i.company_id = v_company and i.job_key = v_key)
       and not exists (select 1 from pb_prod.plans p where p.company_id = v_company and p.job_key = v_key)
       and not exists (select 1 from pb_prod.entries e where e.company_id = v_company and e.job_key = v_key)
       and not exists (select 1 from pb_mat.materials m where m.company_id = v_company and m.job_key = v_key) then raise exception 'pb:no_job'; end if;
    v_closed := coalesce(p_closed, false);
    insert into pb_prod.locates (id, company_id, job_key, job_number, ticket_no, called_at, expires_at, note, created_by, closed, closed_at, closed_by, renewed_at, renewals)
      values (p_id, v_company, v_key, v_job, v_no, p_called_at, p_expires_at, v_note, v_uid, v_closed, case when v_closed then now() end, case when v_closed then v_uid end,
              v_ren, case when v_ren is not null then 1 else 0 end)
      returning * into nw;
  end if;
  return jsonb_build_object('ok', true, 'locate', pb_prod.locate_json(nw), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
exception when raise_exception then
  if sqlerrm = 'pb:no_change' then
    return jsonb_build_object('ok', true, 'same', true, 'locate', pb_prod.locate_json(cur), 'locates', pb_prod.locates_json(v_company, v_key), 'server_at', now());
  end if;
  raise;
end $function$;
revoke all on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid, date) from public, anon;
grant execute on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid, date) to authenticated, service_role;

-- the 9-argument save (every save that isn't a renewal, and any phone still on an older build): the same rules, the
-- renewal day on file is kept. Same name, arguments and grants as before; only its body is now the hand-over.
create or replace function public.pb_prod_locate_set(p_job_number text, p_id uuid, p_ticket_no text, p_called_at date, p_expires_at date, p_note text, p_closed boolean, p_expect_version integer, p_expect_uid uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  return public.pb_prod_locate_set(p_job_number, p_id, p_ticket_no, p_called_at, p_expires_at, p_note, p_closed, p_expect_version, p_expect_uid, null::date);
end $function$;
revoke all on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid) from public, anon;
grant execute on function public.pb_prod_locate_set(text, uuid, text, date, date, text, boolean, integer, uuid) to authenticated, service_role;

create or replace function public.pb_prod_locate_log(p_job_number text, p_id uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_uid uuid := auth.uid(); v_company uuid; v_key text := pb_prod.job_key(p_job_number); l pb_prod.locates;
begin
  v_company := pb_prod.locate_company(v_uid, false); -- signed in; the company account, its managers, PMs and foremen (as pb_prod_locates)
  if v_key = '' then raise exception 'pb:bad_job'; end if;
  if p_id is null then raise exception 'pb:bad_request'; end if;
  select * into l from pb_prod.locates x where x.id = p_id;
  if not found or l.company_id <> v_company or l.job_key <> v_key then raise exception 'pb:not_found'; end if; -- another company's ticket reads the same as none
  return jsonb_build_object('ok', true, 'id', l.id, 'server_at', now(),
    'total', (select count(*) from pb_prod.locate_log g where g.locate_id = l.id),
    'log', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'action', g.action, 'at', g.at,
        'by_name', case when g.by_user is not null then pb_prod.member_name(g.company_id, g.by_user) end,
        'ticket_no', g.ticket_no, 'called_at', g.called_at, 'expires_at', g.expires_at, 'renewed_at', g.renewed_at, 'closed', g.closed,
        'expires_was', g.expires_was, 'changes', g.changes) order by g.id desc)
      from (select * from pb_prod.locate_log x where x.locate_id = l.id order by x.id desc limit 50) g), '[]'::jsonb));
end $function$;
revoke all on function public.pb_prod_locate_log(text, uuid) from public, anon;
grant execute on function public.pb_prod_locate_log(text, uuid) to authenticated, service_role;

commit;
