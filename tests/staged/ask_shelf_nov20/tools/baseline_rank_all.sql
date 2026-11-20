-- LOCAL COMPARISON ONLY, never for the server: the staged search with the rare-word step taken out (ranks every row that has any of the words).
create or replace function public.zz_shelf_all(p_q text, p_state text default null, p_k integer default 3,
    p_terms text[] default null, p_coll text[] default null, p_chars integer default 700)
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  v_st text := nullif(upper(btrim(coalesce(p_state, ''))), '');
  v_states text[];
  v_k int := least(greatest(coalesce(p_k, 3), 1), 8);
  v_chars int := least(greatest(coalesce(p_chars, 700), 200), 1800);
  v_src text[]; v_g tsquery[] := '{}'; v_df int[] := '{}'; v_ord int[]; v_all tsquery; v_drive tsquery;
  g tsquery; t text; i int; n int; v_sum int := 0; v_cap constant int := 2500; v jsonb;
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
     where s.tsv @@ v_all and s.states && v_states
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
