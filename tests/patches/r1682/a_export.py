import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
rep('onclick="pbRrSeals()">Sealed Originals</button></div>\'',
    'onclick="pbRrSeals()">Sealed Originals</button><button type="button" class="pb-btn ghost small" id="cxRunExport" onclick="pbRrExport()">Export for Records</button></div>\'')
JS = r'''
  // r16.82 (legal review, evidence I7/I10): Export for Records. One ZIP for a dispute or a records request: the run report
  // PDF, every sealed original, the photos, the record data, a manifest with the SHA-256 of every file, and a custodian
  // certificate pre-filled with this run's facts (with the description of how the app keeps records). Nothing is sent.
  const pbZipCrc = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return (u) => { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = t[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }; })();
  function pbZip(files) { // [{ name, data: Uint8Array }] -> Blob (stored, UTF-8 names)
    const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
    const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    files.forEach(f => {
      const nm = enc.encode(f.name), crc = pbZipCrc(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, tm, true); h.setUint16(12, dt, true);
      h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nm, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, tm, true); c.setUint16(14, dt, true);
      c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
      cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + f.data.length;
    });
    const csz = cen.reduce((a, x) => a + x.length, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csz, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
  }
  const pbHex = async (u) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', u))).map(b => b.toString(16).padStart(2, '0')).join('');
  const PB_EXHIBIT = [
    'EXHIBIT 1: HOW THE PIPELAYER’S BIBLE MAKES AND KEEPS RECORDS (as of app build ' + String(window.PB_APP_BUILD || '') + ')',
    '',
    '1. Entry. Records are entered on a phone or tablet by a signed-in user. The app works without a network connection; entries are stored on the device and sent to the server when a connection is available.',
    '2. Event times. The time of an entry is taken from the device’s clock, with its time zone. The server separately records the time at which it received each record and each later version, and, for runs, the difference between the device’s clock and the server’s clock at the time of receipt.',
    '3. Versions. Each time a changed run, site-log entry, production entry, ticket, daily report or permit reaches the server, the server stores it as a new version and keeps the earlier versions. Users cannot change or delete stored versions through the app.',
    '4. Photographs. Photographs taken in the app are reduced in size and saved as JPEG files; the camera’s original file and its embedded metadata are not kept. Photographs taken within about three minutes of being added carry a band with the device’s date and time, reported position and accuracy, compass direction and an approximate street address. Photographs chosen from the device’s library are not stamped. A SHA-256 hash value of each photograph is computed on the device and used as its file name; the server re-reads each run photograph after it is uploaded and records the SHA-256 it computes itself. The user who uploaded a run photograph cannot replace or delete it through the app.',
    '5. Sealed PDF. After a finished run has reached the company’s account, the user’s device produces a PDF of the run, computes its SHA-256 hash value and uploads both. The server records the hash value and the time, re-reads the file and computes its own SHA-256, and obtains time-stamp tokens for that hash value from independent time-stamp authorities (RFC 3161). Users cannot replace or delete a sealed PDF through the app. If the run is later changed, a further sealed PDF is made and the earlier ones are kept.',
    '6. Automated reading. A feature of the app can read values from a photograph of a survey stake and enter them in the form. For runs locked with app build r16.77 or later, the record keeps the values as read, the values as locked, and the time the person locking the run confirmed they checked them.',
    '7. Administration. The operator of the app has administrative access to the database and file storage, as the operator of any hosted service does.',
    '8. Limits. The app records what users entered and when the server received it. It does not measure the work and does not verify that entries are correct.'
  ].join('\n');
  window.pbRrExport = async function() {
    const O = pbRoFor(pbArchiveOwnerUid), x = O.open; let e = O.rec;
    if (!x || !e) return;
    if (!sbClient || navigator.onLine === false) { pbAlert('Export for Records needs signal (it gathers the photos and sealed copies from the company account).', 'No Signal'); return; }
    if (!pdfLibReady() || !(window.crypto && crypto.subtle)) { pbAlert('This phone can’t build the export. Try another browser.', 'Not Available'); return; }
    const files = [], enc = new TextEncoder(), job = String(e.jobNumber || x.job_number || 'job').replace(/[^A-Za-z0-9_-]+/g, '-');
    const add = (name, data) => files.push({ name, data: data instanceof Uint8Array ? data : new Uint8Array(data) });
    try {
      pbRptBusy('Export: getting the photos…');
      let full = e; try { if (e.pbOffice && Array.isArray(e.pbOffice.photos) && e.pbOffice.photos.length) full = await window.pbRrPhotosIn(e); } catch (y) {}
      const plist = (e.pbOffice && Array.isArray(e.pbOffice.photos)) ? e.pbOffice.photos : [];
      for (const ph of plist) { try { const { data } = await sbClient.storage.from('run-photos').download(ph.path); if (data) add('photos/' + ph.sha + '.jpg', await data.arrayBuffer()); } catch (y) {} }
      pbRptBusy('Export: making the report PDF…');
      const doc = await pbRrPdfDoc(e, async () => {}); add('run-report.pdf', doc.output('arraybuffer'));
      pbRptBusy('Export: getting the sealed originals…');
      let seals = []; try { const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: x.id }, 20000); seals = (r.data && r.data.seals) || []; } catch (y) {}
      for (const sl of seals) { try { const { data } = await sbClient.storage.from('run-seals').download(sl.path); if (data) add('sealed/sealed-v' + sl.version + '.pdf', await data.arrayBuffer()); } catch (y) {}
        try { ((sl.server_check && sl.server_check.tokens) || []).forEach(t => { if (!t || !t.token) return; const bin = atob(String(t.token)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); add('sealed/sealed-v' + sl.version + '.' + String(t.name || 'tsa').replace(/[^A-Za-z0-9]/g, '') + '.tsr', u); }); } catch (y) {} }
      const tsrNote = seals.some(sl => sl.server_check && sl.server_check.tokens && sl.server_check.tokens.length) ? 'Time-stamp tokens (.tsr, RFC 3161) are in sealed/. To check one: openssl ts -reply -in <file>.tsr -text shows the time and the SHA-256 it stamped; it should equal that PDF\u2019s SHA-256. Full verification against the authority\u2019s certificate: openssl ts -verify -in <file>.tsr -data <pdf> -CAfile <authority CA file>.' : '';
      add('record.json', enc.encode(JSON.stringify({ run: x, record: e, sealed: seals }, null, 1)));
      const sums = []; for (const f of files) sums.push((await pbHex(f.data)) + '  ' + String(f.data.length).padStart(10) + '  ' + f.name);
      const when = new Date(), first = e.runStartTime || e.lockTime, last = e.runEndTime || e.lockTime;
      const day = (v) => { const d = new Date(v); return isFinite(d.getTime()) ? d.toLocaleDateString() : 'not recorded'; };
      const manifest = ['MANIFEST: The Pipelayer’s Bible export', 'Company: ' + (pbRptCompany() || ''), 'Job: ' + (e.jobNumber || x.job_number || 'not recorded') + (e.jobsite ? ' (' + e.jobsite + ')' : ''), 'Run: ' + (e.startLabel || 'Start') + ' to ' + (e.endLabel || 'End') + ', record id ' + e.id, 'Exported: ' + when.toISOString() + ' (device time) by ' + (pbRptAccount() || 'this account') + ', app build ' + String(window.PB_APP_BUILD || ''),
        'Sealed originals: ' + seals.length + (seals.length ? ' (' + seals.map(sl => 'v' + sl.version + ': recorded SHA-256 ' + sl.sha256 + (sl.server_check ? (sl.server_check.matches ? ', server re-check matches' : ', SERVER RE-CHECK DID NOT MATCH') + (sl.server_check.tsa && sl.server_check.tsa.length ? ', time-stamped by ' + sl.server_check.tsa.join(' and ') : '') : ', server re-check pending')).join('; ') + ')' : ''),
        '', 'SHA-256 (hex)                                                      bytes      file', ...sums, '', 'To check a file: compute its SHA-256 (for example: shasum -a 256 <file>, or certutil -hashfile <file> SHA256) and compare it with the line above.', tsrNote].filter(x => x !== '' || true).join('\n');
      const mbytes = enc.encode(manifest), mhash = await pbHex(mbytes);
      add('MANIFEST.txt', mbytes);
      const counts = { photos: files.filter(f => /^photos\//.test(f.name)).length, sealed: seals.length };
      const cert = ['CERTIFICATION OF CUSTODIAN OF RECORDS', '(Fed. R. Evid. 803(6), 902(11), 902(13), 902(14); Cal. Evid. Code §§ 1271, 1552–1553, 1560–1562)', 'DRAFT prepared by the app. Have your attorney adapt it before anyone signs it; sign only what you personally know to be true.', '',
        'I, ______________________, declare:', '',
        '1. I am the ______________________ of ' + (pbRptCompany() || '______________________') + ' (the "Company"). I am a custodian of the Company’s field records or am otherwise qualified to describe how they are made and kept. I have personal knowledge of the facts below, except where stated on information and belief.',
        '2. The Company uses a software service called The Pipelayer’s Bible (the "Service") in the ordinary course of its business to record pipe runs, daily reports, site-log entries, photographs and related field records. It has done so on this project since about ______________.',
        '3. The records listed in the attached manifest (the "Records") were made by Company personnel who had knowledge of the matters recorded, or from information transmitted by them, at or near the time of the events recorded. Making these records is a regular practice of the Company’s field work. The Records were kept in the course of that regularly conducted activity.',
        '4. The Records concern job ' + (e.jobNumber || x.job_number || '__________') + (e.jobsite ? ' (' + e.jobsite + ')' : '') + ', for work dates ' + day(first) + ' to ' + day(last) + ', and consist of 1 run report, ' + counts.photos + ' photographs and ' + counts.sealed + ' sealed PDF files.',
        '5. On ' + when.toLocaleDateString() + ' I exported the Records from the Service using its Export for Records function, signed in as ______________________. The export produced a file named ______________________ of ________ bytes. I have not altered it.',
        '6. The export includes a manifest (MANIFEST.txt) listing each file with a SHA-256 hash value. The SHA-256 hash value of the manifest file itself is: ' + mhash + '. [If verified:] On __________ I recomputed the hash values of the files in the export using __________ and they matched the manifest.',
        '7. Attached as Exhibit 1 is a description, supplied by the operator of the Service, of how the Service records times, versions, photographs and hash values. On information and belief it accurately describes the Service as it operated during the dates above.',
        '8. Times shown in the Records as the time of an event are the times kept by the phone or tablet used to make the entry. Times shown as "received" or "saved" by the server are the times kept by the Service’s servers when each entry or version reached them.',
        '9. Where a Record was changed after it was first made, the Service keeps each earlier version with the server time at which it was received; earlier sealed PDFs are included in this export.',
        '10. ' + (Array.isArray(e.aiReads) && e.aiReads.length ? 'Certain values in the Records were first read from photographs by an automated (AI) reading feature of the Service and then reviewed by Company personnel. The run report lists those values, what was read and what was locked.' : 'The Records do not show any values read by the Service’s automated photo-reading feature' + (e.lockTime && new Date(e.lockTime) < new Date('2026-11-17') ? ' (the Service did not record that information for runs locked before November 17, 2026).' : '.')),
        '', 'I declare under penalty of perjury under the laws of the United States of America and the State of California that the foregoing is true and correct.', '', 'Executed on ______________ at ______________, ______________.', '', '______________________________          ______________________________', 'Signature                                Printed name', '', '', PB_EXHIBIT].join('\n');
      add('CUSTODIAN-CERTIFICATE-draft.txt', enc.encode(cert));
      const zip = pbZip(files), name = 'records-' + job + '-' + e.id + '.zip';
      const u = URL.createObjectURL(zip), a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
      pbAlert('Saved ' + name + ': the report, ' + counts.photos + ' photo' + (counts.photos === 1 ? '' : 's') + ', ' + counts.sealed + ' sealed original' + (counts.sealed === 1 ? '' : 's') + ', the record data, a manifest of fingerprints and a draft custodian certificate.\n\nManifest fingerprint: ' + mhash.slice(0, 16) + '… (the full value is in the certificate).', 'Export Ready');
    } catch (y) { console.error('Export for Records:', y); pbAlert('The export couldn’t be made. Try again with signal.', 'Not Exported'); }
    finally { pbRptBusy(null); }
  };
'''
rep("  function pbRrPdfName(e) { return 'crew-run-' +", JS + "  function pbRrPdfName(e) { return 'crew-run-' +")
open(out, 'w', encoding='utf-8').write(s); print('ok')
s = open(out, encoding='utf-8').read()
old = "open: (o) => { pbRoFor(pbArchiveOwnerUid).open = o; }"
assert s.count(old) == 1
s = s.replace(old, "open: (o, rec) => { const O = pbRoFor(pbArchiveOwnerUid); O.open = o; if (rec) O.rec = rec; }")
open(out, 'w', encoding='utf-8').write(s); print('ok2')
