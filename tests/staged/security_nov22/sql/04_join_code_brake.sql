-- security_nov22 04 (review finding 4, LOW): the wrong-join-code brake counts per caller, not app-wide.
-- Before: pb_onboard.braked() = 30 wrong codes in 10 minutes from ANYONE. pb_onboard_peek works signed out, so one
-- person typing junk could stop every company's crews joining by typed code for 10 minutes.
-- After: each wrong code is filed with a caller key: a signed-in caller by a hash of their login; a signed-out caller
-- (pb_onboard_peek) by a keyed hash of their IP (HMAC-SHA256 with a random key kept in the database, first 32 hex, the
-- way the website's trial form keys its limit; the IP itself is never stored); the crew-join edge function by the key it
-- sends in the x-pb-caller header (an HMAC of the person's IP made in the function: edge/crew-join). The brake is
--   30 wrong codes in 10 minutes from the same caller (the old number, now per caller), or
--   600 wrong codes in 10 minutes from everyone together (backstop against many IPs).
-- A caller with no key (no IP header reached the database) shares one bucket with the old limit of 30: never worse than
-- today. Rows are kept 1 day, as before. After applying, check that keys arrive (NOTES: "after 04").
-- Changes pb_onboard.braked() and pb_onboard.miss(); pb_onboard.find() and the callers are unchanged.
-- Run as postgres, in one transaction (the whole file). Safe to run twice. Undo: undo/99_undo_04.sql.

select pb_sec.guard('nov22_04', 'pb_onboard.braked()', '3e997a1374454a667b67997b7843a410');
select pb_sec.guard('nov22_04', 'pb_onboard.miss(text)', '6a784f2b22b27924a4661aeb14ab2cd6');

alter table pb_onboard.misses add column if not exists who text;
create index if not exists misses_who_at on pb_onboard.misses (who, at);

create table if not exists pb_onboard.caller_salt (id integer primary key default 1 check (id = 1), k bytea not null);
alter table pb_onboard.caller_salt enable row level security;
revoke all on table pb_onboard.caller_salt from public;
revoke all on table pb_onboard.caller_salt from anon, authenticated;
insert into pb_onboard.caller_salt (id, k) values (1, extensions.gen_random_bytes(32)) on conflict (id) do nothing;

-- the caller's key for the brake (null: none could be made)
create or replace function pb_onboard.caller() returns text
language plpgsql stable security definer set search_path = '' as $f$
declare h jsonb; c jsonb; ip text; v_role text; v_sub text;
begin
  begin c := nullif(current_setting('request.jwt.claims', true), '')::jsonb; exception when others then c := null; end;
  begin h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then h := null; end;
  v_role := coalesce(c->>'role', ''); v_sub := c->>'sub';
  if v_role = 'authenticated' and v_sub ~ '^[0-9a-f-]{36}$' then return 'u:' || left(md5(v_sub), 32); end if;
  if v_role = 'service_role' then  -- only the service role may name the caller (crew-join)
    ip := lower(btrim(coalesce(h->>'x-pb-caller', '')));
    return case when ip ~ '^[0-9a-f]{16,64}$' then 'e:' || left(ip, 32) else 'e:' end; -- 'e:' alone: crew-join before its update (one bucket, as today)
  end if;
  ip := coalesce(nullif(btrim(h->>'cf-connecting-ip'), ''),
                 nullif(btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), ''),
                 nullif(btrim(h->>'x-real-ip'), ''));
  if ip is null then return null; end if;
  return 'i:' || left(encode(extensions.hmac(convert_to(left(ip, 64), 'UTF8'), (select s.k from pb_onboard.caller_salt s where s.id = 1), 'sha256'), 'hex'), 32);
end $f$;
revoke all on function pb_onboard.caller() from public;
revoke all on function pb_onboard.caller() from anon, authenticated;

CREATE OR REPLACE FUNCTION pb_onboard.braked()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  -- security_nov22 04: per caller (30 in 10 minutes, the old number), plus a whole-app backstop (600 in 10 minutes)
  select (select count(*) from pb_onboard.misses m where m.at > now() - interval '10 minutes') >= 600
      or (select count(*) from pb_onboard.misses m where m.at > now() - interval '10 minutes' and m.who is not distinct from pb_onboard.caller()) >= 30
$function$;

CREATE OR REPLACE FUNCTION pb_onboard.miss(p_kind text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  delete from pb_onboard.misses where at < now() - interval '1 day';
  insert into pb_onboard.misses (kind, who) values (left(p_kind, 20), pb_onboard.caller()); -- security_nov22 04: who (a key, never the IP)
$function$;
