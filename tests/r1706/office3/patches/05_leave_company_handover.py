#!/usr/bin/env python3
# office3 #35: Leave Company, and handing a removed foreman's runs and crew to someone else (sql/35_leave_handover.sql).
# A) Settings: a member (foreman, pipelayer, PM, superintendent) sees which company they are in and a Leave Company
#    button. It says plainly what leaving does and doesn't do, needs signal, and calls pb_crew_leave. The company account
#    (the owner) has no such button. After leaving, the account's plan and company screens are checked again at once;
#    the existing "You're no longer part of ..." line offers an individual plan.
# B) Crew members: after the owner removes a foreman, the app asks who takes his waiting runs and his crew (a list of
#    the company's other foremen, or Not Now). pb_crew_handover moves them and the line says how many moved.
# Shared code touched: pbCmAct's 'remove' branch (a .then after the existing pbCmRun), the Settings page HTML (one new
# empty block after the crew invitation block).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

rep("""    <div id="settingsCrewInvite" class="pbc-invite-wrap" hidden></div><!-- batch 13 C: crew invitation -->""",
"""    <div id="settingsCrewInvite" class="pbc-invite-wrap" hidden></div><!-- batch 13 C: crew invitation -->
    <div class="pb-section" id="settingsLeaveCo" hidden></div><!-- office3 #35: Leave Company (members) -->""")

rep("""        () => pbCmRun({ action: 'remove', user_id: m.user_id }, () => nm + ' was removed from the company.'), 'Remove from Company', { no: 'Keep in Company', yes: 'Remove from Company' });
    }
  };""",
"""        () => { const others = pbCmSt.rows.filter(x => x && x.user_id && x.user_id !== m.user_id && x.role === 'foreman'); /* office3 #35 */
          return Promise.resolve(pbCmRun({ action: 'remove', user_id: m.user_id }, () => nm + ' was removed from the company.')).then(d => { if (d && d.ok && m.role === 'foreman') pbCmHandoverAsk(m, nm, others); }); },
        'Remove from Company', { no: 'Keep in Company', yes: 'Remove from Company' });
    }
  };
  // ---- office3 #35: who takes a removed foreman's waiting runs and crew ----
  function pbCmHandoverAsk(m, nm, others) {
    if (!others.length) { pbCmSt.msg = nm + ' was removed from the company. There is no other foreman to hand his waiting runs and crew to yet: they wait for any foreman, and his pipelayers can link to a new foreman themselves.'; pbCmSt.msgKind = 'ok'; pbCmRender(); return; }
    let pick = others.length === 1 ? others[0].user_id : null;
    pbShowModal('Who takes ' + nm + '’s crew runs that are waiting for a foreman, and the pipelayers who were on his crew?', [{ label: 'Not Now' }, { label: 'Hand Over', primary: true, onClick: () => { if (pick) pbCmHandoverDo(m, nm, pick, others); else setTimeout(() => pbCmHandoverAsk(m, nm, others), 0); } }], 'Hand Over to a Foreman');
    const wrap = document.createElement('div'); wrap.className = 'pb-modal-extra'; wrap.id = 'crHandWrap'; wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', 'Foreman who takes over');
    wrap.innerHTML = others.map((x, i) => '<label class="pb-checkrow"><input type="radio" name="crHand" id="crHand' + i + '" value="' + escapeHtml(x.user_id) + '"' + (pick === x.user_id ? ' checked' : '') + '><span>' + escapeHtml(pbCmName(x)) + '</span></label>').join('')
      + '<p class="pb-help">Run reports already sent to ' + escapeHtml(nm) + ' go to the foreman each pipelayer is linked to, so they follow the crew.</p>';
    wrap.querySelectorAll('input').forEach(el => el.addEventListener('change', () => { if (el.checked) pick = el.value; }));
    document.getElementById('pbModalMessage').insertAdjacentElement('afterend', wrap);
  }
  async function pbCmHandoverDo(m, nm, to, others) {
    const uid = pbCmSt.uid, who = others.find(x => x.user_id === to), toName = who ? pbCmName(who) : 'the foreman';
    if (!pbCmOnline()) { pbAlert(PB_CM_MSG['pb:no_signal'], 'Needs Signal'); return; }
    pbCmSt.busy = true; pbCmRender();
    let r; try { r = await pbPermitRpc('pb_crew_handover', { p_from: m.user_id, p_to: to, p_expect_uid: uid }, 30000); } finally { if (pbCmSt.uid === uid) pbCmSt.busy = false; }
    if (pbCmSt.uid !== uid) return;
    const d = r && !r.error ? r.data : null, msg = String((r && r.error && r.error.message) || '');
    const n = (k, one, many) => { const v = Number(d && d[k]) || 0; return v ? v + ' ' + (v === 1 ? one : many) : ''; };
    if (d && d.ok) {
      const moved = [n('runs', 'waiting run', 'waiting runs'), n('crew', 'pipelayer', 'pipelayers')].filter(Boolean);
      pbCmSt.msg = moved.length ? moved.join(' and ') + ' from ' + nm + ' went to ' + toName + '. ' + toName + ' was told.' : nm + ' had no waiting runs or crew to hand over.';
      pbCmSt.msgKind = 'ok';
    } else {
      const c = d && d.code ? d.code : (msg.match(/pb:\\w+/) || [''])[0];
      pbCmSt.msg = c === 'pb:not_a_foreman' ? toName + ' isn’t a foreman of the company any more. Nothing was handed over.'
        : c === 'pb:still_foreman' ? nm + ' is still a foreman here. Nothing was handed over.'
        : c === 'pb:nothing_to_hand_over' ? nm + ' had no waiting runs or crew to hand over.'
        : /Could not find the function|does not exist/i.test(msg) ? 'Handing over isn’t ready on the company server yet. ' + nm + '’s waiting runs wait for any foreman.'
        : navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(msg) ? 'No signal. Nothing was handed over; try again from here with signal.' : 'Nothing was handed over. Try again.';
      pbCmSt.msgKind = c === 'pb:nothing_to_hand_over' ? 'ok' : 'err';
    }
    pbCmSt.msgFrom = 'action'; pbCmRender(); pbCmLoad();
  }
  window.__pbCmHandoverAsk = pbCmHandoverAsk; // tests
  // ---- office3 #35: Leave Company (Settings, members only) ----
  function pbLeaveCoInfo() {
    const s = typeof sbCachedSubscription === 'object' && sbCachedSubscription ? sbCachedSubscription : {};
    if (!sbUser || typeof s.companyId !== 'string' || !s.companyId || !s.companyRole || s.companyRole === 'Company account') return null;
    const role = typeof pbRoleShown === 'function' ? pbRoleShown(s) : s.companyRole, rw = role === 'foreman' ? 'Foreman' : role === 'pipelayer' ? 'Pipelayer' : role;
    return { id: s.companyId, name: s.companyName || 'your company', role: rw };
  }
  window.pbLeaveCoRender = function() {
    const w = document.getElementById('settingsLeaveCo'); if (!w) return;
    const I = pbLeaveCoInfo();
    if (!I) { if (!w.hidden) w.hidden = true; if (w.innerHTML) w.innerHTML = ''; return; }
    const h = '<div class="pb-tag" id="settingsLeaveCoLabel">Your company</div><div class="pb-body">'
      + '<p class="pb-help" id="settingsLeaveCoText">' + escapeHtml('You are in ' + I.name + ' as ' + I.role + '.') + '</p>'
      + '<button type="button" class="pb-btn ghost small" id="settingsLeaveCoBtn" onclick="pbLeaveCo()">Leave Company</button></div>';
    if (w.innerHTML !== h) w.innerHTML = h;
    w.hidden = false;
  };
  window.pbLeaveCo = function() {
    const I = pbLeaveCoInfo(), uid = sbUser && sbUser.id; if (!I || !uid) return;
    if (navigator.onLine === false || !sbClient || typeof sbClient.rpc !== 'function') { pbAlert('Leaving a company needs signal. Nothing was changed.', 'Needs Signal'); return; }
    pbConfirm('Leave ' + I.name + '?\\n\\n'
      + 'What this does: you stop being part of the company in the app. You lose its screens, your runs and reports stop going to the company from now on, and your foreman link ends. The owner is told.\\n\\n'
      + 'What it doesn’t do: production, tickets and permits you already filed stay the company’s. Your own records on this phone stay on this phone. Your account isn’t closed, and the company can add you again later.',
      async () => {
        let r; try { r = await pbPermitRpc('pb_crew_leave', { p_expect_uid: uid, p_expect_company: I.id }, 30000); } catch (e) { r = null; }
        if (!sbUser || sbUser.id !== uid) return;
        const d = r && !r.error ? r.data : null, msg = String((r && r.error && r.error.message) || '');
        if (d && d.ok) {
          try { if (typeof pbRefreshSubscriptionCache === 'function') await pbRefreshSubscriptionCache(); } catch (e) {}
          try { if (typeof pbProdAccessRefresh === 'function') await Promise.race([pbProdAccessRefresh(uid), new Promise(res => setTimeout(res, 6000))]); } catch (e) {}
          window.pbLeaveCoRender();
          try { if (typeof window.pbRenderHome === 'function') window.pbRenderHome(); } catch (e) {}
          pbAlert('You left ' + (d.company_name || I.name) + '. Your records on this phone stay here.', 'Left the Company');
          return;
        }
        const c = d && d.code ? d.code : (msg.match(/pb:\\w+/) || [''])[0];
        pbAlert(c === 'pb:not_member' ? 'You aren’t in a company any more. Nothing was changed.'
          : c === 'pb:company_changed' ? 'Your company changed since this screen loaded. Nothing was changed. Open Settings again.'
          : c === 'pb:is_owner' ? 'The company account can’t leave its own company.'
          : /Could not find the function|does not exist/i.test(msg) ? 'Leaving isn’t ready on the company server yet. Ask the owner to remove you. Nothing was changed.'
          : navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(msg) ? 'No signal. Nothing was changed; try again with signal.' : 'Nothing was changed. Try again.', 'Not Left');
        if (c === 'pb:not_member' || c === 'pb:company_changed') { try { if (typeof pbRefreshSubscriptionCache === 'function') await pbRefreshSubscriptionCache(); } catch (e) {} window.pbLeaveCoRender(); }
      }, 'Leave Company', { no: 'Stay', yes: 'Leave Company' });
  };
  window.pbScreenHooks.push((name) => { if (name === 'settings') { try { window.pbLeaveCoRender(); } catch (e) { console.error(e); } } });""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
