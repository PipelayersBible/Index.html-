-- undo records_nov22 Phase B 03 (B9): drops the guards, the no-truncate and audit triggers on the 7 tables, puts back
-- ON DELETE CASCADE on report_photos -> reports, drops the two guard functions. Plain SQL, DO-block safe. Safe twice.
do $u$ declare t text; begin
  foreach t in array array['pb_daily.events', 'pb_daily.event_photos', 'pb_daily.report_photos', 'pb_daily.event_reviews',
                           'pb_prod.talks_given', 'pb_safety.open_permits', 'pb_tickets.photos'] loop
    execute format('drop trigger if exists zz_pb_audit on %s', t);
    execute format('drop trigger if exists %I on %s', case when t = 'pb_tickets.photos' then 'ticket_photos_no_truncate' else split_part(t, '.', 2) || '_no_truncate' end, t);
  end loop;
end $u$;
drop trigger if exists events_guard on pb_daily.events;
drop trigger if exists event_photos_permanent on pb_daily.event_photos;
drop trigger if exists event_photos_no_delete on pb_daily.event_photos;
drop trigger if exists report_photos_permanent on pb_daily.report_photos;
drop trigger if exists report_photos_no_delete on pb_daily.report_photos;
drop trigger if exists event_reviews_permanent on pb_daily.event_reviews;
drop trigger if exists event_reviews_no_delete on pb_daily.event_reviews;
drop trigger if exists talks_given_no_delete on pb_prod.talks_given;
drop trigger if exists open_permits_no_delete on pb_safety.open_permits;
drop trigger if exists ticket_photos_permanent on pb_tickets.photos;
drop trigger if exists ticket_photos_no_delete on pb_tickets.photos;
alter table pb_daily.report_photos drop constraint if exists report_photos_report_id_fkey;
alter table pb_daily.report_photos add constraint report_photos_report_id_fkey foreign key (report_id) references pb_daily.reports(id) on delete cascade;
drop function if exists pb_daily.events_guard();
drop function if exists pb_daily.record_delete_guard();
