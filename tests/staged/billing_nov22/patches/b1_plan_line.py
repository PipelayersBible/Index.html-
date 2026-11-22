# billing_nov22 b1: Home plan line + Settings > Your plan (company account only).
#  #1 #17 #21  Start Company Plan (Monthly / Yearly) during the trial too, with HIS amount; "Trial ends Fri Dec 18" (time on the last day);
#              after the request: "Thomas will email you a one-page order to sign. For your 6 people: $111 a month (or $1,110 a year), plus tax."
#  #2 #23      the company account (only) sees "Payment due" with the pause date; "Plan paused" says why and who to ask; Your plan card.
#  #9          PMs / supers at trial end: ask the company account (with the price).
#  #16         an individual whose payment is late sees "Payment due", not "No plan yet".
#  #19         Not Now on the removed card clears Home.  #20 a canceled company's crew: "plan has ended" + their own plan.
# Old server (no is_owner in pb_my_plan): the request stays 'company' and the generic price shows, as before.
# usage: python3 b1_plan_line.py in.html out.html
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# --- helpers next to the price list ---
p.rep("""    const pbIndSave = () => { const p = pbPr(); return Math.max(0, p.ind * 12 - p.indy); }; /* billing_yearly_nov20: 12 months minus the yearly price ($36) */""",
"""    const pbIndSave = () => { const p = pbPr(); return Math.max(0, p.ind * 12 - p.indy); }; /* billing_yearly_nov20: 12 months minus the yearly price ($36) */
    /* billing_nov22: the company account's own numbers (pb_my_plan gives them to the company account only) */
    const PB_BILL_CONTACT = 'admin@pipelayersbible.com';
    const pbNewSrv = () => !!(plan && Object.prototype.hasOwnProperty.call(plan, 'is_owner'));
    const pbCoMonth = (n) => { const p = pbPr(); return p.base + Math.max(0, n - p.seats) * p.seat; };
    const pbCoPeople = () => (plan && Number.isFinite(+plan.people) && plan.people !== null ? +plan.people : null);
    const pbCoFor = (iv) => { const n = pbCoPeople(); if (n == null) return ''; const m = pbCoMonth(n), y = m * pbPr().ym;
      return 'For your ' + (n === 1 ? '1 person' : n + ' people') + ': ' + (iv === 'year' ? pbUsd(y) + ' a year (or ' + pbUsd(m) + ' a month)' : pbUsd(m) + ' a month (or ' + pbUsd(y) + ' a year)') + ', plus tax.'; };
    const PB_WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], PB_MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pbDayTxt = (d) => { const t = d instanceof Date ? d : new Date(String(d || '').length === 10 ? d + 'T12:00:00' : d); return isNaN(t) ? '' : PB_WD[t.getDay()] + ' ' + PB_MO[t.getMonth()] + ' ' + t.getDate(); };
    const pbTimeTxt = (d) => { try { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } };
    const pbTrialEnds = (endMs) => { if (!Number.isFinite(endMs)) return ''; const e = new Date(endMs), last = endMs - Date.now() < 864e5; /* the end is a clock time: on the last day say it */
      return 'Trial ends ' + pbDayTxt(e) + (last ? ' at ' + pbTimeTxt(e) : ''); };
    const pbCoPick = () => { if (!pbNewSrv() || pbCoPeople() == null) return '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Start Company Plan</button></span>';
      const m = pbCoMonth(pbCoPeople()), y = m * pbPr().ym;
      return '<span class="pb-beta-acts pb-co-pick"><button type="button" class="pb-btn small" data-plan="company:month">Start Monthly ' + pbUsd(m) + '</button><button type="button" class="pb-btn small" data-plan="company:year">Start Yearly ' + pbUsd(y) + '</button></span>'; };
    const pbCoPriceNow = () => (pbCoPeople() != null ? pbCoFor('month') : pbPriceCo());""")

# --- what the company account is told after Start Company Plan ---
p.rep("""      : kind === 'company' ? 'Request sent. You\\u2019ll get an email with the invoice: ' + pbPriceCo()""",
"""      : /^company/.test(kind) ? 'Request sent. Thomas will email you a one-page order to sign. ' + (pbCoFor(kind === 'company:year' || (plan && plan.request && plan.request.interval === 'year') ? 'year' : 'month') || pbPriceCo()) /* billing_nov22 #21 */
        + (plan && plan.request && plan.request.before_end ? ' The founder price is locked for ' + pbPr().fm + ' months.' : '')""")
p.rep("""    const pbReqKind = (office) => { if (office) return 'company'; try { return localStorage.getItem(pbReqKey()) || ''; } catch (e) { return ''; } };""",
"""    const pbReqKind = (office) => { if (office) { try { const k = localStorage.getItem(pbReqKey()) || ''; return /^company/.test(k) ? k : 'company'; } catch (e) { return 'company'; } } try { return localStorage.getItem(pbReqKey()) || ''; } catch (e) { return ''; } };""")

# --- Not Now clears Home (#19) ---
p.rep("""          plan = yes ? Object.assign({}, plan, { requested: true }) : Object.assign({}, plan, { removed: null });""",
"""          plan = yes ? Object.assign({}, plan, { requested: true }) : Object.assign({}, plan, { removed: null, dismissed: true }); /* billing_nov22 #19: Home shows nothing after Not Now */""")

# --- individual payment due (#16), no plan yet only when not dismissed (#19) ---
p.rep("""      } else if (line && sbUser && plan && plan.ok && plan.plan == null && plan.individual === false) { /* pricing_nov20: no plan yet (the server says so) */""",
"""      } else if (line && sbUser && plan && plan.ok && plan.plan == null && (plan.individual_state === 'past_due' || plan.individual_state === 'lapsed')) { /* billing_nov22 #16: their own plan's payment is late */
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span class="pb-beta-chip">Payment due</span><span>' + (plan.individual_state === 'lapsed' ? 'Your plan is paused until it\\u2019s paid. Your records stay on this phone.'
          : 'Your plan pauses on ' + pbDayTxt(plan.individual_lock_on) + ' if it isn\\u2019t paid.') + ' Questions: ' + PB_BILL_CONTACT + '</span>';
      } else if (line && sbUser && plan && plan.ok && plan.plan == null && plan.individual === false && plan.dismissed) { /* billing_nov22 #19: they said Not Now */
        line.hidden = true; line.innerHTML = '';
      } else if (line && sbUser && plan && plan.ok && plan.plan == null && plan.individual === false) { /* pricing_nov20: no plan yet (the server says so) */""")

# --- paid: ended (#20), paused with reason (#2), payment due for the company account only (#2) ---
p.rep("""      } else if (line && plan && plan.plan === 'paid' && plan.paused) { /* billing Phase 0: a paid plan that is read-only (past due or canceled) */
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span class="pb-beta-chip">Plan paused</span><span>Your company\\u2019s plan is paused. Your records stay in your company\\u2019s account. New runs and reports wait on this phone and send once the plan is active again. Nothing is deleted.</span>';""",
"""      } else if (line && plan && plan.plan === 'paid' && plan.ended) { /* billing_nov22 #20: a canceled plan whose paid time is over */
        line.hidden = false; line.classList.add('ended');
        const offE = pbIsOffice();
        line.innerHTML = '<span class="pb-beta-chip">Plan ended</span>' + (offE ? '<span>Your company plan has ended. Your records are kept. To start it again: ' + PB_BILL_CONTACT + '</span>'
          : '<span>' + escapeHtml(plan.company || 'Your company') + '\\u2019s plan has ended. Your records were kept for the company.</span>'
            + (plan.individual ? '<span>You have an individual plan.</span>' : plan.requested ? pbReqSent(pbIndKind()) : '<span>Would you like your own plan? It\\u2019s ' + pbPriceInd() + '.</span>' + pbIndPick('data-plan')));
        pbPlanAskBind(line);
      } else if (line && plan && plan.plan === 'paid' && plan.paused) { /* billing Phase 0: a paid plan that is read-only (past due or canceled) */
        line.hidden = false; line.classList.add('ended');
        const bl = plan.billing || {}, nx = bl.next || {};
        line.innerHTML = '<span class="pb-beta-chip">Plan paused</span>' + (pbIsOffice() /* billing_nov22 #2: the company account is told why and who to ask */
          ? '<span>' + (bl.paused_reason === 'unpaid' ? 'Payment for ' + pbDayTxt(nx.from) + ' \\u2013 ' + pbDayTxt(nx.to) + ' wasn\\u2019t received, so your plan is paused.' : 'Your company\\u2019s plan is paused.')
            + ' Your crew\\u2019s new runs and reports wait on their phones and come in once it\\u2019s active again. Nothing is deleted. Questions: ' + PB_BILL_CONTACT + '</span>'
          : '<span>Your company\\u2019s plan is paused. Your records stay in your company\\u2019s account. New runs and reports wait on this phone and send once the plan is active again. Nothing is deleted.</span>');
      } else if (line && plan && plan.plan === 'paid' && pbIsOffice() && plan.billing && plan.billing.state === 'past_due') { /* billing_nov22 #2: the company account only */
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span class="pb-beta-chip">Payment due</span><span>The plan pauses on ' + pbDayTxt(plan.billing.lock_on) + ' if it isn\\u2019t paid. Questions: ' + PB_BILL_CONTACT + '</span>';""")

# --- trial running: end date, his price, the buttons (#1 #17) ---
p.rep("""          else if (!ended) line.innerHTML = '<span class="pb-beta-chip">Trial</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>'
            + (officeNow ? '<span class="pb-beta-price">After the trial: ' + pbPriceCo() + ' Start your plan before the trial ends and this price is locked for ' + pbPr().fm + ' months.</span>' : ''); /* pricing_nov20 */""",
"""          else if (!ended) { line.innerHTML = '<span class="pb-beta-chip">Trial</span><span>' + (pbTrialEnds(endMs) ? pbTrialEnds(endMs) + (endMs - Date.now() < 864e5 ? '' : ' \\u00b7 ' + daysLeft + ' days left') : (daysLeft === 1 ? '1 day left' : daysLeft + ' days left')) + '</span>' /* billing_nov22 #17 */
            + (officeNow ? (plan.requested ? pbReqSent(pbReqKind(true))
              : '<span class="pb-beta-price">After the trial: ' + pbCoPriceNow() + ' Start your plan before the trial ends and this price is locked for ' + pbPr().fm + ' months.</span>' + pbCoPick()) : ''); /* pricing_nov20; billing_nov22 #1: the button during the trial */
            pbPlanAskBind(line); }""")

# --- trial ended: his price and Monthly / Yearly; managers told who decides (#9) ---
p.rep("""            const own = office ? (plan.requested ? pbReqSent('company') : '<span class="pb-beta-price">The company plan is ' + pbPriceCo() + '</span><span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Start Company Plan</button></span>')
              : plan.individual ? '<span>You have an individual plan.</span>'""",
"""            const mgr = !office && typeof window.pbBresCanSee === 'function' && window.pbBresCanSee(); /* billing_nov22 #9: PMs and supers */
            const own = office ? (plan.requested ? pbReqSent(pbReqKind(true)) : '<span class="pb-beta-price">The company plan: ' + pbCoPriceNow() + '</span>' + pbCoPick())
              : plan.individual ? '<span>You have an individual plan.</span>'
              : mgr ? '<span>Ask the company account to tap Start Company Plan on its Home screen. The company plan is ' + pbPriceCo() + '</span>'""")
p.rep("""            line.innerHTML = '<span class="pb-beta-chip">Trial ended</span>' + (own === null ? '<span>Your company\\u2019s trial has ended. Your records are safe. Your office decides what\\u2019s next.</span>'
              : '<span>' + (office ? whatOffice : what) + '</span>' + own);""",
"""            line.innerHTML = '<span class="pb-beta-chip">Trial ended</span>' + (own === null ? '<span>Your company\\u2019s trial has ended. Your records are safe. Your office decides what\\u2019s next.</span>'
              : mgr && !plan.individual ? '<span>Your company\\u2019s trial has ended. Your records are safe.</span>' + own
              : '<span>' + (office ? whatOffice : what) + '</span>' + own);""")

# --- the company account test, and the Your plan card, rendered with the line ---
p.rep("""    function pbBetaRender() {
      pbPriceFill();""",
"""    function pbIsOffice() { return !!((sbCachedSubscription && sbCachedSubscription.companyRole === 'Company account') || (plan && plan.is_owner)); }
    function pbYourPlanRender() { /* billing_nov22 #23: Settings > Your plan, the company account only */
      const el = document.getElementById('settingsYourPlan'); if (!el) return;
      if (!sbUser || !plan || !plan.ok || !pbIsOffice() || (plan.plan !== 'trial' && plan.plan !== 'paid')) { el.hidden = true; el.innerHTML = ''; return; }
      const L = [];
      if (plan.plan === 'trial') {
        const endMs = plan.trial_ends_at ? new Date(plan.trial_ends_at).getTime() : NaN, over = Number.isFinite(endMs) && endMs <= Date.now();
        L.push(over ? 'Trial ended ' + pbDayTxt(new Date(endMs)) + '.' : (pbTrialEnds(endMs) || 'Trial') + '.');
        L.push('After the trial: ' + pbCoPriceNow());
        if (plan.requested) L.push('Plan requested' + (plan.request && plan.request.interval ? ' (' + (plan.request.interval === 'year' ? 'yearly' : 'monthly') + ')' : '') + '. Thomas will email you a one-page order to sign.' + (plan.request && plan.request.before_end ? ' Founder price locked for ' + pbPr().fm + ' months.' : ''));
        else L.push('Start your plan on the Home screen.');
      } else {
        const b = plan.billing || {}, nx = b.next || {}, yr = b.interval === 'year', ppl = Number(b.people) || 0, paid = Number(b.seats_paid) || 0;
        if (!plan.billing) L.push('Company plan.');
        else {
          L.push('Company plan, ' + (yr ? 'yearly' : 'monthly') + ' \\u00b7 ' + (ppl === 1 ? '1 person' : ppl + ' people') + ' (' + paid + ' paid)' + (b.first_invoice ? '' : ' \\u00b7 paid through ' + pbDayTxt(b.paid_through)) + '.');
          if (plan.ended) L.push('Your plan has ended. Your records are kept.');
          else if (plan.paused) L.push(b.paused_reason === 'unpaid' ? 'Paused: payment for ' + pbDayTxt(nx.from) + ' \\u2013 ' + pbDayTxt(nx.to) + ' wasn\\u2019t received.' : 'Paused.');
          else if (b.state === 'canceled') L.push('Canceled: open until ' + pbDayTxt(b.cancel_at) + '. Nothing is deleted.');
          else {
            if (b.state === 'past_due') L.push('<b>Payment due.</b> The plan pauses on ' + pbDayTxt(b.lock_on) + ' if it isn\\u2019t paid.');
            L.push((b.first_invoice ? 'First invoice: ' : 'Next bill: ') + pbUsd(nx.amount_cents) + (nx.interval === 'year' ? ' for the year' : ' for the month') + ' (' + pbDayTxt(nx.from) + ' \\u2013 ' + pbDayTxt(nx.to) + '), plus tax' + (b.state !== 'past_due' && b.due_on ? ', due ' + pbDayTxt(b.due_on) : '') + '.');
            if (b.next_interval) L.push('Switches to ' + (b.next_interval === 'year' ? 'yearly' : 'monthly') + ' at renewal.');
          }
          if (b.founder_until) L.push('Founder price locked until ' + pbDayTxt(b.founder_until) + '.');
        }
      }
      L.push('Questions about your bill: ' + PB_BILL_CONTACT);
      el.hidden = false; el.innerHTML = '<p class="pb-set-label">Your plan</p>' + L.map((x) => '<p class="pb-help" style="margin:2px 0">' + x + '</p>').join('');
    }
    function pbBetaRender() {
      pbPriceFill(); try { pbYourPlanRender(); } catch (e) {}""")

# --- the request buttons: remember the pick and the server's answer ---
p.rep("""        plan = Object.assign({}, plan, { requested: true }); try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
        window.pbTrack('plan_request:' + b.dataset.plan); pbBetaRender();""",
"""        plan = Object.assign({}, plan, { requested: true }); try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
        if (/^company:/.test(b.dataset.plan)) { plan.request = { interval: b.dataset.plan.split(':')[1], open: true, before_end: !!r.data.before_end }; if (Number.isFinite(+r.data.people) && r.data.people !== null) plan.people = +r.data.people; try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {} } /* billing_nov22 */
        window.pbTrack('plan_request:' + b.dataset.plan); pbBetaRender();""")
p.save()
