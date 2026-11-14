import sys
s = open(sys.argv[1]).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:90]); s = s.replace(a, b)
# r16.24 (Tommy, Nov 14): "Add your spec books": several files at once in Documents, a spec-book card when the
# company has none, a Home card for the office, and spec books up to 1,500 pages.
rep('<button type="button" class="pb-btn" id="docsAddBtn" onclick="pbDocsPick()">Add Document</button></div>\n      <input type="file" id="docsFile" accept="application/pdf,image/*" hidden onchange="pbDocsPicked(this)">',
    '<button type="button" class="pb-btn" id="docsAddBtn" onclick="pbDocsPick()">Add Documents</button></div>\n      <div class="pb-docs-spec" id="docsSpecCard" hidden><p class="t">Add your spec books</p><p class="s">The Greenbook or state specs, city and water district standards. Ask answers from them first, for everyone in the company.</p><button type="button" class="pb-btn" id="docsSpecBtn" onclick="pbDocsPick()">Add Spec Books</button></div>\n      <input type="file" id="docsFile" accept="application/pdf,image/*" multiple hidden onchange="pbDocsPicked(this)">')
rep('        <div class="pb-field"><label for="docsTitle">Title</label><input type="text" id="docsTitle" maxlength="200" autocomplete="off"></div>',
    '        <div class="pb-field" id="docsTitleWrap"><label for="docsTitle">Title</label><input type="text" id="docsTitle" maxlength="200" autocomplete="off"></div>')
rep("#pbApp #pjDocsRow[hidden], #pbApp #docsAddWrap[hidden], #pbApp #docsJobsWrap[hidden] { display: none; }",
    """#pbApp #pjDocsRow[hidden], #pbApp #docsAddWrap[hidden], #pbApp #docsJobsWrap[hidden], #pbApp #docsSpecCard[hidden], #pbApp #docsTitleWrap[hidden] { display: none; }
#pbApp .pb-docs-spec { margin: 0 0 14px 0; padding: 14px; border: 1px solid var(--pb-border); border-radius: 12px; background: var(--pb-surface); }
#pbApp .pb-docs-spec .t { margin: 0 0 4px 0; font-weight: 700; font-size: 17px; }
#pbApp .pb-docs-spec .s { margin: 0 0 12px 0; color: var(--pb-text-2); font-size: 14px; line-height: 1.4; }""")
# render: the spec card when the company has no documents yet
rep("    if (add) add.hidden = !(pbDocs.ready === true && can) || !pbDocsEl('docsForm').hidden || pbDocs.busy;",
    "    if (add) add.hidden = !(pbDocs.ready === true && can) || !pbDocsEl('docsForm').hidden || pbDocs.busy;\n    { const sc = pbDocsEl('docsSpecCard'); if (sc) sc.hidden = !(pbDocs.ready === true && can && !pbDocs.list.length) || !pbDocsEl('docsForm').hidden || pbDocs.busy; if (add && sc && !sc.hidden) add.hidden = true; } /* r16.24 */")
rep("      for (let n = 1; n <= pdf.numPages && n <= 400; n++) {", "      for (let n = 1; n <= pdf.numPages && n <= 1500; n++) { // r16.24: spec books run 700+ pages")
# picked: one or several
rep("""  window.pbDocsPicked = function(inp) {
    const file = inp && inp.files && inp.files[0]; if (!file) return;
    if (!pbDocsIsPdf(file) && !/^image\\//.test(file.type)) { pbDocsSay('Use a PDF or a photo.'); return; }
    if (file.size > 50 * 1024 * 1024) { pbDocsSay('That file is over 50 MB.'); return; }
    if (pbDocs.resume) { const rs = pbDocs.resume; pbDocs.resume = null; pbDocsResumeWith(rs, file); return; } // Continue: the same file again
    pbDocs.file = file;""",
"""  window.pbDocsPicked = function(inp) {
    const all = inp && inp.files ? [...inp.files] : []; if (!all.length) return;
    if (pbDocs.resume) { const rs = pbDocs.resume; pbDocs.resume = null; pbDocsResumeWith(rs, all[0]); return; } // Continue: the same file again
    const ok = all.filter(f => (pbDocsIsPdf(f) || /^image\\//.test(f.type)) && f.size <= 50 * 1024 * 1024).slice(0, 20); // r16.24: several at once
    const skipped = all.length - ok.length;
    if (!ok.length) { pbDocsSay(all.length > 1 ? 'Use PDFs or photos, each under 50 MB.' : (!pbDocsIsPdf(all[0]) && !/^image\\//.test(all[0].type) ? 'Use a PDF or a photo.' : 'That file is over 50 MB.')); return; }
    const file = ok[0];
    pbDocs.file = file; pbDocs.files = ok;""")
rep("""    pbDocsEl('docsFileName').textContent = file.name;
    pbDocsEl('docsTitle').value = String(file.name || '').replace(/\\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 200);""",
"""    pbDocsEl('docsFileName').textContent = ok.length > 1 ? ok.length + ' files' + (skipped ? ' (' + skipped + ' skipped: not a PDF or photo, or over 50 MB)' : '') : file.name;
    pbDocsEl('docsTitle').value = pbDocsTitleOf(file);
    { const tw = pbDocsEl('docsTitleWrap'); if (tw) tw.hidden = ok.length > 1; } // several: each keeps its file name""")
rep("  window.pbDocsPick = function() { pbDocs.resume = null;",
    "  const pbDocsTitleOf = (f) => String(f.name || '').replace(/\\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 200) || 'Document';\n  window.pbDocsPick = function() { pbDocs.resume = null;")
rep("    pbDocs.file = null; if (!quiet) pbDocsSay(''); pbDocsRender();\n  };",
    "    pbDocs.file = null; pbDocs.files = null; if (!quiet) pbDocsSay(''); pbDocsRender();\n  };")
# upload: one file, or each in turn with the same area and jobs
rep("""  window.pbDocsUpload = async function() {
    if (pbDocs.busy || !pbDocs.file) return;
    const file = pbDocs.file, title = pbDocsEl('docsTitle').value.trim() || file.name;""",
"""  window.pbDocsUpload = async function() {
    if (pbDocs.busy || !pbDocs.file) return;
    const files = Array.isArray(pbDocs.files) && pbDocs.files.length > 1 ? pbDocs.files.slice() : null;
    if (files) return pbDocsUploadMany(files);
    const file = pbDocs.file, title = pbDocsEl('docsTitle').value.trim() || file.name;""")
rep("""  // Continue an unfinished upload: pb_docs_resume says where it stands (`next`).""",
"""  // r16.24: several files, one after another, with the same area and jobs; each its own document titled by its file name
  async function pbDocsUploadMany(files) {
    const area = { city: pbDocsEl('docsCity').value.trim().slice(0, 80), county: pbDocsEl('docsCounty').value.trim().slice(0, 80), state: pbDocsEl('docsState').value.trim().toUpperCase().slice(0, 2), agency: pbDocsEl('docsAgency').value.trim().slice(0, 120) };
    if (pbDocsAreaBad(area)) { pbDocsSay('State is two letters, like AZ.'); return; }
    try { localStorage.setItem('pbDocsArea', JSON.stringify(area)); } catch (e) {}
    const jobs = pbDocs.jobs.filter(j => pbDocs.picked.has(String(j.number).trim().toLowerCase())).map(j => String(j.number));
    pbDocs.busy = true; pbDocs.files = null; pbDocsEl('docsForm').hidden = true; pbDocsSay(''); pbDocsRender();
    let added = 0; const notes = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i], title = pbDocsTitleOf(file), tag = (i + 1) + ' of ' + files.length + ': ';
      let c = null, line = '';
      try {
        pbDocsWait(tag + 'preparing…');
        try { c = await pbDocsPrep(file); } catch (e) { notes.push(title + ': ' + PB_AI_PHOTO_FAIL); continue; }
        const sha = pbDocsHex(await crypto.subtle.digest('SHA-256', c.bytes));
        const b = await pbDocsRpc('pb_docs_begin', { p_sha256: sha, p_title: title, p_bytes: c.bytes.length, p_pages: c.read ? c.read.pages : 1, p_mime: c.mime }, 'Couldn’t add it.');
        if (!b.ok) { notes.push(title + ': ' + b.line); if (/limit|full|budget/i.test(b.line)) break; continue; }
        if (b.data.existing) { notes.push(title + ': already in your library.'); continue; }
        Object.assign(c, { id: b.data.doc_id, path: b.data.storage_path, bucket: b.data.bucket, area, jobs });
        pbDocs.mem.set(String(c.id), c);
        const say = pbDocsWait; pbDocsWait = (t) => say(t ? tag + t.charAt(0).toLowerCase() + t.slice(1) : '');
        try { line = await pbDocsSteps(c, 'upload'); } finally { pbDocsWait = say; }
        if (c.finished) added++; else notes.push(title + ': ' + line);
      } catch (e) { console.error(e); notes.push(title + ': didn’t finish. Tap Continue on it.'); }
      finally { if (c && c.finished) { if (c.id) pbDocs.mem.delete(String(c.id)); try { if (c.read && c.read.pdf) c.read.pdf.destroy(); } catch (e) {} } }
    }
    pbDocsDone(null, (added ? added + ' of ' + files.length + ' added.' : 'None added.') + (notes.length ? ' ' + notes.slice(0, 3).join(' ') : ''));
  }
  window.pbDocsUploadMany = pbDocsUploadMany;
  // Continue an unfinished upload: pb_docs_resume says where it stands (`next`).""")
# pbDocsWait must be reassignable
rep("  function pbDocsWait(t) { const w = pbDocsEl('docsWait'), x = pbDocsEl('docsWaitT'); if (w) w.hidden = !t; if (x) x.textContent = t || ''; }",
    "  let pbDocsWait = function(t) { const w = pbDocsEl('docsWait'), x = pbDocsEl('docsWaitT'); if (w) w.hidden = !t; if (x) x.textContent = t || ''; };")
# Home: an office card until the company has a document
rep("    add(() => (typeof window.pbR95HomeAttention === 'function' ? window.pbR95HomeAttention() : null)); // roles95: dailies the foreman didn't sign (office)",
    "    add(() => (typeof window.pbR95HomeAttention === 'function' ? window.pbR95HomeAttention() : null)); // roles95: dailies the foreman didn't sign (office)\n    add(() => (typeof window.pbDocsSpecHomeAttention === 'function' ? window.pbDocsSpecHomeAttention() : null)); // r16.24: add your spec books (office)")
rep("  window.pbDocsQuiet = pbDocsQuiet;",
"""  window.pbDocsQuiet = pbDocsQuiet;
  // r16.24: the office sees a Home card until the company has a document (Remind later / hide like any card)
  window.pbDocsSpecHomeAttention = function() {
    const uid = pbArchiveOwnerUid;
    if (pbDocs.ready !== true || pbDocs.list.length || !uid || !sbUser || sbUser.id !== uid || pbCurrentScreen === 'askDocs') return null; // not as a banner on Documents itself
    let office = false; try { office = typeof window.pbAcOffice === 'function' && window.pbAcOffice(uid); } catch (e) {}
    if (!office || !pbDocsCanAdd()) return null;
    return { id: 'specBooks', info: true, html: '<span class="t">Add your spec books</span>Ask answers from them first, for the whole crew.<button type="button" class="pb-btn small" id="homeSpecBooksBtn" onclick="pbDocsOpen()">Add Spec Books</button>' };
  };""")
rep("    if (name === 'tools' || name === 'settings') setTimeout(pbDocsQuiet, 0);",
    "    if (name === 'tools' || name === 'settings' || name === 'home') setTimeout(pbDocsQuiet, 0); // r16.24: home, for the spec-book card")
rep("    try { if (typeof pbSupAdminRow === 'function') pbSupAdminRow(); } catch (e) {}\n  }\n  window.pbDocsQuiet = pbDocsQuiet;",
    "    try { if (typeof pbSupAdminRow === 'function') pbSupAdminRow(); } catch (e) {}\n    try { if (pbCurrentScreen === 'home' && typeof window.pbRenderHome === 'function') window.pbRenderHome(); } catch (e) {} // r16.24\n  }\n  window.pbDocsQuiet = pbDocsQuiet;")
rep("pbDocs.list.length || pbDocs.busy ? '' : pbDocsCanAdd() ? 'No documents yet.' : 'Foremen and the office add documents.'",
    "pbDocs.list.length || pbDocs.busy ? '' : pbDocsCanAdd() ? '' : 'Foremen and the office add documents.'")  # r16.24: the spec-book card says it
open(sys.argv[2], 'w').write(s); print('ok')
