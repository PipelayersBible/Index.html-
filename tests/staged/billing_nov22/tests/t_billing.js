// billing_nov22: Billing and Trial End review fixes, app side. PASS/FAIL per item; exit 1 on any FAIL.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_billing.js   (page served with sw.js, data/ and pbx/ next to it)
// Fake server (tests/rig/fakesb.js): pb_my_plan / owner RPCs are answered per case; nothing is sent anywhere.
const R = __dirname + '/../../../rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co'), mgr = require(R + 'mgr');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10931/cur.html';
let fails = 0; const ok = (c, m, got) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c || got === undefined ? '' : '  [got: ' + String(got).slice(0, 400) + ']')); if (!c) fails++; };
const DAY = 864e5, iso = (ms) => new Date(ms).toISOString(), ymd = (ms) => { const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayTxt = (ms) => { const d = new Date(ms); return WD[d.getDay()] + ' ' + MO[d.getMonth()] + ' ' + d.getDate(); };
const PRICES = { base_cents: 9900, base_seats: 5, seat_cents: 1200, yearly_months: 10, founder_months: 12, individual_cents: 1500, individual_year_cents: 14400, plan_sheet_cents: 100 };
const CO_ID = 'd01a4a5f-312a-418f-9172-ea9aec9784b5';
const plan = (o) => `;window.__rpcOverride.pb_my_plan=()=>(${JSON.stringify(Object.assign({ ok: true, prices: PRICES }, o))});window.__rpcOverride.pb_plan_request=(a)=>{window.__req=a;return {ok:true,before_end:true,people:6,month_cents:11100};};window.__rpcOverride.pb_removed_dismiss=()=>({ok:true});`;
const COMPANY = co + mgr + `;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:null,companies:{name:'Acme Pipeline',status:'active'}});
 window.__rpcOverride.pb_report_access=()=>({member:false,manager:true,managed_company_id:'${CO_ID}'});})();`;
const PM = co + `;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'pm',title:'project_manager',companies:{name:'Acme Pipeline',status:'active'}}});
 window.__rpcOverride.pb_prod_access=()=>({member:true,company_id:'11111111-1111-4111-8111-111111111111',manager:true,role:'pm',server_at:new Date().toISOString()});})();`;
const FM = co + `;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'foreman',companies:{name:'Acme Pipeline',status:'active'}}});})();`;
const SOLO = co + `;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{subscriptions:{tier:'individual',status:'active'},company_members:null});
 window.__rpcOverride.pb_prod_access=()=>({member:false,company_id:null,manager:false,role:null,server_at:new Date().toISOString()});window.__rpcOverride.pb_report_access=()=>({member:false,manager:false});})();`;

async function boot(init, o = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', timezoneId: 'America/Los_Angeles' });
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(R + 'fakesb.js', 'utf8') }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await ctx.addInitScript(init);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(o.wait || 4500);
  return { b, p };
}
const line = (p) => p.evaluate(() => { const l = document.getElementById('pbBetaLine'); return !l || l.hidden ? '(hidden)' : l.innerText.replace(/\s+/g, ' ').trim(); });
const btns = (p) => p.evaluate(() => [...document.querySelectorAll('#pbBetaLine button')].map(x => x.innerText.trim() + '|' + (x.dataset.plan || x.dataset.own || '')));
const modalClick = (p, t) => p.evaluate((t) => { const ds = [...document.querySelectorAll('.pb-modal-overlay,[role=alertdialog],[role=dialog]')].filter(x => x.offsetParent); for (const d of ds) { const b = [...d.querySelectorAll('button')].find(b => b.textContent.trim() === t); if (b) { b.click(); return true; } } return false; }, t);
const args = (p, fn) => p.evaluate((fn) => (window.__rpcArgs || []).filter(x => x[0] === fn).map(x => x[1]), fn);

(async () => {
  const now = Date.now();
  // ---------- #1 #17 #21: trial running, company account ----------
  { const end = now + 10.4 * DAY;
    const { b, p } = await boot(COMPANY + plan({ plan: 'trial', trial_ends_at: iso(end), days_left: 11, expired: false, is_owner: true, people: 6, joined: 4, request: null, billing: null, requested: false }));
    const l = await line(p), bt = await btns(p);
    ok(l.includes('Trial ends ' + dayTxt(end)) && /days left/.test(l), '#17 Home shows the trial end date', l);
    ok(l.includes('For your 6 people: $111 a month (or $1,110 a year), plus tax.'), '#21 his own amount for 6 people', l);
    ok(bt.includes('Start Monthly $111|company:month') && bt.includes('Start Yearly $1,110|company:year'), '#1 Start Company Plan (Monthly / Yearly) during the trial', bt.join(', '));
    await p.evaluate(() => [...document.querySelectorAll('#pbBetaLine button')].find(x => x.dataset.plan === 'company:year').click()); await p.waitForTimeout(700);
    const a = await p.evaluate(() => window.__req), l2 = await line(p);
    ok(a && a.p_kind === 'company:year', '#1 the request carries Yearly', JSON.stringify(a));
    ok(l2.includes('Request sent. Thomas will email you a one-page order to sign. For your 6 people: $1,110 a year (or $111 a month), plus tax.') && l2.includes('founder price is locked for 12 months'), '#21 the right next step and his amount after the request', l2);
    await p.evaluate(() => pbGoto('settings')); await p.waitForTimeout(800);
    const yp = await p.evaluate(() => { const e = document.getElementById('settingsYourPlan'); return e && !e.hidden && e.offsetParent ? e.innerText.replace(/\s+/g, ' ') : '(hidden)'; });
    ok(yp.includes('Your plan') && yp.includes('Trial ends ' + dayTxt(end)) && yp.includes('$111 a month') && yp.includes('admin@pipelayersbible.com'), '#23 Settings > Your plan (trial)', yp);
    ok(!p.errs.length, 'no page errors (trial, company account)', p.errs.join(' | ')); await b.close(); }
  { const end = now + 3 * 3600e3;
    const { b, p } = await boot(COMPANY + plan({ plan: 'trial', trial_ends_at: iso(end), days_left: 1, expired: false, is_owner: true, people: 4, requested: false }));
    const l = await line(p), t = new Date(end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
    ok(l.includes('Trial ends ' + dayTxt(end) + ' at ' + t) && !/days left/.test(l), '#17 last day: the end time is shown', l);
    ok((await btns(p)).some(x => x.startsWith('Start Monthly $99')), '#1 the button is there with 3 hours left ($99 for 4 people)', (await btns(p)).join(', '));
    await b.close(); }
  { const { b, p } = await boot(COMPANY + plan({ plan: 'trial', trial_ends_at: iso(now + 5 * DAY), days_left: 5, expired: false, requested: false }));
    ok((await btns(p)).includes('Start Company Plan|company'), 'old server (no is_owner): one Start Company Plan button sending "company"', (await btns(p)).join(', '));
    await b.close(); }
  // ---------- trial ended: company account, PM, foreman ----------
  { const { b, p } = await boot(COMPANY + plan({ plan: 'trial', trial_ends_at: iso(now - DAY), expired: true, closed: false, is_owner: true, people: 6, requested: false }));
    const l = await line(p); ok(l.includes('Trial ended') && l.includes('For your 6 people: $111 a month') && (await btns(p)).some(x => x.startsWith('Start Yearly $1,110')), 'trial ended: company account gets his price and Monthly / Yearly', l); await b.close(); }
  { const { b, p } = await boot(PM + plan({ plan: 'trial', trial_ends_at: iso(now - DAY), expired: true, closed: false, is_owner: false, requested: false }));
    const l = await line(p); ok(l.includes('Ask the company account to tap Start Company Plan on its Home screen. The company plan is $99 a month') && !(await btns(p)).some(x => /company/.test(x)), '#9 PM at trial end: ask the company account (with the price), no button', l); await b.close(); }
  { const { b, p } = await boot(FM + plan({ plan: 'trial', trial_ends_at: iso(now - DAY), expired: true, closed: false, is_owner: false, requested: false }));
    const l = await line(p); ok(l.includes('Your office decides') && !/\$/.test(l), '#8 (unchanged) foreman at trial end: no price, office decides', l); await b.close(); }
  // ---------- #2 #23 paid plan: payment due, paused, Your plan ----------
  const BILL = { state: 'past_due', paused_reason: null, due_on: ymd(now - 2 * DAY), lock_on: ymd(now + 5 * DAY), paid_through: ymd(now - 2 * DAY), first_invoice: false, interval: 'month', seats_paid: 7, people: 7, joined: 7,
    next: { from: ymd(now - 2 * DAY), to: ymd(now + 28 * DAY), seats: 7, amount_cents: 12300, interval: 'month' } };
  { const { b, p } = await boot(COMPANY + plan({ plan: 'paid', paused: false, closed: false, ended: false, is_owner: true, people: 7, billing: BILL }));
    const l = await line(p); ok(l.includes('Payment due') && l.includes('The plan pauses on ' + dayTxt(now + 5 * DAY) + ' if it isn’t paid. Questions: admin@pipelayersbible.com'), '#2 company account: Payment due with the pause date and contact', l);
    await p.evaluate(() => pbGoto('settings')); await p.waitForTimeout(800);
    const yp = await p.evaluate(() => { const e = document.getElementById('settingsYourPlan'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ') : '(hidden)'; });
    ok(yp.includes('Company plan, monthly · 7 people (7 paid) · paid through ' + dayTxt(now - 2 * DAY)) && yp.includes('Payment due') && yp.includes('$123 for the month'), '#23 Your plan: interval, people / paid seats, paid through, next bill', yp);
    await b.close(); }
  { const { b, p } = await boot(FM + plan({ plan: 'paid', paused: false, closed: false, ended: false, is_owner: false }));
    ok((await line(p)) === '(hidden)', '#2 a crew member sees nothing while the company is past due', await line(p));
    await p.evaluate(() => pbGoto('settings')); await p.waitForTimeout(600);
    ok(await p.evaluate(() => { const e = document.getElementById('settingsYourPlan'); return !e || e.hidden; }), '#23 no Your plan card for the crew'); await b.close(); }
  { const { b, p } = await boot(COMPANY + plan({ plan: 'paid', paused: true, closed: true, ended: false, is_owner: true, billing: Object.assign({}, BILL, { state: 'read_only', paused_reason: 'unpaid' }) }));
    const l = await line(p); ok(l.includes('Plan paused') && l.includes('Payment for ' + dayTxt(now - 2 * DAY) + ' – ' + dayTxt(now + 28 * DAY) + ' wasn’t received') && l.includes('admin@pipelayersbible.com'), '#2 Plan paused: reason and contact for the company account', l); await b.close(); }
  { const { b, p } = await boot(FM + plan({ plan: 'paid', paused: true, closed: true, ended: false, is_owner: false }));
    const l = await line(p); ok(l.includes('Plan paused') && !l.includes('admin@') && !/\$/.test(l), 'Plan paused for the crew: no price, no billing contact', l); await b.close(); }
  // ---------- #20 ended; #19 Not Now; #16 individual payment due ----------
  { const { b, p } = await boot(FM + plan({ plan: 'paid', paused: true, closed: true, ended: true, is_owner: false, company: 'Acme Pipeline', individual: false, requested: false }));
    const l = await line(p), bt = await btns(p);
    ok(l.includes('Acme Pipeline’s plan has ended. Your records were kept for the company.') && bt.some(x => x.endsWith('|individual:month')), '#20 canceled company crew: plan has ended, records kept, own-plan offer', l); await b.close(); }
  { const { b, p } = await boot(co + plan({ plan: null, removed: { company: 'Acme Pipeline', at: iso(now - DAY) }, individual: false, requested: false }));
    await p.click('#pbBetaLine [data-own="0"]'); await p.waitForTimeout(800);
    ok((await line(p)) === '(hidden)', '#19 removed member: Not Now clears Home', await line(p)); await b.close(); }
  { const { b, p } = await boot(co + plan({ plan: null, individual: false, dismissed: true, requested: false }));
    ok((await line(p)) === '(hidden)', '#19 after Not Now (server says dismissed): nothing on Home', await line(p)); await b.close(); }
  { const { b, p } = await boot(SOLO + plan({ plan: null, individual: true, individual_state: 'past_due', individual_lock_on: ymd(now + 5 * DAY), requested: false }));
    const l = await line(p); ok(l.includes('Payment due') && l.includes('Your plan pauses on ' + dayTxt(now + 5 * DAY)), '#16 individual past due: Payment due with the date', l); await b.close(); }
  { const { b, p } = await boot(SOLO + plan({ plan: null, individual: false, individual_state: 'lapsed', requested: false }), { wait: 6500 });
    const l = await line(p); ok(l.includes('Payment due') && !l.includes('No plan yet'), '#16 individual lapsed: Payment due, not "No plan yet"', l);
    const shut = await p.evaluate(() => window.pbCanOpen('stats') === false && window.pbCanOpen('quickrun') === false);
    ok(shut, '#16 lapsed individual: plan screens closed');
    const acct = await p.evaluate(() => (document.getElementById('loggedInAs') || {}).textContent || '');
    ok(/Individual plan \(payment due\)/.test(acct), '#16 the account line says payment due', acct); await b.close(); }
  // ---------- #25 AI reset words, Pacific phone ----------
  { const { b, p } = await boot(co + plan({ plan: 'paid', paused: false }));
    const r = await p.evaluate(() => [window.pbAiResetTxt(false), window.pbAiResetTxt(true)]);
    const exp = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/Los_Angeles' });
    ok(r[0].startsWith('It resets at ' + exp) && /(today|tomorrow)\.$/.test(r[0]), '#25 day reset said in phone time (' + exp + ')', r[0]);
    ok(/^It resets (today|tomorrow|[A-Z][a-z]{2} \d+) at \d/.test(r[1]), '#25 month reset says the date and time', r[1]); await b.close(); }
  // ---------- #7 Crew members uses the bill's numbers ----------
  { const CREW = `;window.__rpcOverride.pb_crew_list=()=>({company_id:'${CO_ID}',company_name:'Acme Pipeline',me:'x',is_owner:true,owner_user_id:'x',invites_today:0,invite_limit:30,seats:4,seats_included:5,pm_ready:true,can_manage_pms:true,alerts:null,server_at:new Date().toISOString(),members:[],invitations:[],billing:{plan:'paid',people:6,joined:4,waiting:2,paid:8,interval:'month'}});`;
    const { b, p } = await boot(COMPANY + CREW + plan({ plan: 'paid', paused: false, is_owner: true }));
    await p.evaluate(() => { try { pbOpenCrewMembers(); } catch (e) { window.__ce = e.message; } }); await p.waitForTimeout(1500);
    const t = await p.evaluate(() => (document.getElementById('crSeats') || {}).textContent || '');
    ok(t.startsWith('6 people (2 waiting to join) · 8 paid · monthly'), '#7 Crew members: "6 people (2 waiting to join)", paid seats, interval', t); await b.close(); }
  // ---------- owner Billing: Make Paid form, Invoice Sent, Restart, Undo Cancel, Edit, Switch, Catch-up, also-in ----------
  const T0 = ymd(now), T1 = ymd(now + 30 * DAY);
  const acct = (o) => Object.assign({ legal_name: 'Acme Pipeline LLC', billing_email: 'ap@acme.com', state: 'active', stored_state: 'active', read_only: false, interval: 'month', next_interval: null, paid_through: T1, period_start: T0, first_invoice: false,
    due_on: T1, lock_on: ymd(now + 37 * DAY), seats_capacity: 6, seats_min: 0, seats_used: 6, joined: 6, waiting: 0, seat_cents: 1200, tax_state: 'CA', terms_version: '1.0', plan_reading: false,
    catchup: { people: 0, months: 0, cents: 0, each_cents: 0, monthly_next_invoice: 0 }, invoice: null,
    next: { from: T1, to: ymd(now + 60 * DAY), seats: 6, amount_cents: 11100, interval: 'month', sent: false, due: true, first: false } }, o);
  const OWNER = (cos, inds) => `;window.__rpcOverride.pb_owner_overview=()=>({ok:true,companies:${JSON.stringify(cos.map(c => ({ id: c.id, name: c.name, plan: c.plan, trial_ends_at: c.trial_ends_at || null, users: 3, active_7d: 1, active_days: 3, ai: {}, events: {} })))},totals:null});
    window.__rpcOverride.pb_owner_plan_requests=()=>({ok:true,requests:[]});window.__rpcOverride.pb_owner_sheets_read=()=>({ok:true,companies:[],individuals:[],all:{}});
    window.__rpcOverride.pb_owner_billing=()=>({ok:true,settings:${JSON.stringify(Object.assign({ invoice_ahead_days: 7, grace_days: 7, due_offset_days: 0 }, PRICES))},individuals:${JSON.stringify(inds || [])},companies:${JSON.stringify(cos)},due:[]});
    ['pb_owner_make_paid','pb_owner_billing_invoice_sent','pb_owner_billing_restart','pb_owner_billing_state','pb_owner_billing_edit','pb_owner_billing_next_interval','pb_owner_billing_catchup_paid','pb_owner_individual_off','pb_owner_billing_paid'].forEach(n=>{window.__rpcOverride[n]=()=>({ok:true,account:{next:{},period_start:'${T0}',paid_through:'${T0}',due_on:'${ymd(now + 7 * DAY)}',lock_on:'${ymd(now + 14 * DAY)}'}});});`;
  { const trial = { id: 'c1', name: 'Acme Pipeline', plan: 'trial', trial_ends_at: iso(now - DAY), seats_used: 6, founder_ok: true, request: { at: iso(now - 2 * DAY), interval: 'year', open: true, before_end: true }, people: [], owner_login: 'own@acme.com', account: null };
    const { b, p } = await boot(co + OWNER([trial]));
    await p.evaluate(() => window.pbOwnerOpen()); await p.waitForTimeout(1500);
    await p.evaluate(() => [...document.querySelectorAll('#pbOwnerSheet [data-act="paid"]')][0].click()); await p.waitForTimeout(600);
    const f = await p.evaluate(() => ({ seats: !!document.getElementById('pbMpSeatsIn'), st: !!document.getElementById('pbMpState'), terms: (document.getElementById('pbMpTerms') || {}).value, founder: !document.getElementById('pbMpFounder').disabled,
      yr: (document.querySelector('#pbMakePaid [data-iv="year"]') || {}).getAttribute && document.querySelector('#pbMakePaid [data-iv="year"]').getAttribute('aria-pressed'), note: document.getElementById('pbMakePaid').innerText.replace(/\s+/g, ' ') }));
    ok(f.seats && f.st && f.terms === '1.0', '#6 Make Paid has Seats, billing address (state) and Terms version', JSON.stringify(f));
    ok(f.founder && f.yr === 'true' && /before the beta ended/.test(f.note), '#17 founder box on (asked before the end) and Yearly picked from the request', f.note.slice(0, 300));
    await p.fill('#pbMpEmail', 'ap@acme.com'); await p.fill('#pbMpSigner', 'Jo Doe, Owner'); await p.click('#pbMpGo'); await p.waitForTimeout(400);
    ok((await args(p, 'pb_owner_make_paid')).length === 0 && /state/.test(await p.evaluate(() => document.getElementById('pbMpSt').textContent)), '#6 no Make Paid without a billing state');
    await p.fill('#pbMpState', 'ca'); await p.fill('#pbMpCity', 'Fresno'); await p.fill('#pbMpSeatsIn', '8'); await p.dispatchEvent('#pbMpSeatsIn', 'input'); await p.click('#pbMpFounder'); await p.click('#pbMpGo'); await p.waitForTimeout(800);
    const a = (await args(p, 'pb_owner_make_paid'))[0] || {};
    ok(a.p_seats === 8 && a.p_address && a.p_address.state === 'CA' && a.p_terms_version === '1.0' && a.p_interval === 'year' && a.p_founder === true, '#6 Make Paid sends seats 8, state CA, Terms 1.0, yearly, founder', JSON.stringify(a));
    const done = await p.evaluate(() => document.getElementById('pbMakePaid').innerText.replace(/\s+/g, ' '));
    ok(/stays in Billing due until you press Paid/.test(done), '#3 the answer says the first invoice stays in Billing due until Paid', done.slice(0, 300));
    ok(!p.errs.length, 'no page errors (Make Paid)', p.errs.join(' | ')); await b.close(); }
  { const c1 = { id: 'c1', name: 'Acme Pipeline', plan: 'paid', seats_used: 7, people: [], owner_login: 'own@acme.com', account: acct({ catchup: { people: 1, months: 11, cents: 11000, each_cents: 11000, monthly_next_invoice: 0 }, interval: 'year', seats_used: 8, joined: 7, waiting: 1 }) };
    const c2 = { id: 'c2', name: 'Bravo Pipe', plan: 'paid', seats_used: 5, people: [], account: acct({ legal_name: 'Bravo Pipe Inc', state: 'read_only', next: { from: ymd(now - 60 * DAY), to: ymd(now - 30 * DAY), seats: 5, amount_cents: 9900, interval: 'month', sent: true, due: true } }) };
    const c3 = { id: 'c3', name: 'Charlie Co', plan: 'paid', seats_used: 5, people: [], account: acct({ legal_name: 'Charlie Co', state: 'canceled', stored_state: 'canceled', read_only: false, cancel_at: iso(now + 20 * DAY) }) };
    const ind = [{ user_id: 'u9', email: 'solo@x.com', cents: 1500, year_cents: 14400, interval: 'month', paid_through: T0, due_on: ymd(now + 7 * DAY), lock_on: ymd(now + 14 * DAY), first_invoice: true, company: 'Acme Pipeline', state: 'active', next: { from: T0, to: T1, amount_cents: 1500, due: true } }];
    const { b, p } = await boot(co + OWNER([c1, c2, c3], ind));
    await p.evaluate(() => window.pbOwnerOpen()); await p.waitForTimeout(1500);
    const acts = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#pbOwnerSheet .pb-own-co[data-id]')].map(e => [e.dataset.id, [...e.querySelectorAll('[data-act]')].map(x => x.textContent.trim())])));
    ok(acts.c1 && acts.c1.includes('Invoice Sent') && acts.c1.includes('Edit Billing') && acts.c1.includes('Switch to Monthly at Renewal') && acts.c1.includes('Catch-up Paid'), '#5 #14 Invoice Sent, Edit Billing, Switch at Renewal on a paid company', JSON.stringify(acts.c1));
    ok(acts.c2 && acts.c2.includes('Paid – Restart From Today') && !acts.c2.includes('Invoice Sent'), '#13 Paid – Restart From Today on a locked company', JSON.stringify(acts.c2));
    ok(acts.c3 && acts.c3.includes('Undo Cancel'), '#14 Undo Cancel while paid time remains', JSON.stringify(acts.c3));
    const txt = await p.evaluate(() => document.getElementById('pbOwnerSheet').innerText.replace(/\s+/g, ' '));
    ok(/Catch-up: 1 joined above the paid seats × \$110\.00 each \(11 full months left at the yearly rate\) = \$110\.00/.test(txt), '#4 catch-up line at the yearly rate', (txt.match(/Catch-up[^·]*/) || [''])[0]);
    ok(/Also in Acme Pipeline/.test(txt) && /First invoice not paid yet/.test(txt), '#16 individual: also in a company, first invoice not paid', '');
    const click = async (id, t) => { await p.evaluate(([id, t]) => [...document.querySelectorAll('#pbOwnerSheet .pb-own-co[data-id="' + id + '"] [data-act]')].find(x => x.textContent.trim() === t).click(), [id, t]); await p.waitForTimeout(400); };
    await click('c1', 'Invoice Sent'); await modalClick(p, 'Invoice Sent'); await p.waitForTimeout(600);
    ok(JSON.stringify((await args(p, 'pb_owner_billing_invoice_sent'))[0]) === JSON.stringify({ p_company: 'c1', p_from: T1 }), '#5 Invoice Sent records the next period', JSON.stringify(await args(p, 'pb_owner_billing_invoice_sent')));
    await p.waitForTimeout(800); await click('c1', 'Catch-up Paid'); await modalClick(p, 'Catch-up Paid'); await p.waitForTimeout(600);
    ok(((await args(p, 'pb_owner_billing_catchup_paid'))[0] || {}).p_seats === 7, '#18 Catch-up Paid sends the joined count (6 paid + 1), not the invite', JSON.stringify(await args(p, 'pb_owner_billing_catchup_paid')));
    await p.waitForTimeout(800); await click('c2', 'Paid – Restart From Today'); await modalClick(p, 'Restart From Today'); await p.waitForTimeout(600);
    ok(((await args(p, 'pb_owner_billing_restart'))[0] || {}).p_company === 'c2', '#13 Restart From Today calls the server', JSON.stringify(await args(p, 'pb_owner_billing_restart')));
    await p.waitForTimeout(800); await click('c3', 'Undo Cancel'); await modalClick(p, 'Undo Cancel'); await p.waitForTimeout(600);
    ok(JSON.stringify((await args(p, 'pb_owner_billing_state')).pop()) === JSON.stringify({ p_company: 'c3', p_state: 'active' }), '#14 Undo Cancel sets the plan active', JSON.stringify(await args(p, 'pb_owner_billing_state')));
    await p.waitForTimeout(800); await click('c1', 'Switch to Monthly at Renewal'); await modalClick(p, 'Switch'); await p.waitForTimeout(600);
    ok(((await args(p, 'pb_owner_billing_next_interval'))[0] || {}).p_interval === 'month', '#14 Switch at Renewal', JSON.stringify(await args(p, 'pb_owner_billing_next_interval')));
    await p.waitForTimeout(800); await click('c1', 'Edit Billing'); await p.waitForTimeout(400);
    await p.fill('#pbBeState', 'nv'); await p.fill('#pbBeSeats', '9'); await p.click('#pbBeGo'); await p.waitForTimeout(600);
    const e = ((await args(p, 'pb_owner_billing_edit'))[0] || {}).p_changes || {};
    ok(e.billing_address && e.billing_address.state === 'NV' && e.seats_min === 9 && e.legal_name === 'Acme Pipeline LLC', '#14 Edit Billing sends name, address (NV), seats bought', JSON.stringify(e));
    await p.evaluate(() => document.querySelector('#pbOwnerSheet [data-indoff]').click()); await p.waitForTimeout(300); await modalClick(p, 'Turn Off'); await p.waitForTimeout(600);
    ok(((await args(p, 'pb_owner_individual_off'))[0] || {}).p_user === 'u9', '#16 Turn Off Their Plan for someone also in a company', JSON.stringify(await args(p, 'pb_owner_individual_off')));
    ok(!p.errs.length, 'no page errors (owner Billing)', p.errs.join(' | ')); await b.close(); }
  // ---------- static: words ----------
  { const src = fs.readFileSync(require('path').join(process.env.PB_SRC || (__dirname + '/../work/out/index.src.html')), 'utf8');
    ok(!/Contractor plan|Contractor\)|'a Contractor'|\? 'Contractor'/.test(src.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').replace(/Contractor plan: all of that/, '')), '#26 no "Contractor plan" left on screen (source check)');
    ok(src.includes("'pb:beta_ended': 'This company\\u2019s trial has ended") && src.includes("'pb:read_only': 'This company\\u2019s plan is paused"), '#24 Crew members has words for refused email invites');
    ok(!src.includes('can see the plan choices in Settings') && src.includes('can start the plan on its Home screen'), '#23 the join message no longer sends people to Settings for plan choices'); }
  console.log(fails ? fails + ' FAIL' : 'ALL PASS'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
