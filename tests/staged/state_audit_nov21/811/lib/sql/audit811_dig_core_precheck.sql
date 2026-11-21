-- audit811_dig_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 1, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('dig-mn-wait-1', 'dig-ia-wait-1', 'dig-in-wait-1', 'dig-sd-wait-1', 'dig-ok-wait-1', 'dig-sc-wait-1', 'dig-nv-holidays-1', 'dig-ut-holidays-1', 'dig-or-tickets-2')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('dig-or-tickets-1')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
