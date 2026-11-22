# records_nov22 A1 + A4 (review "No Signal and Lost Work"):
#  A4: a run whose current version the company hasn't accepted keeps going, whatever its age (was: only runs locked in the
#      last 21 days). Kept from going to the wrong place: a run older than 21 days goes only if it was locked after this
#      account joined the company, or this company already has an earlier version of it. Runs whose photos were cleared
#      from the phone (speed2 #52) are not resent (their copy here now holds placeholders).
#      The sent list is no longer trimmed to 300 for runs still in Records (a trimmed run looked unsent for ever).
#      A cheap fingerprint per run (photos by length + tail) remembers "accepted, photos and all", so the full office-copy
#      hash (which hashes every photo) runs only for changed runs, at most 30 a pass.
#  A1: "Not sent" (Home, Log Out, Lock This Phone, switch-company warning) also counts run records the company hasn't
#      accepted, run photos still owed, and closed permits not backed up.
#  A4b: a daily-report attachment gives up 14 days after the server first ANSWERED (no-signal tries don't count).
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()

# ---- cache invalidation: every Records save ----
p.rep("""  async function saveRunArchive() {
    await pbArchiveReady;""", """  async function saveRunArchive() {
    try { pbRrHC.gen++; } catch (x) {} /* records_nov22 A1: run fingerprints are worked out again after any change */
    await pbArchiveReady;""")

# ---- photos-done map kept in memory once saved ----
p.rep("""    const ks = Object.keys(done); if (ks.length > 2000) ks.sort((a, b) => done[a] - done[b]).slice(0, ks.length - 2000).forEach(k => delete done[k]);
    await pbSetFor(uid, 'rrPhotosUp', JSON.stringify(done));
    return more;""", """    const ks = Object.keys(done); if (ks.length > 2000) ks.sort((a, b) => done[a] - done[b]).slice(0, ks.length - 2000).forEach(k => delete done[k]);
    await pbSetFor(uid, 'rrPhotosUp', JSON.stringify(done));
    if (pbRr.uid === uid) pbRr.photosDone = done; /* records_nov22 A1 */
    return more;""")

# ---- load sent + fingerprints + photos done together; helpers ----
p.rep("""  async function pbRrLoadSent(uid) {
    if (pbRr.uid === uid && pbRr.sent) return pbRr.sent;
    let m = {}; try { const raw = await pbGetFor(uid, 'rrSent'); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') m = p; } catch (x) { m = {}; }
    if (pbRr.uid !== uid) pbRr = { uid, sent: null, busy: false, pauseUntil: 0, timer: null, asked: {} };
    pbRr.sent = m; return m;
  }""", """  async function pbRrLoadSent(uid) {
    if (pbRr.uid === uid && pbRr.sent) return pbRr.sent;
    let m = {}; try { const raw = await pbGetFor(uid, 'rrSent'); const p = raw ? JSON.parse(raw) : null; if (p && typeof p === 'object') m = p; } catch (x) { m = {}; }
    let sg = {}, pd = {}; try { const o = JSON.parse((await pbGetFor(uid, 'rrSig')) || '{}'); if (o && typeof o === 'object') sg = o; } catch (x) {} try { const o = JSON.parse((await pbGetFor(uid, 'rrPhotosUp')) || '{}'); if (o && typeof o === 'object') pd = o; } catch (x) {} /* records_nov22 A1 */
    if (pbRr.uid === uid && pbRr.sent) return pbRr.sent; // loaded meanwhile
    if (pbRr.uid !== uid) pbRr = { uid, sent: null, busy: false, pauseUntil: 0, timer: null, asked: {} };
    pbRr.sent = m; pbRr.sig = sg; pbRr.photosDone = pd; return m;
  }
  // ---- records_nov22 A1 / A2 / A4: has the company got this run as it is now? ----
  // cm: entry -> cheap fingerprint; m: entry -> office copy + its hash. Both thrown away on every Records save (gen).
  let pbRrHC = { gen: 0, m: new WeakMap(), cm: new WeakMap() };
  function pbRrLockMs(e) { const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); return isFinite(t) ? t : NaN; }
  function pbRrCheapOf(e, co, fresh) { // fresh: worked out now (a change not saved yet counts); else once per Records save
    let laid = ''; try { const L = window.pbLaidSummaryOf ? window.pbLaidSummaryOf(e.id) : null; laid = L ? String(L.laidFt) : ''; } catch (x) {}
    const c = pbRrHC.cm.get(e); if (!fresh && c && c.g === pbRrHC.gen && c.co === co && c.laid === laid) return c.s;
    let held = false; try { held = typeof window.pbRfEndHeld === 'function' && !!window.pbRfEndHeld(e); } catch (x) {}
    const s = pbHashText(JSON.stringify(e, (k, v) => (typeof v === 'string' && v.length > 200 && /^data:/.test(v)) ? v.length + ':' + v.slice(-48) : v) + '|' + laid + '|' + co + '|' + held);
    pbRrHC.cm.set(e, { g: pbRrHC.gen, co, laid, s }); return s;
  }
  function pbRrHashOf(e, co, budget, fresh) {
    const cheap = pbRrCheapOf(e, co, fresh), c = pbRrHC.m.get(e);
    if (c && c.cheap === cheap && c.co === co) return c;
    if (budget) { if (budget.n <= 0) return null; budget.n--; }
    let rec; try { rec = pbRrOfficeCopy(e); } catch (x) { return null; }
    const v = { co, cheap, rec, h: pbHashText(JSON.stringify([rec, co])) };
    pbRrHC.m.set(e, v); return v;
  }
  let pbRrSigT = null;
  function pbRrSigSet(uid, id, v) {
    if (pbRr.uid !== uid) return; const sg = pbRr.sig || (pbRr.sig = {}), o = sg[id];
    if (o && o.c === v.c && o.h === v.h && o.co === v.co && !!o.ph === !!v.ph) return;
    sg[id] = v; clearTimeout(pbRrSigT);
    pbRrSigT = setTimeout(() => { if (pbRr.uid !== uid || !pbRr.sig) return; const live = new Set(runArchive.filter(x => x && x.kind === 'run').map(x => String(x.id))); const k = Object.keys(pbRr.sig).filter(x => !live.has(x)); if (k.length > 300) k.slice(0, k.length - 300).forEach(x => delete pbRr.sig[x]); pbSetFor(uid, 'rrSig', JSON.stringify(pbRr.sig)).catch(() => {}); }, 2000);
  }
  // Does this run go to the company at all? Recent runs (21 days), a report he asked to send, a run locked after he joined
  // this company, or one this company already has a version of. Never one whose photos were cleared from this phone.
  function pbRrWants(e, acc) {
    if (Array.isArray(e._phoneCleared) && e._phoneCleared.length) return false;
    const t = pbRrLockMs(e);
    if (isFinite(t) && t > Date.now() - PB_RR_DAYS * 86400000) return true;
    if (e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete)) return true;
    const j = Number(acc.joinedAt); if (j > 0 && isFinite(t) && t >= j - 86400000) return true;
    const sg = pbRr.sig && pbRr.sig[String(e.id)]; return !!(sg && sg.co === acc.companyId);
  }
  // k: 'ok' | 'unsent' | 'held' (its end isn't saved on the phone yet) | 'photos' (n still owed) | 'refused' (said on the run)
  //    | 'na' (doesn't go to a company) | 'unknown' (not worked out yet)
  function pbRrRunState(uid, e, budget, fresh) {
    const acc = uid ? pbProdAccMem.get(uid) : null; if (!acc || !acc.member || !acc.companyId || pbArchiveOwnerUid !== uid) return { k: 'na' };
    if (!e || e.kind !== 'run' || e.id === undefined || e.id === null || !/^[A-Za-z0-9_.:-]{1,60}$/.test(String(e.id))) return { k: 'na' };
    if (pbRr.uid !== uid || !pbRr.sent) { pbRrLoadSent(uid).then(() => { try { pbUnsentHomeSoon(); } catch (x) {} }).catch(() => {}); return { k: 'unknown' }; }
    const id = String(e.id), co = acc.companyId, sent = pbRr.sent[id];
    if (e.reportRefused && e.reportRefused.code !== 'pb:not_company_member') return { k: 'refused' };
    if (!pbRrWants(e, acc)) return { k: sent ? 'ok' : 'na' };
    const sg = pbRr.sig && pbRr.sig[id];
    if (sent && sg && sg.h === sent && sg.ph && sg.co === co && sg.c === pbRrCheapOf(e, co, fresh)) return { k: 'ok' };
    const c = pbRrHashOf(e, co, budget, fresh); if (!c) return { k: 'unknown' };
    if (sent !== c.h) return { k: (typeof window.pbRfEndHeld === 'function' && window.pbRfEndHeld(e)) ? 'held' : 'unsent' };
    const done = pbRr.photosDone || {};
    const owed = ((c.rec.pbOffice && c.rec.pbOffice.photos) || []).filter(ph => ph && !ph.r && !done[ph.path]).length;
    pbRrSigSet(uid, id, { c: c.cheap, h: c.h, co, ph: owed ? 0 : 1 });
    return owed ? { k: 'photos', n: owed } : { k: 'ok' };
  }
  window.pbRrRunState = (e) => pbRrRunState(pbArchiveOwnerUid, e, null, true); // tests""")

# ---- pbRrSend: any age (see pbRrWants), cheap skip, budgeted hashes, no trimming of live runs ----
p.rep("""    const since = Date.now() - PB_RR_DAYS * 86400000;
    const runs = runArchive.filter(e => e && e.kind === 'run' && e.id !== undefined && e.id !== null && /^[A-Za-z0-9_.:-]{1,60}$/.test(String(e.id)) && !(typeof window.pbRfEndHeld === 'function' && window.pbRfEndHeld(e)) /* review S1: sent once the end is saved */
      && ((e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete)) /* offline audit 03: a report he sent goes whatever the phone's clock said */ || (() => { const t = (e.lockTime instanceof Date ? e.lockTime : new Date(e.lockTime)).getTime(); return isFinite(t) && t > since; })()));
    const todo = [], held = [];
    for (const e of runs) {
      let rec; try { rec = pbRrOfficeCopy(e); } catch (x) { continue; }
      const h = pbHashText(JSON.stringify([rec, acc.companyId]));
      const ask = !e.reportSentAt""", """    const runs = runArchive.filter(e => e && e.kind === 'run' && e.id !== undefined && e.id !== null && /^[A-Za-z0-9_.:-]{1,60}$/.test(String(e.id)) && !(typeof window.pbRfEndHeld === 'function' && window.pbRfEndHeld(e)) /* review S1: sent once the end is saved */
      && pbRrWants(e, acc)); /* records_nov22 A4: any age (was: locked in the last 21 days) */
    const todo = [], held = [], budget = { n: 30 }; let skipped = false;
    for (const e of runs) {
      const sid = String(e.id), sg0 = pbRr.sig && pbRr.sig[sid];
      const ask0 = !e.reportSentAt && !(e.reportRefused && e.reportRefused.code !== 'pb:not_company_member') && (e.completed || e.incomplete) && Date.now() - (pbRr.asked[sid] || 0) > (e.reportSendWanted ? 60000 : 30 * 60000);
      if (!ask0 && sent[sid] && sg0 && sg0.h === sent[sid] && sg0.ph && sg0.co === acc.companyId && sg0.c === pbRrCheapOf(e, acc.companyId, true)) continue; // records_nov22: unchanged since the company took it, photos and all
      const hc = pbRrHashOf(e, acc.companyId, budget, true); if (!hc) { skipped = true; continue; }
      const rec = hc.rec, h = hc.h;
      const ask = !e.reportSentAt""")
p.rep("""      const keys = Object.keys(sent); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete sent[k]);
      if (pbRr.uid === uid) await pbSetFor(uid, 'rrSent', JSON.stringify(sent));""", """      { const live = new Set(runArchive.filter(x => x && x.kind === 'run').map(x => String(x.id))); const keys = Object.keys(sent).filter(k => !live.has(k)); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete sent[k]); } /* records_nov22 A4: a run still in Records is never forgotten */
      if (pbRr.uid === uid) await pbSetFor(uid, 'rrSent', JSON.stringify(sent));
      todo.forEach(t => { if (sent[t.id] === t.h) { const c = pbRrHC.m.get(t.e); if (c && c.h === t.h) pbRrSigSet(uid, t.id, { c: c.cheap, h: t.h, co: acc.companyId, ph: 0 }); } }); /* records_nov22: this company has a version (photos checked by pbRrRunState) */
      try { pbUnsentHomeSoon(); } catch (x) {}""")
p.rep("""      again = again || todo.length >= PB_RR_MAX_PER_PASS;
    } finally { pbRr.busy = false;""", """      again = again || todo.length >= PB_RR_MAX_PER_PASS || skipped;
    } finally { pbRr.busy = false;""")
# the early return when there's nothing to do must still come back for skipped (budgeted) runs
p.rep("""    if (!todo.length && !owed.length) return;
    pbRr.busy = true;""", """    if (!todo.length && !owed.length) { if (skipped) pbRrSoon(5000); return; }
    pbRr.busy = true;""")

# ---- A1: the counts ----
p.rep("""    run(() => { if (pbArchiveOwnerUid !== uid) return; const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete));
      add('reports', W.length, 0, 'run report', 'run reports', 'Records', () => window.pbOpenArchive()); });
    return out;
  }""", """    run(() => { if (pbArchiveOwnerUid !== uid) return; const W = runArchive.filter(e => e && e.kind === 'run' && e.reportSendWanted && !e.reportSentAt && (e.completed || e.incomplete));
      add('reports', W.length, 0, 'run report', 'run reports', 'Records', () => window.pbOpenArchive());
      // records_nov22 A1: run records the company hasn't accepted as they are now, and run photos still owed
      if (archiveLoadFailed) return; const inW = new Set(W), budget = full ? null : { n: 12 }; let nR = 0, nP = 0, more = false;
      runArchive.forEach(e => { if (!e || e.kind !== 'run') return; const s = pbRrRunState(uid, e, budget, !!full); if (s.k === 'unsent' || s.k === 'held') { if (!inW.has(e)) nR++; } else if (s.k === 'photos') nP += s.n; else if (s.k === 'unknown' && budget && budget.n <= 0) more = true; });
      if (more) setTimeout(() => { try { pbUnsentHomeSoon(); } catch (x) {} }, 1500);
      add('runs', nR, 0, 'run record', 'run records', 'Records', () => window.pbOpenArchive());
      add('rphotos', nP, 0, 'run photo', 'run photos', 'Records', () => window.pbOpenArchive()); });
    run(() => { if (pbArchiveOwnerUid !== uid || !sbUser || sbUser.id !== uid || archiveLoadFailed) return; // records_nov22 A1: closed permits not backed up yet
      const S = runArchive.filter(e => e && e.kind === 'confined').map(pbPermitBkStateOf).filter(s => ['pending', 'failing', 'quota', 'refused'].includes(s.k));
      add('permits', S.length, S.filter(s => s.k === 'refused').length, 'permit not backed up', 'permits not backed up', 'Records', () => window.pbOpenArchive()); });
    return out;
  }""")
p.rep("""  function pbUnsentGroups(uid) {
    const out = []; if (!uid || uid === 'shared') return out;""", """  function pbUnsentGroups(uid, full) { // full: every run worked out now (Log Out); else a few per call (Home)
    const out = []; if (!uid || uid === 'shared') return out;""")
# Log Out / Lock / switch: load the run and permit state first, count everything
p.rep("""    try { await Promise.race([Promise.all([pbDlyLoad(uid), pbLocLoadSt(uid), pbJbLoadStore(uid), pbDaLoad(uid)].map(p => Promise.resolve(p).catch(() => null))), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    const g = pbUnsentGroups(uid); if (!g.length) return '';""", """    try { await Promise.race([Promise.all([pbDlyLoad(uid), pbLocLoadSt(uid), pbJbLoadStore(uid), pbDaLoad(uid), pbRrLoadSent(uid), pbPermitBkLoad(uid)].map(p => Promise.resolve(p).catch(() => null))), new Promise(r => setTimeout(r, 1500))]); } catch (e) {} /* records_nov22 A1: runs and permits too */
    const g = pbUnsentGroups(uid, true); if (!g.length) return '';""")
p.rep("""    Promise.all([pbDlyLoad(uid), pbLocLoadSt(uid), pbJbLoadStore(uid), pbDaLoad(uid)].map(p => Promise.resolve(p).catch(() => null))).then(() => pbUnsentHomeSoon());""",
"""    Promise.all([pbDlyLoad(uid), pbLocLoadSt(uid), pbJbLoadStore(uid), pbDaLoad(uid), pbRrLoadSent(uid), pbPermitBkLoad(uid)].map(p => Promise.resolve(p).catch(() => null))).then(() => pbUnsentHomeSoon());""")
p.rep("""    const uid = pbArchiveOwnerUid, g = pbUnsentGroups(uid);
    if (!g.length) { pbAlert('Everything has reached your company.', 'Not Sent'); pbUnsentHomeSoon(); return; }""", """    const uid = pbArchiveOwnerUid, g = pbUnsentGroups(uid, true);
    if (!g.length) { pbAlert('Everything has reached your company.', 'Not Sent'); pbUnsentHomeSoon(); return; }""")

# ---- A4b: daily attachment gives up 14 days after the server first answered ----
p.rep("""        if (x.firstTry && Date.now() - x.firstTry > PB_DA_GIVEUP) { Object.assign(x, { state: 'gone', why: 'Not on the company server 14 days after the first try — not attached.' }); changed = true; continue; }""",
"""        if (x.firstAns && Date.now() - x.firstAns > PB_DA_GIVEUP) { Object.assign(x, { state: 'gone', why: 'The server still couldn’t attach it 14 days after it first answered (' + (x.why || 'no reason given') + '). Not attached.' }); changed = true; continue; } /* records_nov22 A4: days with no signal don't count */""")
p.rep("""        if (A.k === 'retry') { if (x.why !== A.why) { x.why = A.why || ''; changed = true; } break; }
        if (A.k === 'ok') Object.assign(x, { state: 'sent', why: '', after: !!A.d.after_signing""", """        if (A.k === 'retry') { if (x.why !== A.why) { x.why = A.why || ''; changed = true; } break; }
        if (!x.firstAns) x.firstAns = Date.now(); /* records_nov22 A4 */
        if (A.k === 'ok') Object.assign(x, { state: 'sent', why: '', after: !!A.d.after_signing""")
p.rep("""after 14 days it stops trying.' }); changed = true; break; } // review 3""", """after 14 days of answers like this it stops trying.' }); changed = true; break; } // review 3""")
p.save()
