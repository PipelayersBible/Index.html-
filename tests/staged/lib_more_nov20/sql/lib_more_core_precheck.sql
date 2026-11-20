-- lib_more_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 0, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('fed-fmcsa-cdl-classes-1', 'fed-fmcsa-usdot-number-1', 'fed-fmcsa-medical-card-1', 'fed-fmcsa-eld-exempt-1', 'fed-fmcsa-annual-inspection-1', 'fed-fmcsa-cargo-check-1', 'fed-fhwa-size-weight-1', 'spec-fl-dep-main-disinfection-1')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
