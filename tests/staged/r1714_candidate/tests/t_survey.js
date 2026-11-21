// survey s1-s5 check (stacked build). PB_URL=http://127.0.0.1:10500/cur.html node t_survey.js
const boot = require('/home/claude/index.html-/tests/rig/boot'), co = require('/home/claude/index.html-/tests/rig/co');
(async () => {
  const { b, p } = await boot(process.env.PB_URL || 'http://127.0.0.1:10500/cur.html', { init: co });
  const fails = [], errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  // s4 slope converter
  const slope = (mode, v) => p.evaluate(([mode, v]) => { pbGoto('slopeConvCalc'); document.querySelector('#slopeConvToggle [data-val="' + mode + '"]').click(); document.getElementById('slopeConvVal').value = v; pbCalcSlopeConv(); const r = document.getElementById('slopeConvResult'); return { l: [...r.querySelectorAll('.pb-answer-label')].map(x => x.textContent), v: [...r.querySelectorAll('.pb-answer-val')].map(x => x.textContent) }; }, [mode, v]);
  const a = await slope('pct', '0.5'); console.log('0.5% ->', a.v.join(' | '));
  if (a.v.join('|') !== '0.50%|0.0050 ft/ft|200.00 : 1|1 : 200.00|0.29°') fails.push('slope 0.5%: ' + a.v.join('|'));
  const c = await slope('ratio', '2'); console.log('ratio 2 ->', c.v.join(' | '));
  if (c.v[0] !== '50.00%' || c.v[2] !== '2.00 : 1') fails.push('slope ratio 2: ' + c.v.join('|'));
  const d = await slope('pct', '0.08'); console.log('0.08% ->', d.v.join(' | '));
  if (d.v[1] !== '0.00080 ft/ft') fails.push('slope 0.08%: ' + d.v[1]);
  // s5 glossary + cutsheet page
  const g = await p.evaluate(() => ['vertical-datum', 'survey-foot', 'blue-top-red-top', 'flagging-colors', 'same-datum', 'metric-sheets'].map(id => { const e = document.querySelector('[data-edu-id="' + id + '"]'); return e ? e.textContent.slice(0, 40) : null; }));
  console.log('edu:', g.join(' / ')); if (g.some(x => !x)) fails.push('edu items missing');
  // s1 + s2 cutsheet paste
  const rows = await p.evaluate(() => {
    pbOpenCutsheetImport();
    const box = document.querySelector('textarea[id^="cutsheetPasteBox"]');
    box.value = ['101 0+00.00 LT 15.00 15/SS MH-1 IE OUT 100.00 C 5.00 105.00 1000.00 2000.00',
      '102 0+50.00 15.00 LT 15/SS 99.75 CUT 5.10 104.85 1000.00 2050.00',
      '103 1+00.00 O/S 15.00 LT 15/SS MH-2 IE IN 99.50 C5.20 104.70 1000.00 2100.00',
      '201 0+00.00 RT 10.00 10/SD CB-1 101.00 F 0.50 100.50 1100.00 2000.00',
      '202 0+40.00 10.00 RT 10/SD 100.60 -0.40 101.00 1100.00 2040.00'].join('\n');
    pbParseCutsheetManual();
    return { text: document.getElementById('screen-cutsheetImport').innerText.replace(/[ \t]+/g, ' ') };
  });
  const T = rows.text;
  for (const want of ['4 row(s) parsed, 1 not used', '15/SS (3)', '10/SD (1)', 'mostly 15/SS', ' 102 50.00 L 15/SS C-5.10', ' 201 0.00 R 10/SD CB-1 F+0.50'])
    if (!T.includes(want)) fails.push('cutsheet: missing "' + want + '"');
  console.log('cutsheet:', T.match(/\d+ row\(s\) parsed[^.]*/)[0], '|', (T.match(/mostly [^ ]+/g) || []).join(', '));
  console.log('page errors:', errs.length ? errs.join(' | ') : 'none');
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
