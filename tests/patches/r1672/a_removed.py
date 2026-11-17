import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""      const beta = !!(plan && plan.plan === 'trial'), ended = beta && !!plan.expired;
      const line = document.getElementById('pbBetaLine');
      if (line) {""",
"""      const beta = !!(plan && plan.plan === 'trial'), ended = beta && !!plan.expired;
      const line = document.getElementById('pbBetaLine');
      const removed = !!(plan && !beta && plan.removed && !plan.individual); /* r16.72: removed from a company: offer their own plan */
      if (line && removed) {
        line.hidden = false; line.classList.add('ended');
        line.innerHTML = '<span>You’re no longer part of ' + escapeHtml(plan.removed.company || 'your company') + '. Want your own plan to keep the AI tools?</span>'
          + (plan.requested ? '<span>Request sent. You’ll be contacted to set it up.</span>'
            : '<span class="pb-beta-acts"><button type="button" class="pb-btn small" data-own="1">My Own Plan</button><button type="button" class="pb-btn ghost small" data-own="0">Not Now</button></span>');
        line.querySelectorAll('[data-own]').forEach((b) => { b.onclick = async () => {
          if (!sbClient || navigator.onLine === false) { pbAlert('Needs signal. Try again when you have it.', 'Needs Signal'); return; }
          const yes = b.dataset.own === '1'; b.disabled = true;
          let r; try { r = yes ? await sbClient.rpc('pb_plan_request', { p_kind: 'individual' }) : await sbClient.rpc('pb_removed_dismiss'); } catch (e) { r = { error: e }; }
          if (!r || r.error || !r.data || !r.data.ok) { b.disabled = false; pbAlert('Not sent. Try again.', 'Not Sent'); return; }
          plan = yes ? Object.assign({}, plan, { requested: true }) : Object.assign({}, plan, { removed: null });
          try { localStorage.setItem(planKey(), JSON.stringify(plan)); } catch (e) {}
          window.pbTrack(yes ? 'plan_request:individual_removed' : 'plan_request:dismissed'); pbBetaRender();
        }; });
      } else if (line) {""")
open(sys.argv[2],'w').write(s)
