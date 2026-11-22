# Deeper review, permit safety (PHASE 1, behaviour):
#  G-1 an Entrant / Entry Supervisor / Attendant row whose Check In is not allowed right now (no air test yet, a reading
#      out of range or too old, the attendant rule, no attendant outside, an open EMERGENCY: the same pbEntryBlockers()
#      the button already runs) no longer shows a big green "Check In": it shows a grey outlined
#      "🚫 Check In (entry not allowed)". Still tappable: the tap opens the same DO NOT ENTER question and keeps the
#      "did they enter anyway?" logging. Green again as soon as entry is allowed (checked every second on Active Permit,
#      and on every roster repaint).
#  G-3 Lock & Activate Permit: the "The entry supervisor decides… I Understand" note came BEFORE the form was checked, so
#      an incomplete permit asked for the acknowledgment and then refused. Now an incomplete form (a required box empty or
#      an impossible number) is checked first; the acknowledgment shows once the form is complete (same words, once).
#  G-4 Close-out reason: after an out-of-range reading or an EMERGENCY on this permit, it starts on
#      "Evacuated / Prohibited Condition" instead of "Completed Normally" (until the person picks one). The existing
#      question for "Completed Normally" with an unsafe last reading / open emergency stays.
#  F2 Active Permit: when the EMERGENCY button has scrolled out of view, a red EMERGENCY bar stays pinned at the bottom
#      (same pbTriggerEmergency()); gone when the button is on screen, on a closed permit and on every other screen.
#  F3 "Set reminder" links on Active Permit used an undefined --pb-accent (yellow #f2c230 on white, 1.7:1): now the
#      brand text colour (dark gold on white, yellow on dark).
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
# G-1: the toggle carries its row index; a gate pass styles it
p.rep("""        <button class="pb-btn small cp-tog ${p.status === 'in' ? 'cp-tog-out' : 'cp-tog-in'}" style="margin-top:6px;" onclick="pbToggleRosterStatus(${i})">${p.status === 'in' ? 'Check Out' : 'Check In'}</button>""",
"""        <button class="pb-btn small cp-tog ${p.status === 'in' ? 'cp-tog-out' : 'cp-tog-in'}" data-ri="${i}" style="margin-top:6px;" onclick="pbToggleRosterStatus(${i})">${p.status === 'in' ? 'Check Out' : 'Check In'}</button>""")
p.rep("""    }).join('');
  }
  let confinedReassignIdx = null;""",
"""    }).join('');
    pbRosterGate(); /* design G-1 */
  }
  // design G-1: a Check In that isn't allowed now looks it (grey, outlined, "entry not allowed"); the tap still asks
  function pbRosterGate() {
    try {
      if (!confinedPermit) return;
      document.querySelectorAll('#cpRosterList button.cp-tog[data-ri]').forEach(b => {
        const p = confinedRoster[Number(b.dataset.ri)]; if (!p) return;
        let blocked = false; if (p.status === 'out') { try { blocked = pbEntryBlockers(p).texts.length > 0; } catch (e) { blocked = false; } }
        const want = p.status === 'in' ? 'Check Out' : blocked ? '\\u{1F6AB} Check In (entry not allowed)' : 'Check In';
        if (b.textContent !== want) b.textContent = want;
        b.classList.toggle('cp-tog-blocked', blocked);
        if (blocked) b.setAttribute('aria-label', 'Check in ' + p.name + ': entry not allowed now'); else b.removeAttribute('aria-label');
      });
    } catch (e) {}
  }
  window.pbRosterGate = pbRosterGate;
  setInterval(() => { try { if (pbCurrentScreen === 'confinedActive' && confinedPermit) { pbRosterGate(); pbCloseoutDefault(); } } catch (e) {} }, 1000);
  // design G-4: after an out-of-range reading or an EMERGENCY, close-out starts on "Evacuated / Prohibited Condition"
  function pbCloseoutDefault() {
    const tg = document.getElementById('cpCloseoutReasonToggle'); if (!tg || tg.dataset.touched === '1' || !confinedPermit) return;
    if (!tg.dataset.pbTouchWired) { tg.dataset.pbTouchWired = '1'; tg.addEventListener('click', () => { tg.dataset.touched = '1'; }, true); }
    let bad = (confinedEmergencyIncidents || []).some(i => i && i.start) || !!(confinedLastObservation && confinedLastObservation.unsafe);
    if (!bad) { try { bad = (confinedAtmoLog || []).some(r => r && checkAtmoThresholds(r.o2, r.lel, { skipAlert: true, gases: pbLatestMeasuredGases([r]) }).unsafe); } catch (e) {} }
    if (!bad) return;
    const cur = tg.querySelector('button.active'); if (cur && cur.dataset.val === 'prohibited') return;
    if (cur && cur.dataset.val !== 'normal') return;
    tg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === 'prohibited'));
  }
  let confinedReassignIdx = null;""")
p.rep("""    const tg = document.getElementById('cpCloseoutReasonToggle');
    if (tg) tg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === 'normal'));""",
"""    const tg = document.getElementById('cpCloseoutReasonToggle');
    if (tg) { tg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === 'normal')); delete tg.dataset.touched; } /* design G-4: a new permit's default is worked out again */""")
# G-3: complete form first, then the acknowledgment
p.rep("""      if (a === undefined && b === undefined && !ack) {
        pbShowModal('The entry supervisor decides whether entry is safe, not this app.""",
"""      let pbAckIncomplete = false; /* design G-3: an incomplete permit is checked (and refused) before the acknowledgment */
      try { pbAckIncomplete = (pbCurrentScreen === 'confinedPermit') && (PB_CP_GROUPS.some(g => Object.keys(g.req).some(id => !pbCpVal(id))) || pbPermitNumberErrors().length > 0); } catch (e) { pbAckIncomplete = false; }
      if (a === undefined && b === undefined && !ack && !pbAckIncomplete) {
        pbShowModal('The entry supervisor decides whether entry is safe, not this app.""")
# CSS: G-1 blocked look, F2 pinned bar, F3 link colour
p.rep("""html.pb-light #pbApp#pbApp #screen-confinedActive .cp-roster-row > .cp-tog-in { color: #FFFFFF; }""",
"""html.pb-light #pbApp#pbApp #screen-confinedActive .cp-roster-row > .cp-tog-in { color: #FFFFFF; }
/* design G-1: Check In not allowed now: grey, outlined (still tappable: it asks) */
#pbApp#pbApp#pbApp #screen-confinedActive .cp-roster-row > .cp-tog-in.cp-tog-blocked { background: transparent; color: var(--pb-text-2); border: 1.5px solid var(--pb-control); font-weight: 650; flex: 1 1 100%; width: 100%; white-space: normal; grid-column: 1 / -1; grid-row: auto; justify-self: stretch; min-height: 52px; }
/* design F3: "Set reminder" readable (was an undefined --pb-accent: yellow on white) */
#pbApp#pbApp #screen-confinedActive .cp-tc-set { color: var(--pb-brand); }
html.pb-light #pbApp#pbApp #screen-confinedActive .cp-tc-set { color: #7A5800; }
/* design F2: EMERGENCY pinned at the bottom of Active Permit while its button is scrolled out of view */
#pbApp .pb-em-pin { display: none; }
html.pb-em-pin-on #pbApp #screen-confinedActive.active:not(.is-closed) .pb-em-pin { display: flex; position: fixed; left: 12px; right: 12px; bottom: calc(var(--pb-shell-h, 0px) + 8px + env(safe-area-inset-bottom, 0px)); z-index: 41; width: auto; max-width: 536px; margin: 0 auto; padding: 12px; font-size: 18px; box-shadow: 0 6px 20px rgba(0,0,0,0.45); }""")
p.rep("""    <div class="pb-btn-wrap" style="padding-top:14px;"><button class="pb-emergency-btn" onclick="pbTriggerEmergency()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-siren"/></svg>EMERGENCY</button></div>""",
"""    <div class="pb-btn-wrap" style="padding-top:14px;"><button class="pb-emergency-btn" id="cpEmBtnMain" onclick="pbTriggerEmergency()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-siren"/></svg>EMERGENCY</button></div>
    <button type="button" class="pb-emergency-btn pb-em-pin" id="cpEmPin" aria-label="EMERGENCY" onclick="pbTriggerEmergency()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-siren"/></svg>EMERGENCY</button>""")
p.rep("""  window.pbRosterGate = pbRosterGate;""",
"""  window.pbRosterGate = pbRosterGate;
  // design F2: the pinned EMERGENCY bar shows while the permit's own EMERGENCY button is out of view
  (function () {
    const set = (on) => document.documentElement.classList.toggle('pb-em-pin-on', !!on);
    const start = () => { const b = document.getElementById('cpEmBtnMain'); if (!b) return;
      try { new IntersectionObserver((es) => es.forEach(e => set(!e.isIntersecting && e.boundingClientRect.bottom < 0)), { threshold: 0 }).observe(b); } catch (e) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
  })();""")
p.save()
