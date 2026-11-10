  // r16.19 (Tommy, Nov 10): several plan sets in one pick, sent one after another
  window.pbPlansPicked = async function(inp) {
    const list = inp && inp.files ? Array.from(inp.files) : []; if (!list.length) return;
    const pdfs = list.filter((f) => /pdf$/i.test(f.type || '') || /\.pdf$/i.test(f.name || ''));
    if (!pdfs.length) { pbPlansSay('Use the plan set PDF.'); return; }
    if (navigator.onLine === false) { pbPlansSay('No signal.'); return; }
    if (!(await pbEnsurePdfjs())) { pbPlansSay('Couldn’t open PDFs on this device.'); return; }
    pbPlans.busy = true; pbPlansRender(); pbPlansSay('');
    let wake = null; try { wake = navigator.wakeLock ? await navigator.wakeLock.request('screen') : null; } catch (e) { wake = null; }
    const reports = [], sent = [], already = []; let stop = '';
    try {
      for (let k = 0; k < pdfs.length && !stop; k++) {
        const r = await pbPlansSendOne(pdfs[k], pdfs.length > 1 ? 'Set ' + (k + 1) + ' of ' + pdfs.length + ' · ' : '');
        if (r.report) reports.push(r);
        if (r.sent) sent.push(pdfs[k].name);
        if (r.already) already.push(pdfs[k].name);
        if (r.stop) stop = (pdfs.length > 1 ? String(pdfs[k].name || '').replace(/\.pdf$/i, '') + ': ' : '') + r.stop + (k + 1 < pdfs.length ? ' The rest weren’t sent.' : '');
      }
    } finally {
      try { if (wake) wake.release(); } catch (e) {}
      pbPlans.busy = false; pbPlansWait(''); pbPlansRender(); pbPlansLoad(true);
    }
    const skipped = list.length - pdfs.length;
    pbPlansSay(stop || ((sent.length ? (sent.length > 1 ? sent.length + ' plan sets sent.' : 'Sent.') + ' Ask can use each sheet as soon as it’s read.' : '') +
      (already.length ? ' ' + (already.length > 1 ? already.length + ' were' : 'One was') + ' already on this job.' : '') + (skipped ? ' ' + skipped + ' file' + (skipped > 1 ? 's weren’t PDFs' : ' wasn’t a PDF') + '.' : '')).trim());
    if (reports.length) {
      const r0 = reports[0], more = reports.length - 1;
      const msg = (r0.all ? '“' + String(r0.file.name || '').replace(/\.pdf$/i, '') + '” is a report, not plan sheets. Add it under Documents instead? Ask reads it there for much less.'
        : '“' + String(r0.file.name || '').replace(/\.pdf$/i, '') + '” also has ' + r0.pages + ' report page' + (r0.pages === 1 ? '' : 's') + '. Add it under Documents too, so Ask can read those?')
        + (more ? '\n\n' + more + ' more report' + (more > 1 ? 's go' : ' goes') + ' under Documents too.' : '');
      setTimeout(() => pbPlansToDocs(r0.file, msg), 400);
    }
  };
  async function pbPlansSendOne(file, pre) {
    let pdf = null;
    try {
      pbPlansWait(pre + 'Opening ' + String(file.name || 'the plan set').replace(/\.pdf$/i, '') + '…');
      const buf = new Uint8Array(await file.arrayBuffer());
      const sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map((b) => b.toString(16).padStart(2, '0')).join('');
      pdf = await pdfjsLib.getDocument(Object.assign({ data: buf.slice(0) }, PB_PV_PDFJS)).promise;
      const sheetPages = [];
      for (let p = 1; p <= pdf.numPages; p++) { const pg = await pdf.getPage(p); const v = pg.getViewport({ scale: 1 }); if (Math.max(v.width, v.height) >= 1150) sheetPages.push(p); try { pg.cleanup(); } catch (e) {} }
      const reportPages = pdf.numPages - sheetPages.length;
      if (!sheetPages.length) return { report: true, all: true, file, pages: reportPages };
      const n = sheetPages.length, rep = reportPages ? { report: true, all: false, file, pages: reportPages } : {};
      const title = String(file.name || 'Plans').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').slice(0, 200);
      const b = await pbDocsRpc('pb_plans_begin', { p_job: pbPlans.job, p_title: title, p_pages: n, p_sha256: sha }, 'Couldn’t add it.');
      if (!b.ok) return { stop: b.line };
      const setId = String(b.data.set_id), have = new Set(Array.isArray(b.data.have) ? b.data.have.map(Number) : []);
      if (b.data.existing && b.data.state !== 'uploading') return Object.assign({ already: true }, rep);
      for (let p = 1; p <= n; p++) {
        if (have.has(p)) continue;
        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + '…');
        const { grid, files } = await pbPlansRenderPage(pdf, sheetPages[p - 1]); // r16.18: plan-size pages only
        for (const f of files) {
          if (!(await pbPlansPut(setId + '/p' + p + '/' + f.name + '.jpg', f.blob))) return { stop: navigator.onLine === false ? 'No signal. Add the same file again to carry on.' : 'Sheet ' + p + ' didn’t send. Add the same file again to carry on.' };
        }
        const r = await pbDocsRpc('pb_plans_sheet_ready', { p_set: setId, p_page: p, p_grid: grid }, 'Sheet ' + p + ' didn’t send.');
        if (!r.ok) return { stop: r.line + ' Add the same file again to carry on.' };
      }
      const u = await pbDocsRpc('pb_plans_uploaded', { p_set: setId }, 'Couldn’t finish sending.');
      if (!u.ok) return { stop: u.line };
      return Object.assign({ sent: true }, rep);
    } catch (e) {
      console.error('plans upload', e);
      return { stop: 'Couldn’t read that PDF.' };
    } finally { try { if (pdf) pdf.destroy(); } catch (e) {} }
  }
