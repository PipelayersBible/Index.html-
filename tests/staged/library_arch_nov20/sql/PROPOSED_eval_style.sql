-- PROPOSED_eval_style.sql (library_arch_nov20, 2026-11-20). NOT APPLIED. See LIBRARY_RULES.md section 5.
-- Makes the eval grade Tommy's style rule (Nov 20): "concise and direct; on complicated subjects offer more info, then dive in".
-- Today the eval only checks words <= maxwords, and maxwords is loose (120 to 220 for most cases), so a long answer with the
-- fact buried in the middle passes. This adds two columns to the case table and three checks to the grading view:
--   lead     regex list: every one must match inside the FIRST 40 WORDS of the answer (the answer comes first)
--   complex  true = a complicated subject: the answer must END with one short offer question (12 words or fewer);
--            false / null = a simple question: the answer must NOT end with an offer
-- Old cases have lead = null and complex = null, so they grade exactly as before (the new checks are skipped for them).
begin;
alter table pb_ai.eval_set add column if not exists lead jsonb, add column if not exists complex boolean;

create or replace view pb_ai.eval_graded as
 select g.*,
        (select coalesce(array_agg(m.value), '{}'::text[]) from jsonb_array_elements_text(coalesce(g.lead, '[]'::jsonb)) m(value)
          where not (g.first40 ~* m.value)) as buried,                       -- lead facts that are NOT in the first 40 words
        (g.last_line ~ '\?\s*$' and g.last_line ~* '^\s*(want|need|should i|do you want|would you like)\M'
          and array_length(regexp_split_to_array(btrim(g.last_line), '\s+'), 1) <= 12) as ends_offer
   from (
     select r.run, s.id, s.cat, r.status, r.local, r.usd, r.ms,
            array_length(regexp_split_to_array(btrim(coalesce(r.text, '')), '\s+'), 1) as words,
            s.maxwords,
            (select coalesce(array_agg(m.value), '{}'::text[]) from jsonb_array_elements_text(s.must) m(value) where not (coalesce(r.text, '') ~* m.value)) as missing,
            (select coalesce(array_agg(m.value), '{}'::text[]) from jsonb_array_elements_text(s.mustnot) m(value) where coalesce(r.text, '') ~* m.value) as forbidden,
            s.lead, s.complex,
            array_to_string((regexp_split_to_array(btrim(regexp_replace(coalesce(r.text, ''), '^\s*TYPE:\s*\w+\s*', '')), '\s+'))[1:40], ' ') as first40,
            (regexp_match(btrim(coalesce(r.text, '')), '([^\n.!?]*[.!?]?)\s*$'))[1] as last_line
       from pb_ai.eval_results r join pb_ai.eval_set s on s.id = r.id) g;

-- pass = facts present, nothing forbidden (wrong state's number included), within the word limit, answer first, offer rule kept
create or replace function pb_ai.eval_score(p_run text) returns jsonb language sql security definer set search_path to '' as $function$
 with g as (select *, (status = 200 and missing = '{}' and forbidden = '{}' and words <= maxwords and buried = '{}'
                       and (complex is null or complex = ends_offer)) as ok from pb_ai.eval_graded where run = p_run)
 select jsonb_build_object('n', count(*), 'pass', count(*) filter (where ok),
   'facts_ok', count(*) filter (where missing = '{}'), 'forbidden_hits', count(*) filter (where forbidden <> '{}'), 'too_long', count(*) filter (where words > maxwords),
   'buried', count(*) filter (where buried <> '{}'), 'offer_wrong', count(*) filter (where complex is not null and complex <> ends_offer),
   'errors', count(*) filter (where status <> 200), 'avg_words', round(avg(words)), 'median_words', percentile_cont(0.5) within group (order by words),
   'usd', round(sum(usd), 2), 'avg_s', round(avg(ms) / 1000.0, 1),
   'fails', jsonb_agg(jsonb_build_object('id', id, 'miss', missing, 'bad', forbidden, 'w', words, 'max', maxwords, 'st', status, 'buried', buried,
                                         'offer', case when complex is not null and complex <> ends_offer then case when complex then 'missing' else 'not wanted' end end) order by id) filter (where not ok))
 from g $function$;
commit;
