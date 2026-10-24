#!/usr/bin/env python3
"""feat_core33 (r15.33, from the overnight core sweep, /home/claude/night/core.md):
 K1  [WORDING] Home band / Settings › Account with a cached account and no signal: the status line said "Not signed in —
     log in to use the app" above a "Log Out / Lock This Phone" button; it now says the sign-in couldn't be confirmed and the
     last account's records are open (the Settings help under the button no longer repeats that), and the locked-tab
     dialog says logging in needs signal instead of "Log in first".
 K2  [WORDING] Notifications › Crew production reminders: the "Saved on this phone…" note only after the switch was flipped
     on this phone; a server error with signal says "Couldn't be saved to the server. It is tried again later."
 K3  [UX] Cutsheet import rows: no inner 62 vh scroll box (the table grows with the page); the invert note stays on one
     line so a row is two lines tall, not five.
 K4  [UX] Settings › Company › Time zone value wraps instead of being clipped with "…".
 K5  [WORDING] Structure Bedding thickness: one inch helper (the F09 one), not two.
 K6  [UX] Calculators tab: the four category buttons scroll to that heading on the tab (the category screens stay for
     any direct pbGoto to them).
 K7  [WORDING] Tools tab: "Learn" over the reference rows (not "Education & Reference" over a row of that name), no heading
     over the single Edit Home shortcuts row, no Ask row (Ask is the tab under it; search still finds it).
 K8  [WORDING] Two (i) panels no longer open with the question that opened them (Lenker rod, Forgot your password?).
 K9  [WORDING] App problems (owner): the lead no longer says "Read only" and "you can mark"; times without seconds, as the
     sender's list; the Screen column shows the screen's name with its id.
 K10 [WORDING] Report an App Problem names the Home screen "Home", not the app's name.
 K11 [UX] Cutsheet "Read a Photo of the Sheet (AI)" says "No signal" before opening the picker.
 K12 [WORDING] Material Volume sub-row leaves out the unit shown as the main number.
 K13 [UX] Report an App Problem with no account on the phone says "Log in first" with a Log In button as soon as it opens."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))

# K1 — the account band
r('K1a', "      else if (!sbUser) { el.textContent = 'Not signed in \\u2014 log in to use the app'; }",
  "      else if (!sbUser && pbCachedAccountUnverified()) { el.textContent = 'Not signed in (no signal to confirm it) \\u2014 the last account\\u2019s records are open'; } /* feat_core33 K1: agrees with the Lock This Phone button under it */\n      else if (!sbUser) { el.textContent = 'Not signed in \\u2014 log in to use the app'; }")
r('K1b', "    if (help) help.textContent = /Lock This Phone/.test(label) ? 'No connection, so no one can be confirmed signed in, but the last account\\u2019s records are open. Lock This Phone hides them until that person logs in again. Nothing is deleted.'",
  "    if (help) help.textContent = /Lock This Phone/.test(label) ? 'Lock This Phone hides those records until that person logs in again. Nothing is deleted.' /* feat_core33 K1: the status line above says whose records are open */")
r('K1c', "    if (!sbUser) { pbAlert('This requires an active subscription. Log in first, then check your subscription status.', 'Subscription Required'); return; }",
  "    if (!sbUser && pbCachedAccountUnverified()) { pbAlert('This requires an active subscription. Kept on this phone from the last sign-in: ' + (sbCachedSubscription.tier === 'none' ? 'no active subscription' : sbCachedSubscription.tier + ' (' + sbCachedSubscription.status + ')') + '. Logging in to check it needs signal.', 'Subscription Required'); return; } /* feat_core33 K1: no Log In control exists in this state */\n    if (!sbUser) { pbAlert('This requires an active subscription. Log in first, then check your subscription status.', 'Subscription Required'); return; }")

# K2 — crew production reminders note
r('K2a', """      const r = await pbPermitRpc('pb_prod_push_prefs_set', { p_crew_production: p.on !== false, p_tz: tz || null, p_expect_uid: uid }, 20000);
      if (!r.error && r.data && r.data.ok === true && sbUser && sbUser.id === uid) { const cur = await pbCrewPushLocal(uid); if (cur.on === p.on) { cur.sent = want; await pbSetFor(uid, 'crewPushPref', JSON.stringify(cur)); } pbCrewPushRender(); }""",
  """      const r = await pbPermitRpc('pb_prod_push_prefs_set', { p_crew_production: p.on !== false, p_tz: tz || null, p_expect_uid: uid }, 20000);
      if (!r.error && r.data && r.data.ok === true && sbUser && sbUser.id === uid) { const cur = await pbCrewPushLocal(uid); if (cur.on === p.on) { cur.sent = want; delete cur.failedAt; await pbSetFor(uid, 'crewPushPref', JSON.stringify(cur)); } pbCrewPushRender(); }
      else { /* feat_core33 K2: a server answer that is not "no signal" is remembered, so the note can say so */
        const msg = String((r.error && r.error.message) || ''), noSignal = navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout/i.test(msg);
        const cur = await pbCrewPushLocal(uid); if (cur.changedAt && !noSignal) { cur.failedAt = Date.now(); await pbSetFor(uid, 'crewPushPref', JSON.stringify(cur)); pbCrewPushRender(); }
      }""")
r('K2b', "    if (m) { const pend = p.sent !== JSON.stringify([p.on !== false, pbCrewPushTz()]); m.hidden = !pend; m.textContent = pend ? 'Saved on this phone. The change is sent when there’s signal.' : ''; }",
  "    if (m) { const pend = !!p.changedAt && p.sent !== JSON.stringify([p.on !== false, pbCrewPushTz()]); m.hidden = !pend; m.textContent = !pend ? '' : p.failedAt && navigator.onLine !== false ? 'Couldn’t be saved to the server. It is tried again later.' : 'Saved on this phone. The change is sent when there’s signal.'; } /* feat_core33 K2: only after a change made on this phone */")
r('K2c', "    const p = await pbCrewPushLocal(uid); p.on = !!on; await pbSetFor(uid, 'crewPushPref', JSON.stringify(p));\n    pbCrewPushRender(); pbCrewPushFlush(uid);",
  "    const p = await pbCrewPushLocal(uid); p.on = !!on; p.changedAt = Date.now(); delete p.failedAt; await pbSetFor(uid, 'crewPushPref', JSON.stringify(p)); /* feat_core33 K2 */\n    pbCrewPushRender(); pbCrewPushFlush(uid);")

# K3 — cutsheet rows table; K4 — time zone row (CSS)
r('K3', "#pbApp#pbApp #screen-cutsheetImport #cutsheetRowTable .pb-table-wrap { margin: 0; border-radius: 10px; }",
  "#pbApp#pbApp #screen-cutsheetImport #cutsheetRowTable .pb-table-wrap { margin: 0; border-radius: 10px; max-height: none; overflow-y: visible; } /* feat_core33 K3: the rows grow with the page, no box inside the page */\n#pbApp#pbApp #screen-cutsheetImport .pb-cs-inv small { white-space: nowrap; } /* feat_core33 K3: two-line rows (the table scrolls sideways anyway) */")
r('K4', "#pbApp .pbx-cotime { margin-top: 8px; }",
  "#pbApp .pbx-cotime { margin-top: 8px; }\n#pbApp .pbx-cotime .pbx-namerow-v { white-space: normal; overflow: visible; text-overflow: clip; line-height: 1.3; padding: 6px 0; } /* feat_core33 K4: the whole value, on two lines if needed */")

# K5 — one inch helper under the bedding thickness
r('K5', "  const PB_WT_FTIN = ['volRectD', 'volTrapD', 'volSectorD', 'volEncD', 'beddingThk'];",
  "  const PB_WT_FTIN = ['volRectD', 'volTrapD', 'volSectorD', 'volEncD']; /* feat_core33 K5: beddingThk has the F09 helper (type inches) */")

# K6 — the category buttons scroll to the heading on the tab
r('K6a', """      <button type="button" class="pb-btn secondary" id="calcCatBtnGrade" onclick="pbGoto('calcCatGrade')">Grade &amp; Elevation</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnSafety" onclick="pbGoto('calcCatTrench')">Safety</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnPipe" onclick="pbGoto('calcCatPipe')">Pipe &amp; Flow</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnStruct" onclick="pbGoto('calcCatStructures')">Structures</button>""",
  """      <!-- feat_core33 K6: each jumps to its heading on this tab (the calcCat* screens stay for direct routes) -->
      <button type="button" class="pb-btn secondary" id="calcCatBtnGrade" onclick="pbCalcCatJump('Grade &amp; Elevation')">Grade &amp; Elevation</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnSafety" onclick="pbCalcCatJump('Safety')">Safety</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnPipe" onclick="pbCalcCatJump('Pipe &amp; Flow')">Pipe &amp; Flow</button>
      <button type="button" class="pb-btn secondary" id="calcCatBtnStruct" onclick="pbCalcCatJump('Structures')">Structures</button>""")
r('K6b', "  function pbRenderToolsList() {\n    const box = document.getElementById('toolsList'); if (!box) return;",
  """  // feat_core33 K6: a category button scrolls to that heading on the Calculators tab (under the sticky header).
  window.pbCalcCatJump = function(name) {
    const s = document.querySelector('#toolsList section[aria-label="' + String(name).replace(/"/g, '') + '"]'); if (!s) return;
    const h = document.querySelector('#screen-calcHub .pb-header'), hh = h ? h.getBoundingClientRect().height : 0;
    window.scrollTo({ top: Math.max(0, s.getBoundingClientRect().top + window.scrollY - hh - 8), behavior: 'smooth' });
  };
  function pbRenderToolsList() {
    const box = document.getElementById('toolsList'); if (!box) return;""")

# K7 — Tools tab headings and the Ask row
r('K7a', "  const PB_TOOLS_TAB_CATS = [['reference', 'Education & Reference'], ['records', 'Production']];",
  "  const PB_TOOLS_TAB_CATS = [['reference', 'Learn'], ['records', 'Production']]; /* feat_core33 K7: the first row is named Education & Reference */")
r('K7b', "    box.innerHTML = PB_TOOLS_TAB_CATS.map(([cat, name]) => pbGroupHTML(name, PB_DESTINATIONS.filter(d => pbDestTab(d) === 'tools' && d.cat === cat))).join('')\n      + '<section class=\"pb-edu-block\" aria-label=\"Home shortcuts\"><h2 class=\"pb-edu-h\">Home shortcuts</h2><div class=\"pb-tools-group\">'",
  "    box.innerHTML = PB_TOOLS_TAB_CATS.map(([cat, name]) => pbGroupHTML(name, PB_DESTINATIONS.filter(d => pbDestTab(d) === 'tools' && d.cat === cat && d.id !== 'aiAsk'))).join('') /* feat_core33 K7: Ask is the tab below (search still finds it) */\n      + '<section class=\"pb-edu-block pb-tools-solo\" aria-label=\"Home shortcuts\"><div class=\"pb-tools-group\">' /* feat_core33 K7: no heading over one row */")
r('K7c', "#pbApp .pb-calc-cats { display: grid;",
  "#pbApp #toolsAllList .pb-tools-solo { margin-top: 20px; } /* feat_core33 K7 */\n#pbApp .pb-calc-cats { display: grid;")

# K8 — (i) panels
r('K8a', "Using a Lenker rod? You don't need this — the number on the rod is already the elevation (a direct reading).",
  "You don't need this: the number on a Lenker rod is already the elevation (a direct reading).")
r('K8b', "Forgot your password? On the Log In screen, tap Forgot password? (it needs signal).",
  "On the Log In screen, tap Forgot password? (it needs signal).")

# K9 — the owner's App problems list
r('K9a', "Problems people reported from the app. Read only: you can mark each one read or closed.",
  "Problems people reported from the app. Mark each one read or closed; nothing else can be changed here.")
r('K9b', "<span class=\"pb-w10-ap-when\">' + escapeHtml(d && !isNaN(d) ? d.toLocaleString() : '') + '</span></div>'",
  "<span class=\"pb-w10-ap-when\">' + escapeHtml(d && !isNaN(d) ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '') + '</span></div>' /* feat_core33 K9: as the sender's list */")
r('K9c', "' · <span class=\"k\">Screen</span> ' + escapeHtml(String(x.screen || '—')) + '</p>'",
  "' · <span class=\"k\">Screen</span> ' + escapeHtml(x.screen ? pbSupScreenLabel(String(x.screen)) : '—') + '</p>' /* feat_core33 K9: the screen's name, id kept */")

# K10 — Home is "Home"
r('K10', "    return title ? title + ' (' + id + ')' : String(id || 'home');\n  }",
  "    if (!id || id === 'home') return 'Home'; /* feat_core33 K10: Home's h1 is the app's name */\n    return title ? title + ' (' + id + ')' : String(id);\n  }")

# K11 — the photo button says no signal before the picker opens
r('K11', "    if (!pbAiPlanOk()) { pbAiShow(statusEl, 'warn', 'AI not on your plan.', PB_AI_MSG.plan); return; }\n    pbAiEnsurePrivacy(() => { const inp = document.getElementById('cutsheetAiPhotoInput'); if (inp) inp.click(); });",
  "    if (!pbAiPlanOk()) { pbAiShow(statusEl, 'warn', 'AI not on your plan.', PB_AI_MSG.plan); return; }\n    if (navigator.onLine === false) { pbAiShow(statusEl, 'warn', 'No signal.', PB_AI_MSG.offline); return; } /* feat_core33 K11: said before the camera opens */\n    pbAiEnsurePrivacy(() => { const inp = document.getElementById('cutsheetAiPhotoInput'); if (inp) inp.click(); });")

# K12 — Material Volume sub-row without the main unit
r('K12', "${cubicYd.toFixed(2)} yd³ · ${cubicFt.toFixed(2)} ft³ · ${gal.toFixed(1)} gal${volLastArcLen",
  "${[unit !== 'yd3' ? cubicYd.toFixed(2) + ' yd³' : '', unit !== 'ft3' ? cubicFt.toFixed(2) + ' ft³' : '', unit !== 'gal' ? gal.toFixed(1) + ' gal' : ''].filter(Boolean).join(' · ')}${volLastArcLen")

# K13 — Report an App Problem with no account: said at once, with Log In
r('K13', "    const scr = document.getElementById('apAutoScreen'); if (scr) scr.textContent = pbSupScreenLabel(pbSupFromScreen);",
  """    const scr = document.getElementById('apAutoScreen'); if (scr) scr.textContent = pbSupScreenLabel(pbSupFromScreen);
    { /* feat_core33 K13: no account on this phone — said before anything is typed, with the way to log in */
      const err = document.getElementById('apError');
      if (err && (!uid || uid === 'shared')) { err.innerHTML = 'Log in first. App problem reports are sent from your account, so the app owner can reply. <button type="button" class="pb-btn ghost small" onclick="pbOpenLogin()">Log In</button>'; err.style.display = ''; }
      else if (err && /App problem reports are sent from your account/.test(err.textContent)) { err.textContent = ''; err.style.display = 'none'; }
    }""")

r('K13b', "    if (!uid || uid === 'shared') { say('Log in first. App problem reports are sent from your account, so the app owner can reply. Nothing was sent.'); return; }",
  "    if (!uid || uid === 'shared') { await pbSupRender(); return; } /* feat_core33 K13: the same line, with Log In */")

def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('core33 written', len(s))
