// askgrade #63: Trench Sloping at exactly 20 ft requires an engineer instead of giving a slope (Table B-1 covers
// excavations "less than 20 feet deep"). Every soil choice, typed depths 19.9 / 20 / 20.0 / 25, and the Review link's
// computed depth 19.96 ft (rounded UP to 20.0). 19.9 ft keeps Table B-1's slope; 20 ft and deeper: no slope, no
// offset, no top width, no diagram, "Engineer Required" plus OSHA's note.
const boot = require(__dirname + '/rig/boot'), co = require(__dirname + '/rig/co');
(async () => {
  const { b, p } = await boot((process.env.PB_URL || ((process.env.PB_ROOT || 'http://127.0.0.1:8843/') + 'cur.html')), { init: co });
  const fails = [];
  const calc = (depth, soil, vert) => p.evaluate(([depth, soil, vert]) => {
    pbGoto('trenchCalc');
    const s = document.getElementById('trenchSoil'); s.value = soil; s.dispatchEvent(new Event('change', { bubbles: true }));
    const v = document.getElementById('trenchVertOpt'); v.checked = !!vert;
    document.getElementById('trenchDepth').value = depth; document.getElementById('trenchBottomW').value = '3';
    pbCalcTrench();
    const r = document.getElementById('trenchResult');
    return { labels: [...r.querySelectorAll('.pb-answer-label')].map(x => x.textContent.trim()), vals: [...r.querySelectorAll('.pb-answer-val')].map(x => x.textContent.trim()), text: r.innerText.replace(/\s+/g, ' '), diagram: document.getElementById('trenchDiagram').innerHTML.length };
  }, [depth, soil, vert]);
  const SLOPE = /Max Allowable Slope|Slope Above the Vertical Portion|Unsupported Vertical Portion|Horizontal Offset|Required Top Width/;
  for (const [soil, vert] of [['rock'], ['A'], ['A', true], ['Ashort'], ['B'], ['C']]) {
    const tag = soil + (vert ? '+vertical' : '');
    const r199 = await calc('19.9', soil, vert);
    const okBelow = (soil === 'Ashort' || vert) ? /Not Applicable/.test(r199.labels.join()) : r199.labels.includes('Max Allowable Slope');
    console.log(tag.padEnd(11), '19.9 ft:', r199.labels.join(' | '), r199.vals.join(' | '));
    if (!okBelow) fails.push(tag + ' 19.9 ft changed: ' + r199.labels.join(' | '));
    for (const d of ['20', '20.0', '25']) {
      const r = await calc(d, soil, vert);
      console.log(tag.padEnd(11), d.padEnd(4), 'ft:', r.labels.join(' | '), '|', r.vals.join(' | '));
      if (r.labels.some(l => SLOPE.test(l))) fails.push(tag + ' ' + d + ' ft still gives a slope: ' + r.labels.join(' | '));
      if (!r.labels.includes('Engineer Required')) fails.push(tag + ' ' + d + ' ft: no "Engineer Required"');
      if (!/registered professional engineer/.test(r.text) || !/less than 20 feet deep/.test(r.text)) fails.push(tag + ' ' + d + ' ft: OSHA note missing');
      if (r.diagram) fails.push(tag + ' ' + d + ' ft: a sloped diagram is drawn');
    }
  }
  // the Review link: a computed 19.96 ft opens the calculator at 20.0 ft
  const rv = await p.evaluate(async () => { const s = document.getElementById('trenchSoil'); s.value = 'B'; document.getElementById('trenchDepth').value = ''; await pbOpenTrenchCalc('review', 19.96, null); await new Promise(r => setTimeout(r, 300)); const r = document.getElementById('trenchResult'); return { depth: document.getElementById('trenchDepth').value, labels: [...r.querySelectorAll('.pb-answer-label')].map(x => x.textContent.trim()) }; });
  console.log('Review link at 19.96 ft: depth box', rv.depth, '|', rv.labels.join(' | '));
  if (rv.depth !== '20.0' || !rv.labels.includes('Engineer Required') || rv.labels.some(l => SLOPE.test(l))) fails.push('Review link 19.96 ft: ' + JSON.stringify(rv));
  const edu = await p.evaluate(() => { const e = document.querySelector('[data-edu-id="20-ft-or-more"]'); return e ? e.textContent.replace(/\s+/g, ' ') : null; });
  console.log('Education:', edu && edu.slice(0, 80) + ' ...');
  if (!edu || !/^20 feet or more/.test(edu) || !/no slope at 20 feet or deeper/.test(edu)) fails.push('Education entry not updated');
  if (p.errs.length) fails.push('page errors: ' + p.errs.slice(0, 3).join(' | '));
  console.log(fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'PASS');
  await b.close(); process.exit(fails.length ? 1 : 0);
})();
