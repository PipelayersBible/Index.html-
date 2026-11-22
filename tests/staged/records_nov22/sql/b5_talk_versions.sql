-- records_nov22 B5: toolbox talks keep every version. pb_talk_give updates pb_prod.talks_given in place (version + 1) and
-- the earlier attendees / date / title are gone. A trigger now copies each version (the row as saved, with the server
-- time) into pb_prod.talk_versions, which nobody can change or delete. The rows there now are copied in as their
-- current version. "Entered on <date>" (a talk entered more than a day after its date) needs created_at in the app's
-- talk list: app follow-up (pb_prod.talk_json / the daily PDF), not in this file. Undo: b5_talk_versions_undo.sql.
begin;
create table if not exists pb_prod.talk_versions (
  id bigint generated always as identity primary key,
  talk_id uuid not null, company_id uuid not null, version integer not null, row_data jsonb not null,
  saved_at timestamptz not null default now(), unique (talk_id, version));
alter table pb_prod.talk_versions enable row level security; -- no policies: read through security-definer functions only
revoke all on pb_prod.talk_versions from anon, authenticated;
create or replace function pb_prod.talk_version_keep() returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  insert into pb_prod.talk_versions (talk_id, company_id, version, row_data) values (new.id, new.company_id, new.version, to_jsonb(new))
    on conflict (talk_id, version) do nothing;
  return null;
end $f$;
drop trigger if exists talks_given_versions on pb_prod.talks_given;
create trigger talks_given_versions after insert or update on pb_prod.talks_given for each row execute function pb_prod.talk_version_keep();
drop trigger if exists talk_versions_locked on pb_prod.talk_versions;
create trigger talk_versions_locked before update or delete on pb_prod.talk_versions for each row execute function pb_prod.versions_locked();
drop trigger if exists talk_versions_no_truncate on pb_prod.talk_versions;
create trigger talk_versions_no_truncate before truncate on pb_prod.talk_versions for each statement execute function pb_prod.versions_locked();
insert into pb_prod.talk_versions (talk_id, company_id, version, row_data, saved_at)
  select t.id, t.company_id, t.version, to_jsonb(t), t.updated_at from pb_prod.talks_given t on conflict (talk_id, version) do nothing;
commit;
