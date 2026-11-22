// t_emergency_ui.js : emergency_nov22 in the built app (browser, fake server; PB_ROOT=http://127.0.0.1:<port>/ serving build_hooks/).
// 1) instant scripts through the real Ask box (English + Spanish, machine-on-a-line, sewer smell, a false alarm that now goes to Ask);
// 2) "Not an emergency? Send to Ask": one tap sends the same question with not_emergency: true, the AI answer shows, the link goes;
// 3) offline: the script still shows with no request; 4) Spanish on (#es-review): the words around the answer, the link and an
// offline message are Spanish, and the dispatcher interpreter line shows only in Spanish. No page errors.
const L = require('/home/claude/index.html-/tests/bughunt_nov17/office/lib');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  // ---- English
  let { b, p } = await L.boot(L.URL, { init: L.co + `;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}` });
  const sent = [];
  await p.route('**/functions/v1/ai**', async (r) => { let j = {}; try { j = JSON.parse(r.request().postData() || '{}'); } catch (e) {} sent.push(j);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, v: 2, text: 'The surveyor resets lath. Note it on the daily.', used: 1, limit: 20 }) }); });
  await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(600);
  const ask = async (q) => { await p.fill('#aiAskBox', q); await p.click('#aiAskBtn'); await p.waitForTimeout(900); };
  const top = () => p.evaluate(() => { const e = document.getElementById('aiAskItem0'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
  const cases = [
    ['the boom touched the line', /Power line contact/, /stay in the cab/],
    ['the bucket hit the line', /not sure what it is/, /upwind/],
    ['smells like rotten eggs in the wet well', /confined space/, /tested and ventilated/],
    ['we smell gas in the trench', /Gas line hit or gas smell/, /upwind/],
    ['le pegamos al gas', /Le pegaron a una línea de gas/, /hacia donde viene el viento/],
    ['se electrocutó', /Contacto con línea eléctrica/, /quédese en la cabina/],
    ['lo atropelló la troca', /Caída, aplastado o atropellado/, /intérprete/],
    ['derrumbe!', /Emergencia en una zanja/, /Derrumbe/],
  ];
  for (const [q, a, c] of cases) { const n = sent.length; await ask(q); const t = await top(); ok(a.test(t) && c.test(t) && /EMERGENCY/.test(t) && sent.length === n, 'instant script, nothing sent: ' + q); }
  const n0 = sent.length; await ask('Excavator ran over the lath, who resets it?');
  ok(sent.length === n0 + 1 && !sent[sent.length - 1].not_emergency && /surveyor resets lath/.test(await top()), 'false alarm goes to Ask: ran over the lath');
  // the link
  await ask('Truck backed over the flagger'); let t = await top();
  ok(/Emergency/.test(t) && /Not an emergency\? Send to Ask/.test(t), 'emergency card has the link');
  const n1 = sent.length; await p.click('#aiAskItem0 .pb-ai-notem button'); await p.waitForTimeout(1200);
  const last = sent[sent.length - 1] || {};
  ok(sent.length === n1 + 1 && last.not_emergency === true && last.question === 'Truck backed over the flagger', 'one tap sends the same question with not_emergency: true');
  t = await top(); ok(/surveyor resets lath/.test(t) && !/Not an emergency/.test(t), 'the AI answer is the newest card; no link on it');
  const link1 = await p.evaluate(() => document.querySelectorAll('.pb-ai-notem').length); ok(link1 === 0, 'the link is gone once Ask answered (' + link1 + ')');
  // offline: the script still shows, nothing sent
  await p.context().setOffline(true); await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); });
  const n2 = sent.length; await ask('la retro tocó la línea de alta'); t = await top();
  ok(/Contacto con línea eléctrica/.test(t) && sent.length === n2, 'offline: Spanish power script, nothing sent');
  ok(p.errs.length === 0, 'no page errors (English): ' + p.errs.join(' | '));
  await b.close();
  // ---- Spanish on
  ({ b, p } = await L.boot(L.URL.replace(/(\.html)?$/, '$1') + '#es-review', { init: L.co + `;try{localStorage.setItem('pbAiPrivacyAck','1');localStorage.setItem('pbLang','es')}catch(e){}` }));
  await p.evaluate(() => { try { window.pbSetLang('es'); } catch (e) {} }); await p.waitForTimeout(500);
  const lang = await p.evaluate(() => window.pbLang && window.pbLang());
  ok(lang === 'es', 'Spanish on for this phone (' + lang + ')');
  await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(600);
  await p.fill('#aiAskBox', 'huele a gas'); await p.click('#aiAskBtn'); await p.waitForTimeout(1200);
  // the Spanish engine makes innerText / textContent read back the English; a Range reads what is on screen
  const shown = (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return ''; const r = document.createRange(); r.selectNodeContents(e); return r.toString().replace(/\s+/g, ' ').trim(); }, sel);
  t = await shown('#aiAskItem0');
  const st = await shown('#aiAskStatus');
  ok(/EMERGENCIA · Llamar al 911/.test(t), 'button: EMERGENCIA · Llamar al 911');
  ok(/Emergencia/.test(t) && /No hay permiso abierto: esto marca el número de emergencia\./.test(t), 'heading and hint in Spanish');
  ok(/¿No es una emergencia\? Mandar la pregunta/.test(t), 'link in Spanish');
  ok(/Respondido por la app · sin IA/.test(t), 'label in Spanish');
  ok(/Emergencia: vea arriba\./.test(st || '') && /No se mandó nada a la IA\./.test(st || ''), 'status line in Spanish: ' + st);
  await p.context().setOffline(true); await p.evaluate(() => { Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true }); });
  await p.fill('#aiAskBox', '¿cuántos pies para el talud?'); await p.click('#aiAskBtn'); await p.waitForTimeout(900);
  const st2 = await shown('#aiAskStatus');
  ok(/No hay señal\. La IA necesita conexión/.test(st2 || '') && /¿Emergencia\? Llame al 911\./.test(st2 || ''), 'offline message in Spanish: ' + st2);
  const disp = await p.evaluate(() => { const e = document.querySelector('.cp-disp-es'); if (!e) return null; const r = document.createRange(); r.selectNodeContents(e); return getComputedStyle(e).display + '|' + r.toString(); });
  ok(disp && /^block\|Si no habla bien inglés/.test(disp), 'dispatcher interpreter line shown in Spanish: ' + disp);
  await p.evaluate(() => window.pbSetLang('en')); await p.waitForTimeout(400);
  const disp2 = await p.evaluate(() => getComputedStyle(document.querySelector('.cp-disp-es')).display);
  ok(disp2 === 'none', 'hidden in English (' + disp2 + ')');
  ok(p.errs.length === 0, 'no page errors (Spanish): ' + p.errs.join(' | '));
  await b.close();
  console.log(bad ? bad + ' FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL crash', e && e.stack); process.exit(1); });
