import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""        if (beta) line.innerHTML = ended
          ? '<span class="pb-beta-chip">Beta ended</span><span>Your records are all here. AI and new plan sets are off until your company starts a plan.</span>'
          : '<span class="pb-beta-chip">Beta</span><span>' + (plan.days_left === 1 ? '1 day left' : (plan.days_left || 0) + ' days left') + '</span>';""",
"""        if (beta) { /* r16.71: the end of the beta: a company plan, or the person's own plan meanwhile */
          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (plan.days_left === 1 ? '1 day left' : (plan.days_left || 0) + ' days left') + '</span>';
          else {
            const graceLeft = plan.trial_ends_at ? Math.max(0, Math.ceil((new Date(plan.trial_ends_at).getTime() + 3 * 864e5 - Date.now()) / 864e5)) : 0;
            const what = plan.closed || !graceLeft ? 'Your records are safe. New runs and reports wait on this phone and send once your company starts a plan.'
              : 'New runs and reports stop sending to your company in ' + (graceLeft === 1 ? '1 day' : graceLeft + ' days') + ' unless it starts a plan. Nothing is lost.';
            const own = plan.individual ? '<span>You have your own plan, so your AI tools keep working.</span>'
              : plan.requested ? '<span>Request sent. You’ll be contacted to set it up.</span>'
              : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button><button type="button" class="pb-btn ghost small" data-plan="individual">My Own Plan</button></span>';
            line.innerHTML = '<span class="pb-beta-chip">Beta ended</span><span>' + what + '</span>' + own;
            line.querySelectorAll('[data-plan]').forEach((b) => { b.onclick = async () => {
              if (!sbClient || navigator.onLine === false) { pbAlert('Needs signal. Try again when you have it.', 'Needs Signal'); return; }
              b.disabled = true; let r; try { r = await sbClient.rpc('pb_plan_request', { p_kind: b.dataset.plan }); } catch (e) { r = { error: e }; }
              if (!r || r.error || !r.data || !r.data.ok) { b.disabled = false; pbAlert('Not sent. Try again.', 'Not Sent'); return; }
              plan = Object.assign({}, plan, { requested: true }); try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
              window.pbTrack('plan_request:' + b.dataset.plan); pbBetaRender();
            }; });
          }
        }""")
rep("""#pbApp .pb-beta-line[hidden], .pb-fb-pill[hidden] { display: none !important; }""",
"""#pbApp .pb-beta-line[hidden], .pb-fb-pill[hidden] { display: none !important; }
#pbApp .pb-beta-line.ended { padding: 12px 14px; border-radius: 14px; background: var(--pb-surface, #fff); box-shadow: var(--pb-elev-1); color: var(--pb-text); }
#pbApp .pb-beta-acts { display: flex; gap: 8px; width: 100%; } #pbApp .pb-beta-acts .pb-btn { flex: 1; margin: 0; }""")
# owner page: plan requests with Turn On
rep("""        let r; try { r = await sbClient.rpc('pb_owner_overview'); } catch (e) { r = { error: e }; }""",
"""        let r; try { r = await sbClient.rpc('pb_owner_overview'); } catch (e) { r = { error: e }; }
        let rq = null; try { rq = await sbClient.rpc('pb_owner_plan_requests'); } catch (e) {} /* r16.71 */
        const reqs = rq && !rq.error && rq.data && rq.data.ok ? rq.data.requests || [] : [];""")
rep("""        list.innerHTML = tot + (cos.length ? cos.map((c) => {""",
"""        const reqHtml = reqs.length ? '<div class="pb-own-co"><div class="nm">Plan requests</div>' + reqs.map((q) => '<div class="ln" data-uid="' + escapeHtml(q.user_id) + '">' + escapeHtml(q.who || q.email || 'Someone') + (q.company ? ' (' + escapeHtml(q.company) + ')' : '') + ' wants ' + (q.kind === 'company' ? 'a company plan: use Make Paid on the company' : 'their own plan')
          + (q.email && q.email !== q.who ? ' · ' + escapeHtml(q.email) : '') + (q.kind === 'individual' ? ' <button type="button" class="pb-btn small" data-on="1" style="width:auto;display:inline-block;margin-left:6px">Turn On</button>' : '') + '</div>').join('') + '</div>' : '';
        list.innerHTML = reqHtml + tot + (cos.length ? cos.map((c) => {""")
rep("""        list.querySelectorAll('[data-act]').forEach((b) => { b.onclick = async () => {""",
"""        list.querySelectorAll('[data-on]').forEach((b) => { b.onclick = async () => {
          const uid = b.closest('[data-uid]').dataset.uid; b.disabled = true;
          let r; try { r = await sbClient.rpc('pb_owner_individual_on', { p_user: uid }); } catch (e) { r = { error: e }; }
          if (!r || r.error || !r.data || !r.data.ok) { pbAlert('Not changed. Check signal and try again.', 'Not Changed'); b.disabled = false; return; }
          load();
        }; });
        list.querySelectorAll('[data-act]').forEach((b) => { b.onclick = async () => {""")
open(sys.argv[2],'w').write(s)
