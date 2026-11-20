-- 01_kb_shelf.sql (ask_shelf_nov20, 2026-11-20). NOT APPLIED. Replaces library_arch_nov20/sql/PROPOSED_kb_shelf.sql.
-- The "shelf": the deep Ask library that is NOT loaded into each Ask worker (LIBRARY_RULES.md section 1). It is searched
-- here, in Postgres, the way company documents are (public.pb_docs_search): a tsvector column, a GIN index, ts_rank_cd.
-- Adding this changes nothing for the live Ask build: it never reads this table and never calls this function.
--
-- Loading: lib_kb.py's shelf SQL (sql/<name>_shelf_NN.sql) targets this table as it is:
--     insert into pb_ai.kb_shelf (id, chunk) ... on conflict (id) do update set chunk = excluded.chunk
-- Every other column is worked out from the chunk, so a load is one insert and can be run twice.
--
-- Who can call the search: only the Ask edge function. It calls the database with the service-role key (index.ts:85,
-- `admin`), the same way it loads the core library (pb_ai_kb_boot / pb_ai_kb_page: SECURITY DEFINER, search_path '',
-- execute granted to service_role only). Signed-in users, anon and public get nothing: no table rights, no execute.
begin;

-- guard: the earlier draft (library_arch_nov20/sql/PROPOSED_kb_shelf.sql) made a table of the same name without two of
-- the columns below. If that one is here, stop: run 03_undo_kb_shelf.sql (or drop the draft's table) first.
do $g$ begin
  if to_regclass('pb_ai.kb_shelf') is not null and not exists (select 1 from pg_catalog.pg_attribute a
       where a.attrelid = to_regclass('pb_ai.kb_shelf') and a.attname = 'tsv_t' and not a.attisdropped) then
    raise exception 'pb_ai.kb_shelf exists in the older draft shape: run 03_undo_kb_shelf.sql first, then this file';
  end if;
end $g$;
drop function if exists public.pb_ai_kb_shelf_search(text[], text, integer, text[]);   -- the draft's search function, if it was ever made

create table if not exists pb_ai.kb_shelf (
  id       text primary key,
  chunk    jsonb not null,           -- the chunk exactly as lib_kb.py writes it (LIBRARY_RULES.md section 2)
  state    text   generated always as (upper(coalesce(chunk->>'state', 'US'))) stored,                         -- 'US', 'TX', 'KS,MO'
  states   text[] generated always as (string_to_array(upper(coalesce(chunk->>'state', 'US')), ',')) stored,   -- {US}, {TX}, {KS,MO}
  coll     text   generated always as (split_part(id, '-', 1)) stored,                                         -- dig, osha, sp, mutcd, tc, spec, ...
  tsv      tsvector generated always as (
             setweight(to_tsvector('english', coalesce(chunk->>'title', '')), 'A') ||
             setweight(to_tsvector('english', coalesce(chunk->>'topic', '')), 'B') ||
             setweight(to_tsvector('english', coalesce(chunk->>'text',  '')), 'D')) stored,
  tsv_t    tsvector generated always as (to_tsvector('english', coalesce(chunk->>'title', ''))) stored,        -- title only: the title boost
  added_at timestamptz not null default now(),
  constraint kb_shelf_shape check (chunk->>'id' = id and length(chunk->>'text') between 200 and 1800
                                   and length(coalesce(chunk->>'title', '')) between 1 and 160 and chunk ? 'source'
                                   and chunk->>'state' ~ '^(US|[A-Z]{2}(,[A-Z]{2}){0,3})$')
);
create index if not exists kb_shelf_tsv on pb_ai.kb_shelf using gin (tsv);
create index if not exists kb_shelf_states on pb_ai.kb_shelf using gin (states);
alter table pb_ai.kb_shelf enable row level security;      -- no policies: only the function below (and the table owner) reads it
revoke all on pb_ai.kb_shelf from public, anon, authenticated, service_role;

-- The excerpt handed to Ask: the whole text when it fits; else the run of whole sentences (at most p_chars) that holds
-- the most of the question's word groups, the earliest such run on a tie (chunks lead with the answer). Never cuts
-- inside a sentence unless one sentence alone is longer than p_chars.
create or replace function pb_ai.kb_shelf_excerpt(p_text text, p_groups tsquery[], p_chars integer)
 returns text language plpgsql immutable set search_path to '' as $function$
declare s text[]; h int[] := '{}'; n int; a int; b int; len int; got int; best int := -1; ba int := 1; bb int := 1; tv tsvector;
begin
  if p_text is null or length(p_text) <= p_chars then return p_text; end if;
  s := regexp_split_to_array(p_text, '(?<=[.;?!])\s+');
  n := array_length(s, 1);
  for a in 1..n loop
    tv := to_tsvector('english', s[a]);
    h := h || (select count(*)::int from unnest(p_groups) q where tv @@ q);
  end loop;
  for a in 1..n loop
    len := 0; got := 0; b := a - 1;
    while b < n and len + length(s[b + 1]) + (case when len > 0 then 1 else 0 end) <= p_chars loop
      b := b + 1; len := len + length(s[b]) + (case when len > 0 then 1 else 0 end); got := got + h[b];
    end loop;
    if b < a then b := a; got := h[a]; end if;        -- one sentence longer than the limit: it is cut below
    if got > best then best := got; ba := a; bb := b; end if;
  end loop;
  return left(array_to_string(s[ba:bb], ' '), p_chars);
end $function$;
revoke all on function pb_ai.kb_shelf_excerpt(text, tsquery[], integer) from public, anon, authenticated, service_role;

-- Search the shelf.
--   p_q       the question as typed (used only when p_terms is empty)
--   p_state   the job's state code ('TX') or null. A state's chunks come back only for that state; 'US' chunks always.
--             With no state: 'US' chunks only (one state's rule is never offered as "the" rule).
--   p_k       how many excerpts (1 to 8)
--   p_terms   the word groups Ask builds for document search (retrieval.ts queryGroups): one entry per typed word,
--             "word synonym synonym". Each group counts once however many of its words a chunk has.
--   p_coll    only these collections (id prefix: 'osha', 'mutcd', 'spec', ...), or null for all
--   p_chars   longest excerpt (200 to 1800). A longer chunk is cut to its best run of whole sentences; 'cut' says so.
--   p_weights how much each entry of p_terms matters (same length; Ask sends how rare the word is in its core library,
--             so "mandrel" counts for more than "pipe"). Empty: worked out here from how rare the group is on the shelf.
-- Ranking: websearch_to_tsquery per group (so nothing typed can break the query), ts_rank_cd over title (heaviest), topic
-- and text, times how much of the question the chunk covers (by weight), times a title boost (the share found in the
-- title), times a small boost for the job state's own chunk, times 0.8 for confidence "low". At most 2 per title.
-- Each row says how much of the question it covers ('cover', 0 to 1) and how much its title does ('title_cover'): Ask hands
-- an excerpt to the model only when those are high enough (shelf.ts).
-- Speed: ranking every row that has ANY of the words is what gets slow on a big shelf (common words match a third of
-- it). So the rows to rank are picked by the RAREST groups: groups are added, rarest first, while they bring in at most
-- 5,000 rows in all; when even the rarest group is commoner than that, a row must have the two rarest. Counting a
-- group's rows is an index-only step. Every picked row is checked against all the groups (cheap); the 400 that cover the
-- most of the question get the full ts_rank_cd ranking (the costly step).
create or replace function public.pb_ai_kb_shelf_search(p_q text, p_state text default null, p_k integer default 3,
    p_terms text[] default null, p_coll text[] default null, p_chars integer default 700, p_weights real[] default null)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v_st text := nullif(upper(btrim(coalesce(p_state, ''))), '');
  v_states text[];
  v_k int := least(greatest(coalesce(p_k, 3), 1), 8);
  v_chars int := least(greatest(coalesce(p_chars, 700), 200), 1800);
  v_own boolean := coalesce(array_length(p_terms, 1), 0) > 0;
  v_wok boolean := v_own and coalesce(array_length(p_weights, 1), 0) = coalesce(array_length(p_terms, 1), 0);
  v_src text[]; v_g tsquery[] := '{}'; v_w real[] := '{}'; v_df int[] := '{}'; v_ord int[]; v_all tsquery; v_drive tsquery;
  g tsquery; t text; i int; k int := 0; n int; v_sum int := 0; v_cap constant int := 5000; v_rows real; v_wsum real; v jsonb;
begin
  if v_st is not null and v_st !~ '^[A-Z]{2}$' then v_st := null; end if;
  v_states := case when v_st is null or v_st = 'US' then array['US'] else array['US', v_st] end;
  -- the groups: Ask's own (word + synonyms), else the typed words one by one
  v_src := case when v_own then p_terms[1:12] else (regexp_split_to_array(lower(left(coalesce(p_q, ''), 300)), '[^a-z0-9]+'))[1:24] end;
  if v_src is null then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'groups', 0); end if;
  foreach t in array v_src loop
    k := k + 1;
    -- letters and digits only, joined with "or": websearch_to_tsquery never raises, whatever is typed
    t := btrim(regexp_replace(lower(left(coalesce(t, ''), 200)), '[^a-z0-9]+', ' ', 'g'));
    continue when t = '' or length(to_tsvector('english', t)) = 0;     -- only stop words: skip (and no NOTICE in the log)
    g := websearch_to_tsquery('english', replace(t, ' ', ' or '));
    continue when g is null or numnode(g) = 0 or g = any (v_g);
    v_g := v_g || g;
    v_w := v_w || (case when v_wok then least(greatest(coalesce(p_weights[k], 1), 0.05), 100) else null end)::real;
    exit when array_length(v_g, 1) >= 12;
  end loop;
  n := coalesce(array_length(v_g, 1), 0);
  if n = 0 then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'groups', 0); end if;
  -- how common each group is (whole shelf; index only)
  for i in 1..n loop
    v_df := v_df || (select count(*)::int from pb_ai.kb_shelf s where s.tsv @@ v_g[i]);
    v_all := case when v_all is null then v_g[i] else v_all || v_g[i] end;
  end loop;
  if not v_wok then   -- no weights given: a rare group matters more than a common one
    select greatest(c.reltuples, 1) into v_rows from pg_catalog.pg_class c where c.oid = 'pb_ai.kb_shelf'::regclass;
    for i in 1..n loop v_w[i] := ln(1 + greatest(v_rows, v_df[i]) / (v_df[i] + 1)); end loop;
  end if;
  select sum(x) into v_wsum from unnest(v_w) x;
  select array_agg(x.i order by v_df[x.i], x.i) into v_ord from generate_series(1, n) x(i) where v_df[x.i] > 0;
  if v_ord is null then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'groups', n); end if;
  if v_df[v_ord[1]] > v_cap and array_length(v_ord, 1) >= 2 then
    v_drive := v_g[v_ord[1]] && v_g[v_ord[2]];
  else
    foreach i in array v_ord loop
      exit when v_drive is not null and v_sum + v_df[i] > v_cap;
      v_drive := case when v_drive is null then v_g[i] else v_drive || v_g[i] end;
      v_sum := v_sum + v_df[i];
    end loop;
  end if;

  with hit as materialized (
    select s.id, s.chunk, s.state, s.coll, s.tsv,
           (select coalesce(sum(v_w[q.i]), 0) from generate_subscripts(v_g, 1) q(i) where s.tsv   @@ v_g[q.i])::real / v_wsum as m,   -- share of the question this chunk covers
           (select coalesce(sum(v_w[q.i]), 0) from generate_subscripts(v_g, 1) q(i) where s.tsv_t @@ v_g[q.i])::real / v_wsum as mt   -- share found in its title
      from pb_ai.kb_shelf s
     where s.tsv @@ v_drive and s.states && v_states
       and (p_coll is null or s.coll = any (p_coll))
  ), pre as (   -- the costly part (ts_rank_cd) only for the 400 rows that cover the most of the question
    select * from hit order by m desc, mt desc, id limit 400
  ), scored as (
    select h.id, h.chunk, h.state, h.coll, h.m, h.mt,
           ts_rank_cd('{0.1, 0.2, 0.6, 1.0}', h.tsv, v_all, 32)
             * (0.25 + 0.75 * h.m)                                                -- covers more of the question
             * (1 + 0.6 * h.mt)                                                   -- title boost
             * (case when h.state <> 'US' then 1.25 else 1 end)                   -- the job state's own chunk first
             * (case h.chunk->>'confidence' when 'low' then 0.8 else 1 end) as score
      from pre h
  ), top as (select * from scored order by score desc, id limit 40),
  capped as (select t2.*, row_number() over (partition by lower(t2.chunk->>'title') order by t2.score desc, t2.id) as rn from top t2),
  best as (select * from capped where rn <= 2 order by score desc, id limit v_k)
  select jsonb_build_object('ok', true, 'groups', n, 'rows', coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'state', b.state, 'coll', b.coll, 'title', b.chunk->>'title', 'topic', b.chunk->>'topic',
           'text', x.txt, 'cut', length(b.chunk->>'text') > v_chars,
           'source', b.chunk->>'source', 'url', b.chunk->>'url', 'conf', b.chunk->>'confidence', 'kind', b.chunk->>'kind',
           'edition', b.chunk->>'edition', 'checked', b.chunk->>'checked',
           'cover', round(b.m::numeric, 2), 'title_cover', round(b.mt::numeric, 2), 'score', round(b.score::numeric, 4)) order by b.score desc, b.id), '[]'::jsonb))
    into v
    from best b
    cross join lateral (select pb_ai.kb_shelf_excerpt(b.chunk->>'text', v_g, v_chars) as txt) x;
  return v;
end $function$;
revoke all on function public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[]) from public, anon, authenticated;
grant execute on function public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer, real[]) to service_role;

commit;
