# grade_sql.py <run> <cases.jsonl> [maxwords] : a SELECT that grades an eval run's answers on the server (no writes):
# facts = every must regex (Postgres ARE, \b -> \y), wrong_state = the answer names a state other than the job's (or the one asked about),
# words = whitespace words (limit 110 by default, the "rule" kind + offer). Prints the SQL.
import json, sys
run, f = sys.argv[1], sys.argv[2]; mx = int(sys.argv[3]) if len(sys.argv) > 3 else 110
t = open(f).read().strip(); cases = json.loads(t) if t.startswith("[") else [json.loads(l) for l in t.splitlines() if l.strip()]
q = lambda s: "'" + s.replace("'", "''") + "'"
vals = ',\n'.join(f"({q(c['id'])}, {q(c['where'][-2:])}, array[{','.join(q(m.replace(chr(92)+'b', chr(92)+'y')) for m in c['must'])}]::text[])" for c in cases)
ST = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
names = ',\n'.join(f"({q(k)}, {q(v)})" for k, v in ST.items())
print(f"""with c(id, st, must) as (values {vals}),
s(code, name) as (values {names}),
r as (select c.id, c.st, e.text, e.status, e.usd,
        coalesce(array_length(regexp_split_to_array(trim(e.text), '\\s+'), 1), 0) as words,
        (select bool_and(e.text ~* m) from unnest(c.must) m) as facts,
        (select string_agg(s.name, ',') from s where s.code <> c.st and s.code <> 'DC'
            and (case when c.st = 'WV' and s.code = 'VA' then false else
                 regexp_replace(regexp_replace(e.text, 'West Virginia', case when s.code = 'WV' then 'West Virginia' else ' ' end, 'g'), 'Washington,? D\\.?C\\.?', ' ', 'g') ~ ('\\y' || s.name || '\\y') end)) as other_states
      from c join pb_ai.eval_results e on e.run = {q(run)} and e.id = c.id)
select id, status, words, facts, other_states, (status = 200 and facts and other_states is null and words <= {mx}) as pass, usd
  from r order by pass, id""")
