// ask_followups_nov20 rig test (fake server, one browser at a time).
//   cd work (cur.html = r17.11 source + ask_state_app.py + ask_followups_app.py); python3 -m http.server 10150 &
//   PB_ROOT=http://127.0.0.1:10150/ node tests/t_ask_followups_app.js
const L = require('/home/claude/index.html-/tests/bughunt_nov17/office/lib');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ACK = `;try{localStorage.setItem('pbAiPrivacyAck','1')}catch(e){}`;
const IND = `;window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_terms_status:()=>({terms:'1.0',privacy:'1.0',at:new Date().toISOString()}),pb_my_name_get:()=>({ok:true,name:'Tommy Fontaine'})});`;
const vis = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return !!(e && e.offsetParent); }, sel);
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
async function askRig(p) {
  const sent = []; const R = { reply: { ok: true, v: 2, text: 'Answer.', used: 1, limit: 20 } };
  await p.route('**/functions/v1/ai**', async r => { let j = null; try { j = JSON.parse(r.request().postData() || 'null'); } catch (e) {} if (j && j.question) sent.push(j); await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(R.reply) }); });
  const open = async () => { await p.evaluate(() => window.pbOpenAiAsk()); await p.waitForTimeout(600); };
  const ask = async (q) => { await p.fill('#aiAskBox', q); await p.click('#aiAskBtn'); await p.waitForTimeout(900); return sent[sent.length - 1]; };
  return { sent, R, open, ask };
}
(async () => {
  // ---------- 1. Individual plan (the rig's default account): asked once on Home, kept on the phone ----------
  {
    const { b, p } = await L.boot(L.URL, { init: IND + ACK });
    ok(await vis(p, '#homeStateCard'), 'individual: the State card is on Home');
    ok(/Which state do you work in\?/.test(await txt(p, '#homeStateCard') || ''), 'individual wording: ' + (await txt(p, '#homeStateH')));
    ok(!(await vis(p, '#homeStateUse')), 'no guess, no "Use ..." button');
    const A = await askRig(p);
    // nothing known yet: Ask sends no state; with a photo-stamp place it sends that
    await A.open(); let j = await A.ask('How long is my 811 ticket good for?');
    ok(j && j.ctx.state === undefined, 'nothing known: no state sent');
    await p.evaluate(() => localStorage.setItem('pbHereState', JSON.stringify({ s: 'AZ', at: Date.now() })));
    j = await A.ask('and the tolerance zone?'); ok(j.ctx.state === 'AZ' && j.ctx.state_how === 'here', 'phone location sent: ' + JSON.stringify([j.ctx.state, j.ctx.state_how]));
    await p.evaluate(() => { window.pbGoHome ? window.pbGoHome() : window.pbGoto('home'); window.pbRenderHome(); }); await p.waitForTimeout(400);
    ok(/Use Arizona/.test(await txt(p, '#homeStateUse') || ''), 'the card offers the state the phone is in: ' + (await txt(p, '#homeStateUse')));
    await p.evaluate(() => localStorage.removeItem('pbHereState')); await p.evaluate(() => window.pbRenderHome()); await p.waitForTimeout(200);
    await p.selectOption('#homeStateSel', 'TX'); await p.waitForTimeout(300);
    ok(!(await vis(p, '#homeStateCard')) && (await p.evaluate(() => window.__debugSt.mine())) === 'TX', 'picked Texas: card gone, state kept');
    ok(!(await p.evaluate(() => window.__rpcLog.includes('pb_job_state_set'))), 'individual: nothing sent to a company server');
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500);
    ok(!(await vis(p, '#homeStateCard')) && (await p.evaluate(() => window.__debugSt.mine())) === 'TX', 'after a reload: not asked again, still Texas');
    // Ask: the state is sent, and shown under the answer
    await A.open();
    A.R.reply = { ok: true, v: 2, text: 'Texas: 14 working days.', used: 1, limit: 20, state: { code: 'TX', how: 'company', used: true } };
    j = await A.ask('How long is my 811 ticket good for?');
    ok(j.ctx.state === 'TX' && j.ctx.state_how === 'company', 'Ask is sent the state: ' + JSON.stringify([j.ctx.state, j.ctx.state_how]));
    ok(/^Answered for Texas\. ?Change$/.test(await txt(p, '#aiAskSt0') || ''), 'under the answer: "' + (await txt(p, '#aiAskSt0')) + '"');
    const fs = await p.evaluate(() => { const e = document.querySelector('#aiAskSt0'), c = document.querySelector('#aiAskStChange'); const r = c.getBoundingClientRect(); return { size: parseFloat(getComputedStyle(e).fontSize), h: r.height, right: e.getBoundingClientRect().right, w: document.documentElement.clientWidth }; });
    ok(fs.size <= 14 && fs.h >= 44 && fs.right <= fs.w + 1, 'small text, 44 px tap target, inside the screen ' + JSON.stringify(fs));
    await p.click('#aiAskStChange'); await p.waitForTimeout(200); await p.selectOption('#aiAskStSel', 'NV'); await p.waitForTimeout(300);
    ok(/^Answered for Texas\. Next answers: Nevada\.$/.test(await txt(p, '#aiAskSt0') || ''), 'after Change: "' + (await txt(p, '#aiAskSt0')) + '"');
    A.R.reply = { ok: true, v: 2, text: '1.25 ft.', used: 2, limit: 20, state: { code: 'NV', how: 'company', used: false } };
    j = await A.ask('What is the fall over 250 feet at 0.5%?');
    ok(j.ctx.state === 'NV', 'the next question carries Nevada');
    ok((await txt(p, '#aiAskSt0')) === null, 'state did not matter to the answer (used: false): no line');
    ok(/^Answered for Texas\.$/.test(await txt(p, '#aiAskSt1') || ''), 'the older answer keeps its own line, no Change: "' + (await txt(p, '#aiAskSt1')) + '"');
    A.R.reply = { ok: true, v: 2, text: 'Nevada: 28 days.', used: 3, limit: 20, state: { code: 'NV', how: 'company' } };
    await A.ask('ticket life?'); ok(/^Answered for Nevada\. ?Change$/.test(await txt(p, '#aiAskSt0') || ''), 'server without "used": the line shows');
    A.R.reply = { ok: true, v: 2, text: 'Answer.', used: 4, limit: 20 };
    await A.ask('what is SDR 35'); ok((await txt(p, '#aiAskSt0')) === null, 'server that sends no state (today\'s live build): no line');
    ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  // ---------- 2. Individual: Ask had to ask; Not Now ----------
  {
    const { b, p } = await L.boot(L.URL, { init: IND + ACK });
    await p.click('#homeStateLater'); await p.waitForTimeout(200);
    ok(!(await vis(p, '#homeStateCard')), 'Not Now hides the card');
    const A = await askRig(p); await A.open();
    A.R.reply = { ok: true, v: 2, text: 'It changes by state. Which state is the job in?', used: 1, limit: 20, state: { code: null, how: 'unknown', asked: true } };
    await A.ask('How long is my 811 ticket good for?');
    ok(await vis(p, '#aiAskStSel'), 'Ask asked which state: a State pick sits under the answer');
    A.R.reply = { ok: true, v: 2, text: 'Florida: 30 calendar days.', used: 2, limit: 20, state: { code: 'FL', how: 'company', used: true } };
    const before = A.sent.length; await p.selectOption('#aiAskStSel', 'FL'); await p.waitForTimeout(1200);
    const j = A.sent[A.sent.length - 1];
    ok(A.sent.length === before + 1 && j.question === 'How long is my 811 ticket good for?' && j.ctx.state === 'FL', 'one tap: the same question is asked again with Florida ' + JSON.stringify([A.sent.length - before, j.ctx.state]));
    ok(/^Answered for Florida\./.test(await txt(p, '#aiAskSt0') || '') && !(await vis(p, '#aiAskStSel')), 'answered for Florida; the pick is gone');
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3500);
    ok(!(await vis(p, '#homeStateCard')) && (await p.evaluate(() => window.__debugSt.mine())) === 'FL', 'kept after a reload; Home does not ask');
    ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  // ---------- 3. Company account (owner / PM): asked once when the company has no state; saved for the company; New Job ----------
  {
    const srv = `;window.__co=null;window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_state_rules_get:()=>({ok:true,company_state:window.__co,jobs:{},can_set_company:true,server_at:new Date().toISOString()}),pb_job_state_set:(a)=>{if(!a.p_job_number)window.__co=a.p_state;return {ok:true,job_key:String(a.p_job_number||'').toLowerCase(),state:a.p_state};},pb_prod_job_create:(a)=>({ok:true,job_key:String(a.p_job_number).toLowerCase(),job_number:a.p_job_number,version:1,plan:a.p_plan})});`;
    const { b, p } = await L.boot(L.URL, { init: L.mgr + IND + ACK + srv, wait: 4500 });
    await p.evaluate(() => window.pbRenderHome()); await p.waitForTimeout(600);
    ok(await vis(p, '#homeStateCard') && /Which state does your company work in\?/.test(await txt(p, '#homeStateH') || ''), 'company account, no company state: asked on Home ("' + (await txt(p, '#homeStateH')) + '")');
    const box = await p.evaluate(() => { const e = document.querySelector('#homeStateCard').getBoundingClientRect(); return { r: e.right, w: document.documentElement.clientWidth }; });
    ok(box.r <= box.w + 1, 'card fits a 390 px phone');
    await p.screenshot({ path: __dirname + '/../work/home_state_card_390.png' });
    await p.selectOption('#homeStateSel', 'TX'); await p.waitForTimeout(500);
    const set = await p.evaluate(() => (window.__rpcArgs || []).filter(x => x[0] === 'pb_job_state_set').map(x => x[1]));
    ok(set.length === 1 && !set[0].p_job_number && set[0].p_state === 'TX', 'saved as the company\'s state on the server: ' + JSON.stringify(set.map(x => [x.p_job_number, x.p_state])));
    ok(!(await vis(p, '#homeStateCard')), 'card gone');
    // New Job: the State field only when City, State has no state
    await p.evaluate(() => window.pbCxNewOpen()); await p.waitForTimeout(500);
    const auto = await p.evaluate(() => document.getElementById('cxnAddr').value);
    ok((await vis(p, '#cxnStateF')) === !(await p.evaluate(() => !!window.pbSrMath.parse(document.getElementById('cxnAddr').value))), 'New Job opens with City, State "' + auto + '": State field ' + ((await vis(p, '#cxnStateF')) ? 'shown' : 'hidden'));
    await p.fill('#cxnAddr', 'Reno, NV'); await p.waitForTimeout(150); ok(!(await vis(p, '#cxnStateF')), '"Reno, NV": no State field');
    await p.fill('#cxnAddr', 'Main St yard'); await p.waitForTimeout(150); ok(await vis(p, '#cxnStateF'), '"Main St yard": State field shown');
    ok(/Texas \(company state\)/.test(await p.evaluate(() => document.querySelector('#cxnState option').textContent)), 'left alone it says the company state is used');
    await p.fill('#cxnAddr', ''); await p.waitForTimeout(150); ok(await vis(p, '#cxnStateF'), 'empty City, State: State field shown');
    await p.screenshot({ path: __dirname + '/../work/new_job_state_390.png' });
    await p.selectOption('#cxnState', 'UT'); await p.fill('#cxnJob', 'FU-101'); await p.click('#cxnSave'); await p.waitForTimeout(1500);
    const set2 = await p.evaluate(() => (window.__rpcArgs || []).filter(x => x[0] === 'pb_job_state_set').map(x => [x[1].p_job_number, x[1].p_state]));
    ok(set2.some(x => x[0] === 'FU-101' && x[1] === 'UT'), 'the new job\'s state is saved: ' + JSON.stringify(set2));
    const js = await p.evaluate(() => window.pbSrJobState('FU-101'));
    ok(js.code === 'UT' && (js.how === 'picked' || js.how === 'phone'), 'the job answers Utah: ' + JSON.stringify(js));
    ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  // ---------- 4. Company state already set / a crew member: never asked; no Change without a job ----------
  {
    const srv = `;window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_state_rules_get:()=>({ok:true,company_state:'TX',jobs:{},can_set_company:true,server_at:new Date().toISOString()})});`;
    const { b, p } = await L.boot(L.URL, { init: L.mgr + IND + ACK + srv, wait: 4500 });
    await p.evaluate(() => window.pbRenderHome()); await p.waitForTimeout(600);
    ok(!(await vis(p, '#homeStateCard')) && (await p.evaluate(() => window.__debugSt.mine())) === 'TX', 'company state already set: not asked');
    await b.close();
  }
  {
    const srv = `;window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_state_rules_get:()=>({ok:true,company_state:null,jobs:{},can_set_company:false,server_at:new Date().toISOString()})});`;
    const { b, p } = await L.boot(L.URL, { init: L.co + ACK + srv, wait: 4500 });
    await p.evaluate(() => { window.pbCurJobGet = () => null; window.pbRenderHome(); }); await p.waitForTimeout(600);
    ok(!(await vis(p, '#homeStateCard')), 'foreman (cannot set the company state): not asked on Home');
    const A = await askRig(p); await A.open();
    A.R.reply = { ok: true, v: 2, text: 'Texas: 14 working days.', used: 1, limit: 20, state: { code: 'TX', how: 'company_jobs', used: true } };
    await A.ask('How long is my 811 ticket good for?');
    ok(/^Answered for Texas\.$/.test(await txt(p, '#aiAskSt0') || ''), 'crew member, no job open: the line, no Change ("' + (await txt(p, '#aiAskSt0')) + '")');
    await p.evaluate(() => { window.pbCurJobGet = () => ({ job_number: '24-017', name: 'Main St sewer' }); });
    A.R.reply = { ok: true, v: 2, text: 'Texas: 14 working days.', used: 2, limit: 20, state: { code: 'TX', how: 'company_jobs', used: true } };
    await A.ask('and the wait?'); await p.click('#aiAskStChange'); await p.waitForTimeout(200); await p.selectOption('#aiAskStSel', 'OK'); await p.waitForTimeout(300);
    const js = await p.evaluate(() => window.pbSrJobState('24-017'));
    ok(js.code === 'OK' && js.how === 'phone', 'with a job open, Change sets that job\'s state (same as Change State on Locates): ' + JSON.stringify(js));
    const j = await A.ask('again'); ok(j.ctx.state === 'OK' && j.ctx.job === '24-017', 'and Ask sends it: ' + JSON.stringify([j.ctx.job, j.ctx.state, j.ctx.state_how]));
    ok(!p.errs.length, 'no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  console.log(fails ? fails + ' of ' + n + ' FAILED' : 'ALL PASS ' + n + '/' + n); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
