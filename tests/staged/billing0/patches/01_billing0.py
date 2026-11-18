import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Billing Phase 0 (Nov 17, applies to r16.96; needs sql/01-03 of feat/billing0 on the server):
# (1) Settings > Beta Accounts (app owner only, as today): "Make Paid" opens a short form (legal name, billing email, people
#     counted now, price shown, monthly/yearly, founder lock yes/no with its end date, plan reading add-on, signer) that calls
#     pb_owner_make_paid; a "Billing due" list (who to invoice, people, amount, period, billing email, seller); per paid company
#     Paid / Past Due / Read-Only / Cancel, Plan Reading On/Off, and Hand Over (pb_owner_company_handover) for every company.
# (2) Home: a paid company that is read-only shows "Plan paused" (pb_my_plan.paused), like the ended beta.
# (3) Records refused with pb:beta_ended while the plan is paused wait on the phone with plan wording (not "beta ended").

# ---- CSS (theme tokens only, so light and dark both work) ----
rep(""".pb-own-form { display: flex; flex-direction: column; gap: 8px; }""",
    """.pb-own-form { display: flex; flex-direction: column; gap: 8px; }
.pb-own-co .acts { flex-wrap: wrap; } .pb-own-co .acts.pb-bill-acts { display: grid; grid-template-columns: 1fr 1fr; }
.pb-own-co .ln b { color: var(--pb-text, #14171C); }
.pb-bill-due { border-top: 1px solid var(--pb-divider, #ccc); padding-top: 8px; display: flex; flex-direction: column; gap: 3px; }
.pb-bill-due .hd { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-weight: 700; color: var(--pb-text, #14171C); }
.pb-bill-form label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; font-weight: 600; }
.pb-bill-form label.pb-bill-chk { flex-direction: row; align-items: flex-start; gap: 10px; font-weight: 500; line-height: 1.35; }
.pb-bill-form label.pb-bill-chk input { width: 22px; height: 22px; flex: none; margin: 0; padding: 0; accent-color: var(--pbl-yellow, #F5BF1F); }
.pb-bill-form label.pb-bill-chk input:disabled + span { color: var(--pb-text-2, #555); }
.pb-bill-form .pb-bill-note { font-size: 14px; color: var(--pb-text-2, #555); margin: 0; }
.pb-bill-price { font-size: 15px; padding: 10px 12px; border-radius: 10px; background: var(--pb-canvas, #f4f4f4); border: 1px solid var(--pb-divider, #ccc); }
.pb-bill-form .pb-bill-sec { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--pb-text-2, #555); margin-top: 4px; }""")

# ---- Home line for a paused paid plan ----
rep("""      } else if (line) {
        line.hidden = !beta; line.classList.toggle('ended', ended);""",
    """      } else if (line && plan && plan.plan === 'paid' && plan.paused) { /* billing Phase 0: a paid plan that is read-only (past due or canceled) */
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span class="pb-beta-chip">Plan paused</span><span>Your company\\u2019s plan is paused. Your records stay in your company\\u2019s account. New runs and reports wait on this phone and send once the plan is active again. Nothing is deleted.</span>';
      } else if (line) {
        line.hidden = !beta; line.classList.toggle('ended', ended);""")

# ---- the queue's wording while the plan is paused ----
rep("""  const PB_DLY_BETA_WHY = 'Your company’s beta has ended. It waits on this phone and is sent once your company starts a plan.'; /* bughunt 02 */""",
    """  const PB_DLY_BETA_WHY = 'Your company’s beta has ended. It waits on this phone and is sent once your company starts a plan.'; /* bughunt 02 */
  const pbDlyBetaWhy = () => { const p = typeof window.pbPlanNow === 'function' ? window.pbPlanNow() : null; return p && p.plan === 'paid' ? 'Your company’s plan is paused. It waits on this phone and is sent once the plan is active again.' : PB_DLY_BETA_WHY; }; /* billing Phase 0: same lock, plan wording */""")
rep("""return { k: 'retry', why: PB_DLY_BETA_WHY }; /* bughunt 02""", """return { k: 'retry', why: pbDlyBetaWhy() }; /* bughunt 02""", 2)
rep("""x.state = 'waiting'; x.code = null; x.why = PB_DLY_BETA_WHY; back++;""", """x.state = 'waiting'; x.code = null; x.why = pbDlyBetaWhy(); back++;""")

# ---- Beta Accounts: billing helpers ----
rep("""    // the app owner's Beta Accounts
    const FEAT = {""",
    """    // billing Phase 0 (hand-sent invoices): Make Paid form, Billing due, Paid / Past Due / Read-Only / Cancel, Plan Reading, Hand Over.
    // Prices and the seller's name come from the server's settings (pb_owner_billing); nothing about the deal is decided here.
    const pbMoney = (c) => (Number(c || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const pbDay = (d) => { if (!d) return ''; const t = d instanceof Date ? d : new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(t) ? '' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
    const pbNum = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
    const PB_BILL_MSG = {
      'pb:not_allowed': 'Only the app owner can do that. If you use two-step login, enter your code first.',
      'pb:founder_late': 'The founder price is only for a beta company that commits before its beta ends.',
      'pb:already_paid': 'This company already has a paid plan. Use Paid, Past Due, Read-Only or Cancel.',
      'pb:period_changed': 'That invoice was already marked paid. The list is refreshed.',
      'pb:not_member': 'Invite them to the company in Crew first, then hand it over once they have joined.',
      'pb:owns_other': 'That person already owns another company.', 'pb:same_owner': 'That person already owns the company.',
      'pb:not_paid': 'Plan reading is only for paid companies.', 'pb:no_account': 'Use Make Paid first.',
      'pb:company_inactive': 'That company isn’t active.', 'pb:bad_email': 'Type the billing email.', 'pb:no_signer': 'Type the name of the person who signed the order.',
    };
    async function pbBillRpc(fn, args) {
      if (!sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return { ok: false, message: 'Needs signal. Try again when you have it.' };
      let r; try { r = await sbClient.rpc(fn, args); } catch (e) { r = { error: e }; }
      if (r && !r.error && r.data && r.data.ok) return r.data;
      const d = r && !r.error && r.data && typeof r.data === 'object' ? r.data : null, e = (r && r.error) || {};
      const m = String(e.message || '') + ' ' + String(e.code || ''), code = (d && d.code) || (/pb:[a-z_]+/.exec(m) || [''])[0];
      const missing = /PGRST202|could not find the function|does not exist/i.test(m);
      return { ok: false, code, message: (d && d.message) || PB_BILL_MSG[code] || (missing ? 'The billing server isn’t set up yet. Nothing was changed.' : 'Not changed. Check signal and try again.') };
    }
    const pbBillChip = (a) => { const st = a.read_only && a.state !== 'read_only' ? 'read_only' : a.state; return '<span class="ch' + (st === 'active' ? ' paid' : st === 'past_due' ? '' : ' ended') + '">' + ({ active: 'Paid', past_due: 'Past due', read_only: 'Read-only', canceled: 'Canceled' }[st] || 'Paid') + '</span>'; };
    function pbBillLines(bc) {
      if (!bc) return '';
      const a = bc.account, login = '<div class="ln">Company login: ' + escapeHtml(bc.owner_login || 'unknown') + ' · ' + (Number(bc.seats_used) || 0) + ' people counted (the company login is free)</div>';
      if (!a) return bc.plan === 'paid' ? '<div class="ln">No billing record (made paid before billing). Make Paid records the deal.</div>' + login : login;
      const n = a.next || {}, per = a.interval === 'year' ? 'a year' : 'a month';
      return '<div class="ln"><b>' + escapeHtml(a.legal_name || '') + '</b> · ' + escapeHtml(a.billing_email || '') + (a.order_signed_by ? ' · signed by ' + escapeHtml(a.order_signed_by) : '') + '</div>'
        + '<div class="ln">Next invoice: ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b> ' + per + (a.paid_through ? ' · paid through ' + pbDay(a.paid_through) : ' · first invoice not paid yet') + '</div>'
        + (a.state === 'past_due' ? '<div class="ln">' + (a.read_only ? 'Grace is over: read-only. New runs and reports wait on the crew’s phones.' : 'Past due: read-only after ' + pbDay(a.grace_until) + '.') + '</div>' : '')
        + (a.state === 'read_only' ? '<div class="ln">Read-only: new runs and reports wait on the crew’s phones until it’s paid. Nothing is deleted.</div>' : '')
        + (a.state === 'canceled' ? '<div class="ln">Canceled: ' + (a.read_only ? 'read-only now.' : 'open until ' + pbDay(a.cancel_at) + ', then read-only.') + ' Nothing is deleted.</div>' : '')
        + (a.founder_until ? '<div class="ln">Founder price locked until ' + pbDay(a.founder_until) + (a.founder_set_by ? ' (set ' + pbDay(a.founder_set_at) + ' by ' + escapeHtml(a.founder_set_by) + ')' : '') + '</div>' : '')
        + '<div class="ln">Plan reading add-on: ' + (a.plan_reading ? 'on · ' + (a.plan_reading_cents == null ? 'price not set (not on the invoice)' : pbMoney(a.plan_reading_cents) + ' a month') : 'off (plan sets stay parked)') + '</div>' + login;
    }
    function pbBillActs(bc, beta, haveBilling) {
      const b = (act, label, ghost) => '<button type="button" class="pb-btn small' + (ghost ? ' ghost' : '') + '" data-act="' + act + '">' + label + '</button>';
      if (!haveBilling) return beta ? '<div class="acts">' + b('extend', 'Add 30 Days', true) + b('paid', 'Make Paid') + '</div>' : '';
      const a = bc && bc.account;
      if (beta) return '<div class="acts">' + b('extend', 'Add 30 Days', true) + b('paid', 'Make Paid') + b('handover', 'Hand Over', true) + '</div>';
      if (!a || a.state === 'canceled') return '<div class="acts">' + b('paid', 'Make Paid') + b('handover', 'Hand Over', true) + '</div>';
      return '<div class="acts pb-bill-acts">' + b('b_paid', 'Paid') + (a.state === 'past_due' ? b('b_active', 'Not Past Due', true) : b('b_past', 'Past Due', true))
        + (a.state === 'read_only' ? b('b_active', 'Not Read-Only', true) : b('b_ro', 'Read-Only', true)) + b('b_cancel', 'Cancel Plan', true)
        + (a.plan_reading ? b('pr_off', 'Plan Reading Off', true) : b('pr_on', 'Plan Reading On', true)) + b('handover', 'Hand Over', true) + '</div>';
    }
    function pbBillDue(B) {
      if (!B) return '';
      const set = B.settings || {}, due = Array.isArray(B.due) ? B.due : [], seller = typeof set.seller_legal_name === 'string' && set.seller_legal_name ? set.seller_legal_name : '';
      return '<div class="pb-own-co" id="pbBillDue"><div class="nm">Billing due</div>'
        + '<div class="ln">Seller on invoices: ' + (seller ? escapeHtml(seller) : '<b>not set yet</b>') + ' · ' + pbMoney(pbNum(set.base_cents, 9900)) + ' a month includes ' + pbNum(set.base_seats, 5) + ' people, ' + pbMoney(pbNum(set.seat_cents, 1200)) + ' each extra · yearly = ' + pbNum(set.yearly_months, 10) + ' months</div>'
        + (due.length ? due.map((d) => '<div class="pb-bill-due" data-id="' + escapeHtml(d.company_id) + '"><div class="hd">' + escapeHtml(d.legal_name || d.name || '') + (d.state && d.state !== 'active' ? ' <span class="ch' + (d.state === 'past_due' ? '' : ' ended') + '">' + (d.state === 'past_due' ? 'Past due' : d.state === 'read_only' ? 'Read-only' : 'Canceled') + '</span>' : '') + '</div>'
            + '<div class="ln">' + pbDay(d.from) + ' – ' + pbDay(d.to) + ' · ' + (Number(d.seats) || 0) + ' people · <b>' + pbMoney(d.amount_cents) + '</b> ' + (d.interval === 'year' ? 'for the year' : 'for the month') + (d.founder ? ' · founder price' : '') + '</div>'
            + '<div class="ln">Send to ' + escapeHtml(d.billing_email || '') + (d.tax_state ? ' · billing state ' + escapeHtml(d.tax_state) : '') + (d.plan_reading_price_missing ? ' · plan reading price not set' : '') + '</div></div>').join('')
          : '<div class="ln">Nothing to invoice in the next ' + pbNum(set.invoice_ahead_days, 7) + ' days.</div>') + '</div>';
    }
    function pbBillSheet(id, title) {
      const ov = document.createElement('div'); ov.className = 'pb-fb'; ov.id = id;
      ov.innerHTML = '<div class="pb-fb-card pb-bill-form" role="dialog" aria-modal="true" aria-labelledby="' + id + 'T"><div class="pb-fb-top"><span id="' + id + 'T">' + escapeHtml(title) + '</span><button type="button" class="pb-fb-x" aria-label="Close">&times;</button></div><div class="pb-bill-body" style="display:flex;flex-direction:column;gap:12px"></div></div>';
      document.body.appendChild(ov);
      const close = () => ov.remove();
      ov.querySelector('.pb-fb-x').onclick = close;
      return { ov, body: ov.querySelector('.pb-bill-body'), close };
    }
    function pbMakePaidForm(c, bc, B, done) {
      const set = (B && B.settings) || {}, seats = bc ? Number(bc.seats_used) || 0 : 0, founderOk = !!(bc && bc.founder_ok), months = pbNum(set.founder_months, 12);
      const until = new Date(); until.setMonth(until.getMonth() + months);
      const prc = typeof set.plan_reading_cents === 'number' ? set.plan_reading_cents : null;
      const { body, close } = pbBillSheet('pbMakePaid', 'Make Paid: ' + (c.name || ''));
      body.innerHTML = '<p class="pb-bill-note">Use this after the company signs the order form. You send the invoices from Stripe; this records the deal.</p>'
        + '<label>Company legal name<input id="pbMpName" maxlength="200" autocomplete="off"></label>'
        + '<label>Billing email<input id="pbMpEmail" type="email" maxlength="254" autocomplete="off" autocapitalize="off" placeholder="ap@company.com"></label>'
        + '<div class="pb-bill-sec">People</div><p class="pb-bill-note"><b id="pbMpSeats">' + seats + '</b> counted now: every login in the company and every open invite. The company login is free.</p>'
        + '<div class="pb-bill-sec">Billing</div><div class="pb-fb-seg" role="group" aria-label="Billing period"><button type="button" data-iv="month">Monthly</button><button type="button" data-iv="year">Yearly</button></div>'
        + '<label class="pb-bill-chk"><input type="checkbox" id="pbMpFounder"' + (founderOk ? '' : ' disabled') + '><span>Founder price, locked until <b>' + pbDay(until) + '</b>' + (founderOk ? '' : (c.plan === 'trial' ? ' (not offered: the beta has ended)' : ' (only for a beta company that commits before its beta ends)')) + '</span></label>'
        + '<label class="pb-bill-chk"><input type="checkbox" id="pbMpPr"><span>Plan reading add-on' + (prc == null ? ' (price not set yet: not on the invoice)' : ' (' + pbMoney(prc) + ' a month)') + '. Off: plan sets stay parked.</span></label>'
        + '<label>Signed by (name and title)<input id="pbMpSigner" maxlength="200" autocomplete="off" placeholder="Jane Smith, President"></label>'
        + '<div class="pb-bill-price" id="pbMpPrice" role="status"></div>'
        + '<button type="button" class="pb-btn" id="pbMpGo">Make Paid</button><p class="pb-fb-st" id="pbMpSt" role="status"></p>';
      body.querySelector('#pbMpName').value = c.name || '';
      let iv = 'month';
      const price = () => {
        const base = pbNum(set.base_cents, 9900), bs = pbNum(set.base_seats, 5), sc = pbNum(set.seat_cents, 1200), ym = pbNum(set.yearly_months, 10), pr = body.querySelector('#pbMpPr').checked;
        const m = base + Math.max(0, seats - bs) * sc + (pr && prc != null ? prc : 0);
        body.querySelector('#pbMpPrice').innerHTML = (iv === 'year' ? '<b>' + pbMoney(m * ym) + '</b> a year (' + ym + ' months of ' + pbMoney(m) + ')' : '<b>' + pbMoney(m) + '</b> a month')
          + '<br>' + pbMoney(base) + ' includes ' + bs + ' people, ' + seats + ' counted' + (seats > bs ? ' (' + (seats - bs) + ' extra at ' + pbMoney(sc) + ')' : '') + (pr && prc != null ? ', plan reading ' + pbMoney(prc) : '')
          + (body.querySelector('#pbMpFounder').checked ? '<br>Founder price locked until ' + pbDay(until) : '') + '<br>People added later are billed from the next invoice.';
      };
      const setIv = (x) => { iv = x; body.querySelectorAll('[data-iv]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.iv === iv))); price(); };
      body.querySelectorAll('[data-iv]').forEach((b) => { b.onclick = () => setIv(b.dataset.iv); });
      body.querySelector('#pbMpFounder').onchange = price; body.querySelector('#pbMpPr').onchange = price;
      setIv('month');
      const st = body.querySelector('#pbMpSt'), go = body.querySelector('#pbMpGo');
      go.onclick = async () => {
        const name = body.querySelector('#pbMpName').value.trim(), email = body.querySelector('#pbMpEmail').value.trim(), signer = body.querySelector('#pbMpSigner').value.trim();
        if (!name) { st.textContent = 'Type the company’s legal name.'; return; }
        if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) { st.textContent = 'Type the billing email.'; return; }
        if (signer.length < 2) { st.textContent = 'Type the name of the person who signed the order.'; return; }
        if (go.disabled) return; go.disabled = true; st.textContent = 'Saving…';
        const d = await pbBillRpc('pb_owner_make_paid', { p_company: c.id, p_legal_name: name, p_billing_email: email, p_seats: null, p_interval: iv,
          p_founder: body.querySelector('#pbMpFounder').checked, p_plan_reading: body.querySelector('#pbMpPr').checked, p_signed_by: signer });
        go.disabled = false;
        if (!d.ok) { st.textContent = d.message; return; }
        const n = (d.account && d.account.next) || {}, dbl = Array.isArray(d.individual_plans_to_stop) ? d.individual_plans_to_stop : [];
        body.innerHTML = '<p><b>' + escapeHtml(name) + ' is paid.</b></p>'
          + '<div class="pb-bill-price">First invoice: ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b>' + (d.account && d.account.founder_until ? '<br>Founder price locked until ' + pbDay(d.account.founder_until) : '') + '</div>'
          + '<p class="pb-bill-note">Company login: <b>' + escapeHtml(d.owner_login || 'unknown') + '</b>. If that’s a superintendent and not the company’s owner, use Hand Over.</p>'
          + (dbl.length ? '<div class="pb-bill-sec">Also paying for their own plan</div>' + dbl.map((x) => '<div class="ln" data-uid="' + escapeHtml(x.user_id) + '">' + escapeHtml(x.email || 'Someone') + ' <button type="button" class="pb-btn small ghost" data-off="1" style="width:auto;display:inline-block;margin-left:6px">Turn Off Their Plan</button></div>').join('') : '')
          + '<button type="button" class="pb-btn" id="pbMpDone">Done</button><p class="pb-fb-st" id="pbMpSt2" role="status"></p>';
        body.querySelectorAll('[data-off]').forEach((b) => { b.onclick = async () => {
          b.disabled = true; const r = await pbBillRpc('pb_owner_individual_off', { p_user: b.closest('[data-uid]').dataset.uid, p_reason: 'company plan paid' });
          if (!r.ok) { b.disabled = false; body.querySelector('#pbMpSt2').textContent = r.message; return; }
          b.replaceWith(document.createTextNode(' · turned off'));
        }; });
        body.querySelector('#pbMpDone').onclick = close;
        done();
      };
    }
    function pbHandOverForm(c, bc, done) {
      const people = (bc && Array.isArray(bc.people)) ? bc.people : [];
      const { body, close } = pbBillSheet('pbHandOver', 'Hand Over: ' + (c.name || ''));
      const role = (p) => p.role === 'pm' ? (p.title === 'superintendent' ? 'Superintendent' : 'Project manager') : p.role === 'foreman' ? 'Foreman' : 'Pipelayer';
      body.innerHTML = '<p class="pb-bill-note">The company login moves to the person you pick (the company’s owner). <b>' + escapeHtml((bc && bc.owner_login) || 'The current login') + '</b> stays in the company as:</p>'
        + '<div class="pb-fb-seg" role="group" aria-label="Their role after"><button type="button" data-t="superintendent">Superintendent</button><button type="button" data-t="project_manager">Project manager</button></div>'
        + '<div class="pb-bill-sec">New owner</div>'
        + (people.length ? people.map((p) => '<label class="pb-bill-chk"><input type="radio" name="pbHoWho" value="' + escapeHtml(p.user_id) + '"><span>' + escapeHtml(p.email || 'Unknown') + ' · ' + role(p) + '</span></label>').join('')
          : '<p class="pb-bill-note">Nobody else is in this company yet. Invite the owner in Crew first; once they have joined, hand it over here.</p>')
        + '<p class="pb-bill-note">They need to be in the company already. If they use two-step login, they enter their code before the owner tools work.</p>'
        + '<button type="button" class="pb-btn" id="pbHoGo"' + (people.length ? '' : ' disabled') + '>Hand Over</button><p class="pb-fb-st" id="pbHoSt" role="status"></p>';
      let t = 'superintendent';
      const setT = (x) => { t = x; body.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === t))); };
      body.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => setT(b.dataset.t); }); setT('superintendent');
      const st = body.querySelector('#pbHoSt'), go = body.querySelector('#pbHoGo');
      go.onclick = async () => {
        const pick = body.querySelector('input[name="pbHoWho"]:checked');
        if (!pick) { st.textContent = 'Pick the new owner.'; return; }
        const who = people.find((p) => p.user_id === pick.value) || {};
        const yes = await new Promise((ok) => pbShowModal('Hand ' + (c.name || 'this company') + ' to ' + (who.email || 'them') + '? ' + ((bc && bc.owner_login) || 'The current login') + ' stays in the company as ' + (t === 'superintendent' ? 'Superintendent' : 'Project manager') + '.', [{ label: 'Cancel', onClick: () => ok(false) }, { label: 'Hand Over', primary: true, onClick: () => ok(true) }]));
        if (!yes || go.disabled) return;
        go.disabled = true; st.textContent = 'Handing over…';
        const d = await pbBillRpc('pb_owner_company_handover', { p_company: c.id, p_new_owner: pick.value, p_old_owner_title: t });
        go.disabled = false;
        if (!d.ok) { st.textContent = d.message; return; }
        body.innerHTML = '<p><b>Done.</b> ' + escapeHtml(d.to_email || who.email || '') + ' now holds the company login. ' + escapeHtml(d.from_email || '') + ' is in the company as ' + (t === 'superintendent' ? 'Superintendent' : 'Project manager') + '.</p><button type="button" class="pb-btn" id="pbHoDone">Done</button>';
        body.querySelector('#pbHoDone').onclick = close;
        done();
      };
    }

    // the app owner's Beta Accounts
    const FEAT = {""")

# ---- Beta Accounts: load billing, show Billing due, chips, lines and buttons ----
rep("""        let rq = null; try { rq = await sbClient.rpc('pb_owner_plan_requests'); } catch (e) {} /* r16.71 */""",
    """        let rq = null; try { rq = await sbClient.rpc('pb_owner_plan_requests'); } catch (e) {} /* r16.71 */
        let bl = null; try { bl = await sbClient.rpc('pb_owner_billing'); } catch (e) {} /* billing Phase 0 */
        B = bl && !bl.error && bl.data && bl.data.ok ? bl.data : null; BC = {}; if (B) (B.companies || []).forEach((x) => { BC[x.id] = x; });""")
rep("""        list.innerHTML = reqHtml + tot + (cos.length ? cos.map((c) => {""",
    """        list.innerHTML = reqHtml + pbBillDue(B) + tot + (cos.length ? cos.map((c) => {""")
rep("""          return '<div class="pb-own-co" data-id="' + escapeHtml(c.id) + '"><div class="nm">' + escapeHtml(c.name || '') + ' <span class="ch' + (beta ? (ended ? ' ended' : '') : ' paid') + '">' + (beta ? (ended ? 'Beta ended' : 'Beta · ' + left + (left === 1 ? ' day' : ' days') + ' left') : 'Paid') + '</span></div>'""",
    """          const bc = BC[c.id], acct = bc && bc.account; /* billing Phase 0 */
          return '<div class="pb-own-co" data-id="' + escapeHtml(c.id) + '"><div class="nm">' + escapeHtml(c.name || '') + ' ' + (!beta && acct ? pbBillChip(acct) : '<span class="ch' + (beta ? (ended ? ' ended' : '') : ' paid') + '">' + (beta ? (ended ? 'Beta ended' : 'Beta · ' + left + (left === 1 ? ' day' : ' days') + ' left') : 'Paid') + '</span>') + '</div>'
            + pbBillLines(bc)""")
rep("""            + (beta ? '<div class="acts"><button type="button" class="pb-btn ghost small" data-act="extend">Add 30 Days</button><button type="button" class="pb-btn small" data-act="paid">Make Paid</button></div>' : '')""",
    """            + pbBillActs(bc, beta, !!B)""")
rep("""        list.querySelectorAll('[data-act]').forEach((b) => { b.onclick = async () => {
          const id = b.closest('.pb-own-co').dataset.id, paid = b.dataset.act === 'paid';
          if (paid && !(await new Promise((ok) => pbShowModal('Switch this company to paid? Its parked plan sets start reading now.', [{ label: 'Cancel', onClick: () => ok(false) }, { label: 'Make Paid', primary: true, onClick: () => ok(true) }])))) return;
          b.disabled = true;
          let r; try { r = await sbClient.rpc('pb_owner_company_set', { p_company: id, p_plan: paid ? 'paid' : 'trial', p_days: 30 }); } catch (e) { r = { error: e }; }
          if (!r || r.error || !r.data || !r.data.ok) { pbAlert('Not changed. Check signal and try again.', 'Not Changed'); b.disabled = false; return; }
          load();
        }; });""",
    """        list.querySelectorAll('[data-act]').forEach((b) => { b.onclick = async () => {
          const id = b.closest('.pb-own-co').dataset.id, act = b.dataset.act, c = cos.find((x) => x.id === id) || { id }, bc = BC[id], a = bc && bc.account, nm = (a && a.legal_name) || c.name || 'this company';
          /* billing Phase 0: Make Paid is the form (the deal is recorded on the server); the old one-tap switch is gone */
          if (act === 'paid') { if (!B) { pbAlert('The billing server isn’t set up yet. Nothing was changed.', 'Not Changed'); return; } pbMakePaidForm(c, bc, B, load); return; }
          if (act === 'handover') { pbHandOverForm(c, bc, load); return; }
          const ask = (msg, label) => new Promise((ok) => pbShowModal(msg, [{ label: 'Back', onClick: () => ok(false) }, { label, primary: true, onClick: () => ok(true) }]));
          const grace = B && B.settings ? pbNum(B.settings.grace_days, 7) : 7, n = (a && a.next) || {};
          let fn = null, args = null;
          if (act === 'extend') { fn = 'pb_owner_company_set'; args = { p_company: id, p_plan: 'trial', p_days: 30 }; }
          else if (act === 'b_paid') { if (!(await ask('Mark ' + nm + '’s invoice for ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' (' + pbMoney(n.amount_cents) + ') as paid?', 'Paid'))) return; fn = 'pb_owner_billing_paid'; args = { p_company: id, p_from: n.from, p_amount_cents: n.amount_cents }; }
          else if (act === 'b_past') { if (!(await ask(nm + ' is past due? They get ' + grace + ' days, then the company goes read-only: new runs and reports wait on the crew’s phones. Nothing is deleted.', 'Past Due'))) return; fn = 'pb_owner_billing_state'; args = { p_company: id, p_state: 'past_due' }; }
          else if (act === 'b_ro') { if (!(await ask('Make ' + nm + ' read-only now? New runs and reports wait on the crew’s phones until you press Paid. Nothing is deleted.', 'Read-Only'))) return; fn = 'pb_owner_billing_state'; args = { p_company: id, p_state: 'read_only' }; }
          else if (act === 'b_cancel') { if (!(await ask('Cancel ' + nm + '’s plan? It stays open ' + (a && a.paid_through ? 'until ' + pbDay(a.paid_through) : 'until today') + ', then goes read-only. Nothing is deleted.', 'Cancel Plan'))) return; fn = 'pb_owner_billing_state'; args = { p_company: id, p_state: 'canceled' }; }
          else if (act === 'b_active') { fn = 'pb_owner_billing_state'; args = { p_company: id, p_state: 'active' }; }
          else if (act === 'pr_on' || act === 'pr_off') {
            const on = act === 'pr_on', price = B && B.settings && typeof B.settings.plan_reading_cents === 'number' ? pbMoney(B.settings.plan_reading_cents) + ' a month' : 'price not set yet (not on the invoice)';
            if (!(await ask(on ? 'Turn the plan reading add-on on for ' + nm + ' (' + price + ')? Its parked plan sets start reading now.' : 'Turn plan reading off for ' + nm + '? Plan sets being read go back to parked. Nothing is deleted.', on ? 'Turn On' : 'Turn Off'))) return;
            fn = 'pb_owner_plan_reading_set'; args = { p_company: id, p_on: on };
          }
          if (!fn) return;
          b.disabled = true;
          const d = await pbBillRpc(fn, args);
          if (!d.ok) { pbAlert(d.message, 'Not Changed'); b.disabled = false; if (d.code === 'pb:period_changed') load(); return; }
          load();
        }; });""")
rep("""      const list = ov.querySelector('#pbOwnList'), st = ov.querySelector('#pbOwnSt');
      async function load() {""",
    """      const list = ov.querySelector('#pbOwnList'), st = ov.querySelector('#pbOwnSt');
      let B = null, BC = {}; /* billing Phase 0: pb_owner_billing */
      async function load() {""")
rep("""<span class="sub">Start betas, see how each company uses the app (app owner only)</span>""",
    """<span class="sub">Start betas, Make Paid, billing due, hand over (app owner only)</span>""")
open(out, 'w', encoding='utf-8').write(s)
