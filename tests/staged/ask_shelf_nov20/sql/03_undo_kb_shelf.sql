-- 03_undo_kb_shelf.sql (ask_shelf_nov20). NOT APPLIED. Takes 01_kb_shelf.sql back out.
-- Safe at any time: a build that searches the shelf treats a missing function as "no shelf excerpts" and answers from
-- the core library (shelf.ts). The shelf ROWS are dropped with the table; they are not lost: every batch's .jsonl file
-- is the source and its sql/<name>_shelf_NN.sql can be run again after 01.
begin;
drop function if exists public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[]);
drop function if exists pb_ai.kb_shelf_excerpt(text, tsquery[], integer);
drop function if exists public.pb_ai_kb_shelf_search(text[], text, integer, text[]);   -- the earlier draft's, if present
drop table if exists pb_ai.kb_shelf;
commit;
