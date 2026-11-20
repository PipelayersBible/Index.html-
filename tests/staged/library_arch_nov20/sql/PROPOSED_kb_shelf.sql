-- PROPOSED_kb_shelf.sql (library_arch_nov20, 2026-11-20). NOT APPLIED. Design: LIBRARY_RULES.md section 1.
-- The "shelf": the deep Ask library (regulation text, MUTCD, state supplements, spec books, handbooks) that is NOT loaded into
-- each Ask worker. It is searched here, in Postgres, the same way company documents already are (public.pb_docs_search).
-- Adding this table changes nothing for live Ask: the current build never reads it. Tested on a local Postgres 16
-- (tools/pgtest.sh) with 85,000 rows.
begin;

create table if not exists pb_ai.kb_shelf (
  id       text primary key,
  chunk    jsonb not null,           -- the chunk exactly as lib_kb.py writes it (LIBRARY_RULES.md section 2)
  state    text generated always as (upper(coalesce(chunk->>'state', 'US'))) stored,      -- 'US', 'TX', 'KS,MO'
  coll     text generated always as (split_part(id, '-', 1)) stored,                      -- dig, osha, sp, mutcd, tc, spec, ...
  tsv      tsvector generated always as (
             setweight(to_tsvector('english', coalesce(chunk->>'title', '')), 'A') ||
             setweight(to_tsvector('english', coalesce(chunk->>'topic', '')), 'B') ||
             setweight(to_tsvector('english', coalesce(chunk->>'text',  '')), 'D')) stored,
  added_at timestamptz not null default now(),
  constraint kb_shelf_shape check (chunk->>'id' = id and length(chunk->>'text') between 200 and 1800 and chunk ? 'title' and chunk ? 'source'
                                   and chunk->>'state' ~ '^(US|[A-Z]{2}(,[A-Z]{2}){0,3})$')
);
create index if not exists kb_shelf_tsv on pb_ai.kb_shelf using gin (tsv);
create index if not exists kb_shelf_state on pb_ai.kb_shelf (state);
alter table pb_ai.kb_shelf enable row level security;      -- no policies: only the functions below (and the service role) read it
revoke all on pb_ai.kb_shelf from public, anon, authenticated;

-- Search. p_terms = the word groups Ask already builds for document search (retrieval.ts queryGroups: each typed word with its
-- synonyms, "word word ..."). p_state = the job's state code or null. A state's chunks are returned only for that state;
-- 'US' chunks always. Returns the best p_k (at most 12), at most 2 per title.
create or replace function public.pb_ai_kb_shelf_search(p_terms text[], p_state text default null, p_k integer default 6, p_coll text[] default null)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_q tsquery; v_txt text; v jsonb; v_st text := nullif(upper(btrim(coalesce(p_state, ''))), '');
begin
  -- words are [a-z0-9] only (checked here), so the tsquery text cannot be injected
  select string_agg('(' || g || ')', ' | ') into v_txt from (
    select string_agg(w || ':*', ' | ') g from (select unnest(string_to_array(lower(t), ' ')) w, ord from unnest(p_terms[1:16]) with ordinality u(t, ord)) x
    where w ~ '^[a-z0-9]{2,30}$' group by ord) s;
  if v_txt is null then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb); end if;
  v_q := to_tsquery('english', v_txt);
  if v_q is null or numnode(v_q) = 0 then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb); end if;
  with hit as (
    select s.id, s.chunk, s.state, s.coll,
           ts_rank_cd('{0.1, 0.2, 0.6, 1.0}', s.tsv, v_q, 32)
             * (case when v_st is not null and s.state <> 'US' then 1.25 else 1 end)                 -- the job state's own chunk first
             * (case s.chunk->>'confidence' when 'low' then 0.8 else 1 end) as score
      from pb_ai.kb_shelf s
     where s.tsv @@ v_q
       and (s.state = 'US' or (v_st is not null and v_st = any (string_to_array(s.state, ','))))
       and (p_coll is null or s.coll = any (p_coll))
  ), top as (select * from hit order by score desc, id limit 60),
  capped as (select t.*, row_number() over (partition by t.chunk->>'title' order by t.score desc, t.id) as rn from top t)
  select jsonb_build_object('ok', true, 'rows', coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'state', x.state, 'title', x.chunk->>'title', 'topic', x.chunk->>'topic', 'text', x.chunk->>'text',
           'source', x.chunk->>'source', 'url', x.chunk->>'url', 'conf', x.chunk->>'confidence', 'kind', x.chunk->>'kind',
           'edition', x.chunk->>'edition', 'checked', x.chunk->>'checked', 'score', round(x.score::numeric, 4)) order by x.score desc, x.id), '[]'::jsonb))
    into v from (select * from capped where rn <= 2 order by score desc, id limit least(greatest(coalesce(p_k, 6), 1), 12)) x;
  return v;
end $function$;
revoke all on function public.pb_ai_kb_shelf_search(text[], text, integer, text[]) from public, anon, authenticated;
grant execute on function public.pb_ai_kb_shelf_search(text[], text, integer, text[]) to service_role;

commit;
