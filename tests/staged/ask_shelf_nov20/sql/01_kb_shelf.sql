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
--   p_q      the question as typed (used only when p_terms is empty)
--   p_state  the job's state code ('TX') or null. A state's chunks come back only for that state; 'US' chunks always.
--            With no state: 'US' chunks only (one state's rule is never offered as "the" rule).
--   p_k      how many excerpts (1 to 8)
--   p_terms  the word groups Ask builds for document search (retrieval.ts queryGroups): one entry per typed word,
--            "word synonym synonym". Each group counts once however many of its words a chunk has.
--   p_coll   only these collections (id prefix: 'osha', 'mutcd', 'spec', ...), or null for all
--   p_chars  longest excerpt (200 to 1800). A longer chunk is cut to its best run of whole sentences; 'cut' says so.
-- Ranking: websearch_to_tsquery per group (so nothing typed can break the query), ts_rank_cd over title (heaviest), topic
-- and text, times how many of the groups the chunk covers, times a title boost (groups found in the title), times a
-- small boost for the job state's own chunk, times 0.8 for confidence "low". At most 2 chunks per title.
-- Speed: ranking every row that has ANY of the words is what gets slow on a big shelf (common words match a third of
-- it). So the rows to rank are picked by the RAREST groups: groups are added, rarest first, while they bring in at most
-- 5,000 rows in all; when even the rarest group is commoner than that, a row must have the two rarest. Counting a
-- group's rows is an index-only step. Every picked row is then ranked against all the groups.
create or replace function public.pb_ai_kb_shelf_search(p_q text, p_state text default null, p_k integer default 3,
    p_terms text[] default null, p_coll text[] default null, p_chars integer default 700)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v_st text := nullif(upper(btrim(coalesce(p_state, ''))), '');
  v_states text[];
  v_k int := least(greatest(coalesce(p_k, 3), 1), 8);
  v_chars int := least(greatest(coalesce(p_chars, 700), 200), 1800);
  v_src text[]; v_g tsquery[] := '{}'; v_df int[] := '{}'; v_ord int[]; v_all tsquery; v_drive tsquery;
  g tsquery; t text; i int; n int; v_sum int := 0; v_cap constant int := 5000; v jsonb;
begin
  if v_st is not null and v_st !~ '^[A-Z]{2}$' then v_st := null; end if;
  v_states := case when v_st is null or v_st = 'US' then array['US'] else array['US', v_st] end;
  -- the groups: Ask's own (word + synonyms), else the typed words one by one
  v_src := case when coalesce(array_length(p_terms, 1), 0) > 0 then p_terms[1:12]
                else (regexp_split_to_array(lower(left(coalesce(p_q, ''), 300)), '[^a-z0-9]+'))[1:24] end;
  if v_src is null then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'groups', 0); end if;
  foreach t in array v_src loop
    -- letters and digits only, joined with "or": websearch_to_tsquery never raises, whatever is typed
    t := btrim(regexp_replace(lower(left(coalesce(t, ''), 200)), '[^a-z0-9]+', ' ', 'g'));
    continue when t = '' or length(to_tsvector('english', t)) = 0;     -- only stop words: skip (and no NOTICE in the log)
    g := websearch_to_tsquery('english', replace(t, ' ', ' or '));
    continue when g is null or numnode(g) = 0 or g = any (v_g);
    v_g := v_g || g;
    exit when array_length(v_g, 1) >= 12;
  end loop;
  n := coalesce(array_length(v_g, 1), 0);
  if n = 0 then return jsonb_build_object('ok', true, 'rows', '[]'::jsonb, 'groups', 0); end if;
  -- how common each group is (whole shelf; index only)
  for i in 1..n loop
    v_df := v_df || (select count(*)::int from pb_ai.kb_shelf s where s.tsv @@ v_g[i]);
    v_all := case when v_all is null then v_g[i] else v_all || v_g[i] end;
  end loop;
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
           (select count(*) from unnest(v_g) q where s.tsv   @@ q)::int as m,     -- groups this chunk covers
           (select count(*) from unnest(v_g) q where s.tsv_t @@ q)::int as mt     -- groups found in its title
      from pb_ai.kb_shelf s
     where s.tsv @@ v_drive and s.states && v_states
       and (p_coll is null or s.coll = any (p_coll))
  ), scored as (
    select h.id, h.chunk, h.state, h.coll, h.m, h.mt,
           ts_rank_cd('{0.1, 0.2, 0.6, 1.0}', h.tsv, v_all, 32)
             * (0.25 + 0.75 * h.m::real / n)                                      -- covers more of the question
             * (1 + 0.6 * h.mt::real / n)                                         -- title boost
             * (case when h.state <> 'US' then 1.25 else 1 end)                   -- the job state's own chunk first
             * (case h.chunk->>'confidence' when 'low' then 0.8 else 1 end) as score
      from hit h
  ), top as (select * from scored order by score desc, id limit 40),
  capped as (select t2.*, row_number() over (partition by lower(t2.chunk->>'title') order by t2.score desc, t2.id) as rn from top t2),
  best as (select * from capped where rn <= 2 order by score desc, id limit v_k)
  select jsonb_build_object('ok', true, 'groups', n, 'rows', coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'state', b.state, 'coll', b.coll, 'title', b.chunk->>'title', 'topic', b.chunk->>'topic',
           'text', x.txt, 'cut', length(b.chunk->>'text') > v_chars,
           'source', b.chunk->>'source', 'url', b.chunk->>'url', 'conf', b.chunk->>'confidence', 'kind', b.chunk->>'kind',
           'edition', b.chunk->>'edition', 'checked', b.chunk->>'checked',
           'cover', round(b.m::numeric / n, 2), 'title_hits', b.mt, 'score', round(b.score::numeric, 4)) order by b.score desc, b.id), '[]'::jsonb))
    into v
    from best b
    cross join lateral (select pb_ai.kb_shelf_excerpt(b.chunk->>'text', v_g, v_chars) as txt) x;
  return v;
end $function$;
revoke all on function public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer) from public, anon, authenticated;
grant execute on function public.pb_ai_kb_shelf_search(text, text, integer, text[], text[], integer) to service_role;

commit;
