-- 02_ask_kb_topic_tags_OPTIONAL.sql (2026-11-20). NOT APPLIED. Only needed together with the state-filter change proposed in
-- NOTES.md (filter on title + topic instead of title + source + first 300 characters). These 15 California-only chunks
-- name California only in their source line today; this puts it in the topic. Harmless on its own. Expect: update 15.
begin;
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{topic}', to_jsonb((chunk->>'topic') || ' (California)'))
 where version = 'b3e91f6c47d2' and chunk->>'id' in ('gb-1', 'gb-2', 'gb-3', 'gb-4', 'gb-5', 'gb-6', 'gb-7', 'gb-8', 'cal-1', 'cal-2', 'cal-3', 'rsf-1', 'rsf-2', 'loc-6', 'loc-10') and strpos(chunk->>'topic', 'California') = 0;
update pb_ai.kb_index set parts = 32 where version = 'b3e91f6c47d2';
commit;
