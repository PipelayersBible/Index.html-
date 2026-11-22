-- records_nov22 B9: the tables the r16.80 admin log missed, and guards so their history can't be changed quietly.
-- Verified read-only Nov 21: none of these has zz_pb_audit or a permanent/no-change trigger; pb_daily.report_photos is
-- ON DELETE CASCADE from pb_daily.reports (deleting a report in the console silently takes its photos).
-- App code that writes them (checked): pb_daily.events_store (UPDATE events SET superseded_at), pb_daily_event_review
-- (UPDATE events SET status/reviewed_*/review_rev/changed_after_review), pb_talk_give (UPDATE talks_given), pb_permit_open_put
-- (UPDATE open_permits), pb_safety.drop_open_on_close (DELETE open_permits; needs b3 first, which sets pb.allow_record_delete).
-- Nothing in the app deletes or updates event_photos, report_photos, event_reviews or pb_tickets.photos.
-- A future owner flow that must delete (delete-job) sets pb.allow_record_delete = 'on' for its own transaction, like
-- pb.allow_permit_delete today. APPLY ORDER: b3 first. Undo: b9_audit_guards_undo.sql.
begin;
create or replace function pb_daily.record_delete_guard() returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pb.allow_record_delete', true), '') = 'on' then return old; end if;
  raise exception 'pb:history_is_permanent';
end $f$;
-- events: the review fields may change, the event itself may not
create or replace function pb_daily.events_guard() returns trigger language plpgsql set search_path to '' as $f$
begin
  if tg_op = 'DELETE' then
    if coalesce(current_setting('pb.allow_record_delete', true), '') = 'on' then return old; end if;
    raise exception 'pb:history_is_permanent';
  end if;
  if (new.id, new.company_id, new.job_key, new.job_number, new.report_id, new.client_event_id, new.work_date, new.kind, new.reason, new.detail, new.hours, new.crew_size,
      new.equipment, new.photo_count, new.photos_signed, new.fp, new.same_as_prev, new.created_by, new.foreman_name, new.created_at)
     is distinct from
     (old.id, old.company_id, old.job_key, old.job_number, old.report_id, old.client_event_id, old.work_date, old.kind, old.reason, old.detail, old.hours, old.crew_size,
      old.equipment, old.photo_count, old.photos_signed, old.fp, old.same_as_prev, old.created_by, old.foreman_name, old.created_at) then
    raise exception 'pb:history_is_permanent';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then raise exception 'pb:history_is_permanent'; end if;
  return new;
end $f$;
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
alter table pb_daily.report_photos drop constraint report_photos_report_id_fkey,
  add constraint report_photos_report_id_fkey foreign key (report_id) references pb_daily.reports(id); -- was ON DELETE CASCADE
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
-- the admin log: every write that doesn't come from a signed-in app user or the app's scheduled jobs
do $d$ declare t text; begin
  foreach t in array array['pb_daily.events', 'pb_daily.event_photos', 'pb_daily.report_photos', 'pb_daily.event_reviews', 'pb_prod.talks_given', 'pb_safety.open_permits', 'pb_tickets.photos'] loop
    execute format('drop trigger if exists zz_pb_audit on %s', t);
    execute format('create trigger zz_pb_audit after insert or delete or update on %s for each row execute function pb_audit.direct_write()', t);
  end loop;
end $d$;
commit;
