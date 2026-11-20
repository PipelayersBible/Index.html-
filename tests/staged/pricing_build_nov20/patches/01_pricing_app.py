#!/usr/bin/env python3
# pricing_nov20 (v2, the owner's Nov 20 decisions): the price shown in the app (company $99 + $12; individual $15 a month or
# $144 a year; plan reading $1 a sheet), the individual plan's sign-up wording, clear "limit reached" messages.
# Usage: python3 01_pricing_app.py in.html out.html   (base: r17.11 master source; every replacement must match exactly once)
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, (s.count(old), old[:90])
    s = s.replace(old, new)

# ---- 1. price helpers, next to the plan line
rep("""    function pbBetaRender() {
      const beta = !!(plan && plan.plan === 'trial');""",
"""    /* pricing_nov20: the price list. It comes from the server with the plan (pb_my_plan); until it has answered these are the same numbers. */
    const pbPr = () => { const p = (plan && plan.prices) || {}, n = (v, d) => (v !== null && v !== '' && Number.isFinite(+v) ? +v : d); return { base: n(p.base_cents, 9900), seats: n(p.base_seats, 5), seat: n(p.seat_cents, 1200), ym: n(p.yearly_months, 10), fm: n(p.founder_months, 12), ind: n(p.individual_cents, 1500), indy: n(p.individual_year_cents, 14400), sheet: n(p.plan_sheet_cents, 100) }; };
    const pbUsd = (c) => { const d = Number(c || 0) / 100; return '$' + (Number.isInteger(d) ? String(d) : d.toFixed(2)); };
    const pbPriceCo = () => { const p = pbPr(); return pbUsd(p.base) + ' a month for your company and ' + p.seats + ' people, ' + pbUsd(p.seat) + ' a month for each extra person, plus applicable tax.'; };
    const pbPriceInd = () => { const p = pbPr(); return pbUsd(p.ind) + ' a month, or ' + pbUsd(p.indy) + ' for a year (' + pbUsd(Math.round(p.indy / 12)) + ' a month), plus applicable tax'; };
    window.pbSheetUsd = () => pbUsd(pbPr().sheet); /* plan reading add-on: per sheet, charged once when the sheet is read */
    const pbReqKey = () => 'pbPlanReq:' + (sbUser ? sbUser.id : '');
    const pbReqSent = (kind) => '<span>' + (kind === 'individual' ? 'Request sent. You\\u2019ll get an email with how to pay: ' + pbPriceInd() + '.'
      : kind === 'company' ? 'Request sent. You\\u2019ll get an email with the invoice: ' + pbPriceCo()
      : 'Request sent. You\\u2019ll get an email with the price and how to pay.') + '</span>';
    const pbReqKind = (office) => { if (office) return 'company'; try { return localStorage.getItem(pbReqKey()) || ''; } catch (e) { return ''; } };
    window.pbPlanPrices = () => Object.assign({ usd: pbUsd, company: pbPriceCo(), individual: pbPriceInd() }, pbPr());
    function pbPriceFill() { /* every price written in the page (Settings, What each plan includes) follows the server's list */
      try { const p = pbPr(), v = { base: pbUsd(p.base), seats: String(p.seats), seat: pbUsd(p.seat), ym: String(p.ym), ind: pbUsd(p.ind), indyear: pbUsd(p.indy), indym: pbUsd(Math.round(p.indy / 12)), sheet: pbUsd(p.sheet), fm: String(p.fm) };
        document.querySelectorAll('[data-pbp]').forEach((el) => { const t = v[el.getAttribute('data-pbp')]; if (t && el.textContent !== t) el.textContent = t; }); } catch (e) {}
    }
    function pbPlanAskBind(line) { /* the request buttons: the same request as before (the app owner answers it), now with the price said */
      line.querySelectorAll('[data-plan]').forEach((b) => { b.onclick = async () => {
        if (!sbClient || navigator.onLine === false) { pbAlert('Needs signal. Try again when you have it.', 'Needs Signal'); return; }
        b.disabled = true; let r; try { r = await sbClient.rpc('pb_plan_request', { p_kind: b.dataset.plan }); } catch (e) { r = { error: e }; }
        if (!r || r.error || !r.data || !r.data.ok) { b.disabled = false; pbAlert('Not sent. Try again.', 'Not Sent'); return; }
        try { localStorage.setItem(pbReqKey(), b.dataset.plan); } catch (e) {}
        plan = Object.assign({}, plan, { requested: true }); try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
        window.pbTrack('plan_request:' + b.dataset.plan); pbBetaRender();
      }; });
    }
    function pbBetaRender() {
      pbPriceFill();
      const beta = !!(plan && plan.plan === 'trial');""")

# ---- 2. removed from a company: the individual price, and what happens after the request
rep("""'. Would you like to sign up for an individual plan?</span>'
          + (plan.requested ? '<span>Request sent. You’ll be contacted to set it up.</span>'""",
"""'. Would you like your own plan? It\\u2019s ' + pbPriceInd() + '.</span>'
          + (plan.requested ? pbReqSent('individual')""")

# ---- 3. a signed-in person with no plan at all (never in a company): the individual plan and its price
rep("""      } else if (line && plan && plan.plan === 'paid' && plan.paused) { /* billing Phase 0""",
"""      } else if (line && sbUser && plan && plan.ok && plan.plan == null && plan.individual === false) { /* pricing_nov20: no plan yet (the server says so) */
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span class="pb-beta-chip">No plan yet</span><span>Your own plan is ' + pbPriceInd() + '. It has New Run, Quick Run, the calculators, Education &amp; Reference, Ask and stake reading. On a crew? Ask your company to invite you instead.</span>'
          + (plan.requested ? pbReqSent('individual') : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="individual">Get My Own Plan</button></span>');
        pbPlanAskBind(line);
      } else if (line && plan && plan.plan === 'paid' && plan.paused) { /* billing Phase 0""")

# ---- 4. during the beta: the company account sees what it costs after
rep("""          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>';
          else {""",
"""          const officeNow = !!(sbCachedSubscription && sbCachedSubscription.companyRole === 'Company account');
          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>'
            + (officeNow ? '<span class="pb-beta-price">After the beta: ' + pbPriceCo() + ' Start your plan before the beta ends and this price is locked for ' + pbPr().fm + ' months.</span>' : ''); /* pricing_nov20 */
          else {""")

# ---- 5. the beta has ended: the price next to the button, and after the request
rep("""            const own = office ? (plan.requested ? '<span>Request sent. You\\u2019ll be contacted to set it up.</span>' : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Start Company Plan</button></span>')
              : plan.individual ? '<span>You have an individual plan.</span>'
              : plan.requested ? '<span>Request sent. You’ll be contacted to set it up.</span>'
              : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button><button type="button" class="pb-btn ghost small" data-plan="individual">My Own Plan</button></span>';""",
"""            const own = office ? (plan.requested ? pbReqSent('company') : '<span class="pb-beta-price">The company plan is ' + pbPriceCo() + '</span><span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Start Company Plan</button></span>')
              : plan.individual ? '<span>You have an individual plan.</span>'
              : plan.requested ? pbReqSent(pbReqKind(false))
              : '<span class="pb-beta-price">Your own plan is ' + pbPriceInd() + '.</span><span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button><button type="button" class="pb-btn ghost small" data-plan="individual">My Own Plan</button></span>';""")
rep("""            line.querySelectorAll('[data-plan]').forEach((b) => { b.onclick = async () => {
              if (!sbClient || navigator.onLine === false) { pbAlert('Needs signal. Try again when you have it.', 'Needs Signal'); return; }
              b.disabled = true; let r; try { r = await sbClient.rpc('pb_plan_request', { p_kind: b.dataset.plan }); } catch (e) { r = { error: e }; }
              if (!r || r.error || !r.data || !r.data.ok) { b.disabled = false; pbAlert('Not sent. Try again.', 'Not Sent'); return; }
              plan = Object.assign({}, plan, { requested: true }); try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
              window.pbTrack('plan_request:' + b.dataset.plan); pbBetaRender();
            }; });""",
"""            pbPlanAskBind(line);""")
rep("""#pbApp .pb-beta-line[hidden], .pb-fb-pill[hidden] { display: none !important; }""",
"""#pbApp .pb-beta-line[hidden], .pb-fb-pill[hidden] { display: none !important; }
#pbApp .pb-beta-line .pb-beta-price { flex-basis: 100%; } /* pricing_nov20: the price on its own line */
#settingsPlanHelp p { margin: 0 0 8px 0; }""")

# ---- 6. Settings > What each plan includes: the real lists, with the prices
rep("""<p class="pb-help" id="settingsPlanHelp">Individual plan: New Run, Quick Run, calculators, Education &amp; Reference, Stats and Jobs. Contractor plan: all of that, plus Confined Space permits, Reports (Records) and Management report.</p>""",
"""<div class="pb-help" id="settingsPlanHelp"><!-- pricing_nov20 -->
          <p><b>Company plan: <span data-pbp="base">$99</span> a month</b> for your company and <span data-pbp="seats">5</span> people. <span data-pbp="seat">$12</span> a month for each extra person. Pay for the year and get 12 months for the price of <span data-pbp="ym">10</span>. Everyone with a login counts as a person. The company account is free and doesn&rsquo;t count.</p>
          <p>Everything in the app for the whole company: runs with photos and sealed records, Confined Space permits, trench and shoring, daily reports, tickets, locates, the company board and office screens, crew invites, the calculators, Education &amp; Reference and Ask.</p>
          <p><b>Individual plan: <span data-pbp="ind">$15</span> a month</b>, or <span data-pbp="indym">$12</span> a month billed yearly (<span data-pbp="indyear">$144</span> a year). One person, no company: New Run, Quick Run, the calculators, Education &amp; Reference, Stats, Jobs, Ask and stake reading.</p>
          <p><b>Plan reading (add-on for company plans): <span data-pbp="sheet">$1</span> a sheet</b>, charged once when the sheet is read. Questions about your plans after that count as normal Ask requests. It isn&rsquo;t turned on yet: plan sets you add are kept and you can still open the sheets.</p>
          <p>Prices are plus applicable tax. There is no free plan.</p>
          <p>Ask and photo reading have daily and monthly limits. A person on a company plan: 25 a day. The company account: 5 a day. An individual plan: 15 a day, 50 a month. A company shares 60 a month for each person on its plan. The app tells you when a limit is reached and when it resets.</p>
        </div>""")

# ---- 7. Crew Members: what the people on the list cost
rep("""bSeats != null ? seats + ' of ' + bSeats + ' people in the beta (plus the company account)' : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '');""",
"""bSeats != null ? seats + ' of ' + bSeats + ' people in the beta (plus the company account)' + pbCmPrice(seats, true) : seats + ' member' + (seats === 1 ? '' : 's') + (inc != null ? ' (your plan includes ' + inc + ')' : '') + pbCmPrice(seats, false);""")
rep("""    const seats = D && Number.isFinite(+D.seats) ? +D.seats : null, inc = D && Number.isFinite(+D.seats_included) ? +D.seats_included : null;
    const bp = typeof window.pbPlanNow""",
"""    const seats = D && Number.isFinite(+D.seats) ? +D.seats : null, inc = D && Number.isFinite(+D.seats_included) ? +D.seats_included : null;
    const pbCmPrice = (n, isBeta) => { try { const p = window.pbPlanPrices(); const m = p.base + Math.max(0, n - p.seats) * p.seat; /* pricing_nov20 */
      return isBeta ? ' \\u00b7 After the beta: ' + p.usd(m) + ' a month for ' + (n === 1 ? '1 person' : n + ' people') + ', plus tax' : ' \\u00b7 ' + p.usd(p.seat) + ' a month for each person over ' + p.seats + ', plus tax'; } catch (e) { return ''; } };
    const bp = typeof window.pbPlanNow""")

# ---- 8. a limit was reached: say which one and when it resets (the server knows: pb_my_limits)
rep("""  const PB_AI_MSG = {""",
"""  async function pbAiWhyMsg(feature) { /* pricing_nov20: null when the server can't say (then the old one-line message is used) */
    try {
      if (!sbClient || typeof sbClient.rpc !== 'function') return null;
      const r = await Promise.race([sbClient.rpc('pb_my_limits', { p_feature: String(feature || 'teacher') }), new Promise((res) => setTimeout(() => res(null), 4000))]);
      const d = r && !r.error ? r.data : null; if (!d || !d.ok || !d.reached) return null;
      const n = (o) => (o && Number.isFinite(+o.limit) ? +o.limit + ' ' : ''), w = d.reached;
      const m = w === 'feature_day' ? 'You\\u2019ve used today\\u2019s limit for this. It resets tomorrow.'
        : w === 'person_day' ? 'You\\u2019ve used today\\u2019s ' + n(d.day) + 'AI requests. It resets tomorrow.' + (d.who === 'owner' ? ' The company account has a small allowance. People on your plan have more.' : '')
        : w === 'person_month' ? 'You\\u2019ve used this month\\u2019s ' + n(d.month) + 'AI requests. It resets on the 1st.'
        : w === 'company_day' ? 'Your company has used today\\u2019s ' + n(d.company_day) + 'AI requests. It resets tomorrow.'
        : w === 'company_month' ? 'Your company has used this month\\u2019s ' + n(d.company_month) + 'AI requests. It resets on the 1st.'
        : w === 'budget' ? 'This month\\u2019s AI allowance is used up. It resets on the 1st. Everything else still works.'
        : w === 'plan' ? 'Your plan isn\\u2019t active, so AI is off. Everything else on this phone still works.' : '';
      return m ? { why: w, message: m } : null;
    } catch (e) { return null; }
  }
  const PB_AI_MSG = {""")
rep("""      return { ok: false, code: 'daily_limit', message: PB_AI_MSG.daily(lim) }; }""",
"""      { const why = await pbAiWhyMsg(feature); if (why) return { ok: false, code: 'daily_limit', why: why.why, message: why.message }; } /* pricing_nov20 */
      return { ok: false, code: 'daily_limit', message: PB_AI_MSG.daily(lim) }; }""")
rep("""pbTkAiShow('warn', 'Ticket not read.', 'No AI readings left today. Type the values from the ticket.'); return;""",
"""pbTkAiShow('warn', 'Ticket not read.', (r.why ? r.message : 'No AI readings left today.') + ' Type the values from the ticket.'); return;""")

# ---- 9. the app owner's Billing: the individual price, and the individual plans with Paid
rep("""' each extra · yearly = ' + pbNum(set.yearly_months, 10) + ' months</div>'
        + (due.length ?""",
"""' each extra · yearly = ' + pbNum(set.yearly_months, 10) + ' months · individual ' + pbMoney(pbNum(set.individual_cents, 1500)) + ' a month or ' + pbMoney(pbNum(set.individual_year_cents, 14400)) + ' a year · plan reading ' + pbMoney(pbNum(set.plan_sheet_cents, 100)) + ' a sheet</div>'
        + pbBillInd(B) /* pricing_nov20 */
        + (due.length ?""")
rep("""    function pbBillDue(B) {
      if (!B) return '';""",
"""    function pbBillInd(B) { /* pricing_nov20: individual plans with a billing record: what is due, and Paid */
      const L = Array.isArray(B.individuals) ? B.individuals.filter((x) => x && x.state !== 'canceled') : [];
      return L.map((x) => { const n = x.next || {};
        return '<div class="pb-bill-due" data-ind="' + escapeHtml(x.user_id) + '"><div class="hd">' + escapeHtml(x.email || '') + ' · individual' + (x.state === 'lapsed' ? ' <span class="ch ended">Not paid · AI off</span>' : x.state === 'past_due' ? ' <span class="ch ended">Past due</span>' : '') + '</div>'
          + '<div class="ln">Paid through ' + pbDay(x.paid_through) + ' · next: <b>' + pbMoney(n.amount_cents) + '</b> ' + (x.interval === 'year' ? 'for the year' : 'for the month') + '</div>'
          + (n.due ? '<div class="acts"><button type="button" class="pb-btn small" data-indpaid="' + escapeHtml(x.user_id) + '" data-from="' + escapeHtml(x.paid_through) + '">Paid</button></div>' : '') + '</div>'; }).join('');
    }
    document.addEventListener('click', async (e) => {
      const b = e.target && e.target.closest ? e.target.closest('[data-indpaid]') : null; if (!b || b.disabled) return;
      if (!sbClient || navigator.onLine === false) { pbAlert('Needs signal. Try again when you have it.', 'Needs Signal'); return; }
      b.disabled = true; let r; try { r = await sbClient.rpc('pb_owner_individual_paid', { p_user: b.dataset.indpaid, p_from: b.dataset.from }); } catch (err) { r = { error: err }; }
      const d = r && !r.error ? r.data : null, row = b.closest('[data-ind]');
      if (!d || !d.ok) { b.disabled = false; pbAlert((d && d.message) || 'Not saved. Try again.', 'Not Saved'); return; }
      const me = (d.individuals || []).find((x) => x.user_id === b.dataset.indpaid);
      if (row && me) { const ln = row.querySelector('.ln'); if (ln) ln.textContent = 'Marked paid. Paid through ' + pbDay(me.paid_through) + '.'; const a = row.querySelector('.acts'); if (a) a.remove(); const ch = row.querySelector('.ch'); if (ch) ch.remove(); }
    });
    function pbBillDue(B) {
      if (!B) return '';""")

rep("""          : '<div class="ln">Nothing to invoice in the next ' + pbNum(set.invoice_ahead_days, 7) + ' days.</div>') + '</div>';""",
"""          : (pbBillInd(B) ? '' : '<div class="ln">Nothing to invoice in the next ' + pbNum(set.invoice_ahead_days, 7) + ' days.</div>')) + '</div>';""")

# ---- 10. plan reading add-on: $1 a sheet, charged once when the sheet is read (v2). The price is said wherever the add-on is described.
#      It stays OFF for customers until Billing can show sheets read; the app owner's screens say so.
rep("""' You can open the sheets now. Plan reading for Ask starts with a paid plan.'""",
"""' You can open the sheets now. Plan reading for Ask is an add-on on a paid plan: ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once.'""")
rep("""(a.plan_reading ? 'on · ' + (a.plan_reading_cents == null ? 'price not set (not on the invoice)' : pbMoney(a.plan_reading_cents) + ' a month') : 'off (plan sets stay parked)')""",
"""(a.plan_reading ? 'on · ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once when read. Billing doesn\\u2019t show sheets read yet: count them before you invoice' : 'off (plan sets stay parked) · ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet when it\\u2019s on')""")
rep("""<span>Plan reading add-on' + (prc == null ? ' (price not set yet: not on the invoice)' : ' (' + pbMoney(prc) + ' a month)') + '. Off: plan sets stay parked.</span>""",
"""<span>Plan reading add-on (' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once when read). Leave it off for customers until Billing shows sheets read. Off: plan sets stay parked.</span>""")
rep("""price = B && B.settings && typeof B.settings.plan_reading_cents === 'number' ? pbMoney(B.settings.plan_reading_cents) + ' a month' : 'price not set yet (not on the invoice)';""",
"""price = (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once when read. Billing doesn\\u2019t show sheets read yet, so you count them yourself';""")
rep("""(d.plan_reading_price_missing ? ' · plan reading price not set' : '')""",
"""(d.plan_reading_price_missing ? ' · plan reading is on: add ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' for each sheet read' : '')""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('ok', len(s))
