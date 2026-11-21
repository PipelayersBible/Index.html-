-- lib_safety_states_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 0, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('sp-md-report-1', 'sp-mn-report-1', 'sp-nv-report-1', 'sp-sc-report-1', 'sp-ia-report-1', 'sp-ca-permit-341-1', 'sp-ca-meetings-1', 'sp-wa-meetings-1', 'sp-wa-firstaid-1', 'sp-ca-firstaid-1', 'sp-ca-confined-2026-1', 'sp-mi-confined-2', 'sp-in-trench-1', 'sp-md-trench-1')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
