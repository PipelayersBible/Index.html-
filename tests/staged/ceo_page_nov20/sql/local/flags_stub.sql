-- Local only: pb_auth.flags in the shape staged in tests/staged/one_device_nov20/sql/01_one_device.sql (lines 74-89), with 3 rows.
create schema if not exists pb_auth;
create table pb_auth.flags (id bigserial primary key, at timestamptz not null default now(), user_id uuid not null, company_id uuid,
  kind text not null check (kind in ('tried_in_use', 'tried_full', 'took_place', 'far_apart', 'back_and_forth')),
  kind_a text, kind_b text, miles integer, minutes integer, n integer not null default 1, detail jsonb, dedupe text not null, unique (user_id, kind, dedupe));
insert into auth.users (id, email, created_at) values ('99999999-0000-4000-8000-000000000009', 'sharer@x.test', now());
insert into public.companies (id, name, owner_user_id, status, plan, created_at) values ('99999999-0000-4000-8000-00000000000a', 'Share Co', '99999999-0000-4000-8000-000000000009', 'active', 'trial', now());
insert into pb_auth.flags (user_id, company_id, kind, dedupe, at) values
  ('99999999-0000-4000-8000-000000000009', '99999999-0000-4000-8000-00000000000a', 'tried_in_use', 'a', now() - interval '1 day'),
  ('99999999-0000-4000-8000-000000000009', '99999999-0000-4000-8000-00000000000a', 'far_apart', 'b', now() - interval '2 days'),
  ('99999999-0000-4000-8000-000000000009', '99999999-0000-4000-8000-00000000000a', 'tried_full', 'c', now() - interval '20 days');
