import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.84: Export for Records also on daily reports and confined space permits (from the PDF viewer's bar)
rep("""      <button type="button" class="pb-btn ghost small" id="pdfvTextBtn" onclick="pbPdfViewText()">Text version</button>
    </div>""", """      <button type="button" class="pb-btn ghost small" id="pdfvTextBtn" onclick="pbPdfViewText()">Text version</button>
      <button type="button" class="pb-btn ghost small" id="pdfvExport" onclick="pbPdfViewExport()" style="display:none;">Export for Records</button>
    </div>""")
rep("""  function pbPvBtns(S) { const sh = pbPvEl('pdfvShare'); if (sh) { sh.disabled = !S.doc; sh.title = S.doc ? '' : 'Making the PDF…'; } }""",
"""  function pbPvBtns(S) { const sh = pbPvEl('pdfvShare'); if (sh) { sh.disabled = !S.doc; sh.title = S.doc ? '' : 'Making the PDF…'; } const ex = pbPvEl('pdfvExport'); if (ex) { ex.style.display = typeof S.exp === 'function' ? '' : 'none'; ex.disabled = !S.doc; } /* r16.84 */ }
  // r16.84: Export for Records from the viewer (daily reports, permits): the opener's exp(doc) gathers the files
  window.pbPdfViewExport = async function() {
    const S = pbPvS; if (!S || typeof S.exp !== 'function') return;
    if (!sbClient || navigator.onLine === false) { pbAlert('Export for Records needs signal (it gathers every saved version from the company account).', 'No Signal'); return; }
    if (!(window.crypto && crypto.subtle) || typeof window.pbRecExportSave !== 'function') { pbAlert('This phone can’t build the export. Try another browser.', 'Not Available'); return; }
    let doc = null; try { doc = await pbPvDoc(S); } catch (e) {}
    if (!doc) { pbAlert('The report PDF couldn’t be made, so nothing was exported. Try again.', 'Not Exported'); return; }
    try { pbRptBusy('Export: gathering the records…'); await S.exp(doc); }
    catch (e) { console.error('Export for Records:', e); pbAlert('The export couldn’t be made. Try again with signal.', 'Not Exported'); }
    finally { pbRptBusy(null); }
  };""")
rep("key: o.key, eyebrow: o.eyebrow || 'RECORDS', title: o.title || 'Report', sub: o.sub || '', entry: o.entry, make: o.make, name: o.name || 'report.pdf', backId: o.backId,",
    "key: o.key, eyebrow: o.eyebrow || 'RECORDS', title: o.title || 'Report', sub: o.sub || '', entry: o.entry, make: o.make, name: o.name || 'report.pdf', backId: o.backId, exp: o.exp /* r16.84 */,")

# the shared builder: manifest + draft custodian certificate + ZIP, next to pbZip
rep("""  const PB_EXHIBIT = [""", """  // r16.84: one export (daily report, permit): o = { file, files: [{name,data}], job, jobsite, title, first, last, consist, lines: [manifest lines], p9, p10 }
  window.pbRecExportSave = async function(o) {
    const enc = new TextEncoder(), files = o.files.map(f => ({ name: f.name, data: f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data) }));
    const sums = []; for (const f of files) sums.push((await pbHex(f.data)) + '  ' + String(f.data.length).padStart(10) + '  ' + f.name);
    const when = new Date(), day = (v) => { const d = new Date(v); return isFinite(d.getTime()) ? d.toLocaleDateString() : 'not recorded'; };
    const manifest = ['MANIFEST: The Pipelayer’s Bible export', 'Company: ' + (pbRptCompany() || ''), 'Job: ' + (o.job || 'not recorded') + (o.jobsite ? ' (' + o.jobsite + ')' : ''), o.title, 'Exported: ' + when.toISOString() + ' (device time) by ' + (pbRptAccount() || 'this account') + ', app build ' + String(window.PB_APP_BUILD || ''),
      ...(o.lines || []), '', 'SHA-256 (hex)                                                      bytes      file', ...sums, '', 'To check a file: compute its SHA-256 (for example: shasum -a 256 <file>, or certutil -hashfile <file> SHA256) and compare it with the line above.'].join('\\n');
    const mbytes = enc.encode(manifest), mhash = await pbHex(mbytes);
    files.push({ name: 'MANIFEST.txt', data: mbytes });
    const cert = ['CERTIFICATION OF CUSTODIAN OF RECORDS', '(Fed. R. Evid. 803(6), 902(11), 902(13), 902(14); Cal. Evid. Code §§ 1271, 1552–1553, 1560–1562)', 'DRAFT prepared by the app. Have your attorney adapt it before anyone signs it; sign only what you personally know to be true.', '',
      'I, ______________________, declare:', '',
      '1. I am the ______________________ of ' + (pbRptCompany() || '______________________') + ' (the "Company"). I am a custodian of the Company’s field records or am otherwise qualified to describe how they are made and kept. I have personal knowledge of the facts below, except where stated on information and belief.',
      '2. The Company uses a software service called The Pipelayer’s Bible (the "Service") in the ordinary course of its business to record pipe runs, daily reports, site-log entries, confined space permits, photographs and related field records. It has done so on this project since about ______________.',
      '3. The records listed in the attached manifest (the "Records") were made by Company personnel who had knowledge of the matters recorded, or from information transmitted by them, at or near the time of the events recorded. Making these records is a regular practice of the Company’s field work. The Records were kept in the course of that regularly conducted activity.',
      '4. The Records concern job ' + (o.job || '__________') + (o.jobsite ? ' (' + o.jobsite + ')' : '') + ', for work dates ' + day(o.first) + ' to ' + day(o.last) + ', and consist of ' + o.consist + '.',
      '5. On ' + when.toLocaleDateString() + ' I exported the Records from the Service using its Export for Records function, signed in as ______________________. The export produced a file named ______________________ of ________ bytes. I have not altered it.',
      '6. The export includes a manifest (MANIFEST.txt) listing each file with a SHA-256 hash value. The SHA-256 hash value of the manifest file itself is: ' + mhash + '. [If verified:] On __________ I recomputed the hash values of the files in the export using __________ and they matched the manifest.',
      '7. Attached as Exhibit 1 is a description, supplied by the operator of the Service, of how the Service records times, versions, photographs and hash values. On information and belief it accurately describes the Service as it operated during the dates above.',
      '8. Times shown in the Records as the time of an event are the times kept by the phone or tablet used to make the entry. Times shown as "received" by the server are the times kept by the Service’s servers when each entry or version reached them.',
      '9. ' + (o.p9 || 'Where a Record was changed after it was first made, the Service keeps each earlier version with the server time at which it was received; the earlier versions are included in this export.'),
      ...(o.p10 ? ['10. ' + o.p10] : []),
      '', 'I declare under penalty of perjury under the laws of the United States of America and the State of California that the foregoing is true and correct.', '', 'Executed on ______________ at ______________, ______________.', '', '______________________________          ______________________________', 'Signature                                Printed name', '', '', PB_EXHIBIT].join('\\n');
    files.push({ name: 'CUSTODIAN-CERTIFICATE-draft.txt', data: enc.encode(cert) });
    const zip = pbZip(files), name = String(o.file || 'records').replace(/[^A-Za-z0-9_.-]+/g, '-') + '.zip';
    const u = URL.createObjectURL(zip), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
    pbAlert('Saved ' + name + ': ' + o.consist + ', the record data, a manifest of fingerprints and a draft custodian certificate.\\n\\nManifest fingerprint: ' + mhash.slice(0, 16) + '…', 'Export Ready');
    return { name, mhash };
  };
  window.pbB64Bytes = (b64) => { const bin = atob(String(b64 || '').replace(/^data:[^,]*,/, '')), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  const PB_EXHIBIT = [""")

# daily report photos helper reachable from the office daily opener
rep("""  async function pbDaEvPhotos(rep, fromServer) {""", """  window.pbDaEvPhotosX = (rep, fromServer) => pbDaEvPhotos(rep, fromServer); // r16.84: Export for Records
  async function pbDaEvPhotos(rep, fromServer) {""")

# daily report export
rep("""  async function pbRpfOpenDaily(id) {""", """  // r16.84: Export for Records for a daily report: the PDF, the stored data of this version and every earlier one, the signature, the photos
  async function pbRpfDailyExp(id, doc) {
    const uid = pbRpfUid(), enc = new TextEncoder(), files = [];
    const r = await pbPermitRpc('pb_daily_get', { p_report_id: id, p_expect_uid: uid }, 30000);
    if (!r.data || !r.data.ok) throw new Error('daily report not found');
    const d = r.data, job = d.job_number || '', day = d.work_date || '';
    files.push({ name: 'daily-report.pdf', data: new Uint8Array(doc.output('arraybuffer')) });
    if (d.signature_png_b64) { try { files.push({ name: 'signature.png', data: window.pbB64Bytes(d.signature_png_b64) }); } catch (e) {} }
    let nph = 0; try { const ph = await window.pbDaEvPhotosX({ serverId: d.id, snapshot: d.snapshot }, true); for (const sha of Object.keys(ph || {})) { if (!ph[sha]) continue; files.push({ name: 'photos/' + String(sha).replace(/[^A-Za-z0-9]/g, '') + '.jpg', data: window.pbB64Bytes(ph[sha]) }); nph++; } } catch (e) { console.error('Export photos:', e); }
    const strip = (x) => Object.assign({}, x, { signature_png_b64: x.signature_png_b64 ? '(in signature.png)' : null });
    files.push({ name: 'record.json', data: enc.encode(JSON.stringify(strip(d), null, 1)) });
    const earlier = []; let sup = d.supersedes;
    for (let i = 0; sup && i < 30; i++) { const g = await pbPermitRpc('pb_daily_get', { p_report_id: sup, p_expect_uid: uid }, 30000); if (!g.data || !g.data.ok) break; earlier.push(g.data); files.push({ name: 'earlier/daily-report-v' + g.data.version + '.json', data: enc.encode(JSON.stringify(g.data, null, 1)) }); sup = g.data.supersedes; }
    const ahead = Number(d.phone_clock_ahead_s), clk = isFinite(ahead) && d.phone_clock_ahead_s !== null ? (Math.abs(ahead) < 60 ? 'within a minute of the server' : Math.round(Math.abs(ahead) / 60) + ' min ' + (ahead > 0 ? 'ahead of' : 'behind') + ' the server') : 'not recorded';
    const vline = (x) => 'v' + x.version + ': received ' + x.received_at + ' (server time); report-data SHA-256 from the phone ' + (x.snapshot_sha256 || 'none') + '; server\\u2019s own SHA-256 ' + (x.server_sha256 || 'none') + (x.server_sha256 && x.server_sha256 === x.snapshot_sha256 ? ' (matches)' : ' (DOES NOT MATCH)') + (x.amend_reason ? '; reason for change: ' + x.amend_reason : '');
    await window.pbRecExportSave({ file: 'records-daily-' + (job || 'job') + '-' + day, files, job, jobsite: d.jobsite, title: 'Daily report for ' + day + ', version ' + d.version + ', signed by ' + (d.signed_name || 'not recorded') + (d.signed_at ? ' at ' + d.signed_at + ' (device time, ' + (d.signed_tz || 'zone not recorded') + ')' : ''),
      first: day ? day + 'T12:00:00' : null, last: day ? day + 'T12:00:00' : null,
      consist: '1 daily report (version ' + d.version + ')' + (earlier.length ? ', ' + earlier.length + ' earlier version' + (earlier.length === 1 ? '' : 's') : '') + ', ' + nph + ' photograph' + (nph === 1 ? '' : 's') + (d.signature_png_b64 ? ' and the signature image' : ''),
      lines: ['Versions: ' + [d].concat(earlier).map(vline).join(' | '), 'Phone clock when this version was sent: ' + clk + '.'],
      p9: earlier.length ? 'This daily report was changed after it was first sent. The Service keeps each earlier version with the server time at which it was received, and the reason given for each change; the earlier versions are included in this export.' : 'The Service shows no earlier version of this daily report.',
      p10: 'The daily report was signed in the Service by the person named in the manifest, by drawing a signature on the device; the signature image is included as signature.png.' });
  }
  async function pbRpfOpenDaily(id) {""")
rep("""      make: () => pbRpfDailyDoc(id, E), name: 'daily-report'""", """      make: () => pbRpfDailyDoc(id, E), exp: (doc) => pbRpfDailyExp(id, doc), name: 'daily-report'""")

# permit export (company / crew permit lists and Reports)
rep("""  function pbCprPdfName(entry) {""", """  // r16.84: Export for Records for a confined space permit: the PDF and every stored version with the server's time and fingerprint
  window.pbCprExp = async function(rowId, doc, entry) {
    const enc = new TextEncoder(), files = [];
    const r = await pbPermitRpc('pb_reports_permit_versions', { p_id: rowId, p_expect_uid: (sbUser && sbUser.id) || null }, 45000);
    if (!r.data || !r.data.ok) throw new Error('permit not found');
    const d = r.data, V = Array.isArray(d.versions) ? d.versions : [];
    files.push({ name: 'permit.pdf', data: new Uint8Array(doc.output('arraybuffer')) });
    V.forEach(v => files.push({ name: 'versions/permit-v' + v.version + '.json', data: enc.encode(JSON.stringify(v.record, null, 1)) }));
    files.push({ name: 'record.json', data: enc.encode(JSON.stringify({ row_id: d.row_id, space: d.space, jobsite: d.jobsite, job_number: d.job_number, closed_at: d.closed_at, first_backed_up_at: d.first_backed_up_at, versions: V.map(v => ({ version: v.version, received_at: v.received_at, record_sha256: v.record_sha256, file: 'versions/permit-v' + v.version + '.json' })) }, null, 1)) });
    const e = entry || {}, first = e.permit && e.permit.issuedAt || e.startTime || d.first_backed_up_at || d.closed_at, last = d.closed_at || e.lockTime;
    await window.pbRecExportSave({ file: 'records-permit-' + String(d.space || 'space').slice(0, 30) + '-' + String(d.closed_at || '').slice(0, 10), files, job: d.job_number, jobsite: d.jobsite, title: 'Confined space permit: ' + (d.space || 'space not recorded') + (d.closed_at ? ', closed ' + d.closed_at + ' (server copy)' : ''),
      first, last, consist: '1 confined space permit report and ' + V.length + ' stored version' + (V.length === 1 ? '' : 's') + ' of its record',
      lines: ['Versions: ' + V.map(v => 'v' + v.version + ': received ' + v.received_at + ' (server time); SHA-256 the server computed of the stored record when it arrived ' + (v.record_sha256 || 'none')).join(' | '),
        'versions/*.json is each version as stored. Photos taken on the permit stay on the phone that took them and are not in this export.'],
      p9: V.length > 1 ? 'This permit record reached the server more than once (for example during entry and at close-out). The Service keeps each version with the server time at which it was received; all of them are included in this export.' : 'The Service shows one stored version of this permit record.' });
  };
  function pbCprPdfName(entry) {""")
rep("""        sub: 'Closed ' + (isNaN(d) ? '' : d.toLocaleString()), entry: e, make: async () => pbCprPdfDoc(x).doc, name: pbCprPdfName(e) });
      return;""", """        sub: 'Closed ' + (isNaN(d) ? '' : d.toLocaleString()), entry: e, make: async () => pbCprPdfDoc(x).doc, exp: x.row_id ? (doc) => window.pbCprExp(x.row_id, doc, e) : null, name: pbCprPdfName(e) });
      return;""")
rep("""      sub: 'Closed ' + (isNaN(d) ? '' : d.toLocaleString()), entry: e, make: async () => pbCprPdfDoc(p).doc, name: pbCprPdfName(e) });""",
    """      sub: 'Closed ' + (isNaN(d) ? '' : d.toLocaleString()), entry: e, make: async () => pbCprPdfDoc(p).doc, exp: p.row_id ? (doc) => window.pbCprExp(p.row_id, doc, e) : null, name: pbCprPdfName(e) });""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
