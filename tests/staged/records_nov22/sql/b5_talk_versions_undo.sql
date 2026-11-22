-- undo records_nov22 B5 (stops copying; the table and the versions already kept stay — they are records)
begin;
drop trigger if exists talks_given_versions on pb_prod.talks_given;
commit;
