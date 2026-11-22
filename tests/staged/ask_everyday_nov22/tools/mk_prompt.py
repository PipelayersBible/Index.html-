# mk_prompt.py: reply rule v9 -> v10 (proposed), exact-once edits; writes prompt/reply_rule_v10.txt, prompt/v9_to_v10.diff and the SQL.
# v9 = the live reply_rule element of teacher_v2 and teacher_v2@next (md5 1726f24c5639b197e9dbabd586bec5f2, server SELECT 2026-11-22);
# both rows md5 0dcefa8e293bf1e4ba3c8f50a17be622.
import hashlib, difflib, os
H = '/home/claude/index.html-/tests/staged/ask_everyday_nov22/'
v9 = open(H + 'prompt/reply_rule_v9.txt').read()
assert hashlib.md5(v9.encode()).hexdigest() == '1726f24c5639b197e9dbabd586bec5f2'
EDITS = [
 # review Part 1 #6: pipe air tests ended with "Your competent person decides on site." because "air testing" is in the safety list
 ('SAFETY LINE: on ANY safety-related answer (trenching, sloping, shoring, confined space, air testing, traffic control',
  'SAFETY LINE: on ANY safety-related answer (trenching, sloping, shoring, confined space, air monitoring / gas testing, traffic control'),
 ('and not on 811 ticket timing, reporting deadlines, paperwork, specs, pipe math or the app.',
  'and not on 811 ticket timing, reporting deadlines, paperwork, specs, pipe math, pipe air, water, pressure or mandrel tests, or the app.'),
 # review Part 2 E: one agency's numbers inside a general card (Greenbook 4 h, 50-100 mg/L) must not become "the stricter rule" on other jobs
 ("Never give a weaker rule because it is the state's.",
  "Never give a weaker rule because it is the state's. A number an excerpt gives as one agency's spec (Greenbook, a city, county or water district standard) is that agency's rule, not a stricter rule: on a job outside it, give the national standard's number (AWWA, ASTM, Ten States, DIPRA) and say the job spec governs."),
 # review Part 1 #4 and #7: say which input value was used; a number in the excerpts leads, web search only adds
 ('Never give a "typical", "usual" or "often" number as if it were a rule; when the agency or the job spec sets it, say who sets it.',
  'Never give a "typical", "usual" or "often" number as if it were a rule; when the agency or the job spec sets it, say who sets it. When an excerpt has the number they asked for, line 1 gives it with its source; a web search only adds to it. When excerpts give different values for an input (soil bearing, a table that differs by source), use the plan or spec value if they gave one, otherwise the lower, safer value, and say which value you used.'),
]
v10 = v9
for a, b in EDITS:
    assert v10.count(a) == 1, a[:60]; v10 = v10.replace(a, b)
assert '$rr$' not in v10
open(H + 'prompt/reply_rule_v10.txt', 'w').write(v10)
m10 = hashlib.md5(v10.encode()).hexdigest()
wrap = lambda s: s.replace('. ', '.\n').splitlines(keepends=True)
open(H + 'prompt/v9_to_v10.diff', 'w').writelines(difflib.unified_diff(wrap(v9), wrap(v10), 'reply_rule_v9 (live)', 'reply_rule_v10 (proposed)'))
NOTE = 'ask_everyday_nov22: reply rule v10 (no competent-person line on pipe air/water/mandrel tests; agency numbers in general cards are not the stricter rule; excerpt number leads over web search; say which input value was used)'

def upd(name, guard_row, rule_from, rule_to, text, note):
    return f"""-- prompt row {name}: reply_rule element {rule_from} -> {rule_to}. Every other element unchanged. NOT APPLIED.
-- Guard: runs only when the row's reply_rule element has md5 {guard_row}; a second run changes nothing (0 rows).
with cur as (select p.text from pb_ai.prompt_overrides p, jsonb_array_elements(substr(p.text, 6)::jsonb) e
              where p.name = '{name}' and e ? 'reply_rule' and md5(e->>'reply_rule') = '{guard_row}'),
new as (select 'EDITS' || jsonb_agg(case when e ? 'reply_rule' then jsonb_build_object('reply_rule', $rr${text}$rr$::text) else e end order by n)::text as t
        from cur, jsonb_array_elements(substr(cur.text, 6)::jsonb) with ordinality x(e, n))
update pb_ai.prompt_overrides p set text = new.t, updated_at = now(), note = coalesce(p.note, '') || ' | {note}'
from new where p.name = '{name}'
returning p.name, md5(p.text) as new_row_md5, (select md5(e->>'reply_rule') from jsonb_array_elements(substr(p.text,6)::jsonb) e where e ? 'reply_rule') as rule_md5;
"""

os.makedirs(H + 'sql', exist_ok=True)
open(H + 'sql/30_prompt_row_v10_next.sql', 'w').write(upd('teacher_v2@next', '1726f24c5639b197e9dbabd586bec5f2', 'v9', 'v10 (expect rule_md5 ' + m10 + ')', v10, NOTE))
open(H + 'sql/32_prompt_row_v10_live.sql', 'w').write('-- ONLY after the next-slot eval passes (see NOTES.md).\n' + upd('teacher_v2', '1726f24c5639b197e9dbabd586bec5f2', 'v9', 'v10 (expect rule_md5 ' + m10 + ')', v10, NOTE))
open(H + 'sql/39_prompt_row_v9_rollback.sql', 'w').write(
    upd('teacher_v2@next', m10, 'v10', 'v9 (expect rule_md5 1726f24c5639b197e9dbabd586bec5f2)', v9, 'ask_everyday_nov22: rolled back to reply rule v9')
    + '\n' + upd('teacher_v2', m10, 'v10', 'v9 (expect rule_md5 1726f24c5639b197e9dbabd586bec5f2)', v9, 'ask_everyday_nov22: rolled back to reply rule v9'))
print('v10 md5', m10, 'chars', len(v9), '->', len(v10))
