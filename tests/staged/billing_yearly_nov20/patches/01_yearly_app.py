# billing_yearly_nov20: the individual plan's Monthly / Yearly choice, and plan sheets read on the app owner's Billing.
# Usage: python3 01_yearly_app.py <r17.11 _src/index.html> <out.html>
# Every swap must match exactly once. Works with the old server (no yearly pick stored, no sheets line).
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, (c, old[:120])
    s = s.replace(old, new)

# 1. prices: "save $36" and the two buttons
rep("""    const pbPriceInd = () => { const p = pbPr(); return pbUsd(p.ind) + ' a month, or ' + pbUsd(p.indy) + ' for a year (' + pbUsd(Math.round(p.indy / 12)) + ' a month), plus applicable tax'; };""",
"""    const pbIndSave = () => { const p = pbPr(); return Math.max(0, p.ind * 12 - p.indy); }; /* billing_yearly_nov20: 12 months minus the yearly price ($36) */
    const pbPriceInd = () => { const p = pbPr(), sv = pbIndSave(); return pbUsd(p.ind) + ' a month, or ' + pbUsd(p.indy) + ' for a year (' + pbUsd(Math.round(p.indy / 12)) + ' a month' + (sv > 0 ? ', save ' + pbUsd(sv) : '') + '), plus applicable tax'; };
    /* billing_yearly_nov20: the individual plan is picked Monthly or Yearly; the pick goes with the request ('individual:month' / 'individual:year') */
    const pbIndPick = (attr, pre) => { const p = pbPr(), sv = pbIndSave(), x = pre || '';
      return '<span class="pb-beta-acts pb-ind-pick"><button type="button" class="pb-btn small" ' + attr + '="individual:month">' + x + 'Monthly ' + pbUsd(p.ind) + '</button>'
        + '<button type="button" class="pb-btn small" ' + attr + '="individual:year">' + x + 'Yearly ' + pbUsd(p.indy) + (sv > 0 ? ' <span style="white-space:nowrap">(save ' + pbUsd(sv) + ')</span>' : '') + '</button></span>'; };""")

rep("""    const pbReqSent = (kind) => '<span>' + (kind === 'individual' ? 'Request sent. You\\u2019ll get an email with how to pay: ' + pbPriceInd() + '.'""",
"""    const pbReqSent = (kind) => '<span>' + (kind === 'individual:year' ? 'Request sent: yearly, ' + pbUsd(pbPr().indy) + ' a year (' + pbUsd(Math.round(pbPr().indy / 12)) + ' a month), plus applicable tax. You\\u2019ll get an email with how to pay.'
      : kind === 'individual:month' ? 'Request sent: monthly, ' + pbUsd(pbPr().ind) + ' a month, plus applicable tax. You\\u2019ll get an email with how to pay.'
      : kind === 'individual' ? 'Request sent. You\\u2019ll get an email with how to pay: ' + pbPriceInd() + '.'""")

rep("""    const pbReqKind = (office) => { if (office) return 'company'; try { return localStorage.getItem(pbReqKey()) || ''; } catch (e) { return ''; } };""",
"""    const pbReqKind = (office) => { if (office) return 'company'; try { return localStorage.getItem(pbReqKey()) || ''; } catch (e) { return ''; } };
    const pbIndKind = () => { const k = pbReqKind(false); return /^individual/.test(k) ? k : 'individual'; }; /* billing_yearly_nov20: what this phone asked for */""")

# Settings > What each plan includes: the saving, from the same price list
rep("""indym: pbUsd(Math.round(p.indy / 12)), sheet: pbUsd(p.sheet), fm: String(p.fm) };""",
"""indym: pbUsd(Math.round(p.indy / 12)), indsave: pbUsd(pbIndSave()), sheet: pbUsd(p.sheet), fm: String(p.fm) };""")
rep("""a month billed yearly (<span data-pbp="indyear">$144</span> a year).""",
"""a month billed yearly (<span data-pbp="indyear">$144</span> a year, save <span data-pbp="indsave">$36</span>).""")

# 2. removed from a company: Monthly / Yearly / Not Now
rep("""          + (plan.requested ? pbReqSent('individual')
            : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-own="1">My Own Plan</button><button type="button" class="pb-btn ghost small" data-own="0">Not Now</button></span>');""",
"""          + (plan.requested ? pbReqSent(pbIndKind())
            : pbIndPick('data-own') + '<span class="pb-beta-acts"><button type="button" class="pb-btn ghost small" data-own="0">Not Now</button></span>');""")
rep("""          const yes = b.dataset.own === '1'; b.disabled = true;
          let r; try { r = yes ? await sbClient.rpc('pb_plan_request', { p_kind: 'individual' }) : await sbClient.rpc('pb_removed_dismiss'); } catch (e) { r = { error: e }; }""",
"""          const yes = b.dataset.own !== '0', kind = /^individual:(month|year)$/.test(b.dataset.own) ? b.dataset.own : 'individual'; b.disabled = true;
          let r; try { r = yes ? await sbClient.rpc('pb_plan_request', { p_kind: kind }) : await sbClient.rpc('pb_removed_dismiss'); } catch (e) { r = { error: e }; }
          if (yes && r && !r.error && r.data && r.data.ok) { try { localStorage.setItem(pbReqKey(), kind); } catch (e) {} }""")
rep("""window.pbTrack(yes ? 'plan_request:individual_removed' : 'plan_request:dismissed');""",
"""window.pbTrack(yes ? 'plan_request:individual_removed:' + kind.replace('individual:', '') : 'plan_request:dismissed');""")

# 3. no plan yet
rep("""          + (plan.requested ? pbReqSent('individual') : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="individual">Get My Own Plan</button></span>');""",
"""          + (plan.requested ? pbReqSent(pbIndKind()) : pbIndPick('data-plan'));""")

# 4. beta ended, a crew member: Company Plan, or their own plan Monthly / Yearly
rep("""<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button><button type="button" class="pb-btn ghost small" data-plan="individual">My Own Plan</button></span>';""",
"""<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button></span>' + pbIndPick('data-plan', 'My Own Plan: ');""")

# 5. the app owner's Billing: sheets read (pb_owner_sheets_read), yearly on individual rows, Turn On Monthly / Yearly
rep("""    function pbBillLines(bc) {
      if (!bc) return '';""",
"""    let pbSR = null; /* billing_yearly_nov20: plan sheets read (pb_owner_sheets_read); null = server not updated yet */
    const pbSRn = (v) => (Number(v) || 0).toLocaleString('en-US');
    const pbSRtxt = (x) => '<b>' + pbSRn(x && x.month) + '</b> this month \\u00b7 ' + pbSRn(x && x.last_month) + ' last month \\u00b7 ' + pbSRn(x && x.total) + ' in all';
    const pbSheetsLn = (id) => { if (!pbSR) return ''; const x = (pbSR.companies || []).find((y) => y && y.company_id === id); return '<div class="ln" data-sheets="' + escapeHtml(id || '') + '">Plan sheets read: ' + pbSRtxt(x) + '</div>'; };
    function pbBillLines(bc) {
      if (!bc) return '';""")
rep("""+ '<div class="ln">Plan reading add-on: ' + (a.plan_reading ? 'on · ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once when read. Billing doesn\\u2019t show sheets read yet: count them before you invoice' : '""",
"""+ '<div class="ln">Plan reading add-on: ' + (a.plan_reading ? 'on · ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet, charged once when read' + (pbSR ? ' (sheets read are counted below)' : '. Billing doesn\\u2019t show sheets read yet: count them before you invoice') : '""")

rep("""        return '<div class="pb-bill-due" data-ind="' + escapeHtml(x.user_id) + '"><div class="hd">' + escapeHtml(x.email || '') + ' · individual' + (""",
"""        const yr = x.interval === 'year', other = yr ? x.cents : x.year_cents, srI = pbSR && (pbSR.individuals || []).find((y) => y && y.user_id === x.user_id);
        return '<div class="pb-bill-due" data-ind="' + escapeHtml(x.user_id) + '"><div class="hd">' + escapeHtml(x.email || '') + ' · individual, ' + (yr ? 'yearly' : 'monthly') + (""")
rep("""          + (n.due ? '<div class="acts"><button type="button" class="pb-btn small" data-indpaid="' + escapeHtml(x.user_id) + '" data-from="' + escapeHtml(x.paid_through) + '">Paid</button></div>' : '') + '</div>'; }).join('');""",
"""          + (srI ? '<div class="ln">Plan sheets read: ' + pbSRtxt(srI) + '</div>' : '')
          + (n.due ? '<div class="acts"><button type="button" class="pb-btn small" data-indpaid="' + escapeHtml(x.user_id) + '" data-from="' + escapeHtml(x.paid_through) + '" data-iv="' + (yr ? 'year' : 'month') + '">Paid</button>'
            + (Number(other) > 0 ? '<button type="button" class="pb-btn ghost small" data-indpaid="' + escapeHtml(x.user_id) + '" data-from="' + escapeHtml(x.paid_through) + '" data-iv="' + (yr ? 'month' : 'year') + '">Paid for a ' + (yr ? 'Month' : 'Year') + ' Instead (' + pbMoney(other) + ')</button>' : '') + '</div>' : '') + '</div>'; }).join('');""")
rep("""      b.disabled = true; let r; try { r = await sbClient.rpc('pb_owner_individual_paid', { p_user: b.dataset.indpaid, p_from: b.dataset.from }); } catch (err) { r = { error: err }; }""",
"""      const iv = b.dataset.iv === 'year' || b.dataset.iv === 'month' ? b.dataset.iv : null; /* billing_yearly_nov20: the period being paid */
      b.disabled = true; let r; try { r = await sbClient.rpc('pb_owner_individual_paid', iv ? { p_user: b.dataset.indpaid, p_from: b.dataset.from, p_interval: iv } : { p_user: b.dataset.indpaid, p_from: b.dataset.from }); } catch (err) { r = { error: err }; }""")
rep("""if (ln) ln.textContent = 'Marked paid. Paid through ' + pbDay(me.paid_through) + '.'; const a = row.querySelector('.acts'); if (a) a.remove();""",
"""if (ln) ln.textContent = 'Marked paid' + (me.interval === 'year' ? ' for the year' : me.interval === 'month' ? ' for the month' : '') + '. Paid through ' + pbDay(me.paid_through) + '.'; const a = row.querySelector('.acts'); if (a) a.remove();""")

rep("""      return '<div class="pb-own-co" id="pbBillDue"><div class="nm">Billing due</div>'""",
"""      return '<div class="pb-own-co" id="pbBillDue"><div class="nm">Billing due</div>'
        + (pbSR ? '<div class="ln" id="pbSheetsAll">Plan sheets read, everyone: ' + pbSRtxt(pbSR.all) + ' \\u00b7 ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' a sheet when plan reading is on</div>' : '')""")
rep("""(d.plan_reading_price_missing ? ' · plan reading is on: add ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' for each sheet read' : '')""",
"""(d.plan_reading_price_missing ? ' · plan reading is on: add ' + (window.pbSheetUsd ? window.pbSheetUsd() : '$1') + ' for each sheet read' + (pbSR ? ' (' + pbSRtxt((pbSR.companies || []).find((y) => y && y.company_id === d.company_id)).replace(/<\\/?b>/g, '') + ')' : '') : '')""")
rep("""Leave it off for customers until Billing shows sheets read. Off: plan sets stay parked.""",
"""' + (pbSR ? 'Billing counts the sheets read.' : 'Leave it off for customers until Billing shows sheets read.') + ' Off: plan sets stay parked.""")

rep("""        let bl = null; try { bl = await sbClient.rpc('pb_owner_billing'); } catch (e) {} /* billing Phase 0 */""",
"""        let bl = null; try { bl = await sbClient.rpc('pb_owner_billing'); } catch (e) {} /* billing Phase 0 */
        let sr = null; try { sr = await sbClient.rpc('pb_owner_sheets_read'); } catch (e) {} /* billing_yearly_nov20 */
        pbSR = sr && !sr.error && sr.data && sr.data.ok ? sr.data : null;""")
rep("""            + pbBillLines(bc)
            + '<div class="ln">' + c.users + ' user'""",
"""            + pbBillLines(bc)
            + pbSheetsLn(c.id) /* billing_yearly_nov20 */
            + '<div class="ln">' + c.users + ' user'""")

# Turn On: Monthly or Yearly (the person's pick is the solid button)
rep("""' wants ' + (q.kind === 'company' ? 'a company plan: use Make Paid on the company' : 'their own plan')""",
"""' wants ' + (q.kind === 'company' ? 'a company plan: use Make Paid on the company' : 'their own plan' + (q.interval === 'year' ? ', yearly (' + pbMoney(pbNum(B && B.settings && B.settings.individual_year_cents, 14400)) + ' a year)' : q.interval === 'month' ? ', monthly (' + pbMoney(pbNum(B && B.settings && B.settings.individual_cents, 1500)) + ' a month)' : ''))""")
rep("""(q.kind === 'individual' ? ' <button type="button" class="pb-btn small" data-on="1" style="width:auto;display:inline-block;margin-left:6px">Turn On</button>' : '')""",
"""(q.kind === 'individual' ? ['month', 'year'].map((iv) => ' <button type="button" class="pb-btn small' + ((q.interval || 'month') === iv ? '' : ' ghost') + '" data-on="' + iv + '" style="width:auto;display:inline-block;margin-left:6px">Turn On ' + (iv === 'year' ? 'Yearly' : 'Monthly') + '</button>').join('') : '')""")
rep("""          let r; try { r = await sbClient.rpc('pb_owner_individual_on', { p_user: uid }); } catch (e) { r = { error: e }; }
          if (!r || r.error || !r.data || !r.data.ok) { pbAlert('Not changed. Check signal and try again.', 'Not Changed'); b.disabled = false; return; }""",
"""          const iv = b.dataset.on === 'year' ? 'year' : 'month'; /* billing_yearly_nov20 */
          let r; try { r = await sbClient.rpc('pb_owner_individual_on', { p_user: uid, p_interval: iv }); } catch (e) { r = { error: e }; }
          const old = r && r.error && /PGRST202|could not find the function|does not exist/i.test(String(r.error.message || '') + ' ' + String(r.error.code || ''));
          if (old && iv === 'month') { try { r = await sbClient.rpc('pb_owner_individual_on', { p_user: uid }); } catch (e) { r = { error: e }; } }
          else if (old) { pbAlert('Yearly needs the billing server update first. Nothing was changed.', 'Not Changed'); b.disabled = false; return; }
          if (!r || r.error || !r.data || !r.data.ok) { pbAlert('Not changed. Check signal and try again.', 'Not Changed'); b.disabled = false; return; }""")

open(out, 'w', encoding='utf-8').write(s)
print('ok', out)
