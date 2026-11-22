-- consolidate_core_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = 6, and rows = max_ord + 1.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('osha-pl-trench-states-1', 'osha-pl-trench-states-2', 'sp-wa-trench-1', 'sp-ca-trench-1', 'sp-ca-trench-other-1', 'sp-mn-confined-1', 'dig-ca-penalties-2', 'fed-811-wait-1', 'fed-811-ticketlife-1', 'fed-811-zone-1')) as already_there,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ('plan-trench-depth-1', 'sp-wa-trench-1', 'sp-ca-trench-1', 'sp-ca-trench-other-1', 'sp-mn-trench-1', 'dig-ca-penalties-1')) as to_replace_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord;
