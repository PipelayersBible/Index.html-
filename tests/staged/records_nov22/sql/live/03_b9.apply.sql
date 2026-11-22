-- records_nov22 Phase B, 03 (B9): the 7 tables the r16.80 admin log missed get it, plus guards so their history can't
-- be changed quietly from the console / SQL editor / service key.
--   pb_daily.events         only the review fields may change (status, reviewed_at, reviewed_by, review_rev,
--                           changed_after_review) and superseded_at once (null -> a time); no delete
--   pb_daily.event_photos   insert only          pb_daily.report_photos  insert only; FK to reports no longer ON DELETE CASCADE
--   pb_daily.event_reviews  insert only          pb_tickets.photos       insert only
--   pb_prod.talks_given     no delete (updates are the app's edit path; 04 B5 keeps every version)
--   pb_safety.open_permits  no delete (updates are the app's open-save path) except the close-out drop (02 B3 sets
--                           pb.allow_record_delete = 'on' for that one statement)
--   all 7                   no TRUNCATE; zz_pb_audit (pb_audit.direct_write) like the other record tables
-- Read on live Nov 22 2026: none of the 7 had any of these triggers. App writers checked (exact SQL in the live functions):
-- pb_daily.events_store (INSERT events/event_photos/event_reviews; UPDATE events SET superseded_at WHERE superseded_at IS NULL),
-- pb_daily_event_review (UPDATE events SET status, reviewed_at, reviewed_by, review_rev, changed_after_review; INSERT event_reviews),
-- pb_daily_event_photo_put / pb_daily_report_photo_put / pb_ticket_save (INSERT ... ON CONFLICT DO NOTHING),
-- pb_talk_give (INSERT / UPDATE talks_given), pb_permit_open_put (INSERT ... ON CONFLICT DO UPDATE open_permits),
-- pb_safety.drop_open_on_close (DELETE open_permits). No other function, cron job or edge function deletes or updates them.
-- A future owner flow that must delete (delete-job) sets pb.allow_record_delete = 'on' for its own transaction, like
-- pb.allow_permit_delete today. Error raised: 'pb:history_is_permanent' (the app never sees it: no app path is refused).
-- Needs 02 (refuses otherwise). Plain SQL, DO-block safe. Safe to run twice. Undo: 99_undo_03.sql.
do $c$ begin
  if position('pb.allow_record_delete' in pg_get_functiondef('pb_safety.drop_open_on_close()'::regprocedure)) = 0 then
    raise exception 'records B9: apply 02_b3.apply.sql first (the close-out drop of open permits must set pb.allow_record_delete). Nothing was applied.';
  end if;
end $c$;

create or replace function pb_daily.record_delete_guard() returns trigger
language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pb.allow_record_delete', true), '') = 'on' then return old; end if;
  raise exception 'pb:history_is_permanent';
end $f$;

create or replace function pb_daily.events_guard() returns trigger
language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('pb.allow_record_delete', true), '') = 'on' then return old; end if;
    raise exception 'pb:history_is_permanent';
  end if;
  if (new.id, new.company_id, new.job_key, new.job_number, new.report_id, new.client_event_id, new.work_date, new.kind, new.reason, new.detail,
      new.hours, new.crew_size, new.equipment, new.photo_count, new.photos_signed, new.fp, new.same_as_prev, new.created_by, new.foreman_name, new.created_at)
     is distinct from
     (old.id, old.company_id, old.job_key, old.job_number, old.report_id, old.client_event_id, old.work_date, old.kind, old.reason, old.detail,
      old.hours, old.crew_size, old.equipment, old.photo_count, old.photos_signed, old.fp, old.same_as_prev, old.created_by, old.foreman_name, old.created_at) then
    raise exception 'pb:history_is_permanent';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then raise exception 'pb:history_is_permanent'; end if;
  return new;
end $f$;

revoke all on function pb_daily.record_delete_guard() from public;
revoke all on function pb_daily.record_delete_guard() from anon, authenticated;
revoke all on function pb_daily.events_guard() from public;
revoke all on function pb_daily.events_guard() from anon, authenticated;

drop trigger if exists events_guard on pb_daily.events;
create trigger events_guard before update or delete on pb_daily.events for each row execute function pb_daily.events_guard();

drop trigger if exists event_photos_permanent on pb_daily.event_photos;
create trigger event_photos_permanent before update on pb_daily.event_photos for each row execute function pb_daily.permanent();
drop trigger if exists event_photos_no_delete on pb_daily.event_photos;
create trigger event_photos_no_delete before delete on pb_daily.event_photos for each row execute function pb_daily.record_delete_guard();

drop trigger if exists report_photos_permanent on pb_daily.report_photos;
create trigger report_photos_permanent before update on pb_daily.report_photos for each row execute function pb_daily.permanent();
drop trigger if exists report_photos_no_delete on pb_daily.report_photos;
create trigger report_photos_no_delete before delete on pb_daily.report_photos for each row execute function pb_daily.record_delete_guard();

drop trigger if exists event_reviews_permanent on pb_daily.event_reviews;
create trigger event_reviews_permanent before update on pb_daily.event_reviews for each row execute function pb_daily.permanent();
drop trigger if exists event_reviews_no_delete on pb_daily.event_reviews;
create trigger event_reviews_no_delete before delete on pb_daily.event_reviews for each row execute function pb_daily.record_delete_guard();

drop trigger if exists talks_given_no_delete on pb_prod.talks_given;
create trigger talks_given_no_delete before delete on pb_prod.talks_given for each row execute function pb_daily.record_delete_guard();

drop trigger if exists open_permits_no_delete on pb_safety.open_permits;
create trigger open_permits_no_delete before delete on pb_safety.open_permits for each row execute function pb_daily.record_delete_guard();

drop trigger if exists ticket_photos_permanent on pb_tickets.photos;
create trigger ticket_photos_permanent before update on pb_tickets.photos for each row execute function pb_daily.permanent();
drop trigger if exists ticket_photos_no_delete on pb_tickets.photos;
create trigger ticket_photos_no_delete before delete on pb_tickets.photos for each row execute function pb_daily.record_delete_guard();

-- a report deleted in the console no longer takes its photos with it (was ON DELETE CASCADE): the delete is refused
alter table pb_daily.report_photos drop constraint if exists report_photos_report_id_fkey;
alter table pb_daily.report_photos add constraint report_photos_report_id_fkey foreign key (report_id) references pb_daily.reports(id) not valid;
alter table pb_daily.report_photos validate constraint report_photos_report_id_fkey;

-- no TRUNCATE, and the admin log (every write not from a signed-in app user or the app's scheduled jobs)
do $d$ declare t text; n text; begin
  foreach t in array array['pb_daily.events', 'pb_daily.event_photos', 'pb_daily.report_photos', 'pb_daily.event_reviews',
                           'pb_prod.talks_given', 'pb_safety.open_permits', 'pb_tickets.photos'] loop
    n := split_part(t, '.', 2) || '_no_truncate';
    if t = 'pb_tickets.photos' then n := 'ticket_photos_no_truncate'; end if;
    execute format('drop trigger if exists %I on %s', n, t);
    execute format('create trigger %I before truncate on %s for each statement execute function pb_daily.record_delete_guard()', n, t);
    execute format('drop trigger if exists zz_pb_audit on %s', t);
    execute format('create trigger zz_pb_audit after insert or delete or update on %s for each row execute function pb_audit.direct_write()', t);
  end loop;
end $d$;
