const L = require('/home/claude/test/lib.js');
// End to end: Lock a run while signed in (mocked Supabase; the upload fails), then reopen the app with no session.
// The upload is still owed: the pending record must survive the signed-out boot, without spending an attempt.
const MOCK = () => {
  if (localStorage.getItem('__useMock') !== '1') return;   // only while "online and signed in"
  // subscriptions lookup answers "contractor, active"; every other call (the run upload) gets no row back, so it fails
  const chain = (table) => new Proxy(function(){}, { get(t, k) { if (k === 'then') return (res) => res({ data: table === 'subscriptions' ? { tier: 'contractor', status: 'active' } : null, error: null }); return chain(table); }, apply() { return chain(table); } });
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }), signInWithPassword: async ({ email }) => ({ data: { user: { id: 'acctS', email } }, error: null }), signOut: async () => ({}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: (table) => chain(table) }) };
};
(async () => {
  const browser = await L.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
  await ctx.route(/supabase/i, r => r.abort());
  await ctx.addInitScript(MOCK);
  await ctx.addInitScript(() => { localStorage.setItem('lastKnownUserId', 'acctS'); localStorage.setItem('acctS:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' })); });
  const page = await L.newPage(browser, 'acctS', ctx);
  await page.evaluate(() => localStorage.setItem('__useMock', '1')); await page.reload(); await page.waitForTimeout(1000);
  await page.evaluate(() => pbGoto('login')); await page.waitForTimeout(200);
  await page.fill('#loginEmail', 'a@example.com'); await page.fill('#loginPassword', 'pw');
  await page.click('#loginSubmitBtn'); await page.waitForTimeout(1500); await L.dismiss(page);
  L.check('setup: signed in', await page.evaluate(() => /Signed in/.test(document.getElementById('loggedInAs').textContent)));
  const id = await L.lockRun(page, { dist: 80 });
  await page.waitForTimeout(1500);
  const pend1 = await page.evaluate(() => JSON.parse(localStorage.getItem('acctS:pendingLockRetries') || '[]'));
  console.log('after signed-in Lock:', JSON.stringify(pend1.map(p => ({ id: p.entryId, s: p.syncStatus, a: p.syncAttempts, owed: p.syncOwed }))));
  L.check('control: the signed-in Lock\'s failed upload leaves the sync pending', pend1.some(p => p.entryId === id && p.syncStatus === 'pending'));
  // reopen offline / without a session
  await page.evaluate(() => localStorage.setItem('__useMock', '0'));
  await page.reload(); await page.waitForTimeout(2000); await L.dismiss(page);
  L.check('setup: this boot has no session', await page.evaluate(() => /Not signed in/.test(document.getElementById('loggedInAs').textContent)));
  const pend2 = await page.evaluate(() => JSON.parse(localStorage.getItem('acctS:pendingLockRetries') || '[]'));
  const e = (await L.archive(page, 'acctS')).find(x => x.id === id);
  console.log('after signed-out boot:', JSON.stringify(pend2.map(p => ({ id: p.entryId, s: p.syncStatus, a: p.syncAttempts }))));
  const p2 = pend2.find(p => p.entryId === id);
  L.check('the owed upload is still pending after a boot with no session (or the run is flagged not synced)', !!p2 || e.cloudSyncFailed === true);
  L.check('a boot with no session does not use up a sync attempt', !p2 || p2.syncAttempts === pend1.find(p => p.entryId === id).syncAttempts);
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
