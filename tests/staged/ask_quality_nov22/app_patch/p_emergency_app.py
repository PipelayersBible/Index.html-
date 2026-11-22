# p_emergency_app.py <in.html> <out.html>: app side of the safety review items 1-2 (ask_quality_nov22), on _src r17.14 (e85bf91).
# - the instant emergency answer uses the SAME triggers and scripts as the server (src_patch/emergency.ts, pasted here):
#   4 scripts (space / open / gas / power), English and Spanish; checked on the phone before the plan check (no plan, quota or signal needed).
# - every "Ask can't answer" message (no plan, limit, no signal, timeout, busy ...) ends with "Emergency? Call 911."
# Exact-once replacements (asserted). Not shipped: the lead integrates.
import re, sys, os
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, f"expected {n} got {c}: {a[:80]!r}"
    s = s.replace(a, b)
em = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src_patch', 'emergency.ts'), encoding='utf-8').read()
em = re.sub(r'^export (const|function) ', r'\1 ', em, flags=re.M)
em = '\n'.join('  ' + l if l.strip() else l for l in em.split('\n')).rstrip() + '\n'
i = s.index('  const PB_AI_EMERGENCY_RX = [\n'); j = s.index('  ];\n', i) + len('  ];\n')
assert s.count('  const PB_AI_EMERGENCY_RX = [\n') == 1
s = s[:i] + '  // ask_quality_nov22 (safety review 1-2): the server\'s emergency.ts, pasted. Keep the two copies identical.\n' + em + '  const PB_AI_EMERGENCY_RX = PB_EMG_STRONG;\n' + s[j:]
rep("    if (PB_AI_EMERGENCY_RX.some(r => r.test(t))) return { kind: 'emergency', safety: true, local: true, sources: src(pages),\n      body: 'If someone is down, not responding, trapped, or a gas alarm is going off:\\n- Get out yourself and keep everyone else out.\\n- Do NOT go in after them unless you are a trained, equipped rescuer. Untrained rescuers are often the next victims.\\n- Call 911 or your emergency number now, then tell your supervisor / entry supervisor.\\n- If a permit is open, use EMERGENCY so the entry team and the permit record know.' };",
    "    const em = pbEmergencyKind(q);\n    if (em) return { kind: 'emergency', script: em.key, lang: em.lang, safety: true, local: true, sources: em.key === 'space' ? src(pages) : [], body: PB_EMG_TEXT[em.key][em.lang] };")
E = ' Emergency? Call 911.'
for k, old in [('plan', 'Your plan on this phone doesn’t include it.'), ('offline', 'Runs, calculators and permits still work offline.'),
               ('noClient', 'Check your signal and try again.'), ('signedOut', 'or your login has expired.'),
               ('betaEnded', 'Everything else still works.'), ('busy', 'Try again in a minute.'), ('unavailable', 'AI isn’t available right now. Try again later.'),
               ('timeout', 'The AI took too long. Check your signal and try again.'), ('incomplete', 'Couldn’t finish looking that up. Try again.'),
               ('network', 'Couldn’t reach the AI. Check your signal and try again.'), ('dropped', 'Connection lost before the answer finished.')]:
    a = f"    {k}: '"; i = s.index(a, s.index('const PB_AI_MSG = {')); j = s.index("'", i + len(a))
    line = s[i:j]; assert line.endswith(old), (k, line)
    s = s[:j] + E + s[j:]
rep("    daily: () => 'You’ve hit today’s limit. It resets tomorrow.',", "    daily: () => 'You’ve hit today’s limit. It resets tomorrow." + E + "',")
open(out, 'w', encoding='utf-8').write(s)
print('ok')
