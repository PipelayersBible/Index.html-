-- messaging_nov22 undo 04: the exact live text of pb_billing.storage_room back, and 01's photo check (with its 2 GB ceiling).
begin;
do $u$ declare d text; begin
  select b.def into d from pb_msg.fn_backup b where b.sig = 'pb_billing.storage_room(uuid,text,integer)';
  if d is null then raise notice 'nothing to undo (04 was not applied)'; return; end if;
  execute d;
  delete from pb_msg.fn_backup where sig = 'pb_billing.storage_room(uuid,text,integer)';
end $u$;
create or replace function public.pb_msg_photo_put_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path to '' as $f$
declare a text[] := string_to_array(coalesce(p_name, ''), '/'); v uuid := auth.uid(); c pb_msg.chats; ok boolean;
begin
  if v is null or array_length(a, 1) <> 4 or a[3] <> v::text or a[4] !~ '^[A-Za-z0-9_-]{8,64}-[1-6]\.jpg$' then return false; end if;
  begin select * into c from pb_msg.chats x where x.id = a[2]::uuid and x.company_id = a[1]::uuid; exception when others then return false; end;
  if c.id is null or pb_msg.can_post(c.id, v) is not null then return false; end if;
  -- the existing daily photo cap (pb_billing.plan_limits photos_day; 150/day for this bucket) and a 2 GB per company ceiling
  if to_regprocedure('pb_billing.storage_room(uuid,text,integer)') is not null then
    execute 'select pb_billing.storage_room($1, ''msg-photos'', 150)' into ok using v;
    if not coalesce(ok, false) then return false; end if;
  end if;
  return (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o where o.bucket_id = 'msg-photos' and o.name like c.company_id::text || '/%') < 2147483648;
end $f$;
revoke all on function public.pb_msg_photo_put_ok(text) from public, anon;
grant execute on function public.pb_msg_photo_put_ok(text) to authenticated;
commit;
