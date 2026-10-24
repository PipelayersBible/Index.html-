// Supabase mock with a controllable start-up session check.
// localStorage '__mockSess' = signed-in user JSON (or absent).
// localStorage '__hangBoot' = '1' -> the FIRST getSession of each page load waits for window.__answerSession(user|null).
// localStorage '__failSub' = '1' -> subscriptions query errors (offline).
const L = require('/home/claude/test/lib.js');
function mockInit() {
  const users = { 'a@x.com': { id: 'acctA', email: 'a@x.com' }, 'b@x.com': { id: 'acctB', email: 'b@x.com' } };
  const getU = () => { try { return JSON.parse(localStorage.getItem('__mockSess') || 'null'); } catch (e) { return null; } };
  window.__mockFrom = [];
  let first = true;
  const chain = (t) => { const q = { _t: t, select() { return q; }, eq(k, v) { if (q._op) q._op.eq = [k, v]; return q; },
    insert(row) { q._op = { t, op: 'insert', row, uid: (getU() || {}).id }; window.__mockFrom.push(q._op); return q; },
    update(row) { q._op = { t, op: 'update', row, uid: (getU() || {}).id }; window.__mockFrom.push(q._op); return q; },
    upsert(row) { q._op = { t, op: 'upsert', row, uid: (getU() || {}).id }; window.__mockFrom.push(q._op); return q; },
    then(res, rej) { return Promise.resolve({ error: null }).then(res, rej); },
    maybeSingle: async () => (localStorage.getItem('__failSub') ? { data: null, error: { message: 'offline' } } : { data: t === 'subscriptions' ? { tier: 'contractor', status: 'active' } : null, error: null }),
    single: async () => {
      if (t === 'runs' && window.__upsertMode === 'error') return { data: null, error: { message: 'network' } };
      if (t === 'runs' && window.__upsertMode === 'hang') { window.__upsertMode = 'ok'; const r = await new Promise(res => { window.__releaseUpsert = res; }); if (r === 'error') return { data: null, error: { message: 'network' } }; }
      if (t === 'management_reports' && window.__reportMode === 'hang') { window.__reportMode = 'ok'; const r = await new Promise(res => { window.__releaseReport = res; }); if (r === 'error') return { data: null, error: { message: 'network' } }; }
      const id = 'srv' + Math.random().toString(36).slice(2, 7); if (q._op) q._op.id = id; return { data: { id }, error: null }; } }; return q; };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => ({
    auth: {
      getSession: () => {
        if (first && localStorage.getItem('__hangBoot')) { first = false; return new Promise(r => { window.__answerSession = (u) => r({ data: { session: u ? { user: u } : null } }); }); }
        first = false;
        return Promise.resolve({ data: { session: getU() ? { user: getU() } : null } });
      },
      signInWithPassword: async ({ email }) => { const u = users[email]; if (!u) return { data: {}, error: { message: localStorage.getItem('__loginErr') || 'bad' } }; /* r15.35: __loginErr = the service's text to answer with */ localStorage.setItem('__mockSess', JSON.stringify(u)); return { data: { user: u }, error: null }; },
      signOut: async () => { localStorage.removeItem('__mockSess'); return {}; },
      onAuthStateChange: (f) => { window.__authEvent = f; return { data: { subscription: { unsubscribe() {} } } }; }
    },
    from: chain,
    storage: { from: () => ({ upload: async (path) => { (window.__uploads = window.__uploads || []).push(path); return { error: null }; } }) }
  }) }; }, set(v) {} });
}
async function newCtx(browser) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(mockInit);
  return ctx;
}
async function open(ctx, { waitCover = true } = {}) {
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  await page.goto(L.ORIGIN);
  if (waitCover) await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 15000 });
  await page.waitForTimeout(500);
  return page;
}
async function loginAs(page, email) {
  await L.dismiss(page);
  await page.evaluate(() => pbGoto('login', false, true));
  await page.fill('#loginEmail', email); await page.fill('#loginPassword', 'pw');
  await page.click('#loginSubmitBtn');
  await page.waitForFunction((e) => document.getElementById('loggedInAs').textContent.includes(e), email);
  await page.waitForTimeout(400);
}
const modal = (page) => page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); return getComputedStyle(ov).display === 'none' ? null : { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
const clickModal = (page, label) => page.evaluate((l) => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
module.exports = { ...L, mockInit, newCtx, open, loginAs, modal, clickModal };
