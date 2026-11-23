-- messaging_nov22 04 (Tommy, Nov 22 answer 49): message photos count in the plan's storage allowance, like run photos.
-- Replaces pb_billing.storage_room(uuid,text,integer): the same text, with 'msg-photos' added to the buckets whose bytes are
-- summed against pb_billing.storage_gb (10 GB base + 1 GB per extra person on a company plan). Refuses if the live text is
-- not the one read Nov 22 2026 (md5 9975ba51a21d2f2443b8d570e4b6d960); keeps it for the undo. Then public.pb_msg_photo_put_ok
-- drops 01's separate 2 GB ceiling (storage_room covers it now). Needs 01. Safe to run twice. Undo: undo/99_undo_04.sql.
create table if not exists pb_msg.fn_backup (sig text primary key, def text not null, md5 text not null, saved_at timestamptz not null default now());
alter table pb_msg.fn_backup enable row level security;
revoke all on table pb_msg.fn_backup from public;
revoke all on table pb_msg.fn_backup from anon, authenticated;
do $g$ declare v text := pg_get_functiondef('pb_billing.storage_room(uuid,text,integer)'::regprocedure); begin
  if md5(v) = '9975ba51a21d2f2443b8d570e4b6d960' then
    insert into pb_msg.fn_backup (sig, def, md5) values ('pb_billing.storage_room(uuid,text,integer)', v, md5(v)) on conflict (sig) do nothing;
  elsif exists (select 1 from pb_msg.fn_backup b where b.sig = 'pb_billing.storage_room(uuid,text,integer)') then
    null; -- this file ran before
  elsif current_setting('pb_msg.guard', true) = 'skip-local-test' then
    insert into pb_msg.fn_backup (sig, def, md5) values ('pb_billing.storage_room(uuid,text,integer)', v, md5(v)) on conflict (sig) do nothing;
  else
    raise exception 'pb_msg: pb_billing.storage_room changed on live since Nov 22 2026 (md5 %). Nothing was applied. Re-read it and rebase 04.', md5(v);
  end if;
end $g$;

CREATE OR REPLACE FUNCTION pb_billing.storage_room(p_user uuid, p_bucket text, p_cap integer)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare w record; L jsonb := pb_billing.plan_limits(); v_cap int; v_bytes numeric;
begin
  select * into w from pb_billing.ai_who(p_user);
  L := pb_billing.limits_of(w.company_id);
  v_cap := (L->(case when w.who = 'member' then 'member' when w.who is null then 'none' else w.who end)->>'photos_day')::int;
  if w.who in ('member', 'individual', 'beta') and p_bucket <> 'run-photos' then v_cap := p_cap; end if;  -- sealed runs, cut sheet sources: the policy's own cap
  if (select count(*) from storage.objects o where o.bucket_id = p_bucket and o.owner_id = p_user::text and o.created_at > now() - interval '1 day') >= least(p_cap, v_cap) then return false; end if;
  select coalesce(sum((o.metadata->>'size')::numeric), 0) into v_bytes from storage.objects o
    where o.bucket_id in ('run-photos', 'run-seals', 'cutsheet-sources', 'msg-photos')  -- messaging_nov22 04: + message photos
      and o.owner_id in (select p_user::text
                         union all select m.user_id::text from public.company_members m where m.company_id = w.company_id
                         union all select c.owner_user_id::text from public.companies c where c.id = w.company_id);
  return v_bytes < pb_billing.storage_gb(w.who, w.company_id) * 1073741824;
end $function$;

create or replace function public.pb_msg_photo_put_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path to '' as $f$
declare a text[] := string_to_array(coalesce(p_name, ''), '/'); v uuid := auth.uid(); c pb_msg.chats; ok boolean;
begin
  if v is null or array_length(a, 1) <> 4 or a[3] <> v::text or a[4] !~ '^[A-Za-z0-9_-]{8,64}-[1-6]\.jpg$' then return false; end if;
  begin select * into c from pb_msg.chats x where x.id = a[2]::uuid and x.company_id = a[1]::uuid; exception when others then return false; end;
  if c.id is null or pb_msg.can_post(c.id, v) is not null then return false; end if;
  -- the existing daily photo cap (pb_billing.plan_limits photos_day; 150/day for this bucket); since 04 the company's storage
  -- allowance (pb_billing.storage_room now counts msg-photos with run photos, sealed runs and cut sheet sources)
  if to_regprocedure('pb_billing.storage_room(uuid,text,integer)') is not null then
    execute 'select pb_billing.storage_room($1, ''msg-photos'', 150)' into ok using v;
    if not coalesce(ok, false) then return false; end if;
  end if;
  return true;
end $f$;
revoke all on function public.pb_msg_photo_put_ok(text) from public, anon;
grant execute on function public.pb_msg_photo_put_ok(text) to authenticated;
