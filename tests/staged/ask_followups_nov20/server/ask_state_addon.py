#!/usr/bin/env python3
# ask_followups_nov20: two small additions to the ask_state Ask source (the source AFTER ask_state_nov20/src_patch/apply_patch.py,
# which is what /home/claude/ask_v24/src holds since Nov 20 08:24).   python3 ask_state_addon.py <src dir>     (edits in place, exact-once)
# 1. the reply's state says whether the state mattered to this answer: state.used (true when the question changes by state
#    or the job state's own chunks were handed to the model). The app shows "Answered for Texas." only when used is not false.
# 2. the app may send where the phone is (ctx.state_how = "here"): taken after the last job on the phone, before "told".
import sys, os
d = sys.argv[1]
def patch(rel, pairs):
    p = os.path.join(d, rel); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, s.count(a), a[:80]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
patch('ask.ts', [
 ('state: st.code ? { code: st.code, how: st.how } : { code: null, how: st.how, asked: !!usage.stateDep },',
  'state: st.code ? { code: st.code, how: st.how, used: !!(usage.stateDep || usage.stateOwn) } : { code: null, how: st.how, asked: !!usage.stateDep },'),
])
patch('state.ts', [
 ('  if (appOk && ah === "told") return { code: app, how: "told", named: q };',
  '  if (appOk && ah === "here") return { code: app, how: "here", named: q }; // where the phone is (photo stamp place, last 12 hours)\n  if (appOk && ah === "told") return { code: app, how: "told", named: q };'),
 ('told: "the state this person gave Ask before" }', 'told: "the state this person gave Ask before", here: "where this phone is" }'),
])
# the ask_state Deno test compares the reply's state object exactly: its six checks get the new field (optional 2nd argument = tests dir)
if len(sys.argv) > 2:
    import re
    p = os.path.join(sys.argv[2], 'state_test.ts'); t = open(p, encoding='utf-8').read()
    t, n = re.subn(r'(eq\(\w\.state, \{ code: "[A-Z]{2}", how: "\w+")( \}\);)', r'\1, used: true\2', t)
    assert n == 6, n
    open(p, 'w', encoding='utf-8').write(t)
print('ask_state add-on applied to', d)
