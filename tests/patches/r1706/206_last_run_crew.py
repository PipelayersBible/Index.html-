#!/usr/bin/env python3
# daily3 #50 (owner: yes): a new run offers the last run's crew in one tap.
# The Crew & Equipment Log of a run that hasn't ended shows "Same Crew as Last Run" when this phone's previous run (the
# latest other run with anyone on its log) has people or equipment this run doesn't have yet. It names them and how long
# ago that run was. One tap adds them all with their type, category and Rental mark, checked in now, in one save (one
# undo-free step; anyone can still be checked out or removed as before). Saves 12 to 15 taps per run.
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

rep(r"""  function renderCrewLog(entry) {
    const list = document.getElementById('crewLogList');
    const roster = entry.crewLog || [];
    if (!roster.length) { list.innerHTML = '<p class="pb-help" style="margin:0;">No one logged yet.</p>'; return; }""",
r"""  // daily3 #50: the last run's crew, offered on a run that hasn't ended
  const pbCrewSameKey = (p) => (p.type || '') + '|' + String(p.name || '').trim().replace(/\s+/g, ' ').toLowerCase() + (p.rental ? '|r' : '');
  function pbCrewLastRun(entry) {
    const t = (e) => Number(e.runStartTime) || Date.parse(e.runStartTime || '') || Number(e.lockTime) || Date.parse(e.lockTime || '') || Number(e.id) || 0;
    const me = t(entry);
    return (runArchive || []).filter(e => e && e !== entry && e.kind === 'run' && Array.isArray(e.crewLog) && e.crewLog.some(p => p && String(p.name || '').trim()) && t(e) <= (me || Infinity))
      .sort((a, b) => t(b) - t(a))[0] || null;
  }
  function pbCrewSameOffer(entry) {
    if (!entry || entry.completed || entry.incomplete) return null;
    const last = pbCrewLastRun(entry); if (!last) return null;
    const have = new Set((entry.crewLog || []).map(pbCrewSameKey)), seen = new Set();
    const add = (last.crewLog || []).filter(p => { if (!p || !String(p.name || '').trim()) return false; const k = pbCrewSameKey(p); if (have.has(k) || seen.has(k)) return false; seen.add(k); return true; });
    return add.length ? { last, add } : null;
  }
  function pbCrewSameHtml(entry) {
    const O = pbCrewSameOffer(entry); if (!O) return '';
    const t = Number(O.last.runStartTime) || Date.parse(O.last.runStartTime || '') || 0, ago = t ? Date.now() - t : 0;
    const when = !t ? '' : ago < 86400000 && new Date(t).toDateString() === new Date().toDateString() ? 'today' : ago < 2 * 86400000 ? 'yesterday' : new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    const names = O.add.map(p => p.name).slice(0, 8).join(', ') + (O.add.length > 8 ? ' and ' + (O.add.length - 8) + ' more' : '');
    return '<div class="pb-crew-same" id="crewSameWrap" style="margin:0 0 10px;padding:12px 14px;border:1px solid var(--pb-divider);border-radius:12px;background:var(--pb-raised);">'
      + '<p class="pb-help" style="margin:0 0 8px;" id="crewSameNames">' + escapeHtml('Last run' + (when ? ' (' + when + ')' : '') + ': ' + names) + '</p>'
      + '<button type="button" class="pb-btn secondary" id="crewSameBtn" style="width:100%;min-height:48px;" onclick="pbCrewSameAdd()">' + escapeHtml('Same Crew as Last Run (' + O.add.length + ')') + '</button></div>';
  }
  let pbCrewSameBusy = false;
  window.pbCrewSameAdd = function() {
    const entry = getCurrentArchiveEntry(); if (!entry) { pbRunGoneAlert(); return; }
    if (pbCrewSameBusy) return; pbCrewSameBusy = true;
    return pbRunOnEntry(entry, async () => {
      if (!runArchive.includes(entry) || entry.completed || entry.incomplete) return;
      const O = pbCrewSameOffer(entry); if (!O) { pbRenderCrewIfCurrent(entry); return; }
      entry.crewLog = entry.crewLog || [];
      const now = Date.now();
      const rows = O.add.map(p => ({ id: 'crew-' + now.toString(36) + '-' + (++pbCrewSeq), name: String(p.name).trim(), type: p.type || 'Laborer', category: p.category || 'Pipe Installation', ...(p.rental ? { rental: true } : {}), status: 'in', log: [{ action: 'Checked In', time: now }], from_run: String(O.last.id) }));
      rows.forEach(r => entry.crewLog.push(r));
      const modToken = markEntryModified(entry);
      const ok = await saveRunArchive();
      if (!ok) { rows.forEach(r => { const i = entry.crewLog.indexOf(r); if (i !== -1) entry.crewLog.splice(i, 1); }); pbRevertModification(entry, modToken); }
      pbRenderCrewIfCurrent(entry);
    }).finally(() => { pbCrewSameBusy = false; });
  };
  function renderCrewLog(entry) {
    const list = document.getElementById('crewLogList');
    const roster = entry.crewLog || [];
    const same = (() => { try { return pbCrewSameHtml(entry); } catch (e) { console.error(e); return ''; } })(); /* daily3 #50 */
    if (!roster.length) { list.innerHTML = same + '<p class="pb-help" style="margin:0;">No one logged yet.</p>'; return; }""")
rep(r"""        <button class="pb-btn ghost small" style="margin-top:6px; color:var(--rod-red);" onclick="pbRemoveCrewLogEntry(${escapeHtml(JSON.stringify(pbCrewKey(p)))})">Remove</button>
      </div>`;
    }).join('');
  }""",
r"""        <button class="pb-btn ghost small" style="margin-top:6px; color:var(--rod-red);" onclick="pbRemoveCrewLogEntry(${escapeHtml(JSON.stringify(pbCrewKey(p)))})">Remove</button>
      </div>`;
    }).join('');
    if (same) list.insertAdjacentHTML('afterbegin', same); /* daily3 #50 */
  }""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
