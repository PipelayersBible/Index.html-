-- sa_locatable_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 0, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('dig-co-locatable-1', 'dig-in-locatable-1', 'dig-wv-locatable-1', 'dig-ne-locatable-1', 'dig-mn-locatable-1', 'fed-phmsa-tracer-1')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
