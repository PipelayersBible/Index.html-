# Owner Dashboard (app owner only) + two new usage counts (build in use, crash count). Applies on r17.11 (_src/index.html).
# Usage: python3 p01_owner_dashboard.py in.html out.html
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, ('anchor count %d' % n, a[:90])
    s = s.replace(a, b)

# 1. Settings > App: the row (hidden; shown with Beta Accounts, for the app owner only)
rep('''onclick="pbOwnerOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Beta Accounts</span><span class="sub">Start betas, Make Paid, billing due, hand over (app owner only)</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>''',
'''onclick="pbOwnerOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Beta Accounts</span><span class="sub">Start betas, Make Paid, billing due, hand over (app owner only)</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>
          <button type="button" class="pb-edu-row pb-tool-row" id="settingsCeoBtn" data-ic="flag" hidden onclick="pbCeoOpen()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Owner Dashboard</span><span class="sub">Money, use, costs, safety and account sharing (app owner only)</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>''')
rep("""    { const bb = document.getElementById('settingsBetaBtn'); if (bb) bb.hidden = row.hidden; } /* r16.66 */""",
"""    { const bb = document.getElementById('settingsBetaBtn'); if (bb) bb.hidden = row.hidden; } /* r16.66 */
    { const cb = document.getElementById('settingsCeoBtn'); if (cb) cb.hidden = row.hidden; } /* owner dashboard */""")

# 2. Usage counts the dashboard reads: the build each person is on (once a day is enough; the server keeps the newest per person),
#    and a count of crash reports (only when the crash reporter accepted one, so "Send crash reports" off = not counted).
rep("""    window.pbTrack('open');""",
"""    window.pbTrack('open');
    try { const bd = String(window.PB_APP_BUILD || '').split(' ')[0]; if (/^r\\d/.test(bd)) window.pbTrack('build:' + bd); } catch (e) {} /* owner dashboard: builds in use */
    try { for (let i = 0; i < Math.min(Number(window.__pbCrashN) || 0, 10); i++) window.pbTrack('crash'); window.__pbCrashN = 0; } catch (e) {} /* crashes before this point */""")
rep("""try { if (!allowed() || quiet()) return false; return take(build(err, opts)); }""",
"""try { if (!allowed() || quiet()) return false; var took = take(build(err, opts)); if (took) { try { if (typeof window.pbTrack === 'function') window.pbTrack('crash'); else window.__pbCrashN = (window.__pbCrashN || 0) + 1; } catch (x) {} } return took; }""")

# 3. The page
JS = r"""  /* Owner Dashboard (app owner only): one call, public.pb_owner_dashboard(p_days); account sharing list from pb_owner_share_events when it is live. */
  (function () {
    const CSS = `
#pbCeo { position: fixed; inset: 0; z-index: 48; background: var(--pb-canvas, #08090B); color: var(--pb-text, #F4F6F8); font-family: var(--pb-font); overflow-y: auto; -webkit-overflow-scrolling: touch; }
#pbCeo * { box-sizing: border-box; }
#pbCeo .cx-top { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px; background: var(--pb-surface, #171B21); border-bottom: 1px solid var(--pb-divider, #2C323B); }
#pbCeo .cx-top h1 { font-size: 20px; line-height: 1.2; margin: 0; flex: 1 1 auto; font-weight: 700; }
#pbCeo .cx-top .cx-as { width: 100%; order: 3; font-size: 13px; color: var(--pb-text-3, #9AA3AF); margin: 0; }
#pbCeo .cx-seg { display: inline-flex; border: 1px solid var(--pb-divider, #2C323B); border-radius: 999px; overflow: hidden; }
#pbCeo .cx-seg button, #pbCeo .cx-btn { appearance: none; border: 0; background: transparent; color: var(--pb-text-2, #B3BBC6); font: 600 14px/1 var(--pb-font); padding: 9px 12px; min-height: 36px; cursor: pointer; }
#pbCeo .cx-seg button[aria-pressed="true"] { background: var(--pb-brand, #F4C542); color: var(--pb-brand-ink, #111318); }
#pbCeo .cx-btn { border: 1px solid var(--pb-divider, #2C323B); border-radius: 999px; }
#pbCeo .cx-x { appearance: none; border: 0; background: none; color: inherit; font-size: 28px; line-height: 1; padding: 2px 8px; cursor: pointer; }
#pbCeo .cx-body { max-width: 1280px; margin: 0 auto; padding: 16px 16px calc(32px + env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 22px; }
#pbCeo h2 { font-size: 15px; letter-spacing: .02em; color: var(--pb-text-2, #B3BBC6); margin: 0 0 10px; font-weight: 700; }
#pbCeo .cx-kpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
#pbCeo .cx-kpi { background: var(--pb-surface, #171B21); border: 1px solid var(--pb-divider, #2C323B); border-radius: 14px; padding: 12px 14px; min-width: 0; }
#pbCeo .cx-kpi .k { font-size: 13px; color: var(--pb-text-3, #9AA3AF); }
#pbCeo .cx-kpi .v { font-size: 26px; font-weight: 700; line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
#pbCeo .cx-kpi .s { font-size: 12px; color: var(--pb-text-3, #9AA3AF); }
#pbCeo .cx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 12px; align-items: start; }
#pbCeo .cx-card { background: var(--pb-surface, #171B21); border: 1px solid var(--pb-divider, #2C323B); border-radius: 14px; padding: 14px; min-width: 0; }
#pbCeo .cx-card h3 { font-size: 16px; margin: 0 0 8px; font-weight: 700; }
#pbCeo .cx-card p { margin: 4px 0; font-size: 14px; line-height: 1.45; color: var(--pb-text-2, #B3BBC6); }
#pbCeo .cx-row { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-top: 1px solid var(--pb-divider, #2C323B); font-size: 14px; }
#pbCeo .cx-row:first-of-type { border-top: 0; }
#pbCeo .cx-row > span:first-child { min-width: 0; overflow-wrap: anywhere; }
#pbCeo .cx-row > span:last-child { flex: 0 0 auto; text-align: right; font-variant-numeric: tabular-nums; color: var(--pb-text, #F4F6F8); }
#pbCeo .cx-muted { color: var(--pb-text-3, #9AA3AF) !important; }
#pbCeo .cx-attn { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
#pbCeo .cx-attn li { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; font-size: 15px; line-height: 1.4; background: var(--pb-info-soft, #13202E); border-left: 4px solid var(--pb-info, #8CC2FF); }
#pbCeo .cx-attn li.red { background: var(--pb-danger-soft, #2B1316); border-left-color: var(--pb-danger-line, #E0505C); }
#pbCeo .cx-attn li.amber { background: var(--pb-warn-soft, #2A1F10); border-left-color: var(--pb-warn, #FFAA4D); }
#pbCeo .cx-attn .tag { flex: 0 0 auto; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,.08); white-space: nowrap; margin-top: 1px; }
#pbCeo .cx-attn li.red .tag { color: var(--pb-danger-text, #FF8F96); }
#pbCeo .cx-attn li.amber .tag { color: var(--pb-warn-text, #FFD08A); }
#pbCeo .cx-attn li.ok { background: var(--pb-ok-soft, #10241A); border-left-color: var(--pb-ok, #5FD39A); }
#pbCeo .cx-bars { display: flex; align-items: flex-end; gap: 2px; height: 72px; margin: 8px 0 2px; }
#pbCeo .cx-bars i { flex: 1 1 0; min-width: 2px; background: var(--pb-brand, #F4C542); border-radius: 2px 2px 0 0; opacity: .9; }
#pbCeo .cx-bars i.z { background: var(--pb-divider, #2C323B); height: 2px !important; }
#pbCeo .cx-bars.blue i { background: var(--pb-info, #8CC2FF); }
#pbCeo .cx-bars.green i { background: var(--pb-ok, #5FD39A); }
#pbCeo .cx-bars.red i { background: var(--pb-danger-line, #E0505C); }
#pbCeo .cx-axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--pb-text-3, #9AA3AF); }
#pbCeo .cx-meter { height: 8px; border-radius: 999px; background: var(--pb-raised-2, #2A3038); overflow: hidden; margin-top: 4px; }
#pbCeo .cx-meter > i { display: block; height: 100%; background: var(--pb-ok, #5FD39A); }
#pbCeo .cx-meter.warn > i { background: var(--pb-warn, #FFAA4D); }
#pbCeo .cx-meter.bad > i { background: var(--pb-danger-line, #E0505C); }
#pbCeo .cx-chip { display: inline-block; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--pb-raised-2, #2A3038); color: var(--pb-text-2, #B3BBC6); white-space: nowrap; }
#pbCeo .cx-chip.ok { background: var(--pb-ok-soft, #10241A); color: var(--pb-ok, #5FD39A); }
#pbCeo .cx-chip.warn { background: var(--pb-warn-soft, #2A1F10); color: var(--pb-warn-text, #FFD08A); }
#pbCeo .cx-chip.bad { background: var(--pb-danger-soft, #2B1316); color: var(--pb-danger-text, #FF8F96); }
#pbCeo .cx-not { border-style: dashed; }
#pbCeo .cx-st { font-size: 15px; color: var(--pb-text-2, #B3BBC6); }
#pbCeo .cx-ctl { display: flex; gap: 8px; align-items: center; }
#pbCeo .cx-more { margin-top: 8px; }
@media (max-width: 640px) { #pbCeo .cx-ctl { order: 2; width: 100%; } #pbCeo .cx-x { order: 1; } }
@media (max-width: 520px) { #pbCeo .cx-kpi .v { font-size: 22px; } #pbCeo .cx-top h1 { font-size: 18px; } }
`;
    const esc = (x) => escapeHtml(x == null ? '' : String(x));
    const num = (x) => Math.round(Number(x) || 0).toLocaleString();
    const usd = (x, dp) => '$' + (Number(x) || 0).toLocaleString('en-US', { minimumFractionDigits: dp == null ? 2 : dp, maximumFractionDigits: dp == null ? 2 : dp });
    const cents = (c) => usd((Number(c) || 0) / 100, (Number(c) || 0) % 100 ? 2 : 0);
    const day = (d) => { if (!d) return ''; const t = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(t) ? '' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
    const when = (d) => { if (!d) return 'never'; const t = new Date(d); if (isNaN(t)) return ''; const h = (Date.now() - t) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min ago' : h < 48 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' days ago'; };
    const row = (k, v, cls) => '<div class="cx-row"><span>' + k + '</span><span' + (cls ? ' class="' + cls + '"' : '') + '>' + v + '</span></div>';
    const card = (title, inner, cls) => '<div class="cx-card' + (cls ? ' ' + cls : '') + '"><h3>' + title + '</h3>' + inner + '</div>';
    const FEAT = { teacher: 'Ask', analysis: 'Ask (crew stats)', stake: 'Stake reads', cutsheet: 'Cut sheets', ticket: 'Tickets', plans_strong: 'Plan questions', gonogo_q: 'Permit safety checks' };
    const SHARE = { tried_in_use: 'Tried to sign in while in use elsewhere', tried_full: 'Tried a third device', took_place: 'Signed a device out to get in',
      far_apart: 'Used too far apart to drive', back_and_forth: 'Switched devices back and forth' };
    const STATE = { active: ['Paid', 'ok'], past_due: ['Past due', 'warn'], read_only: ['Read-only', 'bad'], canceled: ['Canceled', 'bad'], no_billing: ['Paid · no billing set up', ''] };
    function bars(list, key, cls, fmt) {
      const v = list.map((x) => Number(x[key]) || 0), max = Math.max(...v, 0), tot = v.reduce((a, b) => a + b, 0);
      const f = fmt || num, first = list[0], last = list[list.length - 1];
      return '<div class="cx-bars ' + (cls || '') + '" role="img" aria-label="' + esc(f(tot) + ' in total, most in one day ' + f(max)) + '">'
        + v.map((n, i) => '<i' + (n ? ' style="height:' + Math.max(4, Math.round(100 * n / (max || 1))) + '%"' : ' class="z"') + ' title="' + esc(day(list[i].day) + ': ' + f(n)) + '"></i>').join('')
        + '</div><div class="cx-axis"><span>' + esc(first ? day(first.day) : '') + '</span><span>Total ' + esc(f(tot)) + '</span><span>' + esc(last ? day(last.day) : '') + '</span></div>';
    }
    function meter(pct) { const p = Math.max(0, Math.min(100, Number(pct) || 0)); return '<div class="cx-meter' + (pct >= 100 ? ' bad' : pct >= 80 ? ' warn' : '') + '"><i style="width:' + p + '%"></i></div>'; }
    let days = 30, D = null, shareRows = null, attnAll = false;
    try { days = Number(localStorage.getItem('pbCeoDays')) || 30; } catch (e) {}
    if (![7, 30, 90].includes(days)) days = 30;

    function render(ov) {
      const body = ov.querySelector('.cx-body'), as = ov.querySelector('.cx-as');
      ov.querySelectorAll('.cx-seg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.d) === days)));
      if (!D) return;
      as.textContent = 'As of ' + new Date(D.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' · last ' + D.days + ' days';
      const M = D.money || {}, C = D.costs || {}, G = D.growth || {}, S = D.security || {}, R = D.reliability || {}, F = D.safety || {}, A = D.ask || {}, MC = M.counts || {};
      const attn = D.attention || [];
      const LV = { red: 'Now', amber: 'Soon', info: 'FYI' };
      const showN = attnAll ? attn.length : 6;
      let h = '<section aria-labelledby="cxAttnH"><h2 id="cxAttnH">Needs your attention' + (attn.length ? ' (' + attn.length + ')' : '') + '</h2><ul class="cx-attn">'
        + (attn.length ? attn.slice(0, showN).map((a) => '<li class="' + esc(a.level) + '"><span class="tag">' + esc(LV[a.level] || 'FYI') + '</span><span>' + esc(a.text) + '</span></li>').join('')
          : '<li class="ok"><span class="tag">OK</span><span>Nothing needs you right now.</span></li>') + '</ul>'
        + (attn.length > 6 ? '<button type="button" class="cx-btn cx-more" id="cxAttnMore" aria-expanded="' + attnAll + '">' + (attnAll ? 'Show Fewer' : 'Show All ' + attn.length) + '</button>' : '') + '</section>';
      // headline numbers
      const margin = C.margin_mtd_cents;
      h += '<section aria-label="Headline numbers"><div class="cx-kpis">'
        + '<div class="cx-kpi"><div class="k">Monthly revenue (MRR)</div><div class="v">' + cents(M.mrr_cents) + '</div><div class="s">' + cents((Number(M.mrr_cents) || 0) * 12) + ' a year</div></div>'
        + '<div class="cx-kpi"><div class="k">Companies</div><div class="v">' + num((MC.paid || 0) + (MC.beta || 0)) + '</div><div class="s">' + num(MC.paid) + ' paid · ' + num(MC.beta) + ' in beta</div></div>'
        + '<div class="cx-kpi"><div class="k">People in the app</div><div class="v">' + num(G.active_7) + '</div><div class="s">this week · ' + num(G.active_today) + ' today</div></div>'
        + '<div class="cx-kpi"><div class="k">Feet laid</div><div class="v">' + num((G.totals || {}).feet) + '</div><div class="s">' + num((G.totals || {}).runs) + ((G.totals || {}).runs === 1 ? ' run sent' : ' runs sent') + '</div></div>'
        + '<div class="cx-kpi"><div class="k">AI cost this month</div><div class="v">' + usd(C.ai_mtd_usd) + '</div><div class="s">' + usd(C.ai_today_usd) + ' today</div></div>'
        + '<div class="cx-kpi"><div class="k">Left after AI' + (C.fixed_month_cents == null ? '' : ' and hosting') + '</div><div class="v">' + cents(margin) + '</div><div class="s">this month' + (C.fixed_month_cents == null ? ' · hosting not set' : '') + '</div></div>'
        + '</div></section>';
      // MONEY
      const cos = M.companies || [];
      h += '<section aria-labelledby="cxMoneyH"><h2 id="cxMoneyH">Money</h2><div class="cx-grid">'
        + card('Companies', cos.length ? cos.map((c) => {
            const st = c.plan === 'trial' ? (c.days_left != null && c.days_left > 0 ? ['Beta · ' + c.days_left + (c.days_left === 1 ? ' day' : ' days') + ' left', c.days_left <= 7 ? 'warn' : ''] : ['Beta ended', 'bad']) : (STATE[c.state] || [c.state || 'Paid', '']);
            return row(esc(c.name) + ' <span class="cx-chip ' + st[1] + '">' + esc(st[0]) + '</span>', esc(num(c.seats_used) + (c.seats_used === 1 ? ' person' : ' people')) + (c.mrr_cents ? ' · ' + cents(c.mrr_cents) + '/mo' : ''));
          }).join('') : '<p>No companies yet.</p>')
        + card('Revenue', row('Company plans', cents(M.company_mrr_cents) + '/mo') + row('Individual plans (' + num((M.individuals || {}).active) + ')', cents(M.individual_mrr_cents) + '/mo')
            + row('If every beta paid today', cents(M.beta_pipeline_cents) + '/mo') + row('Seats used / paid', num(MC.seats_used) + ' / ' + num(MC.seats_paid))
            + (MC.paid_no_billing ? '<p class="cx-muted">' + num(MC.paid_no_billing) + ' paid company with no billing set up (not counted).</p>' : '')
            + '<p class="cx-muted">Payments: ' + (M.stripe_connected ? 'Stripe connected.' : 'invoices by hand (Stripe not connected).') + ' Sales tax is not added by the app; each company’s billing state is on its invoice.</p>')
        + card('Renewals and founder prices', ((M.renewals_30 || []).length ? (M.renewals_30 || []).map((x) => row(esc(x.company) + (x.founder ? ' <span class="cx-chip">founder</span>' : ''), esc(day(x.paid_through)) + ' · ' + cents(x.amount_cents))).join('') : '<p>No renewals in the next 30 days.</p>')
            + ((M.founder_locks || []).length ? '<p class="cx-muted">Founder price ends: ' + (M.founder_locks || []).map((x) => esc(x.company + ' ' + day(x.until))).join(' · ') + '</p>' : ''))
        + '</div></section>';
      // COSTS
      const stops = (C.stops || []).filter((x) => Number(x.usd) > 0 || Number(x.pct) >= 50).slice(0, 8);
      const st = C.storage_gb || {}, stTot = Object.values(st).reduce((a, b) => a + (Number(b) || 0), 0);
      h += '<section aria-labelledby="cxCostH"><h2 id="cxCostH">Costs</h2><div class="cx-grid">'
        + card('AI cost per day', bars(C.ai_by_day || [], 'usd', '', (n) => usd(n)) + row('Last ' + D.days + ' days', usd(C.ai_window_usd)))
        + card('AI by feature (' + D.days + ' days)', (C.ai_by_feature || []).length ? (C.ai_by_feature || []).map((x) => row(esc(FEAT[x.feature] || x.feature) + ' <span class="cx-muted">' + num(x.n) + ' uses</span>', usd(x.usd) + ' <span class="cx-muted">' + usd(x.n ? x.usd / x.n : 0, 3) + ' each</span>')).join('') : '<p>No AI cost logged.</p>')
        + card('AI money used this month', (stops.length ? stops.map((x) => '<div class="cx-row" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc(x.who) + '</span><span>' + usd(x.usd) + ' of ' + usd(x.stop, Number(x.stop) % 1 ? 2 : 0) + ' · ' + num(x.pct) + '%</span></div>' + meter(x.pct) + '</div>').join('') : '<p>No one has used AI money this month.</p>')
            + '<p class="cx-muted">At 100% the server stops that company’s AI until the 1st.</p>')
        + card('AI by company (' + D.days + ' days)', (C.ai_by_company || []).length ? (C.ai_by_company || []).map((x) => row(esc(x.company), usd(x.usd))).join('') : '<p>None.</p>')
        + card('Storage, email, push', Object.keys(st).sort().map((b) => row(esc(b), (Number(st[b]) || 0).toFixed(2) + ' GB')).join('') + row('Database', (Number(C.db_gb) || 0).toFixed(2) + ' GB') + row('<strong>Files in all</strong>', stTot.toFixed(2) + ' GB')
            + row('Plan sheets read this month', num(C.plan_sheets_mtd) + ' · ' + usd(C.plan_usd_mtd))
            + row('Emails this month', num(Object.values(C.emails_mtd || {}).reduce((a, b) => a + (Number(b) || 0), 0)) + ' <span class="cx-muted">' + esc(Object.entries(C.emails_mtd || {}).map(([k, v]) => k + ' ' + v).join(' · ')) + '</span>')
            + row('Push notices (' + D.days + ' days)', num((C.pushes || {}).sent) + ' sent · ' + num((C.pushes || {}).gave_up) + ' failed'))
        + '</div></section>';
      // GROWTH
      const fv = G.first_value || {}, by = G.by_day || [];
      h += '<section aria-labelledby="cxGrowH"><h2 id="cxGrowH">Growth and use</h2><div class="cx-grid">'
        + card('People in the app per day', bars(by, 'active', 'blue') + row('Today / 7 days / 30 days', num(G.active_today) + ' / ' + num(G.active_7) + ' / ' + num(G.active_30)) + row('Companies active this week', num(G.active_companies_7))
            + (G.usage_since ? '<p class="cx-muted">Counted since ' + esc(day(G.usage_since)) + '.</p>' : ''))
        + card('Work done per day', bars(by, 'runs', 'green') + row('Runs sent', num((G.totals || {}).runs)) + row('Feet laid', num((G.totals || {}).feet)) + row('Daily reports', num((G.totals || {}).reports))
            + row('Production entries', num((G.totals || {}).entries)) + row('Permits', num((G.totals || {}).permits)) + row('Plan sets', num((G.totals || {}).plan_sets)))
        + card('Sign-ups and invites', bars(by, 'signups', 'blue') + row('New logins', num(G.new_logins)) + row('New companies', num(G.new_companies))
            + row('Invites sent / accepted', num((G.invites || {}).sent) + ' / ' + num((G.invites || {}).accepted)) + row('Join links made / used', num((G.invites || {}).links_made) + ' / ' + num((G.invites || {}).links_used))
            + row('Time to first record', fv.median_hours == null ? '—' : (fv.median_hours < 48 ? fv.median_hours + ' h' : Math.round(fv.median_hours / 24) + ' days') + ' <span class="cx-muted">(' + num(fv.reached) + ' of ' + num(fv.n) + ' new logins)</span>'))
        + card('Gone quiet (no app for 7+ days)', ((G.quiet || []).length ? (G.quiet || []).map((x) => row(esc(x.who) + (x.company ? ' <span class="cx-muted">' + esc(x.company) + '</span>' : ''), esc(x.days + ' days'))).join('') : '<p>No one has gone quiet.</p>')
            + ((G.quiet_companies || []).length ? '<p class="cx-muted">Whole company quiet: ' + esc((G.quiet_companies || []).join(', ')) + '</p>' : ''))
        + card('Screens used most', (G.screens || []).length ? (G.screens || []).map((x) => row(esc(String(x.screen).replace(/([a-z])([A-Z])/g, '$1 $2')), num(x.n) + ' <span class="cx-muted">' + num(x.people) + (x.people === 1 ? ' person' : ' people') + '</span>')).join('') : '<p>No screen counts yet.</p>')
        + '</div></section>';
      // SECURITY
      const sh = S.share || {}, mfa = S.mfa || {};
      let shareHtml;
      if (!sh.live) shareHtml = '<p><span class="cx-chip">Not live yet</span></p><p>Starts with the one-device update (signed in on 2 devices, one in use at a time). Refused sign-ins and sharing signals will show here. Users never see this.</p>';
      else {
        const k7 = sh.by_kind_7 || {}, k30 = sh.by_kind_30 || {};
        shareHtml = Object.keys(SHARE).map((k) => row(esc(SHARE[k]), num(k7[k]) + ' <span class="cx-muted">/ ' + num(k30[k]) + ' in 30 days</span>')).join('')
          + ((sh.top || []).length ? '<p style="margin-top:10px"><strong>Logins with the most signals (30 days)</strong></p>' + (sh.top || []).map((x) => row(esc(x.who) + (x.company ? ' <span class="cx-muted">' + esc(x.company) + '</span>' : ''), num(x.n))).join('') : '<p>No signals in 30 days.</p>')
          + '<p><button type="button" class="cx-btn" id="cxShareMore">' + (shareRows ? 'Hide Events' : 'Show Events') + '</button></p>'
          + (shareRows ? (shareRows.length ? shareRows.slice(0, 50).map((x) => '<div class="cx-row" style="display:block"><div>' + esc((x.who || 'A login') + (x.company ? ' · ' + x.company : '')) + ' <span class="cx-muted">' + esc(day(x.at)) + '</span></div><div class="cx-muted">' + esc((SHARE[x.kind] || x.kind) + (x.miles ? ' · ' + x.miles + ' miles in ' + x.minutes + ' minutes' : '') + (x.n > 1 ? ' · ' + x.n + ' times' : '')) + '</div></div>').join('') : '<p>No events.</p>') : '');
      }
      h += '<section aria-labelledby="cxSecH"><h2 id="cxSecH">Account sharing and security</h2><div class="cx-grid">'
        + card('Account sharing', shareHtml)
        + card('Sign-ins', row('Logins', num(mfa.logins)) + row('Two-step login on', num(mfa.on) + ' of ' + num(mfa.logins))
            + ((S.many_sessions || []).length ? '<p style="margin-top:10px"><strong>Signed in on 3+ devices now</strong></p>' + (S.many_sessions || []).map((x) => row(esc(x.who) + (x.company ? ' <span class="cx-muted">' + esc(x.company) + '</span>' : ''), num(x.sessions))).join('') : row('Signed in on 3+ devices now', '0'))
            + ((mfa.bosses_without || []).length ? '<p style="margin-top:10px"><strong>Company accounts and PMs without two-step</strong></p>' + (mfa.bosses_without || []).map((x) => row(esc(x.who), esc((x.company || '') + ' · ' + (x.role === 'pm' ? 'PM' : x.role || '')))).join('') : '')
            + (S.failed_signins_available ? '' : '<p class="cx-muted">Failed sign-ins aren’t kept in the database (Supabase Auth logs only).</p>'))
        + card('Changes to crews and records (' + D.days + ' days)', row('Members removed', num(S.removed)) + row('Refused crew actions', num(S.refused)) + row('Billing actions', num(S.billing_actions))
            + row('Admin access log entries', num(S.admin_log) + (S.admin_log_last ? ' <span class="cx-muted">last ' + esc(day(S.admin_log_last)) + '</span>' : '')))
        + '</div></section>';
      // RELIABILITY
      const sc = R.seal_checks || {}, pc = R.photo_checks || {}, ps = R.push_subs || {}, bl = R.backup_last || {}, ol = R.offsite_last || {}, lg = R.legacy_7 || {};
      const ok = (good, yes, no) => '<span class="cx-chip ' + (good ? 'ok' : 'bad') + '">' + esc(good ? yes : no) + '</span>';
      h += '<section aria-labelledby="cxRelH"><h2 id="cxRelH">Reliability</h2><div class="cx-grid">'
        + card('Backups and record checks', row('Backup', ok(!R.backup_problem, 'OK', 'Problem') + ' <span class="cx-muted">' + esc(when(bl.at)) + '</span>') + (R.backup_problem ? '<p>' + esc(R.backup_problem) + '</p>' : '')
            + row('Off-site copy (Backblaze)', esc(when(ol.at)) + (ol.failed ? ' · ' + num(ol.failed) + ' failed' : '') + ' <span class="cx-muted">' + num(R.offsite_files) + ' files</span>')
            + row('Sealed runs checked', num(sc.n) + ' ' + ok(!sc.bad, 'all match', sc.bad + ' changed')) + row('Run photos checked', num(pc.n) + ' ' + ok(!pc.bad, 'all match', pc.bad + ' changed')))
        + card('Crashes per day', bars(by, 'crashes', 'red') + row('This week / last week', num(R.crashes_7) + ' / ' + num(R.crashes_prev_7))
            + '<p class="cx-muted">Counted from the app’s crash reporter (only when “Send crash reports” is on). Details are in Sentry.</p>')
        + card('App builds in use (14 days)', ((R.builds || []).length ? (R.builds || []).map((x, i) => row(esc(x.build) + (i === 0 ? ' <span class="cx-chip ok">newest</span>' : ''), num(x.people) + (x.people === 1 ? ' person' : ' people'))).join('') : '<p>Starts filling once this update is out.</p>')
            + (lg.people ? row('On an old build still writing the old run table', num(lg.people) + ' people', '') : ''))
        + card('Server jobs', (R.jobs || []).map((j) => row(esc(j.name), esc(when(j.last)) + (j.failed ? ' · <span class="cx-chip bad">' + num(j.failed) + ' failed</span>' : '') + (j.stuck ? ' · <span class="cx-chip bad">stuck</span>' : ''))).join('')
            + row('Server errors (7 days)', num(R.server_errors_7)) + ((R.plans_stuck || []).length ? row('Plan sets stuck reading', num((R.plans_stuck || []).length) + ' <span class="cx-muted">since ' + esc(day(R.plans_stuck[0].since)) + '</span>') : ''))
        + card('Notices to phones', row('Push sign-ups alive', num((ps.n || 0) - (ps.dead || 0)) + ' of ' + num(ps.n)) + row('Push failed (7 days)', num(R.push_gave_up_7)) + row('Emails failed (7 days)', num(R.email_gave_up_7)) + row('Emails waiting', num(R.email_waiting)))
        + '</div></section>';
      // SAFETY
      const op = F.open_permits || [], lc = F.locates || {}, fe = F.field_events || {};
      const EV = { delay: 'Delays', standby: 'Standby', 'log:delay': 'Delays (run log)', 'log:incident': 'Incidents', 'log:near_miss': 'Near misses' };
      h += '<section aria-labelledby="cxSafeH"><h2 id="cxSafeH">Safety and legal</h2><div class="cx-grid">'
        + card('Confined space right now', (op.length ? op.map((x) => row(esc((x.company || '') + (x.space ? ' · ' + x.space : '')), '<span class="cx-chip ' + (x.hours >= 8 ? 'bad' : 'warn') + '">open ' + esc(x.hours) + ' h</span>')).join('') : '<p>No permit open.</p>')
            + row('Emergency notices (30 days)', num(F.em_notices_30) + (F.em_last ? ' <span class="cx-muted">last ' + esc(day(F.em_last)) + '</span>' : '')) + row('Permits started (' + D.days + ' days)', num(F.permits_window)))
        + card('811 tickets', row('Open tickets', num(lc.open)) + row('Expiring in 3 days', num(lc.soon)) + ((lc.expired_open || []).length ? (lc.expired_open || []).map((x) => row(esc('Expired ' + day(x.expired) + ' · ' + (x.company || '') + (x.job ? ', job ' + x.job : '')), esc(x.ticket || ''), 'cx-muted')).join('') : ''))
        + card('From the field (' + D.days + ' days)', (Object.keys(fe).length ? Object.entries(fe).map(([k, v]) => row(esc(EV[k] || k.replace(/^log:/, '').replace(/_/g, ' ')), num(v))).join('') : '<p>No delays or incidents logged.</p>')
            + row('Reports to management', num(F.mgmt_reports)) + '<p class="cx-muted">Counts only. What crews write to their company stays with the company.</p>')
        + card('Feedback and legal', row('Feedback not read', num(F.feedback_new)) + row('Website beta requests waiting', num(F.trial_requests_new))
            + row('Terms accepted', esc(Object.entries(F.terms || {}).map(([k, v]) => 'v' + k + ': ' + v).join(' · ') || 'none')) + row('Logins with no Terms record', num(F.logins_no_terms))
            + row('State rules to re-check', (F.state_rules_overdue || []).length ? esc((F.state_rules_overdue || []).join(', ')) : 'none' + (F.state_rules_next ? ' <span class="cx-muted">next ' + esc(day(F.state_rules_next)) + '</span>' : '')))
        + '</div></section>';
      // ASK
      h += '<section aria-labelledby="cxAskH"><h2 id="cxAskH">Ask</h2><div class="cx-grid">'
        + card('Questions per day', bars(by, 'ask', 'blue') + row('Questions (' + D.days + ' days)', num(A.questions)) + row('Cost', usd(A.usd) + (A.usd_per_q != null ? ' <span class="cx-muted">' + usd(A.usd_per_q, 3) + ' each</span>' : ''))
            + (A.kb_version ? row('Knowledge build', esc(A.kb_version)) : ''))
        + card('Answers to improve', row('Waiting', num(A.gaps_new)) + row('Marked “not right” (' + D.days + ' days)', num(A.not_right))
            + Object.entries(A.gaps_by_reason || {}).map(([k, v]) => row(esc({ low_retrieval: 'Library had little on it', model_said_not_in_kb: 'Ask said it isn’t in the library', not_right: 'Crew said not right', not_right_data: 'Crew said the numbers are wrong' }[k] || k), num(v))).join('')
            + ((A.newest || []).length ? '<p style="margin-top:10px"><strong>Newest</strong></p>' + (A.newest || []).map((x) => '<p>“' + esc(x.q) + '”</p>').join('') : ''))
        + '</div></section>';
      // NOT TRACKED YET
      h += '<section aria-labelledby="cxNotH"><h2 id="cxNotH">Not tracked yet</h2><div class="cx-grid">'
        + card('What this page can’t see yet', '<p>Card payments and failed cards (Stripe not connected) · failed sign-ins (Supabase Auth logs) · edge function errors · uptime · which state each Ask question is about · permit entries made against a meter warning.</p><p class="cx-muted">How to start each one is in the build notes.</p>', 'cx-not')
        + '</div></section>';
      body.innerHTML = h;
      const am = body.querySelector('#cxAttnMore'); if (am) am.onclick = () => { attnAll = !attnAll; render(ov); };
      const more = body.querySelector('#cxShareMore');
      if (more) more.onclick = async () => {
        if (shareRows) { shareRows = null; render(ov); return; }
        more.disabled = true; more.textContent = 'Loading…';
        let r; try { r = await sbClient.rpc('pb_owner_share_events', { p_days: 90, p_limit: 200 }); } catch (e) { r = { error: e }; }
        shareRows = r && !r.error && r.data && r.data.ok ? r.data.events || [] : [];
        render(ov);
      };
    }

    async function load(ov) {
      const body = ov.querySelector('.cx-body');
      if (!D) body.innerHTML = '<p class="cx-st" role="status">Loading…</p>';
      let r; try { r = await sbClient.rpc('pb_owner_dashboard', { p_days: days }); } catch (e) { r = { error: e }; }
      if (!document.body.contains(ov)) return;
      const err = r && r.error, code = err && (err.code || ''), msg = String((err && (err.message || err.details)) || '');
      if (err && (code === 'PGRST202' || /could not find the function|does not exist/i.test(msg))) { D = null; body.innerHTML = '<p class="cx-st" role="status">The Owner Dashboard isn’t set up on the server yet. Nothing was changed.</p>'; return; }
      if (err && /pb:not_allowed/.test(msg)) { D = null; body.innerHTML = '<p class="cx-st" role="status">This page is only for the app’s owner. If you use a two-step code, sign out and back in with it.</p>'; return; }
      if (!r || err || !r.data || !r.data.ok) { body.innerHTML = (D ? '' : '') + '<p class="cx-st" role="status">Couldn’t load. Check signal and press Refresh.</p>'; return; }
      D = r.data; shareRows = null; render(ov);
    }

    window.pbCeoOpen = function () {
      if (typeof pbSupAdminState !== 'undefined' && !(sbUser && pbSupAdminState.uid === sbUser.id && pbSupAdminState.admin)) { pbAlert('This page is only for the app’s owner.', 'Owner Dashboard'); return; }
      if (!document.getElementById('pbCeoCss')) { const st = document.createElement('style'); st.id = 'pbCeoCss'; st.textContent = CSS; document.head.appendChild(st); }
      const old = document.getElementById('pbCeo'); if (old) old.remove();
      const ov = document.createElement('div'); ov.id = 'pbCeo'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'cxTitle');
      ov.innerHTML = '<div class="cx-top"><h1 id="cxTitle">Owner Dashboard</h1><div class="cx-ctl"><div class="cx-seg" role="group" aria-label="Days shown"><button type="button" data-d="7">7 days</button><button type="button" data-d="30">30 days</button><button type="button" data-d="90">90 days</button></div>'
        + '<button type="button" class="cx-btn" id="cxRefresh">Refresh</button></div><button type="button" class="cx-x" aria-label="Close" id="cxX">&times;</button><p class="cx-as" role="status"></p></div><div class="cx-body"></div>';
      document.body.appendChild(ov); document.documentElement.classList.add('pb-fb-open');
      D = null; shareRows = null; attnAll = false;
      const close = () => { ov.remove(); document.documentElement.classList.remove('pb-fb-open'); document.removeEventListener('keydown', onKey); };
      const onKey = (e) => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey);
      ov.querySelector('#cxX').onclick = close;
      ov.querySelector('#cxRefresh').onclick = () => load(ov);
      ov.querySelectorAll('.cx-seg button').forEach((b) => { b.onclick = () => { days = Number(b.dataset.d); try { localStorage.setItem('pbCeoDays', String(days)); } catch (e) {} render(ov); load(ov); }; });
      render(ov); load(ov);
      try { ov.querySelector('#cxX').focus(); } catch (e) {}
    };
  })();

"""
rep("""  /* Beta Results: one page from the company's own records (pb_company_beta_summary), for the owner. */""",
    JS + """  /* Beta Results: one page from the company's own records (pb_company_beta_summary), for the owner. */""")
open(out, 'w', encoding='utf-8').write(s)
print('ok', len(s))
