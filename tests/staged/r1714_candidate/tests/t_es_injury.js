// r17.14: the new "Report a serious injury" lines (safety p1) have Spanish (review mode; PB_ES_ENABLED stays false).
// PB_URL=http://127.0.0.1:10620/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_es_injury.js
const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
(async () => {
  const { b, p } = await boot(process.env.PB_URL || 'http://127.0.0.1:10620/cur.html', { init: co + ";try{localStorage.setItem('pbEsReview','1')}catch(e){}" });
  const r = await p.evaluate(() => { window.pbSetLang('es'); const o = {};
    for (const s of ['MD', 'MN', 'NV', 'SC', 'IA', 'AZ', 'IN', 'NC', 'NM', 'TN', 'VT', 'WY', 'CA']) { const en = window.pbInjuryLine(s); o[s] = [en, window.pbT(en)]; }
    return o; });
  let bad = 0;
  for (const [s, [en, es]] of Object.entries(r)) { const ok = /^La compañía lo reporta a /.test(es) && !/within|hospital stay/.test(es); console.log((ok ? 'PASS ' : 'FAIL ') + s + ': ' + es); if (!ok) bad++; }
  if (p.errs.length) { console.log('page errors', p.errs); bad++; }
  console.log(bad ? 'FAIL ' + bad : 't_es_injury: ALL PASS'); await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
