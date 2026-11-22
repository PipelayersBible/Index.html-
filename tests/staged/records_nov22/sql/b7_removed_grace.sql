-- records_nov22 B7: a crew member removed from the company still gets his runs from BEFORE the removal to the company,
-- for 14 days. Today pb_prod_run_record_put refuses with pb:not_company_member the moment the member row is gone, so a
-- run locked in a dead zone the day he was let go never reaches the company.
-- 1) pb_prod.member_removals: one row per removal (company_members has no history; the row is deleted on removal).
-- 2) pb_prod_run_record_put: no company now -> the company he was removed from in the last 14 days, only for a run
--    locked before the removal and only when the phone says that company (p_access_company).
-- APP follow-up (not in r17.15 PHASE A): pb_prod_access must say {grace_company_id, grace_until} and pbRrSend must use it
-- (today the phone stops trying when member = false). Same idea for daily/site-log puts later.
-- Needs sql/_patchfn.sql. Undo: b7_removed_grace_undo.sql.
begin;
create table if not exists pb_prod.member_removals (
  id bigint generated always as identity primary key, company_id uuid not null, user_id uuid not null, role text,
  removed_at timestamptz not null default now());
create index if not exists member_removals_user on pb_prod.member_removals (user_id, removed_at desc);
alter table pb_prod.member_removals enable row level security;
revoke all on pb_prod.member_removals from anon, authenticated;
create or replace function pb_prod.member_removed_log() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  begin insert into pb_prod.member_removals (company_id, user_id, role) values (old.company_id, old.user_id, old.role);
  exception when others then raise log 'pb_prod.member_removed_log: %', sqlerrm; end;
  return null;
end $f$;
drop trigger if exists company_members_removed_log on public.company_members;
create trigger company_members_removed_log after delete on public.company_members for each row execute function pb_prod.member_removed_log();
select pb_stage.patch_fn('public.pb_prod_run_record_put(text,jsonb,uuid,uuid)'::regprocedure,
$o$  v_company := pb_prod.my_company(v_uid);
  if v_company is null then raise exception 'pb:not_company_member'; end if;$o$,
$n$  v_company := pb_prod.my_company(v_uid);
  if v_company is null then -- records_nov22 B7: a run locked before he was removed still goes, for 14 days
    begin v_lock := (p_record->>'lockTime')::timestamptz; exception when others then v_lock := null; end;
    select m.company_id into v_company from pb_prod.member_removals m
      where m.user_id = v_uid and m.company_id = p_access_company and m.removed_at > now() - interval '14 days' and v_lock is not null and v_lock < m.removed_at
      order by m.removed_at desc limit 1;
  end if;
  if v_company is null then raise exception 'pb:not_company_member'; end if;$n$);
commit;
