import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
# r16.26 (Tommy, Nov 14: "anything it needs for quality"): only emergencies are answered on the phone. Go/no-go asks
# (entry, readings, permits, "is it safe") go to Ask, which answers with the rule and never says a site is safe.
a=s.index("    if (PB_AI_GONOGO_RX.some(r => r.test(t)) || (PB_AI_GAS_RX.test(t) && PB_AI_ENTER_RX.test(t))) return { kind: 'gonogo'")
b=s.index("    return null;\n  }\n",a)
s=s[:a]+s[b:]
open(sys.argv[2],'w').write(s); print('ok')
