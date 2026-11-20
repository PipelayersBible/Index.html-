import json,sys
r=json.load(open(sys.argv[1])); cs={json.loads(l)['id']:json.loads(l) for l in open('out/cases.jsonl')}
kb=json.load(open('out/kb_next.json')); T={c['id']:c['title'] for v in kb.values() for c in v}
mode=sys.argv[2] if len(sys.argv)>2 else 'neither'
for i,x in r.items():
    c=cs[i]
    if (mode=='neither' and not x['ok'] and not x['facts']) or (mode=='chunk' and not x['ok'] and x['facts']) or (mode=='em' and i.startswith('lib-us-em')):
        print(i,c['where'][-2:],'|',c['q'],'\n    want',[(w,T.get(w,'?')[:90]) for w in c['chunks']],'\n    got',x['ids'][:8],'| must',c['must'])
