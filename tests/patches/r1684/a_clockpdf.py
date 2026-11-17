import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.84: the office copy of a run report shows the phone's clock next to the server's (pb_prod.run_clock)
rep("""  async function pbRrPdfDoc(e, say) {
    say = say || pbRptBusy;
    let doc;
    try {
      await say('Making the PDF…');""",
"""  async function pbRrPdfDoc(e, say, runId) {
    say = say || pbRptBusy;
    let doc;
    try {
      await say('Making the PDF…');
      if (runId) { try { const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: runId }, 15000); const c = r && r.data && r.data.clock; if (Array.isArray(c) && c.length) e = Object.assign({}, e, { _pbClock: c }); } catch (x) {} } /* r16.84 */""")
rep("const doc = await pbRrPdfDoc(e, async () => {}); add('run-report.pdf', doc.output('arraybuffer'));",
    "const doc = await pbRrPdfDoc(e, async () => {}, x.id); add('run-report.pdf', doc.output('arraybuffer'));")
rep("""    const O = pbRoFor(pbArchiveOwnerUid), e = O.rec;
    if (!e) return;
    if (!pdfLibReady()) { pbAlert('PDF library didn\\'t load — check your connection and try again.'); return; }
    const doc = await pbRrPdfDoc(e);""",
"""    const O = pbRoFor(pbArchiveOwnerUid), e = O.rec;
    if (!e) return;
    if (!pdfLibReady()) { pbAlert('PDF library didn\\'t load — check your connection and try again.'); return; }
    const doc = await pbRrPdfDoc(e, null, O.open && O.open.id);""")
rep("entry: e, make: (say) => pbRrPdfDoc(e, say), name: pbRrPdfName(e) });",
    "entry: e, make: (say) => pbRrPdfDoc(e, say, x.id), name: pbRrPdfName(e) });")
# the section
rep("""    // --- field notes
    if (notes.length) {
      R.section('notes',""",
"""    // --- r16.84: phone clock vs the server's clock, each time a version reached the server (office copy only)
    if (Array.isArray(e._pbClock) && e._pbClock.length) {
      const off = (s) => { const a = Math.abs(Number(s) || 0); if (a < 60) return 'within a minute'; const m = Math.round(a / 60), t = m < 120 ? m + ' min' : (Math.round(a / 360) / 10) + ' hr'; return t + (s > 0 ? ' ahead' : ' behind'); };
      const big = e._pbClock.some(c => Math.abs(Number(c.ahead_s) || 0) >= 300);
      R.section('clock', 'Phone clock check', { keep: 26, intro: 'Each time a version of this run reached the server, the phone\\u2019s clock was recorded next to the server\\u2019s clock. Times marked "device time" in this report come from the phone; if the phone was ahead or behind, those times are off by about that much. ' + (big ? 'The phone\\u2019s clock was off by 5 minutes or more at least once.' : 'The phone\\u2019s clock was within 5 minutes of the server\\u2019s each time.') });
      R.table({ head: ['Version', 'Phone clock', 'Server clock', 'Phone was'], body: e._pbClock.map(c => [String(c.version || '\\u2014'), pbRptDt(c.phone_at, { sec: true }), pbRptDt(c.server_at, { sec: true }), Math.abs(Number(c.ahead_s) || 0) >= 300 ? { content: off(c.ahead_s), _accent: true } : off(c.ahead_s)]), fontSize: 8.5 });
    }
    // --- field notes
    if (notes.length) {
      R.section('notes',""")
# export manifest line
rep("add('record.json', enc.encode(JSON.stringify({ run: x, record: e, sealed: seals }, null, 1)));",
    "let clock = []; try { const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: x.id }, 15000); clock = (r.data && r.data.clock) || []; } catch (y) {} /* r16.84 */\n      add('record.json', enc.encode(JSON.stringify({ run: x, record: e, sealed: seals, clock }, null, 1)));")
open(out, 'w', encoding='utf-8').write(s); print('ok')
