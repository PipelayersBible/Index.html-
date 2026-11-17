import sys
s=open(sys.argv[1]).read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)

# 1) feedback goes with its kind (problem / idea)
rep("""      const r = await pbReportRpc('pb_support_send', { p_client_message_id: it.cid, p_body: it.body, p_app_build: it.build, p_screen: it.screen, p_expect_uid: uid });""",
"""      const r = await pbReportRpc('pb_feedback_send', { p_client_message_id: it.cid, p_kind: it.kind === 'idea' ? 'idea' : 'problem', p_body: it.body, p_app_build: it.build, p_screen: it.screen, p_expect_uid: uid }); /* r16.66: problem or idea */""")

# 2) Settings rows: Send Feedback (the quick sheet) and the owner's Beta Accounts
rep("""<button type="button" class="pb-edu-row pb-tool-row" id="settingsReportProblemBtn" data-ic="warn" onclick="pbOpenAppProblem()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Report an App Problem</span><span class="sub">Goes to the app&rsquo;s owner, not your company</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>""",
"""<button type="button" class="pb-edu-row pb-tool-row" id="settingsReportProblemBtn" data-ic="warn" onclick="pbFeedbackOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Send Feedback</span><span class="sub">A problem or an idea, straight to the app&rsquo;s owner</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>
          <button type="button" class="pb-edu-row pb-tool-row" id="settingsBetaBtn" data-ic="people" hidden onclick="pbOwnerOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Beta Accounts</span><span class="sub">Start betas, see how each company uses the app (app owner only)</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>""")
rep("""    const row = document.getElementById('settingsAppProblemsBtn'); if (!row) return;
    row.hidden = !(sbUser && pbSupAdminState.uid === sbUser.id && pbSupAdminState.admin === true);""",
"""    const row = document.getElementById('settingsAppProblemsBtn'); if (!row) return;
    row.hidden = !(sbUser && pbSupAdminState.uid === sbUser.id && pbSupAdminState.admin === true);
    { const bb = document.getElementById('settingsBetaBtn'); if (bb) bb.hidden = row.hidden; } /* r16.66 */""")

# 3) Home: the beta line
rep("""    <div id="homeCrewInvite" class="pbc-invite-wrap" hidden></div><!-- batch 13 C: crew invitation -->""",
"""    <div id="pbBetaLine" class="pb-beta-line" hidden></div><!-- r16.66: beta days left -->
    <div id="homeCrewInvite" class="pbc-invite-wrap" hidden></div><!-- batch 13 C: crew invitation -->""")

# 4) plan sets parked during the beta
rep("""    if (x.state === 'reading') return 'Reading · ' + rd + ' of ' + n;""",
"""    if (x.state === 'reading') return 'Reading · ' + rd + ' of ' + n;
    if (x.state === 'parked') return n + ' sheet' + (n === 1 ? '' : 's') + ' · Plan reading starts with a paid plan'; /* r16.66: beta */""")

# 5) CSS
rep("""#pbApp .pb-jump-end[hidden] { display: none; }""",
"""#pbApp .pb-jump-end[hidden] { display: none; }
/* r16.66: beta line, Feedback button and sheet, owner's Beta Accounts */
#pbApp .pb-beta-line { margin: 4px var(--pb-gutter, 16px) 0 var(--pb-gutter, 16px); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 14px; color: var(--pb-text-2); }
#pbApp .pb-beta-line .pb-beta-chip { font-weight: 700; color: #14171C; background: var(--pbl-yellow, #F5BF1F); border-radius: 999px; padding: 2px 10px; font-size: 13px; }
#pbApp .pb-beta-line.ended .pb-beta-chip { background: var(--pb-danger-soft, #fde2e1); color: var(--pb-danger-text, #8a1c1c); }
#pbApp .pb-beta-line[hidden], .pb-fb-pill[hidden] { display: none !important; }
.pb-fb-pill { position: fixed; left: 14px; bottom: calc(14px + var(--pb-shell-h, 0px)); z-index: 39; border: 0; border-radius: 999px; padding: 9px 14px; font: 600 14px/1 'Inter', sans-serif; color: #14171C; background: var(--pbl-yellow, #F5BF1F); box-shadow: 0 4px 14px rgba(0,0,0,.28); }
html.pb-kb-open .pb-fb-pill, html.pb-fb-open .pb-fb-pill { display: none !important; }
.pb-fb { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; justify-content: center; }
.pb-fb-card { width: 100%; max-width: 560px; box-sizing: border-box; background: var(--pb-bg, #fff); color: var(--pb-text, #14171C); border-radius: 18px 18px 0 0; padding: 18px 16px calc(18px + env(safe-area-inset-bottom, 0px)); font-family: 'Inter', sans-serif; display: flex; flex-direction: column; gap: 12px; max-height: 92vh; overflow-y: auto; }
.pb-fb-top { display: flex; align-items: center; justify-content: space-between; font-size: 18px; font-weight: 700; }
.pb-fb-x { border: 0; background: none; color: inherit; font-size: 26px; line-height: 1; padding: 4px 8px; }
.pb-fb-seg { display: flex; gap: 8px; }
.pb-fb-seg button { flex: 1; border: 1.5px solid var(--pb-divider, #ccc); background: none; color: inherit; border-radius: 10px; padding: 10px; font: 600 15px 'Inter', sans-serif; }
.pb-fb-seg button[aria-pressed="true"] { border-color: var(--pbl-yellow, #F5BF1F); background: var(--pbl-yellow, #F5BF1F); color: #14171C; }
.pb-fb-card textarea, .pb-fb-card input { width: 100%; box-sizing: border-box; font: 16px/1.4 'Inter', sans-serif; padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--pb-divider, #ccc); background: var(--pb-surface, #fff); color: inherit; }
.pb-fb-card textarea { min-height: 120px; resize: vertical; }
.pb-fb-st { margin: 0; font-size: 14px; color: var(--pb-text-2, #555); min-height: 1px; }
.pb-fb-card .pb-btn { margin: 0; width: 100%; font: 600 16px 'Inter', sans-serif; text-transform: none; letter-spacing: 0; border-radius: 12px; padding: 13px 14px; border: 1.5px solid var(--pbl-yellow, #F5BF1F); background: var(--pbl-yellow, #F5BF1F); color: #14171C; }
.pb-fb-card .pb-btn.ghost { background: none; color: inherit; border-color: var(--pb-divider, #ccc); }
.pb-fb-card .pb-btn.small { font-size: 14px; padding: 10px; }
.pb-fb-card .pb-btn:disabled { opacity: .55; }
.pb-fb-link { border: 0; background: none; color: var(--pb-text-2, #555); text-decoration: underline; font: 14px 'Inter', sans-serif; padding: 0; align-self: flex-start; }
.pb-own-co { border-radius: 14px; background: var(--pb-surface, #fff); box-shadow: var(--pb-elev-1, 0 1px 3px rgba(0,0,0,.15)); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; }
.pb-own-co .nm { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; flex-wrap: wrap; }
.pb-own-co .ch { font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 8px; background: var(--pbl-yellow, #F5BF1F); color: #14171C; }
.pb-own-co .ch.paid { background: #2f9e5b; color: #fff; } .pb-own-co .ch.ended { background: #b42318; color: #fff; }
.pb-own-co .ln { color: var(--pb-text-2, #555); }
.pb-own-co .acts { display: flex; gap: 8px; margin-top: 4px; } .pb-own-co .acts .pb-btn { flex: 1; margin: 0; }
.pb-own-form { display: flex; flex-direction: column; gap: 8px; }""")

# 6) the module (after the support helpers, in their closure)
rep("""  window.pbSupRetryNow = function() { pbSupFlush({}); };""",
"""  window.pbSupRetryNow = function() { pbSupFlush({}); };
  /* r16.66: beta accounts (pb_my_plan), quick feedback (problem / idea), feature use counts (pb_usage_add), the owner's Beta Accounts */
  (function() {
    const USE_KEY = 'pbUse1';
    let use = {}; try { use = JSON.parse(localStorage.getItem(USE_KEY) || '{}') || {}; } catch (e) { use = {}; }
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const saveUse = () => { try { localStorage.setItem(USE_KEY, JSON.stringify(use)); } catch (e) {} };
    window.pbTrack = function(ev) {
      try {
        ev = String(ev || '').toLowerCase().replace(/[^a-z0-9_.:-]/g, '').slice(0, 48); if (!ev) return;
        const k = today() + '|' + ev; use[k] = (use[k] || 0) + 1;
        const ks = Object.keys(use); if (ks.length > 400) ks.sort().slice(0, ks.length - 300).forEach((x) => { delete use[x]; });
        saveUse();
      } catch (e) {}
    };
    let useBusy = false;
    async function useFlush() {
      if (useBusy || !sbClient || typeof sbClient.rpc !== 'function' || !sbUser || navigator.onLine === false) return;
      const keys = Object.keys(use).slice(0, 100); if (!keys.length) return;
      const batch = {}; keys.forEach((k) => { batch[k] = use[k]; });
      useBusy = true;
      try {
        const r = await sbClient.rpc('pb_usage_add', { p_events: batch });
        if (r && !r.error && r.data && r.data.ok) { keys.forEach((k) => { use[k] = (use[k] || 0) - batch[k]; if (use[k] <= 0) delete use[k]; }); saveUse(); }
      } catch (e) {} finally { useBusy = false; }
    }
    window.pbUseFlush = useFlush;
    setInterval(useFlush, 120000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') useFlush(); });
    window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : [];
    window.pbScreenHooks.push(function(name) { window.pbTrack('scr:' + name); pbBetaRender(); });
    window.pbTrack('open');

    // the plan: beta days left, or ended
    let plan = null;
    const planKey = () => 'pbPlan:' + (sbUser ? sbUser.id : '');
    function pbBetaRender() {
      const beta = !!(plan && plan.plan === 'trial'), ended = beta && !!plan.expired;
      const line = document.getElementById('pbBetaLine');
      if (line) {
        line.hidden = !beta; line.classList.toggle('ended', ended);
        if (beta) line.innerHTML = ended
          ? '<span class="pb-beta-chip">Beta ended</span><span>Your records are all here. AI and new plan sets are off until your company starts a plan.</span>'
          : '<span class="pb-beta-chip">Beta</span><span>' + (plan.days_left === 1 ? '1 day left' : (plan.days_left || 0) + ' days left') + '</span>';
      }
      let pill = document.getElementById('pbFbPill');
      if (!pill && beta) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'pbFbPill'; pill.className = 'pb-fb-pill'; pill.textContent = 'Feedback'; pill.onclick = () => window.pbFeedbackOpen(); document.body.appendChild(pill); }
      if (pill) pill.hidden = !beta || ['appProblem', 'appProblems', 'login', 'auth'].includes(typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '');
    }
    async function pbPlanLoad() {
      if (!sbUser) { plan = null; pbBetaRender(); return; }
      try { plan = JSON.parse(localStorage.getItem(planKey()) || 'null'); } catch (e) { plan = null; }
      pbBetaRender();
      if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return;
      try {
        const r = await sbClient.rpc('pb_my_plan');
        if (r && !r.error && r.data && r.data.ok) { plan = r.data; try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {} }
      } catch (e) {}
      pbBetaRender();
    }
    window.pbPlanNow = () => plan;
    window.pbAccountLoadHooks.push(() => { plan = null; setTimeout(() => { pbPlanLoad(); useFlush(); }, 2000); });
    document.addEventListener('focusin', (e) => { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) document.documentElement.classList.add('pb-kb-open'); });
    document.addEventListener('focusout', () => { setTimeout(() => { const a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.documentElement.classList.remove('pb-kb-open'); }, 50); });

    // quick feedback: Problem / Idea, one box, Send (kept on the phone and sent like app problem reports)
    window.pbFeedbackOpen = function(kind) {
      const from = typeof pbCurrentScreen === 'string' ? pbCurrentScreen : 'home';
      let k = kind === 'idea' ? 'idea' : 'problem';
      const ov = document.createElement('div'); ov.className = 'pb-fb'; ov.id = 'pbFbSheet';
      ov.innerHTML = '<div class="pb-fb-card" role="dialog" aria-modal="true" aria-labelledby="pbFbTitle">'
        + '<div class="pb-fb-top"><span id="pbFbTitle">Send Feedback</span><button type="button" class="pb-fb-x" aria-label="Close" id="pbFbX">&times;</button></div>'
        + '<div class="pb-fb-seg" role="group" aria-label="Kind"><button type="button" data-k="problem">Problem</button><button type="button" data-k="idea">Idea</button></div>'
        + '<textarea id="pbFbText" maxlength="3000" aria-label="Feedback"></textarea>'
        + '<button type="button" class="pb-btn" id="pbFbSend">Send</button>'
        + '<p class="pb-fb-st" id="pbFbSt" role="status"></p>'
        + '<button type="button" class="pb-fb-link" id="pbFbPast">Past reports</button></div>';
      document.body.appendChild(ov); document.documentElement.classList.add('pb-fb-open');
      const ta = ov.querySelector('#pbFbText'), st = ov.querySelector('#pbFbSt'), send = ov.querySelector('#pbFbSend');
      const setK = (x) => { k = x; ov.querySelectorAll('.pb-fb-seg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k))); ta.placeholder = k === 'idea' ? 'What would make the app better?' : 'What happened? What did you expect?'; };
      setK(k);
      ov.querySelectorAll('.pb-fb-seg button').forEach((b) => { b.onclick = () => setK(b.dataset.k); });
      const close = () => { ov.remove(); document.documentElement.classList.remove('pb-fb-open'); };
      ov.querySelector('#pbFbX').onclick = close;
      ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
      ov.querySelector('#pbFbPast').onclick = () => { close(); window.pbOpenAppProblem(); };
      setTimeout(() => { try { ta.focus(); } catch (e) {} }, 50);
      send.onclick = async () => {
        const text = ta.value.trim();
        if (!text) { st.textContent = k === 'idea' ? 'Type your idea first.' : 'Say what happened first.'; return; }
        const uid = await pbResolveStorageUserId();
        if (!uid || uid === 'shared') { st.textContent = 'Log in to send feedback.'; return; }
        if (send.disabled) return; send.disabled = true;
        try {
          const item = { cid: pbGenerateClientRunId(), kind: k, body: text.slice(0, PB_SUP_MAX_BODY), build: PB_APP_BUILD, screen: pbSupScreenLabel(from).slice(0, 60), at: new Date().toISOString(), st: 'queued', why: '' };
          const saved = await pbSupEdit(uid, (q) => q.concat([item]));
          if (!saved) { st.textContent = 'Couldn’t save it on this phone. ' + pbSaveAdvice(); return; }
          window.pbTrack('feedback:' + k);
          ta.value = ''; st.textContent = 'Sending…';
          const r = await pbSupFlush({});
          st.textContent = r === 'ok' ? 'Sent. Thank you.' : 'Saved. It sends by itself when there’s signal.';
          setTimeout(() => { if (document.body.contains(ov)) close(); }, 1400);
        } finally { send.disabled = false; }
      };
    };

    // the app owner's Beta Accounts
    const FEAT = { stake: 'stake reads', teacher: 'Ask', analysis: 'Ask (stats)', cutsheet: 'cut sheets', ticket: 'tickets', plans_strong: 'plan questions' };
    const SCR = (ev) => ev.replace(/^scr:/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    window.pbOwnerOpen = async function() {
      const ov = document.createElement('div'); ov.className = 'pb-fb'; ov.id = 'pbOwnerSheet';
      ov.innerHTML = '<div class="pb-fb-card" role="dialog" aria-modal="true" aria-labelledby="pbOwnTitle" style="max-height:96vh">'
        + '<div class="pb-fb-top"><span id="pbOwnTitle">Beta Accounts</span><button type="button" class="pb-fb-x" aria-label="Close" id="pbOwnX">&times;</button></div>'
        + '<div class="pb-own-form"><input id="pbOwnName" maxlength="120" placeholder="Company name" autocomplete="off"><input id="pbOwnEmail" type="email" maxlength="254" placeholder="Owner’s email" autocomplete="off" autocapitalize="off"><button type="button" class="pb-btn" id="pbOwnStart">Start a 30-Day Beta</button><p class="pb-fb-st" id="pbOwnSt" role="status"></p></div>'
        + '<div id="pbOwnList" style="display:flex;flex-direction:column;gap:10px"><p class="pb-fb-st">Loading…</p></div></div>';
      document.body.appendChild(ov); document.documentElement.classList.add('pb-fb-open');
      const close = () => { ov.remove(); document.documentElement.classList.remove('pb-fb-open'); };
      ov.querySelector('#pbOwnX').onclick = close;
      const list = ov.querySelector('#pbOwnList'), st = ov.querySelector('#pbOwnSt');
      async function load() {
        let r; try { r = await sbClient.rpc('pb_owner_overview'); } catch (e) { r = { error: e }; }
        if (!r || r.error || !r.data || !r.data.ok) { list.innerHTML = '<p class="pb-fb-st">Couldn’t load. Check signal and open it again.</p>'; return; }
        const cos = r.data.companies || [];
        list.innerHTML = cos.length ? cos.map((c) => {
          const beta = c.plan === 'trial', left = beta && c.trial_ends_at ? Math.ceil((new Date(c.trial_ends_at) - Date.now()) / 86400000) : null, ended = beta && left !== null && left <= 0;
          const ai = Object.entries(c.ai || {}).filter(([f]) => f !== 'gonogo_q').sort((a, b) => b[1] - a[1]).map(([f, n]) => n + ' ' + (FEAT[f] || f)).join(' · ');
          const ev = Object.entries(c.events || {}).filter(([e]) => e.startsWith('scr:') && !/^scr:(home|settings)$/.test(e)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([e, n]) => SCR(e) + ' ' + n).join(' · ');
          const fb = Object.entries(c.events || {}).filter(([e]) => e.startsWith('feedback:')).reduce((a, [, n]) => a + n, 0);
          return '<div class="pb-own-co" data-id="' + escapeHtml(c.id) + '"><div class="nm">' + escapeHtml(c.name || '') + ' <span class="ch' + (beta ? (ended ? ' ended' : '') : ' paid') + '">' + (beta ? (ended ? 'Beta ended' : 'Beta · ' + left + (left === 1 ? ' day' : ' days') + ' left') : 'Paid') + '</span></div>'
            + '<div class="ln">' + c.users + ' user' + (c.users === 1 ? '' : 's') + ' · ' + c.active_7d + ' active this week · used on ' + c.active_days + ' of the last 30 days</div>'
            + '<div class="ln">AI, 30 days: ' + (ai || 'none') + ' · $' + Number(c.ai_usd || 0).toFixed(2) + '</div>'
            + (ev ? '<div class="ln">Most used: ' + escapeHtml(ev) + '</div>' : '')
            + '<div class="ln">Plan sets: ' + c.plan_sets + (c.plan_sheets ? ' (' + c.plan_sheets + ' sheets)' : '') + ' · Feedback: ' + Math.max(c.feedback || 0, fb) + '</div>'
            + (beta ? '<div class="acts"><button type="button" class="pb-btn ghost small" data-act="extend">Add 30 Days</button><button type="button" class="pb-btn small" data-act="paid">Make Paid</button></div>' : '')
            + '</div>';
        }).join('') : '<p class="pb-fb-st">No companies yet.</p>';
        list.querySelectorAll('[data-act]').forEach((b) => { b.onclick = async () => {
          const id = b.closest('.pb-own-co').dataset.id, paid = b.dataset.act === 'paid';
          if (paid && !(await new Promise((ok) => pbShowModal('Switch this company to paid? Its parked plan sets start reading now.', [{ label: 'Cancel', onClick: () => ok(false) }, { label: 'Make Paid', primary: true, onClick: () => ok(true) }])))) return;
          b.disabled = true;
          let r; try { r = await sbClient.rpc('pb_owner_company_set', { p_company: id, p_plan: paid ? 'paid' : 'trial', p_days: 30 }); } catch (e) { r = { error: e }; }
          if (!r || r.error || !r.data || !r.data.ok) { pbAlert('Not changed. Check signal and try again.', 'Not Changed'); b.disabled = false; return; }
          load();
        }; });
      }
      ov.querySelector('#pbOwnStart').onclick = async () => {
        const name = ov.querySelector('#pbOwnName').value.trim(), email = ov.querySelector('#pbOwnEmail').value.trim(), btn = ov.querySelector('#pbOwnStart');
        if (!name || !email) { st.textContent = 'Type the company name and the owner’s email.'; return; }
        if (btn.disabled) return; btn.disabled = true; st.textContent = 'Starting…';
        let r; try { r = await sbClient.functions.invoke('owner-admin', { body: { action: 'trial_create', company_name: name, email } }); } catch (e) { r = { error: e }; }
        btn.disabled = false;
        const d = r && r.data;
        if (!d || !d.ok) { st.textContent = (d && d.message) || 'Couldn’t start it. Check signal and try again.'; return; }
        st.textContent = d.invited ? 'Started. They’ll get an email to set up their account.' : 'Started. They already had an account, so it’s ready when they open the app.';
        ov.querySelector('#pbOwnName').value = ''; ov.querySelector('#pbOwnEmail').value = '';
        load();
      };
      load();
    };
  })();""")
open(sys.argv[2],'w').write(s)
