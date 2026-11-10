import sys
s = open(sys.argv[1]).read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80]); s = s.replace(a, b)
# r16.21 (Tommy, Nov 10): time left while plan sets send
rep("  async function pbPlansSendOne(file, pre, job) {",
'''  const pbPlansProg = { total: 0, done: 0, start: 0 };
  async function pbPlansProgStart(files) {
    pbPlansProg.total = 0; pbPlansProg.done = 0; pbPlansProg.start = Date.now();
    for (const f of files) { try { const d = await pdfjsLib.getDocument(Object.assign({ data: new Uint8Array(await f.arrayBuffer()) }, PB_PV_PDFJS)).promise; pbPlansProg.total += d.numPages; try { d.destroy(); } catch (e) {} } catch (e) {} }
    pbPlansProg.start = Date.now();
  }
  function pbPlansEta() {
    const P = pbPlansProg; if (P.done < 2 || !P.total) return ' · figuring time left';
    const left = Math.max(0, P.total - P.done) * (Date.now() - P.start) / P.done / 60000;
    return left < 1 ? ' · under a minute left' : ' · about ' + Math.round(left) + ' min left';
  }
  async function pbPlansSendOne(file, pre, job) {''')
rep("        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + '… Keep the app open.');",
    "        pbPlansWait(pre + 'Sending sheet ' + p + ' of ' + n + pbPlansEta() + '. Keep the app open.');")
rep("        if (!r.ok) return { net: true, stop: r.line + ' It tries again by itself.' };\n      }",
    "        if (!r.ok) return { net: true, stop: r.line + ' It tries again by itself.' };\n        pbPlansProg.done++;\n      }")
# report pages / already-sent sheets count as done so the estimate isn't stretched
rep("      const reportPages = pdf.numPages - sheetPages.length;\n      if (!sheetPages.length) return { report: true, all: true, file, pages: reportPages };",
    "      const reportPages = pdf.numPages - sheetPages.length;\n      pbPlansProg.total = Math.max(pbPlansProg.done, pbPlansProg.total - reportPages);\n      if (!sheetPages.length) return { report: true, all: true, file, pages: reportPages };")
rep("      const setId = String(b.data.set_id), have = new Set(Array.isArray(b.data.have) ? b.data.have.map(Number) : []);",
    "      const setId = String(b.data.set_id), have = new Set(Array.isArray(b.data.have) ? b.data.have.map(Number) : []);\n      pbPlansProg.total = Math.max(pbPlansProg.done, pbPlansProg.total - have.size);")
rep("    const qids = []; for (const f of pdfs) qids.push(await pbPlansQAdd(f, pbPlans.job)); // r16.20: kept on the phone until sent\n",
    "    const qids = []; for (const f of pdfs) qids.push(await pbPlansQAdd(f, pbPlans.job)); // r16.20: kept on the phone until sent\n    pbPlansWait('Getting ready…'); await pbPlansProgStart(pdfs);\n")
rep("    let done = 0, line = '';\n    try {\n      for (let k = 0; k < q.length; k++) {",
    "    let done = 0, line = '';\n    await pbPlansProgStart(q.map((e) => e.blob).filter((x) => x instanceof Blob));\n    try {\n      for (let k = 0; k < q.length; k++) {")
open(sys.argv[2], 'w').write(s); print('ok')
