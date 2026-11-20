# sqlout.py <saved execute_sql output> : prints/returns the rows (list of dicts) from a saved Supabase tool result
import json, re, sys
def rows(path):
    r = open(path).read()
    try: r = json.loads(r)['result']
    except Exception: pass
    m = re.search(r'<untrusted-data-[0-9a-f-]+>\s*(\[.*\])\s*</untrusted-data', r, re.S)
    return json.loads(m.group(1))
if __name__ == '__main__': print(json.dumps(rows(sys.argv[1]))[:2000])
