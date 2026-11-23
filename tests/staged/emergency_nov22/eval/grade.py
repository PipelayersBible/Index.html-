# grade.py <run> <cases.jsonl> [maxwords] : SELECT grading an eval run on the server (read only). facts = every must regex (Postgres ARE,
# case-insensitive, \b -> \y); bad = any mustnot regex; loc = the instant (local) answer flag matches the case's "local" (when given);
# words limit applies to AI answers only. Prints id, status, local, words, facts, bad, pass, usd.
import json, sys
run, f = sys.argv[1], sys.argv[2]; mx = int(sys.argv[3]) if len(sys.argv) > 3 else 110
cs = [json.loads(l) for l in open(f) if l.strip()]
q = lambda s: "'" + s.replace("'", "''") + "'"
arr = lambda xs: "array[" + ",".join(q(x.replace("\\b", "\\y")) for x in xs) + "]::text[]"
vals = ",\n".join(f"({q(c['id'])}, {arr(c.get('must', []))}, {arr(c.get('mustnot', []))}, {('null' if c.get('local') is None else str(c['local']).lower())}::boolean)" for c in cs)
print(f"""with c(id, must, mustnot, wantlocal) as (values {vals}),
r as (select c.id, e.status, coalesce(e.local, false) loc, e.usd, coalesce(array_length(regexp_split_to_array(trim(e.text), '\\s+'), 1), 0) words,
  coalesce((select bool_and(e.text ~* m) from unnest(c.must) m), true) facts,
  coalesce((select bool_or(e.text ~* m) from unnest(c.mustnot) m), false) bad, c.wantlocal
  from c left join pb_ai.eval_results e on e.run = {q(run)} and e.id = c.id)
select id, status, loc, words, facts, bad, (status = 200 and facts and not bad and (wantlocal is null or wantlocal = loc) and (loc or words <= {mx})) pass, usd from r order by pass nulls first, id""")
