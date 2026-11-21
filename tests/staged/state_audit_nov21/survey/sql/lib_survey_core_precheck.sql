-- lib_survey_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 0, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('fed-ngs-survey-foot-1', 'fed-ngs-vertical-datum-1', 'spec-wa-dot-survey-stakes-1', 'spec-nc-dot-survey-stakes-1', 'spec-fl-wasd-datum-1')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
