# records_nov22 A8 (review "Records That Hold Up"): an office-filled daily report said "SIGNED BY <typed name>" in green,
# with the foreman's statement under it. Now:
#  - the office person's name comes from their member record (Account & Settings > Your name), not a free box: the name
#    box is filled with it and read-only while filling in; the snapshot carries office_fill.by_name / by_account / by_uid;
#  - the PDF banner: "FILLED IN BY THE OFFICE (<name>, <account>) FOR FOREMAN <name>. NOT SIGNED BY THE FOREMAN." (amber);
#  - the statement under the signature says who stated what (the office, not the foreman).
#  Older office-filled reports (no by_name) print the typed name marked "(typed)".
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    const name = pbDlyEl('drName').value.trim().replace(/\\s+/g, ' '), narrative = pbDlyEl('drNarrative').value.trim();
    if (name.length < 2) { window.pbDxTab('report'); say('Type your full name to sign.'); return; }""",
"""    let name = pbDlyEl('drName').value.trim().replace(/\\s+/g, ' '); const narrative = pbDlyEl('drNarrative').value.trim();
    if (V.fill) { // records_nov22 A8: the office signs with the name on its member record, never a typed one
      let mn = pbMyName.uid === uid ? pbMyName.name : null; if (!mn) { try { const r = await pbMyNameLoad(); mn = r && r.name; } catch (e) { mn = null; } }
      mn = String(mn || '').trim().replace(/\\s+/g, ' ');
      if (mn.length < 2) { say(navigator.onLine === false ? 'Your name couldn’t be checked with no signal. Try again with signal.' : 'Set your name first: Account & Settings › Your name. A report filled in for a foreman goes in under it.'); return; }
      name = mn.slice(0, 120); const nb = pbDlyEl('drName'); if (nb) nb.value = name;
    }
    if (name.length < 2) { window.pbDxTab('report'); say('Type your full name to sign.'); return; }""")
p.rep("""      snap.signed = { name: name.slice(0, 120), at: new Date(signedAt).toISOString(), tz, drawn: !!sig, drawn_sha256: sig ? pbSha256Text(sig) : null };
      if (V.amend)""", """      snap.signed = { name: name.slice(0, 120), at: new Date(signedAt).toISOString(), tz, drawn: !!sig, drawn_sha256: sig ? pbSha256Text(sig) : null };
      if (snap.office_fill) Object.assign(snap.office_fill, { by_name: name.slice(0, 120), by_account: (sbUser && sbUser.email) || null, by_uid: uid, by_from: 'member record' }); /* records_nov22 A8 */
      if (V.amend)""")
p.rep("""    if (p) { const t = fill ? 'Filling in for ' + (fill.foreman_name || 'the foreman') : ''; if (p.textContent !== t) p.textContent = t; if (p.hidden !== !fill) p.hidden = !fill; }
  };""", """    if (p) { const t = fill ? 'Filling in for ' + (fill.foreman_name || 'the foreman') : ''; if (p.textContent !== t) p.textContent = t; if (p.hidden !== !fill) p.hidden = !fill; }
    const nb = pbDlyEl('drName'); /* records_nov22 A8: the office's own name, from its member record */
    if (nb) { if (nb.readOnly !== !!fill) nb.readOnly = !!fill; if (fill) { const put = () => { if (pbMyName.uid === pbArchiveOwnerUid && pbMyName.name && nb.value !== pbMyName.name) nb.value = pbMyName.name; }; put(); if (!(pbMyName.uid === pbArchiveOwnerUid && pbMyName.name)) pbMyNameLoad().then(put).catch(() => {}); } }
  };""")
p.rep("""    R.banner(signed.name ? 'SIGNED BY ' + String(signed.name).toUpperCase() : 'NOT SIGNED', signed.name ? 'ok' : 'danger', signed.name ? 'Signed ' + pbRptDt(Date.parse(signed.at), { sec: true, tz: signed.tz }) + ' (' + signed.tz + ', phone clock)' + (signed.drawn ? ' · drawn signature included' : ' · typed name only') : 'This PDF is a draft.');""",
"""    const of = S.office_fill || null, ofBy = of ? (of.by_name || ((signed.name || '') + ' (typed)')) + (of.by_account || (S.foreman && S.foreman.account) ? ', ' + (of.by_account || S.foreman.account) : '') : ''; /* records_nov22 A8 */
    if (of && signed.name) R.banner('FILLED IN BY THE OFFICE (' + String(ofBy).toUpperCase() + ') FOR FOREMAN ' + String(of.for_name || 'not named').toUpperCase() + '. NOT SIGNED BY THE FOREMAN.', 'warn', 'Submitted by the office ' + pbRptDt(Date.parse(signed.at), { sec: true, tz: signed.tz }) + ' (' + signed.tz + ', phone clock)' + (of.by_name ? ' · name from the office person’s account' : ' · typed name') + '.');
    else R.banner(signed.name ? 'SIGNED BY ' + String(signed.name).toUpperCase() : 'NOT SIGNED', signed.name ? 'ok' : 'danger', signed.name ? 'Signed ' + pbRptDt(Date.parse(signed.at), { sec: true, tz: signed.tz }) + ' (' + signed.tz + ', phone clock)' + (signed.drawn ? ' · drawn signature included' : ' · typed name only') : 'This PDF is a draft.');""")
p.rep("""['Filled in by', (signed.name || S.foreman.account || '') + ' (office)']]""", """['Filled in by', (ofBy || S.foreman.account || '') + ' (office)'], ['Signed by the foreman', 'No']]""")
p.rep("""    R.kv([['Signed (typed name)', signed.name || 'not signed'], ['Signed at',""", """    R.kv([[of ? 'Submitted by (office)' : 'Signed (typed name)', of ? ofBy : (signed.name || 'not signed')], [of ? 'Submitted at' : 'Signed at',""")
p.rep("""    R.para('By signing, the foreman states this report is a true account of the work on this job on this day, to the best of the foreman’s knowledge. The records above were pulled in by the app from the sources named under each section; the narrative is the foreman’s own.', { size: 9, color: G.MUTED });""",
"""    R.para(of ? 'Filled in by the office for foreman ' + (of.for_name || 'not named') + ', who did not sign it. By submitting it, ' + (of.by_name || signed.name || 'the office') + ' states it is a true account of the work on this job on this day, to the best of their knowledge. The records above were pulled in by the app from the sources named under each section; the narrative is the office’s.' /* records_nov22 A8 */
      : 'By signing, the foreman states this report is a true account of the work on this job on this day, to the best of the foreman’s knowledge. The records above were pulled in by the app from the sources named under each section; the narrative is the foreman’s own.', { size: 9, color: G.MUTED });""")
p.rep("""    R.section('narrative', 'Foreman’s narrative', { keep: 30 });
    R.para(S.narrative || '(none written)', { size: 10 });
    src('Typed by the foreman before signing.');""", """    R.section('narrative', S.office_fill ? 'Narrative (written by the office)' : 'Foreman’s narrative', { keep: 30 }); /* records_nov22 A8 */
    R.para(S.narrative || '(none written)', { size: 10 });
    src(S.office_fill ? 'Typed by the office person who filled in this report, not by the foreman.' : 'Typed by the foreman before signing.');""")
p.save()
