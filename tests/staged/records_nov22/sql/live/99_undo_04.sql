-- undo records_nov22 Phase B 04 (B5): stops copying talk versions. pb_prod.talk_versions and the versions already kept
-- STAY (they are records; still locked against change). To remove them entirely (only if they were never relied on):
--   drop table pb_prod.talk_versions; drop function pb_prod.talk_version_keep();
-- Plain SQL, DO-block safe. Safe twice.
drop trigger if exists talks_given_versions on pb_prod.talks_given;
