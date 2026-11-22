-- 20_precheck.sql: SELECT only. Before 21_load expect rows 3247, max_ord 3246, kb_n 3247, all_md5 f85b4d61df8e54abe6bd391f7317cbd7, old_rows_found 14, new_ids_there 0.
-- After: rows 3255, max_ord 3254, kb_n 3255, all_md5 eb8a4923f3ff410be0f19b7014e7c92d, new_ids_there 8.
select (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as rows,
       (select max(ord) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as max_ord,
       (select n from pb_ai.kb_versions where version = 'b3e91f6c47d2' and active) as kb_n,
       (select md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version = 'b3e91f6c47d2') as all_md5,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ($kb$business-pm-6$kb$, $kb$pipe-ductile-iron-5$kb$, $kb$quick-reference-3$kb$, $kb$quick-reference-4$kb$, $kb$quick-reference-5$kb$, $kb$quick-reference-8$kb$, $kb$quick-reference-12$kb$, $kb$testing-water-8$kb$, $kb$test-1$kb$, $kb$test-2$kb$, $kb$test-3$kb$, $kb$thr-1$kb$, $kb$mfr-dipra-test-1$kb$, $kb$mfr-dipra-thrust-1$kb$)) as old_rows_found,
       (select count(*) from pb_ai.kb_chunks where version = 'b3e91f6c47d2' and chunk->>'id' in ($kb$std-astm-mandrel-1$kb$, $kb$std-tenstates-watercover-1$kb$, $kb$spec-or-oha-watercover-1$kb$, $kb$spec-in-idem-watercover-1$kb$, $kb$spec-ut-ddw-watercover-1$kb$, $kb$spec-va-vdh-watercover-1$kb$, $kb$osha-pl-h2s-smell-1$kb$, $kb$mfr-dipra-thrust-2$kb$)) as new_ids_there;
