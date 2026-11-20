#!/usr/bin/env python3
# ask_followups_nov20 app patch. Apply AFTER tests/staged/ask_state_nov20/app/ask_state_app.py:
#   python3 ask_state_app.py src.html a.html && python3 ask_followups_app.py a.html out.html     (exact-once replacements)
# 1. Under an Ask answer: "Answered for Texas." (small, quiet) + Change on the newest answer. When Ask had to ask
#    "Which state is the job in?", a State pick sits under that answer: one tap saves it and asks the question again.
# 2. A State pick at set-up: a one-time Home card for the company account (owner / PM / superintendent) whose company has
#    no state yet, and for a person on the Individual plan; and a State field on New Job, shown only when City, State has
#    no state the app can read.
# 3. Ask also uses where the phone is (the photo stamp's place, last 12 hours) when nothing else says.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90])
    s = s.replace(a, b)

# ---- A. Ask: where the phone is, before "the state this person told Ask"
rep('''    try { const c = localStorage.getItem('pbAskSt:' + pbArchiveOwnerUid); if (ok(c)) return { state: c, state_how: 'told' }; } catch (e) {}
    return {};''',
'''    try { const h = typeof window.pbHereState === 'function' ? window.pbHereState() : null; if (ok(h)) return { state: h, state_how: 'here' }; } catch (e) {} /* ask_followups: where this phone is */
    try { const c = localStorage.getItem('pbAskSt:' + pbArchiveOwnerUid); if (ok(c)) return { state: c, state_how: 'told' }; } catch (e) {}
    return {};''')

# ---- B. Ask: the reply's state is kept on the answer card
rep('''    return { v: 2, fb, noHint, body: String(d.text || '').trim(), safety: !!d.safety || d.type === 'safety' || PB_AI_SAFETY_RX.test(q), sources: app, more, analysis,''',
'''    return { v: 2, fb, noHint, st: analysis ? null : pbAskStOf(d.state), body: String(d.text || '').trim(), safety: !!d.safety || d.type === 'safety' || PB_AI_SAFETY_RX.test(q), sources: app, more, analysis,''')
rep('''      + (h.streaming || h.failed ? '<p class="pb-ai-hint pb-ai-label"><span class="pb-ai-tag">AI</span> ' + (h.failed ? 'no checked answer' : 'writing… checked when done') + '</p>' :''',
'''      + pbAskStHtml(h, i) // ask_followups: "Answered for Texas."
      + (h.streaming || h.failed ? '<p class="pb-ai-hint pb-ai-label"><span class="pb-ai-tag">AI</span> ' + (h.failed ? 'no checked answer' : 'writing… checked when done') + '</p>' :''')
rep('''#pbApp .pb-ai-src-k { color: var(--pb-text-2); }''',
'''#pbApp .pb-ai-src-k { color: var(--pb-text-2); }
/* ask_followups: the state an answer is for (quiet), and the State picks */
#pbApp .pb-ai-st { margin-top: 8px; font-size: 13px; }
#pbApp .pb-ai-st .pb-edu-link { font-size: 13px; min-height: 44px; padding: 0 6px; }
#pbApp .pb-ai-st select, #pbApp #homeStateSel, #pbApp #cxnState { min-height: 44px; max-width: 100%; font-size: 16px; }
#pbApp .pb-ai-st-pick { display: block; margin-top: 6px; }
#pbApp #homeStateCard .pbst-f { margin: 10px 0 0 0; padding: 0; }''')

# ---- C. Home: the mount for the one-time State card (above Getting Started)
rep('''      <div id="homeObStart" hidden></div>''',
'''      <div id="homeStateAsk" hidden></div><!-- ask_followups: which state (one time) -->
      <div id="homeObStart" hidden></div>''')

# ---- D. New Job: a State field, shown only when City, State has no state
rep('''        <div class="pb-field"><label for="cxnStart">Start date <span class="pbx-opt">(optional)</span></label><input type="date" id="cxnStart"></div>''',
'''        <div class="pb-field" id="cxnStateF" hidden><label for="cxnState">State</label><select id="cxnState"></select><p class="pb-help" id="cxnStateHelp">No state in City, State. Pick it so 811 rules, trench rules and Ask answers fit this job.</p></div>
        <div class="pb-field"><label for="cxnStart">Start date <span class="pbx-opt">(optional)</span></label><input type="date" id="cxnStart"></div>''')
rep('''    { const f = document.getElementById('cxNewForm'); if (f && !f.__cxIn) { f.__cxIn = true; f.addEventListener('input', () => pbCxNewErr('')); } } // a message goes once the person types again''',
'''    { const f = document.getElementById('cxNewForm'); if (f && !f.__cxIn) { f.__cxIn = true; f.addEventListener('input', () => { pbCxNewErr(''); try { window.pbStNewJobSync(); } catch (e) {} }); } } // a message goes once the person types again
    try { window.pbStNewJobSync(true); } catch (e) {} // ask_followups: the State field shows only when City, State has no state''')
rep('''    pbCx.nf = { key, step: 1, saw: false, partial, loc: locNote };''',
'''    try { const sf = document.getElementById('cxnStateF'), sv = String((document.getElementById('cxnState') || {}).value || ''); if (sf && !sf.hidden && pbSrOk(sv)) pbStSetJob(job.job_number, sv); } catch (e) { console.error(e); } // ask_followups: the state picked for a job with no state in its address
    pbCx.nf = { key, step: 1, saw: false, partial, loc: locNote };''')

# ---- E. the pull remembers whether this account may set the company's state, and refreshes the Home card
rep('''      o.co = pbSrOk(r.data.company_state) ? r.data.company_state : ''; o.jobs = {};''',
'''      o.co = pbSrOk(r.data.company_state) ? r.data.company_state : ''; o.can = r.data.can_set_company === true; o.jobs = {};''')
rep('''      pbLocRefreshScreens(); try { pbLocCoRender(); } catch (e) {}
    }).catch(() => {});''',
'''      pbLocRefreshScreens(); try { pbLocCoRender(); } catch (e) {}
      try { pbStHomeRender(); } catch (e) {}
    }).catch(() => {});''')

# ---- F. the module
rep('''  // ---- Settings › Company: the company's state (r17.05; replaced "a new ticket is good for N days") ----''',
'''  // ---- ask_followups (Nov 20): a State pick at set-up, and the state shown under Ask answers ----
  // "My state" = the company's state when this account may set it (owner, PM, superintendent: saved for the whole
  // company), else kept on this phone (Individual plan). It is the same value Settings > Company > 811 rules state shows.
  function pbStIndividual() { try { const t = sbCachedSubscription; return !!(sbUser && t && t.tier === 'individual' && !t.companyId); } catch (e) { return false; } }
  function pbStUid() { const uid = pbArchiveOwnerUid; return uid && uid !== 'shared' && sbUser && sbUser.id === uid ? uid : null; }
  function pbStGuess() { // a state the phone can already tell: where it is (photo stamps, last 12 hours), else the newest run's job
    try { const h = typeof window.pbHereState === 'function' ? window.pbHereState() : null; if (pbSrOk(h)) return h; } catch (e) {}
    try {
      const seen = new Set();
      for (let i = (runArchive || []).length - 1; i >= 0 && seen.size < 8; i--) {
        const n = String((runArchive[i] && runArchive[i].jobNumber) || '').trim().toLowerCase(); if (!n || seen.has(n)) continue; seen.add(n);
        const t = pbSrJob(pbDlyKey(n), n); if (t && (t.how === 'phone' || t.how === 'picked' || t.how === 'address') && pbSrOk(t.code)) return t.code;
      }
    } catch (e) {}
    return '';
  }
  function pbStSetMine(code) {
    const uid = pbStUid(); if (!uid || !pbSrOk(code)) return false;
    const o = pbSrGet(uid); o.co_local = code; pbSrPut(uid, o);
    if (o.can) pbSrPush(uid, null, code).then(() => { try { pbLocCoRender(); } catch (e) {} });
    try { pbLocRefreshScreens(); } catch (e) {} try { pbLocCoRender(); } catch (e) {}
    return true;
  }
  function pbStSetJob(num, code) { // the same pick as Change State on Locates
    const uid = pbStUid(); num = String(num || '').trim(); if (!uid || !num || !pbSrOk(code)) return false;
    const o = pbSrGet(uid); o.jobs_local[pbDlyKey(num)] = { code, num }; pbSrPut(uid, o);
    pbSrPush(uid, num, code).then(() => { try { pbLocRefreshScreens(); } catch (e) {} });
    return true;
  }
  // Home: asked once. The company account when the company has no state yet (the server says so), or an Individual plan.
  function pbStHomeWant() {
    const uid = pbStUid(); if (!uid) return false;
    try { if (localStorage.getItem('pbStLater:' + uid)) return false; } catch (e) {}
    if (pbSrCompany(uid)) return false;
    if (pbStIndividual()) return true;
    const o = pbSrGet(uid);
    if (!o.at || Date.now() - o.at > 86400000) pbSrPullSoon(uid);
    return !!(o.at && o.can);
  }
  function pbStHomeRender() {
    const el = document.getElementById('homeStateAsk'); if (!el) return;
    if (!pbStHomeWant()) { if (!el.hidden || el.dataset.k) { el.hidden = true; el.innerHTML = ''; el.dataset.k = ''; } return; }
    const g = pbStGuess(), co = !pbStIndividual(), k = (co ? 'c' : 'i') + ':' + g;
    if (el.dataset.k !== k) {
      el.innerHTML = '<div class="pb-home-att info" id="homeStateCard"><span class="t" id="homeStateH">' + (co ? 'Which state does your company work in?' : 'Which state do you work in?') + '</span>'
        + 'For 811 rules, trench rules and Ask answers. A job in another state uses its own.'
        + '<div class="pb-field pbst-f"><label for="homeStateSel">State</label><select id="homeStateSel" onchange="pbStHomePick(this.value)">' + pbSrOptions('', g ? 'Another state' : 'Pick a state') + '</select></div>'
        + '<div class="pb-pc-act">' + (g ? '<button type="button" class="pb-btn small" id="homeStateUse" onclick="pbStHomePick(' + pbLocQ(g) + ')">Use ' + escapeHtml(pbSrName(g)) + '</button>' : '')
        + '<button type="button" class="pb-btn tertiary small" id="homeStateLater" onclick="pbStHomeLater()">Not Now</button></div></div>';
      el.dataset.k = k;
    }
    el.hidden = false;
  }
  window.pbStHomePick = function(v) { if (pbStSetMine(v)) pbStHomeRender(); };
  window.pbStHomeLater = function() { const uid = pbStUid(); if (!uid) return; try { localStorage.setItem('pbStLater:' + uid, new Date().toISOString()); } catch (e) {} pbStHomeRender(); };
  { const r0 = window.pbRenderHome; if (typeof r0 === 'function') window.pbRenderHome = function() { const out = r0.apply(this, arguments); try { pbStHomeRender(); } catch (e) { console.error(e); } return out; }; }
  // New Job: the State field shows only when City, State has no state the app can read
  window.pbStNewJobSync = function(fresh) {
    const a = document.getElementById('cxnAddr'), f = document.getElementById('cxnStateF'), sel = document.getElementById('cxnState'); if (!a || !f || !sel) return;
    const co = pbSrCompany(pbArchiveOwnerUid), k = co || '-';
    if (fresh || sel.dataset.k !== k) { const keep = fresh ? '' : sel.value; sel.innerHTML = pbSrOptions('', co ? pbSrName(co) + ' (company state)' : 'Pick a state'); sel.dataset.k = k; if (pbSrOk(keep)) sel.value = keep; }
    f.hidden = !!pbSrParse(a.value);
  };
  // Ask: the state an answer was written for. The server sends { code, how } (and used: false when the state did not
  // matter to the answer), or { code: null, asked: true } when it had to ask which state.
  function pbAskStOf(x) {
    try {
      if (!x || typeof x !== 'object') return null;
      const c = String(x.code || '');
      if (pbSrOk(c)) return x.used === false ? null : { code: c };
      return !x.code && x.asked === true ? { ask: true } : null;
    } catch (e) { return null; }
  }
  let pbAskStPick = false;
  function pbAskStCanChange() { const uid = pbStUid(); if (!uid) return false; return !!pbAskCurrentJob() || pbStIndividual() || !!pbSrGet(uid).can; }
  function pbAskStHtml(h, i) {
    const t = h.st; if (!t || h.streaming || h.failed || h.local) return '';
    const sel = '<span class="pb-ai-st-pick"><label for="aiAskStSel">' + (t.ask ? 'Pick the state' : 'State for your answers') + '</label> <select id="aiAskStSel" onchange="pbAskStSet(this.value)">' + pbSrOptions('', 'Pick a state') + '</select></span>';
    if (t.ask) return i === 0 && !t.done ? '<div class="pb-ai-hint pb-ai-st" id="aiAskSt0">' + sel + '</div>' : '';
    return '<div class="pb-ai-hint pb-ai-st" id="aiAskSt' + i + '">Answered for ' + escapeHtml(pbSrName(t.code)) + '.'
      + (t.next ? ' Next answers: ' + escapeHtml(pbSrName(t.next)) + '.' : '')
      + (i === 0 && !t.next && pbAskStCanChange() ? (pbAskStPick ? sel : ' <button type="button" class="pb-edu-link" id="aiAskStChange" onclick="pbAskStChange()">Change</button>') : '') + '</div>';
  }
  window.pbAskStChange = function() { pbAskStPick = true; pbAiAskRender(); const e = document.getElementById('aiAskStSel'); if (e) e.focus({ preventScroll: true }); };
  window.pbAskStSet = function(v) {
    const uid = pbStUid(), h = pbAiAskHistory[0], t = h && h.st; if (!uid || !t || !pbSrOk(v)) return;
    const job = pbAskCurrentJob();
    if (job) pbStSetJob(job, v);                                        // the open job is in this state
    else if (pbStIndividual() || pbSrGet(uid).can) pbStSetMine(v);      // my / the company's state
    else { try { localStorage.setItem('pbAskSt:' + uid, v); } catch (e) {} } // a crew member with no job open: kept for Ask on this phone
    pbAskStPick = false;
    if (t.ask) { // Ask had to ask: the same question again, now with the state
      t.done = true; pbAiAskRender();
      const box = document.getElementById('aiAskBox'), btn = document.getElementById('aiAskBtn');
      if (box && btn && !btn.disabled && !box.value.trim()) { box.value = h.q; btn.click(); }
      return;
    }
    if (v !== t.code) t.next = v;
    pbAiAskRender();
  };
  window.__debugSt = { guess: () => pbStGuess(), want: () => pbStHomeWant(), mine: () => pbSrCompany(pbArchiveOwnerUid), render: () => pbStHomeRender() }; /* tests */

  // ---- Settings › Company: the company's state (r17.05; replaced "a new ticket is good for N days") ----''')
open(out, 'w', encoding='utf-8').write(s)
print('ask_followups app patch applied ->', out)
