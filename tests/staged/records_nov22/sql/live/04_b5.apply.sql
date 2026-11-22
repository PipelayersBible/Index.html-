-- records_nov22 Phase B, 04 (B5): toolbox talks keep every version.
-- Before: pb_talk_give UPDATEs pb_prod.talks_given in place (version + 1); the earlier attendees / date / title are gone.
-- After: a trigger copies every saved row (insert and each update, with the server time and an md5 of the row) into
-- pb_prod.talk_versions, which nobody can change, delete or truncate. Keyed (talk, version, md5), so a console edit that
-- doesn't bump the version is still kept as its own row. The talks there now are copied in as their current version
-- (live Nov 22 2026: 0 rows). Not reachable from the API (RLS on, no policies, no grants); read later through
-- security-definer functions ("entered on" / version history in the app: follow-up, not here).
-- Independent of 01-03. Plain SQL, DO-block safe. Safe to run twice. Undo: 99_undo_04.sql (stops copying; the versions stay).
create table if not exists pb_prod.talk_versions (
  id         bigint generated always as identity primary key,
  talk_id    uuid not null,
  company_id uuid not null,
  version    integer not null,
  row_md5    text not null,
  row_data   jsonb not null,
  saved_at   timestamptz not null default now(),
  unique (talk_id, version, row_md5)
);
alter table pb_prod.talk_versions enable row level security;
revoke all on table pb_prod.talk_versions from public;
revoke all on table pb_prod.talk_versions from anon, authenticated;

create or replace function pb_prod.talk_version_keep() returns trigger
language plpgsql security definer set search_path to '' as $f$
begin
  insert into pb_prod.talk_versions (talk_id, company_id, version, row_md5, row_data)
    values (new.id, new.company_id, new.version, md5(to_jsonb(new)::text), to_jsonb(new))
    on conflict (talk_id, version, row_md5) do nothing;
  return null;
end $f$;
revoke all on function pb_prod.talk_version_keep() from public;
revoke all on function pb_prod.talk_version_keep() from anon, authenticated;

drop trigger if exists talks_given_versions on pb_prod.talks_given;
create trigger talks_given_versions after insert or update on pb_prod.talks_given for each row execute function pb_prod.talk_version_keep();
drop trigger if exists talk_versions_locked on pb_prod.talk_versions;
create trigger talk_versions_locked before update or delete on pb_prod.talk_versions for each row execute function pb_prod.versions_locked();
drop trigger if exists talk_versions_no_truncate on pb_prod.talk_versions;
create trigger talk_versions_no_truncate before truncate on pb_prod.talk_versions for each statement execute function pb_prod.versions_locked();
drop trigger if exists zz_pb_audit on pb_prod.talk_versions;
create trigger zz_pb_audit after insert or delete or update on pb_prod.talk_versions for each row execute function pb_audit.direct_write();

insert into pb_prod.talk_versions (talk_id, company_id, version, row_md5, row_data, saved_at)
  select tg.id, tg.company_id, tg.version, md5(to_jsonb(tg)::text), to_jsonb(tg), tg.updated_at from pb_prod.talks_given tg
  on conflict (talk_id, version, row_md5) do nothing;
