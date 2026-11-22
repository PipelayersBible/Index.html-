# show.py <regex on id> [field regex on text] : print matching live cards (ord, id, state, title, text, source, checked)
import json, re, sys
rows = [json.loads(l) for l in open('/home/claude/index.html-/tests/staged/ask_quality_nov22/work/' + (sys.argv[3] if len(sys.argv) > 3 else 'live_rows.jsonl'))]
for r in rows:
    c = r['c']
    if re.search(sys.argv[1], c['id']) and (len(sys.argv) < 3 or not sys.argv[2] or re.search(sys.argv[2], c['text'], re.I)):
        print(f"[{r['o']}] {c['id']} st={c.get('state')} lib={r['lib']} conf={c.get('confidence')} chk={c.get('checked')}\n  T: {c.get('title')}\n  {c['text']}\n  S: {c.get('source')} | {c.get('url')}\n")
