-- 07_lib8_precheck.sql: SELECT only. Expect one row: ord 2971, lib field, text_md5 = 050fee8ec65b86586cddbdf5241cf210 (before 07) or 4ece7bdce9e350fe3d09da62dfbbff48 (after), rows 3236, active version b3e91f6c47d2.
select ord, lib, md5(chunk->>'text') as text_md5, (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows, (select version from pb_ai.kb_versions where active) as active_version
  from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' = 'osha-loi-trench-stacking-1';
