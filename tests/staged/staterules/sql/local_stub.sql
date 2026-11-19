-- local stand-ins for the live objects the migration uses (only for the throwaway local check)
create role anon; create role authenticated;
create schema auth; create schema pb_prod;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.companies (id uuid primary key, owner_user_id uuid);
create table public.company_members (company_id uuid, user_id uuid, role text);
create function pb_prod.managed_company(p uuid) returns uuid language sql stable as $$ select c.id from public.companies c where c.owner_user_id = p $$;
create function pb_prod.my_member(p uuid) returns table (company_id uuid, role text) language sql stable as $$ select m.company_id, m.role from public.company_members m where m.user_id = p $$;
create function pb_prod.job_key(p text) returns text language sql immutable set search_path to '' as $$ select left(lower(btrim(coalesce(p, ''))), 60) $$;
create function pb_prod.locate_company(p_uid uuid, p_write boolean) returns uuid language plpgsql stable security definer set search_path to '' as $$
declare v uuid; begin if p_uid is null then raise exception 'pb:signed_out'; end if; v := pb_prod.managed_company(p_uid); if v is not null then return v; end if;
  select x.company_id into v from pb_prod.my_member(p_uid) x where x.role in ('foreman', 'pm');
  if v is null then if exists (select 1 from pb_prod.my_member(p_uid)) then raise exception 'pb:foremen_only'; end if; raise exception 'pb:not_company_member'; end if; return v; end $$;
insert into public.companies values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', 'e03416b7-6086-40a5-8d42-9267b846fc26');
insert into public.company_members values ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '4fc9c8ae-2951-4c2b-8a8b-f5f09236a84e', 'foreman'), ('d01a4a5f-312a-418f-9172-ea9aec9784b5', '8cd34746-efb4-469c-b1d7-caa8709ba3e4', 'pipelayer');
