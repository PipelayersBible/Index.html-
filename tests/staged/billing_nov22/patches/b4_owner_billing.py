# billing_nov22 b4: Thomas's Billing (Settings > Beta Accounts).
#  #5   Invoice Sent (snapshots seats / amount / due) and Paid marks that invoice.
#  #6   Make Paid: seats bought (at least the people now), billing address (state required), billing contact, Terms version.
#  #3   Make Paid answer: the first invoice is in Billing due until Paid.
#  #13  Paid - Restart From Today.  #14 Edit Billing, Switch to Yearly / Monthly at Renewal, Undo Cancel (while paid time remains).
#  #4 #18  catch-up line at the yearly rate, joined people only.  #16 individuals "also in <company>" (Turn Off), first invoice.
#  #17  founder box on for a company that asked before its trial ended; the pick (Monthly / Yearly) comes from the request.
# usage: python3 b4_owner_billing.py in.html out.html
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

p.rep("""      'pb:company_inactive': 'That company isn’t active.', 'pb:no_catchup': 'Nothing to catch up: the people now fit in the paid seats.', 'pb:bad_email': 'Type the billing email.', 'pb:no_signer': 'Type the name of the person who signed the order.',""",
"""      'pb:company_inactive': 'That company isn’t active.', 'pb:no_catchup': 'Nothing to catch up: the people now fit in the paid seats.', 'pb:bad_email': 'Type the billing email.', 'pb:no_signer': 'Type the name of the person who signed the order.',
      'pb:no_state': 'Type the billing address with its state (2 letters, for sales tax).', 'pb:bad_address': 'Type the billing address.', /* billing_nov22 */
      'pb:not_locked': 'This plan isn’t past due or read-only. Use Paid.', 'pb:cancel_over': 'The paid time has run out. Use Make Paid to start the plan again.',
      'pb:canceled': 'This plan is canceled. Use Make Paid to start it again.', 'pb:bad_due': 'Pick a due date from today to 90 days out.', 'pb:bad_seats': 'Seats bought: a whole number from 0 to 1000.',""")

# the catch-up line: the yearly rate, joined people only
p.rep("""    const pbCatchLine = (a) => { const c = a.catchup || {}; return Number(c.cents) > 0 ? 'Catch-up: ' + c.people + ' above the paid seats × ' + c.months + ' month' + (c.months === 1 ? '' : 's') + ' left × ' + pbMoney(a.seat_cents) + ' = <b>' + pbMoney(c.cents) + '</b>' : Number(c.monthly_next_invoice) > 0 ? c.monthly_next_invoice + ' above the paid seats: on the next invoice' : ''; };""",
"""    const pbCatchLine = (a) => { const c = a.catchup || {}; return Number(c.cents) > 0 ? 'Catch-up: ' + c.people + ' joined above the paid seats × ' + (c.each_cents != null ? pbMoney(c.each_cents) + ' each (' + c.months + ' full month' + (c.months === 1 ? '' : 's') + ' left at the yearly rate)' : c.months + ' months × ' + pbMoney(a.seat_cents)) + ' = <b>' + pbMoney(c.cents) + '</b>' : Number(c.monthly_next_invoice) > 0 ? c.monthly_next_invoice + ' above the paid seats: on the next invoice' : ''; }; /* billing_nov22 #4 #18 */
    const pbInvLine = (a) => { const n = a.next || {}; if (a.state === 'canceled') return ''; /* billing_nov22 #5: has the invoice for the next period been sent? */
      return n.sent ? 'Invoice sent ' + pbDay(a.invoice && a.invoice.sent_on) + ' · due ' + pbDay(a.due_on) + ' · locks ' + pbDay(a.lock_on) + ' if not paid'
        : n.due ? '<b>Not sent yet:</b> send it, then press Invoice Sent (due ' + pbDay(a.due_on) + ' unless sent later)' : ''; };""")

# the company card lines
p.rep("""        + '<div class="ln">Paid through ' + pbDay(a.paid_through) + ' · next invoice ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b> ' + per + '</div>'
        + '<div class="ln">Paid seats: ' + (Number(a.seats_capacity) || 0) + ' · people now: ' + (Number(a.seats_used) || 0) + (pbCatchLine(a) ? ' · ' + pbCatchLine(a) : '') + '</div>'
        + (a.state === 'past_due' ? '<div class="ln"><b>Not paid for the next period.</b> Goes read-only on ' + pbDay(a.lock_on) + ' unless you press Paid.</div>' : '')""",
"""        + '<div class="ln">' + (a.first_invoice ? '<b>First invoice not paid yet</b> · ' : 'Paid through ' + pbDay(a.paid_through) + ' · next invoice ') + pbDay(n.from) + ' – ' + pbDay(n.to) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b> ' + (n.interval === 'year' ? 'a year' : n.interval === 'month' ? 'a month' : per) + '</div>' /* billing_nov22 */
        + (pbInvLine(a) ? '<div class="ln">' + pbInvLine(a) + '</div>' : '')
        + '<div class="ln">Paid seats: ' + (Number(a.seats_capacity) || 0) + (Number(a.seats_min) > 0 ? ' · bought: ' + a.seats_min : '') + ' · people now: ' + (Number(a.seats_used) || 0) + (a.waiting != null ? ' (' + (Number(a.joined) || 0) + ' joined, ' + (Number(a.waiting) || 0) + ' invited)' : '') + (pbCatchLine(a) ? ' · ' + pbCatchLine(a) : '') + '</div>'
        + (a.next_interval ? '<div class="ln">Switches to <b>' + (a.next_interval === 'year' ? 'yearly' : 'monthly') + '</b> at renewal.</div>' : '')
        + '<div class="ln">Billing: ' + (a.tax_state ? 'state ' + escapeHtml(a.tax_state) : '<b>no billing state</b> (Edit Billing)') + (a.billing_contact ? ' · contact ' + escapeHtml(a.billing_contact) : '') + (a.terms_version ? ' · Terms ' + escapeHtml(a.terms_version) : '') + '</div>'
        + (a.state === 'past_due' ? '<div class="ln"><b>Not paid: due ' + pbDay(a.due_on) + '.</b> Goes read-only on ' + pbDay(a.lock_on) + ' unless you press Paid.</div>' : '')""")

# the buttons
p.rep("""      if (!a || a.state === 'canceled') return '<div class="acts">' + b('paid', 'Make Paid') + b('handover', 'Hand Over', true) + '</div>';
      return '<div class="acts pb-bill-acts">' + b('b_paid', 'Paid') + (a.stored_state === 'read_only' ? b('b_active', 'Not Read-Only', true) : b('b_ro', 'Read-Only Now', true)) + b('b_cancel', 'Cancel Plan', true)
        + (a.catchup && Number(a.catchup.cents) > 0 ? b('b_catch', 'Catch-up Paid') : '')""",
"""      if (!a || a.state === 'canceled') return '<div class="acts">' + (a && a.state === 'canceled' && !a.read_only ? b('b_undo', 'Undo Cancel') : '') + b('paid', 'Make Paid') + b('handover', 'Hand Over', true) + '</div>'; /* billing_nov22 #14 */
      const nx = a.next || {}, locked = a.state === 'read_only'; /* restart from today: a locked company (past due still has Paid) */
      return '<div class="acts pb-bill-acts">' + (!nx.sent ? b('b_inv', 'Invoice Sent', !nx.due) : '') + b('b_paid', 'Paid') + (locked ? b('b_restart', 'Paid \\u2013 Restart From Today', true) : '') /* billing_nov22 #5 #13 */
        + (a.stored_state === 'read_only' ? b('b_active', 'Not Read-Only', true) : b('b_ro', 'Read-Only Now', true)) + b('b_cancel', 'Cancel Plan', true)
        + (a.catchup && Number(a.catchup.cents) > 0 ? b('b_catch', 'Catch-up Paid') : '')
        + b('b_edit', 'Edit Billing', true) + b('b_iv', a.next_interval ? 'Keep ' + (a.interval === 'year' ? 'Yearly' : 'Monthly') : 'Switch to ' + (a.interval === 'year' ? 'Monthly' : 'Yearly') + ' at Renewal', true)""")

# individuals: also in a company, first invoice, due date
p.rep("""        return '<div class="pb-bill-due" data-ind="' + escapeHtml(x.user_id) + '"><div class="hd">' + escapeHtml(x.email || '') + ' · individual, ' + (yr ? 'yearly' : 'monthly') + (x.state === 'lapsed' ? ' <span class="ch ended">Not paid · AI off</span>' : x.state === 'past_due' ? ' <span class="ch ended">Past due</span>' : '') + '</div>'
          + '<div class="ln">Paid through ' + pbDay(x.paid_through) + ' · next: <b>' + pbMoney(n.amount_cents) + '</b> ' + (x.interval === 'year' ? 'for the year' : 'for the month') + '</div>'""",
"""        return '<div class="pb-bill-due" data-ind="' + escapeHtml(x.user_id) + '"><div class="hd">' + escapeHtml(x.email || '') + ' · individual, ' + (yr ? 'yearly' : 'monthly') + (x.state === 'lapsed' ? ' <span class="ch ended">Not paid · plan off</span>' : x.state === 'past_due' ? ' <span class="ch ended">Past due</span>' : '') + '</div>'
          + (x.company ? '<div class="ln"><b>Also in ' + escapeHtml(x.company) + '</b>: their company pays for them. Turn their own plan off so they don\\u2019t pay twice. <button type="button" class="pb-btn small ghost" data-indoff="' + escapeHtml(x.user_id) + '" style="width:auto;display:inline-block;margin-left:6px">Turn Off Their Plan</button></div>' : '') /* billing_nov22 #16 */
          + '<div class="ln">' + (x.first_invoice ? '<b>First invoice not paid yet</b>' : 'Paid through ' + pbDay(x.paid_through)) + ' · ' + (x.first_invoice ? '' : 'next: ') + '<b>' + pbMoney(n.amount_cents) + '</b> ' + (x.interval === 'year' ? 'for the year' : 'for the month') + (x.due_on ? ' · due ' + pbDay(x.due_on) + ' · plan off ' + pbDay(x.lock_on) + ' if not paid' : '') + '</div>'""")
p.rep("""    document.addEventListener('click', async (e) => {
      const b = e.target && e.target.closest ? e.target.closest('[data-indpaid]') : null; if (!b || b.disabled) return;""",
"""    document.addEventListener('click', async (e) => { /* billing_nov22 #16: Turn Off Their Plan (an individual who is also in a company) */
      const b = e.target && e.target.closest ? e.target.closest('[data-indoff]') : null; if (!b || b.disabled) return;
      const yes = await new Promise((ok) => pbShowModal('Turn off this person\\u2019s own plan? Their company plan covers them. Nothing is deleted.', [{ label: 'Back', onClick: () => ok(false) }, { label: 'Turn Off', primary: true, onClick: () => ok(true) }]));
      if (!yes) return; b.disabled = true;
      const d = await pbBillRpc('pb_owner_individual_off', { p_user: b.dataset.indoff, p_reason: 'also in a company' });
      if (!d.ok) { b.disabled = false; pbAlert(d.message, 'Not Changed'); return; }
      b.replaceWith(document.createTextNode(' · turned off'));
    });
    document.addEventListener('click', async (e) => {
      const b = e.target && e.target.closest ? e.target.closest('[data-indpaid]') : null; if (!b || b.disabled) return;""")

# Billing due list: first invoice / sent / not sent, catch-up at the yearly rate
p.rep("""            + '<div class="ln">' + pbDay(d.from) + ' – ' + pbDay(d.to) + ' · ' + (Number(d.seats) || 0) + ' people · <b>' + pbMoney(d.amount_cents) + '</b> ' + (d.interval === 'year' ? 'for the year' : 'for the month') + (d.founder ? ' · founder price' : '') + '</div>'
            + (d.catchup && Number(d.catchup.cents) > 0 ? '<div class="ln">Catch-up now: ' + d.catchup.people + ' above the paid seats × ' + d.catchup.months + ' months × ' + pbMoney(pbNum(set.seat_cents, 1200)) + ' = <b>' + pbMoney(d.catchup.cents) + '</b></div>' : '')""",
"""            + '<div class="ln">' + (d.first_invoice ? '<b>First invoice</b> · ' : '') + pbDay(d.from) + ' – ' + pbDay(d.to) + ' · ' + (Number(d.seats) || 0) + ' people · <b>' + pbMoney(d.amount_cents) + '</b> ' + (d.interval === 'year' ? 'for the year' : 'for the month') + (d.founder ? ' · founder price' : '') + '</div>'
            + (d.state !== 'canceled' ? '<div class="ln">' + (d.sent ? 'Sent · due ' + pbDay(d.due_on) : '<b>Not sent yet</b> · send it, then press Invoice Sent on the company below') + '</div>' : '') /* billing_nov22 #5 */
            + (d.catchup && Number(d.catchup.cents) > 0 ? '<div class="ln">Catch-up now: ' + d.catchup.people + ' joined above the paid seats × ' + (d.catchup.each_cents != null ? pbMoney(d.catchup.each_cents) + ' each (' + d.catchup.months + ' full months left at the yearly rate)' : d.catchup.months + ' months × ' + pbMoney(pbNum(set.seat_cents, 1200))) + ' = <b>' + pbMoney(d.catchup.cents) + '</b></div>' : '')""")

# Make Paid form: seats, address, contact, Terms version; the pick from the request; founder after a request before the end
p.rep("""      const set = (B && B.settings) || {}, seats = bc ? Number(bc.seats_used) || 0 : 0, founderOk = !!(bc && bc.founder_ok), months = pbNum(set.founder_months, 12);""",
"""      const set = (B && B.settings) || {}, used = bc ? Number(bc.seats_used) || 0 : 0, founderOk = !!(bc && bc.founder_ok), months = pbNum(set.founder_months, 12); let seats = used; /* billing_nov22 #6: seats bought */
      const req = bc && bc.request && typeof bc.request === 'object' ? bc.request : null;""")
p.rep("""        + '<div class="pb-bill-sec">People</div><p class="pb-bill-note"><b id="pbMpSeats">' + seats + '</b> counted now: every login in the company and every open invite. The company login is free.</p>'""",
"""        + '<label>Billing address<input id="pbMpAddr1" maxlength="200" autocomplete="off" placeholder="Street"></label>' /* billing_nov22 #6 */
        + '<div style="display:flex;gap:8px"><label style="flex:2">City<input id="pbMpCity" maxlength="100" autocomplete="off"></label><label style="flex:1">State<input id="pbMpState" maxlength="2" autocomplete="off" autocapitalize="characters" placeholder="CA"></label><label style="flex:1.3">ZIP<input id="pbMpZip" maxlength="10" inputmode="numeric" autocomplete="off"></label></div>'
        + '<label>Billing contact (name and phone)<input id="pbMpContact" maxlength="200" autocomplete="off" placeholder="Jane Smith, 555-0100"></label>'
        + '<div class="pb-bill-sec">People</div><p class="pb-bill-note"><b id="pbMpSeats">' + used + '</b> counted now: every login in the company and every open invite. The company login is free.</p>'
        + '<label>Seats bought (at least ' + used + ')<input id="pbMpSeatsIn" type="number" inputmode="numeric" min="' + used + '" max="1000" step="1" value="' + used + '"></label>'""")
p.rep("""        + '<label class="pb-bill-chk"><input type="checkbox" id="pbMpFounder"' + (founderOk ? '' : ' disabled') + '><span>Founder price, locked until <b>' + pbDay(until) + '</b>' + (founderOk ? '' : (c.plan === 'trial' ? ' (not offered: the beta has ended)' : ' (only for a beta company that commits before its beta ends)')) + '</span></label>'""",
"""        + '<label class="pb-bill-chk"><input type="checkbox" id="pbMpFounder"' + (founderOk ? '' : ' disabled') + '><span>Founder price, locked until <b>' + pbDay(until) + '</b>' + (founderOk ? (req && req.before_end && c.trial_ends_at && new Date(c.trial_ends_at).getTime() <= Date.now() ? ' (they asked ' + pbDay(req.at) + ', before the beta ended)' : '') : (c.plan === 'trial' ? ' (not offered: the beta ended before they asked)' : ' (only for a beta company that asks before its beta ends)')) + '</span></label>'""")
p.rep("""        + '<label>Signed by (name and title)<input id="pbMpSigner" maxlength="200" autocomplete="off" placeholder="Jane Smith, President"></label>'""",
"""        + '<label>Signed by (name and title)<input id="pbMpSigner" maxlength="200" autocomplete="off" placeholder="Jane Smith, President"></label>'
        + '<label>Terms version they signed under<input id="pbMpTerms" maxlength="40" autocomplete="off" value="1.0"></label>' /* billing_nov22 #6: stamped on the account */""")
p.rep("""          + '<br>If Paid isn’t pressed for the next period by its start, the company goes past due, then read-only ' + pbNum(set.grace_days, 7) + ' days later.';
      };""",
"""          + '<br>The first invoice goes out now and is due in ' + pbNum(set.invoice_ahead_days, 7) + ' days. Each invoice is due on the paid-through date' + (pbNum(set.due_offset_days, 0) ? ' + ' + set.due_offset_days + ' days' : '') + ' (later if sent late). Not paid: past due the next day, read-only ' + pbNum(set.grace_days, 7) + ' days after the due date.'; /* billing_nov22 #2 #3 */
      };
      const seatsIn = body.querySelector('#pbMpSeatsIn'); seatsIn.oninput = () => { const v = Math.floor(Number(seatsIn.value)); seats = Number.isFinite(v) && v >= used ? Math.min(v, 1000) : used; price(); };""")
p.rep("""      setIv('month');
      const st = body.querySelector('#pbMpSt'), go = body.querySelector('#pbMpGo');""",
"""      setIv(req && req.interval === 'year' ? 'year' : 'month'); /* billing_nov22: the company's own pick */
      const st = body.querySelector('#pbMpSt'), go = body.querySelector('#pbMpGo');""")
p.rep("""        if (signer.length < 2) { st.textContent = 'Type the name of the person who signed the order.'; return; }
        if (go.disabled) return; go.disabled = true; st.textContent = 'Saving…';
        const d = await pbBillRpc('pb_owner_make_paid', { p_company: c.id, p_legal_name: name, p_billing_email: email, p_seats: null, p_interval: iv,
          p_founder: body.querySelector('#pbMpFounder').checked, p_plan_reading: body.querySelector('#pbMpPr').checked, p_signed_by: signer });""",
"""        if (signer.length < 2) { st.textContent = 'Type the name of the person who signed the order.'; return; }
        const stt = body.querySelector('#pbMpState').value.trim().toUpperCase(), sIn = Math.floor(Number(seatsIn.value));
        if (!/^[A-Z]{2}$/.test(stt)) { st.textContent = 'Type the billing state (2 letters, for sales tax).'; return; }
        if (!Number.isFinite(sIn) || sIn < used || sIn > 1000) { st.textContent = 'Seats bought: at least ' + used + ' (the people now).'; return; }
        if (go.disabled) return; go.disabled = true; st.textContent = 'Saving…';
        const addr = { line1: body.querySelector('#pbMpAddr1').value.trim(), city: body.querySelector('#pbMpCity').value.trim(), state: stt, zip: body.querySelector('#pbMpZip').value.trim() };
        const d = await pbBillRpc('pb_owner_make_paid', { p_company: c.id, p_legal_name: name, p_billing_email: email, p_seats: sIn, p_interval: iv,
          p_founder: body.querySelector('#pbMpFounder').checked, p_plan_reading: body.querySelector('#pbMpPr').checked, p_signed_by: signer,
          p_address: addr, p_contact: body.querySelector('#pbMpContact').value.trim() || null, p_terms_version: body.querySelector('#pbMpTerms').value.trim() || null });""")
p.rep("""          + '<div class="pb-bill-price">First invoice: ' + pbDay(d.account && d.account.period_start) + ' – ' + pbDay(d.account && d.account.paid_through) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b>' + (d.account && d.account.founder_until ? '<br>Founder price locked until ' + pbDay(d.account.founder_until) : '') + '<br>Next invoice due by ' + pbDay(d.account && d.account.paid_through) + ' (press Paid when it’s paid).</div>'""",
"""          + '<div class="pb-bill-price">First invoice: ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' · ' + (Number(n.seats) || 0) + ' people · <b>' + pbMoney(n.amount_cents) + '</b>' + (n.first !== undefined ? ', due ' + pbDay(d.account && d.account.due_on) : '') + (d.account && d.account.founder_until ? '<br>Founder price locked until ' + pbDay(d.account.founder_until) : '') + '<br>Send it now. It stays in Billing due until you press Paid' + (d.account && d.account.lock_on ? ', and the company goes read-only on ' + pbDay(d.account.lock_on) + ' if it isn\\u2019t paid' : '') + '.</div>'""")

# the actions
p.rep("""          else if (act === 'b_catch') { const c = a.catchup || {}; if (!(await ask('Catch-up paid for ' + c.people + ' more ' + (c.people === 1 ? 'person' : 'people') + ' (' + pbMoney(c.cents) + ')? Paid seats become ' + (Number(a.seats_used) || 0) + ' until ' + pbDay(a.paid_through) + '.', 'Catch-up Paid'))) return; fn = 'pb_owner_billing_catchup_paid'; args = { p_company: id, p_seats: Number(a.seats_used) || 0, p_amount_cents: c.cents }; }""",
"""          else if (act === 'b_catch') { const c = a.catchup || {}, to = (Number(a.seats_capacity) || 0) + (Number(c.people) || 0); /* billing_nov22 #18: joined people only */
            if (!(await ask('Catch-up paid for ' + c.people + ' more ' + (c.people === 1 ? 'person' : 'people') + ' (' + pbMoney(c.cents) + ')? Paid seats become ' + to + ' until ' + pbDay(a.paid_through) + '.', 'Catch-up Paid'))) return; fn = 'pb_owner_billing_catchup_paid'; args = { p_company: id, p_seats: to, p_amount_cents: c.cents }; }
          else if (act === 'b_inv') { if (!(await ask('Record the invoice you sent ' + nm + ' for ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ': ' + (Number(n.seats) || 0) + ' people, ' + pbMoney(n.amount_cents) + (n.interval === 'year' ? ' for the year' : ' for the month') + '? It\\u2019s due ' + pbDay(a.due_on) + ' (or ' + pbNum(B && B.settings && B.settings.invoice_ahead_days, 7) + ' days from today if that\\u2019s later). Paid then marks exactly this invoice.', 'Invoice Sent'))) return;
            fn = 'pb_owner_billing_invoice_sent'; args = { p_company: id, p_from: a.paid_through }; } /* billing_nov22 #5 */
          else if (act === 'b_restart') { const iv2 = a.next_interval || a.interval, t0 = new Date(), t1 = new Date(t0); if (iv2 === 'year') t1.setFullYear(t1.getFullYear() + 1); else t1.setMonth(t1.getMonth() + 1);
            if (!(await ask('Mark ' + nm + ' paid and restart from today? A new ' + (iv2 === 'year' ? 'year' : 'month') + ' starts today (' + pbDay(t0) + ' – ' + pbDay(t1) + ') for ' + (Number(n.seats) || 0) + ' people. The time it was locked isn\\u2019t charged.', 'Restart From Today'))) return;
            fn = 'pb_owner_billing_restart'; args = { p_company: id }; } /* billing_nov22 #13 */
          else if (act === 'b_undo') { if (!(await ask('Undo the cancel for ' + nm + '? The plan keeps going and renews as before.', 'Undo Cancel'))) return; fn = 'pb_owner_billing_state'; args = { p_company: id, p_state: 'active' }; } /* billing_nov22 #14 */
          else if (act === 'b_edit') { pbBillEditForm(c, bc, load); return; }
          else if (act === 'b_iv') { const to = a.next_interval ? null : (a.interval === 'year' ? 'month' : 'year');
            if (!(await ask(to ? 'Switch ' + nm + ' to ' + (to === 'year' ? 'yearly' : 'monthly') + ' at renewal? The next invoice (' + pbDay(n.from) + ') will be ' + (to === 'year' ? 'for the year' : 'for the month') + '.' : 'Keep ' + nm + ' ' + (a.interval === 'year' ? 'yearly' : 'monthly') + '?', to ? 'Switch' : 'Keep'))) return;
            b.disabled = true; const d = await pbBillRpc('pb_owner_billing_next_interval', { p_company: id, p_interval: to }); if (!d.ok) { pbAlert(d.message, 'Not Changed'); b.disabled = false; return; }
            if (d.resend_invoice) pbAlert('The invoice already sent shows the old period. Send a new one and press Invoice Sent again so it shows the new amount.', 'Send It Again');
            load(); return; }""")
p.rep("""          else if (act === 'b_paid') { if (!(await ask('Mark ' + nm + '’s invoice for ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' (' + (Number(n.seats) || 0) + ' people, ' + pbMoney(n.amount_cents) + ') as paid? Paid through moves to ' + pbDay(n.to) + '.', 'Paid'))) return;""",
"""          else if (act === 'b_paid') { if (!(await ask('Mark ' + nm + '’s ' + (n.first ? 'first ' : '') + 'invoice for ' + pbDay(n.from) + ' – ' + pbDay(n.to) + ' (' + (Number(n.seats) || 0) + ' people, ' + pbMoney(n.amount_cents) + (n.sent ? ', as sent' : '') + ') as paid? Paid through moves to ' + pbDay(n.to) + '.', 'Paid'))) return;""")

# Edit Billing form
p.rep("""    function pbHandOverForm(c, bc, done) {""",
"""    function pbBillEditForm(c, bc, done) { /* billing_nov22 #14: fix the billing details without Cancel + Make Paid */
      const a = (bc && bc.account) || {}, ad = a.billing_address && typeof a.billing_address === 'object' ? a.billing_address : {};
      const { body, close } = pbBillSheet('pbBillEdit', 'Edit Billing: ' + (a.legal_name || c.name || ''));
      const v = (x) => escapeHtml(x == null ? '' : String(x));
      body.innerHTML = '<label>Company legal name<input id="pbBeName" maxlength="200" autocomplete="off" value="' + v(a.legal_name) + '"></label>'
        + '<label>Billing email<input id="pbBeEmail" type="email" maxlength="254" autocomplete="off" autocapitalize="off" value="' + v(a.billing_email) + '"></label>'
        + '<label>Billing address<input id="pbBeAddr1" maxlength="200" autocomplete="off" placeholder="Street" value="' + v(ad.line1) + '"></label>'
        + '<div style="display:flex;gap:8px"><label style="flex:2">City<input id="pbBeCity" maxlength="100" autocomplete="off" value="' + v(ad.city) + '"></label><label style="flex:1">State<input id="pbBeState" maxlength="2" autocomplete="off" autocapitalize="characters" value="' + v(ad.state) + '"></label><label style="flex:1.3">ZIP<input id="pbBeZip" maxlength="10" inputmode="numeric" autocomplete="off" value="' + v(ad.zip) + '"></label></div>'
        + '<label>Billing contact<input id="pbBeContact" maxlength="200" autocomplete="off" value="' + v(a.billing_contact) + '"></label>'
        + '<label>Seats bought (0 = bill the people there)<input id="pbBeSeats" type="number" inputmode="numeric" min="0" max="1000" step="1" value="' + (Number(a.seats_min) || 0) + '"></label>'
        + '<p class="pb-bill-note">Changes show on the next invoice. An invoice already sent keeps its amount: send a new one and press Invoice Sent again if it should change.</p>'
        + '<button type="button" class="pb-btn" id="pbBeGo">Save</button><p class="pb-fb-st" id="pbBeSt" role="status"></p>';
      const st = body.querySelector('#pbBeSt'), go = body.querySelector('#pbBeGo'), g = (id) => body.querySelector('#' + id).value.trim();
      go.onclick = async () => {
        const stt = g('pbBeState').toUpperCase(), seats = Math.floor(Number(g('pbBeSeats') || '0'));
        if (!g('pbBeName')) { st.textContent = 'Type the company’s legal name.'; return; }
        if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(g('pbBeEmail'))) { st.textContent = 'Type the billing email.'; return; }
        if (!/^[A-Z]{2}$/.test(stt)) { st.textContent = 'Type the billing state (2 letters, for sales tax).'; return; }
        if (!Number.isFinite(seats) || seats < 0 || seats > 1000) { st.textContent = 'Seats bought: a whole number from 0 to 1000.'; return; }
        if (go.disabled) return; go.disabled = true; st.textContent = 'Saving…';
        const d = await pbBillRpc('pb_owner_billing_edit', { p_company: c.id, p_changes: { legal_name: g('pbBeName'), billing_email: g('pbBeEmail'),
          billing_address: { line1: g('pbBeAddr1'), city: g('pbBeCity'), state: stt, zip: g('pbBeZip') }, billing_contact: g('pbBeContact') || null, seats_min: seats } });
        go.disabled = false;
        if (!d.ok) { st.textContent = d.message; return; }
        close(); done();
      };
    }
    function pbHandOverForm(c, bc, done) {""")

# plan requests list: the company's pick and whether it was before the end
p.rep("""' wants ' + (q.kind === 'company' ? 'a company plan: use Make Paid on the company' :""",
"""' wants ' + (q.kind === 'company' ? 'a company plan' + (q.interval === 'year' ? ' (yearly)' : q.interval === 'month' ? ' (monthly)' : '') + ': send the one-page order, then Make Paid on the company' :""")
p.save()
