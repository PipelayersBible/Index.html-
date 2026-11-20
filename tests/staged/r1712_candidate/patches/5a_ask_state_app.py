#!/usr/bin/env python3
# ask_state_nov20 app patch: the app always sends Ask the state it should answer for.
#   python3 ask_state_app.py in.html out.html     (exact-once replacements; apply to a COPY of the r17.11 source)
# What it sends in ctx: state (two letters) + state_how:
#   phone / picked / address  the open job's state (Change State on Locates, the company's pick, the job address)
#   company                   the company's state
#   last_job                  the newest run on this phone whose job has a state
#   told                      the state this person gave Ask when it asked "Which state is the job in?" (kept on the phone)
# Nothing is sent when nothing says (the state table's own California fallback is not sent as knowledge).
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)

rep('''  function pbAiAskPayload(q, ex, images) {''',
'''  // ask_state: Ask always knows the state. The open job's state, else the company's, else the last job on this phone
  // that has one, else the state the person told Ask. Nothing: Ask asks once, and only when the answer changes by state.
  let pbAskStateWasAsked = false;
  function pbAskState() {
    const ok = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c);
    try { const s = window.pbSrJobState(pbAskCurrentJob()); if (s && s.how !== 'default' && ok(s.code)) return { state: s.code, state_how: s.how }; } catch (e) {}
    try {
      const seen = new Set();
      for (let i = (runArchive || []).length - 1; i >= 0 && seen.size < 8; i--) {
        const n = String((runArchive[i] && runArchive[i].jobNumber) || '').trim().toLowerCase(); if (!n || seen.has(n)) continue; seen.add(n);
        const t = window.pbSrJobState(n); if (t && (t.how === 'phone' || t.how === 'picked' || t.how === 'address') && ok(t.code)) return { state: t.code, state_how: 'last_job' };
      }
    } catch (e) {}
    try { const c = localStorage.getItem('pbAskSt:' + pbArchiveOwnerUid); if (ok(c)) return { state: c, state_how: 'told' }; } catch (e) {}
    return {};
  }
  function pbAskStateNote(s) { // the reply says which state it answered for; a state given in answer to "Which state is the job in?" is kept on this phone
    try {
      if (!s || typeof s !== 'object') return;
      if (pbAskStateWasAsked && s.how === 'question' && /^[A-Z]{2}$/.test(String(s.code || ''))) localStorage.setItem('pbAskSt:' + pbArchiveOwnerUid, s.code);
      pbAskStateWasAsked = !s.code && s.asked === true;
    } catch (e) {}
  }
  window.__debugAskState = { get: () => pbAskState(), note: (s) => pbAskStateNote(s) }; /* tests */
  function pbAiAskPayload(q, ex, images) {''')
rep('''      ctx: { label: pbAiAskCtx ? pbAiAskCtx.label : '', screen: pbAiAskCtx ? pbAiAskCtx.screen : pbCurrentScreen, job: pbAskCurrentJob(), run: pbAskRunSummary() },
      mode: 'auto' };''',
'''      ctx: { label: pbAiAskCtx ? pbAiAskCtx.label : '', screen: pbAiAskCtx ? pbAiAskCtx.screen : pbCurrentScreen, job: pbAskCurrentJob(), run: pbAskRunSummary(), ...pbAskState() },
      mode: 'auto' };''')
rep('''    if (d.local) return { kind: d.kind === 'emergency' ? 'emergency' : 'gonogo', safety: true, local: true, body: String(d.text || ''), sources: [] };
    const srcs = Array.isArray(d.sources)''',
'''    if (d.local) return { kind: d.kind === 'emergency' ? 'emergency' : 'gonogo', safety: true, local: true, body: String(d.text || ''), sources: [] };
    pbAskStateNote(d.state);
    const srcs = Array.isArray(d.sources)''')
open(out, 'w', encoding='utf-8').write(s)
print('ask_state app patch applied ->', out)
