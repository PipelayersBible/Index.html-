#!/usr/bin/env python3
# daily3 #49 (owner said yes, Nov 18): the customer signs extra work on the phone.
# An "Extra work" entry under the daily's Delays & Extra Work (the field ticket for T&M) gets "Customer Signs": a
# full-screen sheet with what is being signed (job, day, reason, detail, hours, crew, equipment, photos), a signature
# pad, the customer's name (required) and title (optional). Sign stores, with the entry: name, title, the time and the
# phone's zone, the drawn signature (PNG) and its SHA-256, and the SHA-256 of the entry exactly as signed (jsonb text
# form, as the app's other fingerprints). Works with no signal: it is kept on this phone with the daily's draft (the
# critical store) and goes to the company with the daily report (snapshot events[].cust_sig), like the entry's photos.
# A signed entry is a record: Change and Remove are gone; Amend keeps every signed version on the entry (prior[], with
# its signature) and the changed entry needs a new signature. The ticket has its own PDF (Ticket PDF: on the entry,
# and on the signed daily's card), and the daily report's PDF shows each signature and any earlier signed versions.
# The office's Delays & extra work list shows "Customer signed" (pb_daily.event_json, sql/02_customer_signed.sql).
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:90])
    s = s.replace(old, new)

# 0) styles (with the daily's other styles)
rep(r"""  #pbApp .dp-segb[aria-pressed="true"] { background: var(--pb-brand-soft); border-color: var(--pb-brand-line); }""",
r"""  #pbApp .dp-segb[aria-pressed="true"] { background: var(--pb-brand-soft); border-color: var(--pb-brand-line); }
  /* daily3 #49: the customer's signature on extra work */
  .xs-wrap { position: fixed; inset: 0; z-index: 2147482000; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: max(12px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px)); background: var(--pb-canvas, #F4F5F7); color: var(--pb-text, #14171C); box-sizing: border-box; font-family: Inter, system-ui, sans-serif; }
  .xs-box { width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 10px; }
  .xs-box h2 { margin: 4px 0 0; font-size: 1.3rem; }
  .xs-sum { background: var(--pb-raised, #fff); border: 1px solid var(--pb-divider, #d6d9de); border-radius: 12px; padding: 12px 14px; font-size: 15px; line-height: 1.45; overflow-wrap: anywhere; }
  .xs-sum p { margin: 0 0 4px; } .xs-sum .xs-k { color: var(--pb-text-2, #555); }
  .xs-stmt { margin: 0; font-size: 15px; font-weight: 600; }
  .xs-pad { display: block; width: 100%; height: auto; aspect-ratio: 3 / 1; background: #fff; border: 2px solid var(--pb-divider, #c9ccd1); border-radius: 12px; touch-action: none; box-sizing: border-box; }
  .xs-padrow { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 13px; color: var(--pb-text-2, #555); }
  .xs-box .pb-field input { width: 100%; box-sizing: border-box; min-height: 48px; font-size: 17px; }
  .xs-box .pbd-acts .pb-btn { min-height: 48px; }
  #pbApp .xs-line { margin: 6px 0 0; font-size: 14px; overflow-wrap: anywhere; }
  #pbApp .xs-chip { display: inline-flex; align-items: center; min-height: 24px; padding: 0 9px; margin-right: 6px; border-radius: 12px; font-size: 13px; font-weight: 650; background: var(--pb-ok-soft); color: var(--pb-ok-strong); }
  #pbApp .xs-chip.no { background: var(--pb-warn-soft); color: var(--pb-warn-text); }""")

# 1) the module: helpers, the sheet, the ticket PDF
rep(r"""  // ---- signing: what blocks it, what goes into the snapshot, the photos after it ----""",
r"""  // ---- daily3 #49: the customer's signature on an Extra work entry ----
  const pbXsCan = (e) => !!e && e.kind === 'extra' && !e.src && !e.rn;
  // what the customer signs (and its fingerprint): the entry's content on this job and day
  const pbXsFields = (e, job, date) => ({ job: String(job || ''), work_date: String(date || ''), kind: e.kind, reason: e.reason, detail: e.detail || '', hours: pbDpNum(e.hours), crew_size: e.crew_size === null || e.crew_size === undefined || e.crew_size === '' ? null : Number(e.crew_size),
    equipment: (e.equipment || []).map(pbDpEqName), photos: (e.photos || []).map(p => p && p.sha).filter(Boolean) });
  const pbXsEntrySha = (e, job, date) => { try { return pbSha256Text(pbJsonbText(pbXsFields(e, job, date))); } catch (x) { return ''; } };
  const pbXsPrior = (e) => ({ kind: e.kind, reason: e.reason, detail: e.detail || '', hours: e.hours, crew_size: e.crew_size === undefined ? null : e.crew_size, equipment: (e.equipment || []).map(q => ({ key: q.key || null, name: q.name, unit_no: q.unit_no || null })), photos: (e.photos || []).map(p => ({ sha: p.sha, taken_exif: p.taken_exif || null })), cust_sig: e.cust_sig, replaced_at: new Date().toISOString() });
  const pbXsSigText = (S) => S ? S.name + (S.title ? ', ' + S.title : '') : '';
  function pbXsLine(e, i) {
    if (!pbXsCan(e) && !e.cust_sig) return '';
    const S = e.cust_sig, P = Array.isArray(e.prior) ? e.prior.filter(x => x && x.cust_sig) : [];
    return '<p class="xs-line" id="dpEvXs_' + i + '">' + (S ? '<span class="xs-chip">Customer signed</span>' + escapeHtml(pbXsSigText(S) + ' · ' + pbDlyTimeIn(S.at, S.tz)) : '<span class="xs-chip no">Not signed by the customer</span>')
      + (P.length ? '<br><span class="pbd-dim">' + escapeHtml('Amends the version ' + pbXsSigText(P[P.length - 1].cust_sig) + ' signed (' + pbDpH(P[P.length - 1].hours) + '). Every signed version stays on the report.') + '</span>' : '') + '</p>';
  }
  function pbXsActs(e, i) {
    const dis = pbDp.form ? ' disabled' : '';
    if (e.cust_sig) return '<div class="pbd-acts"><button type="button" class="pb-btn secondary small" id="dpEvPdf_' + i + '" onclick="pbXsPdfDraft(' + i + ')"' + dis + '>Ticket PDF</button><button type="button" class="pb-btn ghost small" id="dpEvAmend_' + i + '" onclick="pbXsAmend(' + i + ')"' + dis + '>Amend</button></div>';
    return '<div class="pbd-acts"><button type="button" class="pb-btn ghost small" id="dpEvEdit_' + i + '" onclick="pbDpFormOpen(' + i + ')"' + dis + '>Change</button><button type="button" class="pb-btn ghost small" id="dpEvDel_' + i + '" onclick="pbDpEvRemove(' + i + ')"' + dis + '>Remove</button></div>'
      + (pbXsCan(e) ? '<div class="pbd-acts"><button type="button" class="pb-btn secondary small" id="dpEvSig_' + i + '" onclick="pbXsSign(' + i + ')"' + dis + '>Customer Signs</button><button type="button" class="pb-btn ghost small" id="dpEvPdf_' + i + '" onclick="pbXsPdfDraft(' + i + ')"' + dis + '>Ticket PDF</button></div>' : '');
  }
  window.pbXsAmend = function(i) {
    const d = pbDpDraft(), e = d && d.events[i]; if (!e || pbDp.form) return;
    pbConfirm('The customer signed this entry. Amending keeps the signed version on the report and on its PDF; the changed entry needs a new signature.', () => { pbDpFormOpen(i); if (pbDp.form && pbDp.form.i === i) { pbDp.form.amend = true; pbDpRender(); } }, 'Amend a Signed Entry?', { no: 'Keep It', yes: 'Amend' });
  };
  // the sheet the customer signs on
  window.pbXsSign = function(i) {
    const d = pbDpDraft(), e0 = d && d.events[i]; if (!e0 || !pbXsCan(e0) || e0.cust_sig || pbDp.form || document.getElementById('xsSign')) return;
    const V = pbDlyView, cid = e0.cid, key = d.k;
    const eq = (e0.equipment || []).map(pbDpEqName), ph = (e0.photos || []).length;
    const wrap = document.createElement('div'); wrap.id = 'xsSign'; wrap.className = 'xs-wrap'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'xsTitle');
    wrap.innerHTML = '<div class="xs-box"><h2 id="xsTitle">Customer Signature</h2>'
      + '<div class="xs-sum" id="xsSum"><p><strong>' + escapeHtml('Extra work: ' + pbDpReasonName(e0.reason)) + '</strong></p>' + (e0.detail ? '<p>' + escapeHtml(e0.detail) + '</p>' : '')
      + '<p><span class="xs-k">Hours</span> ' + escapeHtml(String(pbDpNum(e0.hours))) + (e0.crew_size !== null && e0.crew_size !== undefined && e0.crew_size !== '' ? ' · <span class="xs-k">Crew</span> ' + escapeHtml(String(e0.crew_size)) : '') + (ph ? ' · <span class="xs-k">Photos</span> ' + ph : '') + '</p>'
      + (eq.length ? '<p><span class="xs-k">Equipment</span> ' + escapeHtml(eq.join(', ')) + '</p>' : '') + '<p><span class="xs-k">Job</span> ' + escapeHtml(V.job + (V.jobsite ? ' · ' + V.jobsite : '')) + ' · ' + escapeHtml(pbDlyDayText(V.date)) + '</p></div>'
      + '<p class="xs-stmt">By signing, you confirm this extra work was done as described above.</p>'
      + '<canvas class="xs-pad" id="xsPad" width="900" height="300" role="img" aria-label="Signature pad. Sign with your finger."></canvas>'
      + '<div class="xs-padrow"><span>Sign above with your finger.</span><button type="button" class="pb-btn ghost small" id="xsClear">Clear</button></div>'
      + '<div class="pb-field"><label for="xsName">Customer name</label><input type="text" id="xsName" maxlength="120" autocomplete="off" autocapitalize="words" enterkeyhint="next"></div>'
      + '<div class="pb-field"><label for="xsTitleIn">Title (optional)</label><input type="text" id="xsTitleIn" maxlength="120" autocomplete="off" enterkeyhint="done" placeholder="e.g. Owner’s rep, City inspector"></div>'
      + '<p class="pb-rpt-status" id="xsMsg" role="alert"></p>'
      + '<div class="pbd-acts"><button type="button" class="pb-btn" id="xsSignBtn">Sign</button><button type="button" class="pb-btn ghost" id="xsCancel">Cancel</button></div></div>';
    (document.getElementById('pbApp') || document.body).appendChild(wrap);
    const c = document.getElementById('xsPad'), g = c.getContext('2d'), msg = document.getElementById('xsMsg');
    let down = false, last = null, drawn = false, busy = false;
    const pos = (ev) => { const r = c.getBoundingClientRect(), t = ev.touches ? ev.touches[0] : ev; return { x: (t.clientX - r.left) * c.width / r.width, y: (t.clientY - r.top) * c.height / r.height }; };
    const start = (ev) => { down = true; last = pos(ev); ev.preventDefault(); };
    const move = (ev) => { if (!down) return; const p = pos(ev); g.strokeStyle = '#111'; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; drawn = true; ev.preventDefault(); };
    const end = () => { down = false; };
    c.addEventListener('pointerdown', start); c.addEventListener('pointermove', move); c.addEventListener('pointerup', end); c.addEventListener('pointerleave', end);
    c.addEventListener('touchstart', start, { passive: false }); c.addEventListener('touchmove', move, { passive: false }); c.addEventListener('touchend', end);
    const close = () => { try { wrap.remove(); } catch (x) {} document.removeEventListener('keydown', esc); };
    const esc = (ev) => { if (ev.key === 'Escape' && !busy) close(); };
    document.addEventListener('keydown', esc);
    document.getElementById('xsClear').onclick = () => { g.clearRect(0, 0, c.width, c.height); drawn = false; };
    document.getElementById('xsCancel').onclick = () => { if (!busy) close(); };
    document.getElementById('xsSignBtn').onclick = async () => {
      if (busy) return;
      const name = pbDpCut(String(document.getElementById('xsName').value || '').trim().replace(/\s+/g, ' '), 120), title = pbDpCut(String(document.getElementById('xsTitleIn').value || '').trim().replace(/\s+/g, ' '), 120);
      if (!drawn) { msg.textContent = 'The customer signs on the pad first.'; return; }
      if (name.length < 2) { msg.textContent = 'Type the customer’s name.'; try { document.getElementById('xsName').focus(); } catch (x) {} return; }
      let png = null; try { const o = document.createElement('canvas'); o.width = 600; o.height = 200; const og = o.getContext('2d'); og.fillStyle = '#fff'; og.fillRect(0, 0, 600, 200); og.drawImage(c, 0, 0, 600, 200); png = o.toDataURL('image/png').split(',')[1]; } catch (x) { png = null; }
      if (!png || png.length > 150000) { msg.textContent = 'The signature couldn’t be saved. Tap Clear and sign again.'; return; }
      busy = true; msg.textContent = '';
      const d2 = pbDpDraft(), e = d2 && d2.k === key ? d2.events.find(x => x.cid === cid) : null;
      if (!e || e.cust_sig) { busy = false; close(); return; }
      let pngSha = ''; try { pngSha = pbSha256Bytes(Uint8Array.from(atob(png), ch => ch.charCodeAt(0))); } catch (x) {}
      e.cust_sig = { v: 1, name, title: title || null, at: new Date().toISOString(), tz: pbDlyTz(), png, png_sha: pngSha, entry_sha: pbXsEntrySha(e, pbDlyView.job, pbDlyView.date) };
      const ok = await pbDpTouch(d2);
      if (!ok) { delete e.cust_sig; busy = false; msg.textContent = 'Not saved: this phone’s storage is full. Free some space and sign again.'; return; }
      close(); pbDpRender(); try { pbDxToast('Customer signature saved with the entry. It goes to the company with today’s report.'); } catch (x) {}
    };
    try { document.getElementById('xsName').blur(); c.scrollIntoView({ block: 'center' }); } catch (x) {}
  };
  // the ticket's own PDF
  function pbXsPdfInto(R, e, c) {
    const G = PB_RPT, fp = pbXsEntrySha(e, c.job, c.date), S = e.cust_sig, P = Array.isArray(e.prior) ? e.prior.filter(x => x && x.cust_sig) : [];
    R.beginRecord({ company: pbRptCompany(), type: 'Extra Work Ticket', outline: 'Extra work ticket ' + c.date + ' · Job ' + c.job, title: 'Job ' + c.job + (c.site ? ' · ' + c.site : ''), job: pbDlyDayText(c.date),
      recordId: 'entry ' + e.cid, version: (P.length ? 'amended ' + P.length + 'x' : 'v1') + (c.status ? ' · ' + c.status : ''), fp, fpShort: pbRptShort(fp), generated: pbRptDt(Date.now()), account: pbRptAccount(), build: pbRptBuild() });
    pbRptTitle(R, 'Extra Work Ticket', 'Job ' + c.job + (c.site ? ' · ' + c.site : '') + ' · ' + pbDlyDayText(c.date));
    R.banner(S ? 'SIGNED BY THE CUSTOMER: ' + String(S.name).toUpperCase() : 'NOT SIGNED BY THE CUSTOMER', S ? 'ok' : 'warn', S ? 'Signed ' + pbRptDt(Date.parse(S.at), { sec: true, tz: S.tz }) + ' (' + S.tz + ', phone clock)' : 'The customer has not signed this entry.');
    const eq = (e.equipment || []).map(pbDpEqName), ph = (e.photos || []).length;
    R.kv([['Job', c.job], ['Jobsite', c.site || '—'], ['Work date', pbDlyDayText(c.date)], ['Foreman', c.foreman || '—'], ['Work', 'Extra work: ' + pbDpReasonName(e.reason)], ['Hours', String(pbDpNum(e.hours))],
      ['Crew size', e.crew_size === null || e.crew_size === undefined || e.crew_size === '' ? '—' : String(e.crew_size)], ['Equipment', eq.join(', ') || 'none'], ['Photos', ph ? ph + ' (with the entry on the daily report)' : 'none'], ['Ticket ' + (c.n || 1), c.status || '']], { cols: 1, labelW: 40 });
    R.sub('Description'); R.para(e.detail || 'No detail entered.', { size: 10 });
    R.section('custsig', 'Customer signature', { keep: 60 });
    if (S) {
      R.kv([['Name', S.name], ['Title', S.title || '—'], ['Signed at', pbRptDt(Date.parse(S.at), { sec: true, tz: S.tz }) + ' · ' + S.tz + ' (phone clock)'], ['Drawn signature', 'below (SHA-256 ' + pbRptShort(S.png_sha) + ')'],
        ['Entry as signed', 'SHA-256 ' + pbRptShort(S.entry_sha) + (S.entry_sha === fp ? ' (matches this ticket)' : ' (DIFFERS from this ticket)')]], { cols: 1, labelW: 40 });
      if (S.png && R.final) { try { R.ensure(34); R.doc.addImage('data:image/png;base64,' + S.png, 'PNG', G.ML, R.y, 90, 30); } catch (x) {} }
      if (S.png) { R.ensure(32); R.y += 32; }
    } else R.para('Not signed.', { size: 10, style: 'bold' });
    R.para('By signing, the customer confirms this extra work was done as described above. The signature was drawn on the foreman’s phone; the name and title were typed.', { size: 9, color: G.MUTED });
    if (P.length) {
      R.section('prior', 'Earlier signed versions (' + P.length + ')', { keep: 26 });
      R.table({ head: ['Signed by', 'When', 'Hours', 'Description'], columns: [{ cellWidth: 44 }, { cellWidth: 40 }, { cellWidth: 16, halign: 'right' }, {}], fontSize: 8.6,
        body: P.map(x => [pbXsSigText(x.cust_sig), pbRptDt(Date.parse(x.cust_sig.at), { tz: x.cust_sig.tz }) + (x.replaced_at ? '\nAmended ' + pbRptDt(Date.parse(x.replaced_at)) : ''), String(pbDpNum(x.hours)), pbDpReasonName(x.reason) + (x.detail ? '\n' + x.detail : '')]) });
      R.para('An amended entry keeps every version the customer signed. The entry at the top is the current one.', { size: 9, color: G.MUTED });
    }
    pbRptIntegrity(R, { kind: 'xticket' }, fp, S ? [['Customer signed (entry SHA-256)', S.entry_sha]] : [], 'How the fingerprint is made: SHA-256 of the entry’s content (job, work date, kind, reason, detail, hours, crew size, equipment names and the SHA-256 of each photo), written in PostgreSQL’s jsonb text form. The customer’s signature keeps the same value for the entry as it was signed, so a later change shows.');
  }
  async function pbXsMakePdf(e, c) {
    try { await pbRptPrepLogo(); } catch (x) {}
    let doc; try { await pbRptBusy('Making the PDF…'); doc = pbRptMake((R) => pbXsPdfInto(R, e, c), { meta: { title: pbPdfSafe('Extra work ticket ' + c.date + ' Job ' + c.job), creator: pbRptBuild() } }); } finally { pbRptBusy(null); }
    if (c.wantDoc) return doc;
    doc.save('extra-work-ticket-' + String(c.job).replace(/[^a-z0-9-]/gi, '_') + '-' + c.date + '-' + (c.n || 1) + '.pdf');
  }
  function pbXsCtxDraft(i, wantDoc) { const V = pbDlyView; let fm = ''; try { fm = pbDpMeName(pbArchiveOwnerUid); } catch (x) {} return { job: V.job, site: V.jobsite || '', date: V.date, foreman: fm, n: i + 1, status: V.amend ? 'on an amendment of the daily report, not signed yet' : 'not on a signed daily report yet', wantDoc: !!wantDoc }; }
  window.pbXsPdfDraft = function(i, wantDoc) { const d = pbDpDraft(), e = d && d.events[i]; if (!e) return null; return pbXsMakePdf(e, pbXsCtxDraft(i, wantDoc)); };
  window.pbXsPdfSigned = function(cid, k, wantDoc) {
    const r = pbDly.st && pbDly.st.reports.find(x => x.cid === cid), S = r && r.snapshot, e = S && Array.isArray(S.events) ? S.events[k] : null; if (!e) return null;
    return pbXsMakePdf(e, { job: S.job.number, site: S.job.site || '', date: S.work_date, foreman: (S.signed && S.signed.name) || '', n: k + 1, status: 'on the daily report signed ' + (S.signed && S.signed.at ? pbRptDt(Date.parse(S.signed.at), { tz: S.signed.tz }) : ''), wantDoc: !!wantDoc });
  };
  // the daily report's PDF: who signed each entry, the signatures, earlier signed versions
  function pbXsPdfCell(e) { if (!pbXsCan(e) && !e.cust_sig) return ''; const P = Array.isArray(e.prior) ? e.prior.filter(x => x && x.cust_sig) : []; return '\nCustomer: ' + (e.cust_sig ? 'signed by ' + pbXsSigText(e.cust_sig) : 'not signed') + (P.length ? '\nAmended after a customer signature (' + P.length + ' signed version' + (P.length === 1 ? '' : 's') + ' kept)' : ''); }
  function pbXsPdfDaily(R, S, E) {
    const G = PB_RPT, L = E.map((e, i) => [e, i]).filter(([e]) => e && (e.cust_sig || (Array.isArray(e.prior) && e.prior.some(x => x && x.cust_sig))));
    if (!L.length) return;
    R.sub('Customer signatures (' + L.filter(([e]) => e.cust_sig).length + ')', { keep: 40 });
    L.forEach(([e, i]) => {
      const Sg = e.cust_sig, fp = pbXsEntrySha(e, S.job.number, S.work_date);
      R.kv([['Entry ' + (i + 1), 'Extra work: ' + pbDpReasonName(e.reason) + ', ' + pbDpH(e.hours)], ['Signed by', Sg ? pbXsSigText(Sg) : 'not signed (amended after a signature; it needs a new one)'],
        ...(Sg ? [['Signed at', pbRptDt(Date.parse(Sg.at), { sec: true, tz: Sg.tz }) + ' · ' + Sg.tz + ' (phone clock)'], ['Entry as signed', 'SHA-256 ' + pbRptShort(Sg.entry_sha) + (Sg.entry_sha === fp ? ' (matches the entry above)' : ' (DIFFERS from the entry above)')]] : []),
        ...(Array.isArray(e.prior) ? e.prior.filter(x => x && x.cust_sig).map((x, k) => ['Earlier version ' + (k + 1), 'signed by ' + pbXsSigText(x.cust_sig) + ' ' + pbRptDt(Date.parse(x.cust_sig.at), { tz: x.cust_sig.tz }) + ': ' + pbDpH(x.hours) + (x.detail ? ', ' + x.detail : '')]) : [])], { cols: 1, labelW: 40 });
      if (Sg && Sg.png && R.final) { try { R.ensure(28); R.doc.addImage('data:image/png;base64,' + Sg.png, 'PNG', G.ML, R.y, 66, 22); } catch (x) {} }
      if (Sg && Sg.png) { R.ensure(24); R.y += 24; }
    });
  }
  window.__pbXs = { fields: pbXsFields, sha: pbXsEntrySha }; // tests
  // ---- signing: what blocks it, what goes into the snapshot, the photos after it ----""")

# 2) the entry row on the screen: the signature line, and the buttons
rep(r"""          + (e.detail ? '<p class="dp-evd">' + escapeHtml(e.detail) + '</p>' : '') + (pbDpEvLine(e) ? '<p class="pbd-dim">' + escapeHtml(pbDpEvLine(e)) + '</p>' : '')
          + '<div class="pbd-acts"><button type="button" class="pb-btn ghost small" id="dpEvEdit_' + i + '" onclick="pbDpFormOpen(' + i + ')"' + (pbDp.form ? ' disabled' : '') + '>Change</button><button type="button" class="pb-btn ghost small" id="dpEvDel_' + i + '" onclick="pbDpEvRemove(' + i + ')"' + (pbDp.form ? ' disabled' : '') + '>Remove</button></div></li>').join('') + '</ul>' : '')""",
r"""          + (e.detail ? '<p class="dp-evd">' + escapeHtml(e.detail) + '</p>' : '') + (pbDpEvLine(e) ? '<p class="pbd-dim">' + escapeHtml(pbDpEvLine(e)) + '</p>' : '')
          + pbXsLine(e, i) + pbXsActs(e, i) /* daily3 #49 */ + '</li>').join('') + '</ul>' : '')""")

# 3) the form: Amend
rep(r"""<p class="dp-formh" id="dpFormH">' + (isNew ? 'New entry' : 'Change this entry') + '</p>'""",
r"""<p class="dp-formh" id="dpFormH">' + (isNew ? 'New entry' : F.amend ? 'Amend this entry' : 'Change this entry') + '</p>' + (F.amend ? '<p class="pbd-dim" id="dpFormAmendNote">The customer’s signed version stays on the report and its PDF. The changed entry needs a new signature.</p>' : '') /* daily3 #49 */""")
rep(r"""    if (F.i >= 0 && d.events[F.i] && d.events[F.i].cid === F.cid) d.events[F.i] = e; else d.events.push(e);
    pbDp.form = null;""",
r"""    { const old = F.i >= 0 && d.events[F.i] && d.events[F.i].cid === F.cid ? d.events[F.i] : null; /* daily3 #49: a signed entry is amended, never overwritten */
      if (old && old.cust_sig && !F.amend) { say('The customer signed this entry. Tap Amend to change it.'); return; }
      if (old && old.cust_sig && pbXsEntrySha(old, pbDlyView.job, pbDlyView.date) === pbXsEntrySha(e, pbDlyView.job, pbDlyView.date)) { say('Nothing changed. The signed entry stays as it is; tap Cancel.'); return; }
      if (old && old.cust_sig) e.prior = (Array.isArray(old.prior) ? old.prior : []).concat([pbXsPrior(old)]).slice(-5); else if (old && Array.isArray(old.prior) && old.prior.length) e.prior = old.prior; }
    if (F.i >= 0 && d.events[F.i] && d.events[F.i].cid === F.cid) d.events[F.i] = e; else d.events.push(e);
    pbDp.form = null;""")
# 4) Remove: not for a signed entry
rep(r"""    const e = d.events[i];
    pbConfirm('Remove this entry (' + pbDpKindName(e.kind)""",
r"""    const e = d.events[i];
    if (e.cust_sig || (Array.isArray(e.prior) && e.prior.length)) { pbAlert('The customer signed this entry, so it stays on the report. Tap Amend to change it.', 'Signed Entry'); return; } /* daily3 #49 */
    pbConfirm('Remove this entry (' + pbDpKindName(e.kind)""")
# 5) removing a machine from the day leaves a signed entry as signed
rep(r"""d.events.forEach(e => { e.equipment = (e.equipment || []).filter(x => pbDpEqKey(x) !== k); });""",
r"""d.events.forEach(e => { if (e.cust_sig) return; /* daily3 #49 */ e.equipment = (e.equipment || []).filter(x => pbDpEqKey(x) !== k); });""")
# 6) the snapshot carries the signature and the earlier signed versions; an amendment starts from them
rep(r"""      equipment: (e.equipment || []).map(q => ({ key: q.key || null, name: q.name, unit_no: q.unit_no || null })), photos: (e.photos || []).map(p => ({ sha: p.sha, taken_exif: p.taken_exif || null })) }));""",
r"""      equipment: (e.equipment || []).map(q => ({ key: q.key || null, name: q.name, unit_no: q.unit_no || null })), photos: (e.photos || []).map(p => ({ sha: p.sha, taken_exif: p.taken_exif || null })),
      ...(e.cust_sig ? { cust_sig: e.cust_sig } : {}), ...(Array.isArray(e.prior) && e.prior.length ? { prior: e.prior } : {}) /* daily3 #49 */ }));""")
rep(r"""      equipment: Array.isArray(e.equipment) ? e.equipment.map(q => ({ key: q.key || null, name: q.name, unit_no: q.unit_no || null })) : [], photos: Array.isArray(e.photos) ? e.photos.filter(p => p && p.sha).map(p => ({ sha: p.sha, taken_exif: p.taken_exif || null })) : [] })) : [];""",
r"""      equipment: Array.isArray(e.equipment) ? e.equipment.map(q => ({ key: q.key || null, name: q.name, unit_no: q.unit_no || null })) : [], photos: Array.isArray(e.photos) ? e.photos.filter(p => p && p.sha).map(p => ({ sha: p.sha, taken_exif: p.taken_exif || null })) : [],
      ...(e.cust_sig && typeof e.cust_sig === 'object' ? { cust_sig: e.cust_sig } : {}), ...(Array.isArray(e.prior) && e.prior.length ? { prior: e.prior } : {}) /* daily3 #49 */ })) : [];""")
# 7) signing the daily: the signatures must fit the report
rep(r"""    if (!pbDpDraft()) return 'The crew and equipment are still loading. Try again in a moment.';""",
r"""    if (!pbDpDraft()) return 'The crew and equipment are still loading. Try again in a moment.';
    { const n = pbDpDraft().events.reduce((t, e) => t + (e && e.cust_sig && e.cust_sig.png ? e.cust_sig.png.length : 0) + (e && Array.isArray(e.prior) ? e.prior.reduce((u, x) => u + (x && x.cust_sig && x.cust_sig.png ? x.cust_sig.png.length : 0), 0) : 0), 0); if (n > 240000) { pbDxTog('dpEvents', true); return 'Too many customer signatures for one report (the report has a size limit). Ask the office.'; } } /* daily3 #49 */""")
# 8) the daily's PDF
rep(r"""        body: E.map(e => [pbDpKindName(e.kind) + ': ' + pbDpReasonName(e.reason) + (e.detail ? '\n' + e.detail : ''), String(pbDpNum(e.hours)),""",
r"""        body: E.map(e => [pbDpKindName(e.kind) + ': ' + pbDpReasonName(e.reason) + (e.detail ? '\n' + e.detail : '') + pbXsPdfCell(e) /* daily3 #49 */, String(pbDpNum(e.hours)),""")
rep(r"""      R.para('Total ' + pbDpH(E.reduce((s, e) => s + pbDpNum(e.hours), 0)) + (by.length > 1 ? ' (' + by.join(' · ') + ')' : ''), { size: 9.5, style: 'bold' });""",
r"""      R.para('Total ' + pbDpH(E.reduce((s, e) => s + pbDpNum(e.hours), 0)) + (by.length > 1 ? ' (' + by.join(' · ') + ')' : ''), { size: 9.5, style: 'bold' });
      try { pbXsPdfDaily(R, S, E); } catch (x) { console.error(x); } /* daily3 #49 */""")
# 9) the signed daily's card: the signed tickets, each with its PDF
rep(r"""    const P = pbDp.send ? pbDp.send.list.filter(x => x.rcid === r.cid) : [];
    if (P.length) {""",
r"""    { const XS = E.map((e, k) => [e, k]).filter(([e]) => e && e.cust_sig); /* daily3 #49 */
      if (XS.length) h += '<p class="dx-sub">Customer-signed extra work (' + XS.length + ')</p><ul class="pbd-list" id="dpSignedXs">' + XS.map(([e, k]) => '<li>' + escapeHtml(pbDpReasonName(e.reason) + ', ' + pbDpH(e.hours) + ' · signed by ' + pbXsSigText(e.cust_sig)) + ' <button type="button" class="pb-btn ghost small" id="dpXsPdf_' + k + '" onclick="pbXsPdfSigned(' + pbDpJs(r.cid) + ',' + k + ')">Ticket PDF</button></li>').join('') + '</ul>'; }
    const P = pbDp.send ? pbDp.send.list.filter(x => x.rcid === r.cid) : [];
    if (P.length) {""")
# 10) the office's list: who signed
rep(r"""      + '<span class="pbx-row-flags">' + pbDpoStatusTag(e) + '</span>'""",
r"""      + '<span class="pbx-row-flags">' + pbDpoStatusTag(e) + (e.customer_signed ? '<span class="pbx-tag">' + pbCxCheck() + pbCxE('Customer signed · ' + e.customer_signed.name) + '</span>' : e.kind === 'extra' && 'customer_signed' in e ? '<span class="pbx-tag">' + pbCxE('No customer signature') + '</span>' : '') /* daily3 #49 */ + '</span>'""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', dst)
