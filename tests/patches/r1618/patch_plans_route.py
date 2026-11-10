import sys
s = open(sys.argv[1]).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70]); s = s.replace(a, b)
# r16.18 (Tommy, Nov 10): reports in the plans upload go to Documents (the cheap text reader), not the sheet reader.
# A plan sheet is a large page (11x17 and up); letter / legal pages are report pages.
rep("""      const pdf = await pdfjsLib.getDocument(Object.assign({ data: buf.slice(0) }, PB_PV_PDFJS)).promise;
      const n = pdf.numPages;
      const title = String(file.name || 'Plans').replace(/\\.pdf$/i, '').replace(/[_]+/g, ' ').slice(0, 200);
      const b = await pbDocsRpc('pb_plans_begin', { p_job: pbPlans.job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');""",
"""      const pdf = await pdfjsLib.getDocument(Object.assign({ data: buf.slice(0) }, PB_PV_PDFJS)).promise;
      const sheetPages = [];
      for (let p = 1; p <= pdf.numPages; p++) { const pg = await pdf.getPage(p); const v = pg.getViewport({ scale: 1 }); if (Math.max(v.width, v.height) >= 1150) sheetPages.push(p); try { pg.cleanup(); } catch (e) {} }
      const reportPages = pdf.numPages - sheetPages.length;
      if (!sheetPages.length) { try { pdf.destroy(); } catch (e) {} pbPlansToDocs(file, 'That’s a report, not plan sheets. Add it under Documents instead? Ask reads it there for much less.'); return; }
      const n = sheetPages.length;
      const title = String(file.name || 'Plans').replace(/\\.pdf$/i, '').replace(/[_]+/g, ' ').slice(0, 200);
      const b = await pbDocsRpc('pb_plans_begin', { p_job: pbPlans.job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');""")
rep("""        pbPlansWait('Sending sheet ' + p + ' of ' + n + '…');
        const { grid, files } = await pbPlansRenderPage(pdf, p);""",
"""        pbPlansWait('Sending sheet ' + p + ' of ' + n + '…');
        const { grid, files } = await pbPlansRenderPage(pdf, sheetPages[p - 1]); // r16.18: plan-size pages only""")
rep("""      pbPlansSay('Sent. Ask can use each sheet as soon as it’s read.');
      try { pdf.destroy(); } catch (e) {}""",
"""      pbPlansSay('Sent. Ask can use each sheet as soon as it’s read.');
      try { pdf.destroy(); } catch (e) {}
      if (reportPages) setTimeout(() => pbPlansToDocs(file, 'The plan sheets are sent. This file also has ' + reportPages + ' report page' + (reportPages === 1 ? '' : 's') + '. Add it under Documents too, so Ask can read those?'), 400);""")
rep("""  window.pbPlansRemove = async function(id) {""",
"""  // r16.18: hand a report to Documents, with this job picked
  function pbPlansToDocs(file, msg) {
    const job = pbPlans.job;
    pbConfirm(msg, async () => {
      if (typeof window.pbDocsOpen !== 'function') return;
      if (pbDocs.ready !== true) { try { await pbDocsCheck(); } catch (e) {} }
      window.pbDocsOpen(job);
      setTimeout(() => {
        try { if (pbCurrentScreen === 'askDocs') window.pbDocsPicked({ files: [file] }); else pbAlert('Documents isn’t ready yet. Try again in a moment from Tools > Documents.', 'Not Ready'); } catch (e) { console.error('plans to docs', e); }
      }, 250);
    }, 'Report', { no: 'Not Now', yes: 'Add to Documents' });
  }
  window.pbPlansRemove = async function(id) {""")
open(sys.argv[2], 'w').write(s); print('ok')
