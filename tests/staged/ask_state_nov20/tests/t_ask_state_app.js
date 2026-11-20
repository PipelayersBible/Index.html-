// ask_state_nov20: the app always sends Ask the state. Rig test (fake server), one browser.
//   cd <dir with cur.html = patched page>; python3 -m http.server 8931 &   then:  PB_ROOT=http://127.0.0.1:8931/ node t_ask_state_app.js
const L = require('/home/claude/index.html-/tests/bughunt_nov17/office/lib');
const UID = '00000000-0000-4000-8000-000000000001';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const { b, p } = await L.boot(L.URL, { init: L.co + `;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}` });
  const sent = []; let reply = { ok: true, v: 2, text: 'Answer.', used: 1, limit: 20 };
  await p.route('**/functions/v1/ai**', async r => { let j = null; try { j = JSON.parse(r.request().postData() || 'null'); } catch (e) {} if (j && j.question) sent.push(j); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(reply) }); });
  await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(600);
  const ask = async (q) => { await p.fill('#aiAskBox', q); await p.click('#aiAskBtn'); await p.waitForTimeout(900); return sent[sent.length - 1]; };
  const uid = await p.evaluate(() => { try { return Object.keys(localStorage).filter(k => k.startsWith('pbSr:')).map(k => k.slice(5))[0] || null; } catch (e) { return null; } });
  ok(typeof (await p.evaluate(() => typeof window.__debugAskState)) === 'string', 'page loaded with the patch');
  // 1. nothing says which state: nothing is sent (never the California fallback)
  await p.evaluate(() => { window.pbCurJobGet = () => null; Object.keys(localStorage).filter(k => k.startsWith('pbSr:') || k.startsWith('pbAskSt:')).forEach(k => localStorage.removeItem(k)); });
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500); await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(500);
  const owner = await p.evaluate(() => { const g = window.__debugAskState.get(); return JSON.stringify(g); });
  reply = { ok: true, v: 2, text: 'It changes by state. Which state is the job in?', used: 1, limit: 20, state: { code: null, how: 'unknown', asked: true } };
  let j = await ask('How long is my 811 ticket good for?');
  ok(j && j.ctx && j.ctx.state === undefined && j.ctx.state_how === undefined, 'no state known: none sent (got ' + owner + ')');
  // 2. the person answers "Texas": the server names it, the phone keeps it, the next question carries it
  reply = { ok: true, v: 2, text: 'Texas: 14 working days.', used: 2, limit: 20, state: { code: 'TX', how: 'question' } };
  j = await ask('Texas'); ok(j.ctx.state === undefined, 'the answer itself still carries no state');
  reply = { ok: true, v: 2, text: 'Answer.', used: 3, limit: 20, state: { code: 'TX', how: 'told' } };
  j = await ask('and the tolerance zone?'); ok(j.ctx.state === 'TX' && j.ctx.state_how === 'told', 'kept on the phone and sent next time: ' + JSON.stringify([j.ctx.state, j.ctx.state_how]));
  // a state named in passing (not in answer to the question) is not kept
  reply = { ok: true, v: 2, text: 'Nevada...', used: 4, limit: 20, state: { code: 'NV', how: 'question' } };
  await ask('what is the rule in Nevada'); j = await ask('ok thanks'); ok(j.ctx.state === 'TX', 'a state named in passing does not replace it');
  // 3. the company's state beats it
  const key = await p.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('pbAskSt:')));
  const u = key ? key.slice(8) : UID;
  await p.evaluate((u) => { localStorage.setItem('pbSr:' + u, JSON.stringify({ co: 'NV', jobs: {}, jobs_local: {} })); }, u);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500); await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(500);
  reply = { ok: true, v: 2, text: 'Answer.', used: 5, limit: 20, state: { code: 'NV', how: 'company' } };
  j = await ask('How long is my 811 ticket good for?'); ok(j.ctx.state === 'NV' && j.ctx.state_how === 'company', 'company state sent: ' + JSON.stringify([j.ctx.state, j.ctx.state_how]));
  // 4. the open job's own state beats the company's
  await p.evaluate((u) => { localStorage.setItem('pbSr:' + u, JSON.stringify({ co: 'NV', jobs: { '24-017': 'AZ' }, jobs_local: {} })); }, u);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500); await p.evaluate(() => { window.pbCurJobGet = () => ({ job_number: '24-017', name: 'Main St sewer' }); window.pbOpenAiAsk(); }); await p.waitForTimeout(500);
  j = await ask('How many days before we dig do I call 811?'); ok(j.ctx.job === '24-017' && j.ctx.state === 'AZ' && j.ctx.state_how === 'picked', 'job state sent: ' + JSON.stringify([j.ctx.job, j.ctx.state, j.ctx.state_how]));
  ok(j.question && j.v === 2 && j.ctx.label !== undefined && Array.isArray(j.history), 'the rest of the request is unchanged');
  ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
  await b.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
