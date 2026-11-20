# Rebuilds a local copy of the live KB (version b3e91f6c47d2, 2,784 rows) from the Nov 18 read-only dump plus the
# edits applied since (askkb fixes F01-F22, chunk 224, the two lockout chunks). Checks each edited row against the
# live md5 prefixes read on Nov 20. Output: ../work/kb_live.json  {app:[...], field:[...], osha:[...]} + ords.
import json,hashlib,sys
R=json.load(open('/tmp/claude-0/audit/askkb/dump/chunks.json'))
by={r['ord']:r for r in R}
for f in json.load(open('/tmp/claude-0/audit/askkb/tools/fixes.json')):
    r=by[f['ord']]; 
    if f['old'] in r['text']: r['text']=r['text'].replace(f['old'],f['new'])
    else: print('fix miss',f['id'],f['ord'])
r=by[224]; o="At exactly 20 ft it still gives the slope with a warning; over 20 ft no slope is given:"
n="At 20 ft or deeper (exactly 20 ft included) no slope is given and the result says \"Engineer Required\": Table B-1 covers excavations \"less than 20 feet deep\", and note 3 says:"
assert o in r['text']; r['text']=r['text'].replace(o,n)
for i,l in enumerate(open('/home/claude/kb_add/kb_lockout_trench20.jsonl')):
    c=json.loads(l); by[2782+i]={'ord':2782+i,'lib':'field','id':c['id'],'topic':c['topic'],'title':c['title'],'src':c['source'],'url':c['url'],'status':None,'conf':c['confidence'],'text':c['text'],'table':None}
S="1c8f3c0a1cb5f241221d14dfdd5af6d40028ef82a5b0965fa98da07a8287615cfa2b9a9c997021db9b6955d2846a15646e0aa6bc593d7bb8a64062e1676ce4286783f3639a26a2311c5770bedea48c74c3d43175dea32da2e01451480c1a335f85e6af65e0cb29f72ff880c495270f372a071b64c68ffb964f1eb81caa46537baa4e55771fc902ce6a1f0521db4d40e99d9ae23d94383b8d2e141738f0880689731f74dc8f24dffe42136ea87deae5fbfd7b1544049dbaae62368a6e2c7a87a4eee0578dc5a5e0a18c9cd739381f8dd1dcde1be62f703bbc9ad0c265cabdbc7c9f4ee3364bddad83d8a46494a8678b0897d6be43c8130a9abcb744f28779d635c71363ee1df2a1ce709e31075c922b48636c76babe2d0d344df9beb81664596ccd477aaad5ec6d22c836429a405cbb32c119fd46896e5cd53d4411248348d979d91005c16bae41affaea3e4a5f07da4c76a4da8c15bfdac3e1df7ddc42f8e3270ccde7576cda13f0b03c671164dc2adbe6768cc323a93a18f963a7f3c6e22634323cb1f945c6a9d83c53266a8be24685b40926db9b228e398b8b235a708e913acc9245eef441c31bb285551b"
B=[6,22,23,27,30,31,32,38,66,71,72,75,97,150,191,199,200,234,237,238,244,278]
ords=[o for b in B for o in range(b*10,b*10+10) if o<=2783]
bad=[o for i,o in enumerate(ords) if hashlib.md5((by[o]['text'] or '').encode()).hexdigest()[:4]!=S[4*i:4*i+4]]
print('rows',len(by),'still different from live:',bad)
out={'app':[],'field':[],'osha':[]}
for o in sorted(by):
    r=by[o]; c={'id':r['id'],'title':r['title'] or '','text':r['text'],'topic':r['topic'],'source':r['src'],'url':r['url'],'confidence':r['conf'],'_ord':o}
    if r.get('status'): c['status']=r['status']
    if r.get('table'): c['table']=r['table']
    out[r['lib']].append(c)
json.dump(out,open('../work/kb_live.json','w'))
