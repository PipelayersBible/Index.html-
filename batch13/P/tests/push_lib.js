// Batch 13 P: the push-notification harness (reconstructed Nov 11 2026: the original was never synced to the workbench,
// so t_core33 / t_crew34 crashed on the require). Supabase is the hunt6 mock5 (session from localStorage '__mockSess')
// with the production fake server from batch20/HOME/tests/pd_lib.js (window.__rpc; pb_report_access answers the role,
// default foreman), plus the push RPCs below. The phone's push pieces are faked in the page: window.__debugPushHost,
// Notification (permission 'default' -> 'granted' on request), PushManager, navigator.serviceWorker.register -> one
// registration whose pushManager keeps one subscription.
//   ctxFor(browser, { ua, uid = 'acctA', email, seed })  seed: localStorage items set once before the first load
//   open(ctx)  openNotif(page)  state(page) -> pbPushState()  visible(page, id)  ANDROID
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const PD = require('/home/claude/batch20/HOME/tests/pd_lib.js');
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const VAPID = 'B' + 'A'.repeat(86); // 87 chars, base64url (the app accepts 80–100)
function pushInit() {
  const VAPID = 'B' + 'A'.repeat(86); // the module's VAPID, repeated: an init script is serialized without its module scope
  window.__debugPushHost = true; // TEST-ONLY: the app only registers push on its own address
  let perm = 'default';
  window.__pushPerm = (p) => { perm = p; };
  function FakeNotification() {}
  Object.defineProperty(FakeNotification, 'permission', { get: () => perm });
  FakeNotification.requestPermission = function (cb) { if (perm === 'default') perm = localStorage.getItem('__pushAnswer') || 'granted'; if (typeof cb === 'function') cb(perm); return Promise.resolve(perm); };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: FakeNotification });
  if (typeof window.PushManager === 'undefined') window.PushManager = function PushManager() {};
  let cur = null;
  window.__pushSubs = [];
  const mkSub = (o) => { const s = { endpoint: 'https://push.example.test/ep/' + Math.random().toString(36).slice(2), options: { applicationServerKey: o && o.applicationServerKey ? o.applicationServerKey : null, userVisibleOnly: true }, toJSON() { return { endpoint: s.endpoint, keys: { p256dh: 'p256dh-' + s.endpoint.slice(-6), auth: 'auth-' + s.endpoint.slice(-6) } }; }, unsubscribe: async () => { if (cur === s) cur = null; return true; } }; return s; };
  const reg = { scope: './', active: { state: 'activated' }, installing: null, waiting: null, addEventListener() {}, update: async () => {}, unregister: async () => true,
    pushManager: { getSubscription: async () => cur, subscribe: async (o) => { if (localStorage.getItem('__pushSubFail')) throw new Error('AbortError: push service error'); cur = mkSub(o); window.__pushSubs.push(cur.endpoint); return cur; }, permissionState: async () => perm } };
  const sw = { register: async () => { if (localStorage.getItem('__swFail')) throw new Error('SecurityError'); return reg; }, ready: Promise.resolve(reg), getRegistration: async () => reg, getRegistrations: async () => [reg], controller: null, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get: () => sw });
  // the push RPCs, over the production fake server (window.__rpc from pd_lib's RPC); state in localStorage '__pushsrv'
  const o = window.__rpc;
  const srvGet = () => JSON.parse(localStorage.getItem('__pushsrv') || '{"subs":{},"prefs":{}}');
  const srvSet = (v) => localStorage.setItem('__pushsrv', JSON.stringify(v));
  const me = () => (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
  window.__rpc = async (fn, args) => {
    const mode = localStorage.getItem('__rpcMode') || 'ok';
    if (/^pb_push_/.test(fn)) {
      (window.__rpcLog = window.__rpcLog || []).push({ fn, args, t: Date.now() });
      if (mode === 'offline') return { data: null, error: { message: 'Failed to fetch' } };
      if (mode === 'boom') return { data: null, error: { message: 'boom', code: '500' } };
      if (mode === 'nopush') return { data: null, error: { message: 'Could not find the function public.' + fn, code: 'PGRST202' } };
      const uid = me(), srv = srvGet();
      if (fn === 'pb_push_public_key') return { data: localStorage.getItem('__pushNoKey') ? null : VAPID, error: null };
      if (fn === 'pb_push_subscribe') {
        if (!uid) return { data: null, error: { message: 'JWT expired', code: 'PGRST301' } };
        if (args.p_expect_uid && args.p_expect_uid !== uid) return { data: { ok: false, code: 'wrong_account' }, error: null };
        srv.subs[args.p_endpoint] = { uid, keys: args.p_keys, label: args.p_label, live: true, at: Date.now() }; srvSet(srv);
        return { data: { ok: true }, error: null };
      }
      if (fn === 'pb_push_status') { const s = srv.subs[args.p_endpoint]; return { data: { ok: true, live: !!(s && s.live && s.uid === uid) }, error: null }; }
      if (fn === 'pb_push_unsubscribe') { delete srv.subs[args.p_endpoint]; srvSet(srv); return { data: { ok: true }, error: null }; }
      if (fn === 'pb_push_prefs_get') { const p = srv.prefs[uid] || {}; return { data: { prefs: p, kinds: JSON.parse(localStorage.getItem('__pushKinds') || '["runs_waiting","mgmt_report","crew_production","run_end_ask","material_alert","crew_nudge","permit_closed","permit_due","locates","schedule","delays"]'), report_reader: localStorage.getItem('__manager') === '1', mgmt_also: [] }, error: null }; }
      if (fn === 'pb_push_prefs_set') { srv.prefs[uid] = Object.assign({}, srv.prefs[uid] || {}, { [args.p_type]: args.p_enabled !== false }); srvSet(srv); return { data: { ok: true }, error: null }; }
      if (fn === 'pb_push_test') return { data: { ok: true }, error: null };
      return { data: null, error: { message: 'unknown' } };
    }
    if (fn === 'pb_prod_push_prefs_set') { (window.__rpcLog = window.__rpcLog || []).push({ fn, args, t: Date.now() }); if (mode === 'offline') return { data: null, error: { message: 'Failed to fetch' } }; const srv = srvGet(); srv.crew = { on: args.p_crew_production, tz: args.p_tz, uid: me() }; srvSet(srv); return { data: { ok: true }, error: null }; }
    return o(fn, args);
  };
}
async function ctxFor(browser, { ua = ANDROID, uid = 'acctA', email = null, seed = null, width = 390, height = 844, tier = 'contractor' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, userAgent: ua, permissions: [] });
  await ctx.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.route(/\/sw\.js(\?|$)/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await ctx.addInitScript(M.mockInit);
  await ctx.addInitScript(PD.RPC);
  await ctx.addInitScript(pushInit);
  await ctx.addInitScript(([u, em, sd, t]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    if (u) { localStorage.setItem('__mockSess', JSON.stringify({ id: u, email: em || (u + '@x.com') })); localStorage.setItem('lastKnownUserId', u); localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: t, status: 'active' })); }
    localStorage.setItem('legacyDataMigrated', 'true');
    if (sd) for (const k in sd) localStorage.setItem(k, typeof sd[k] === 'string' ? sd[k] : JSON.stringify(sd[k]));
  }, [uid, email, seed, tier]);
  return ctx;
}
async function open(ctx) {
  const page = await M.open(ctx); await M.dismiss(page);
  await page.waitForTimeout(1200); // account load + access answer
  return page;
}
const openNotif = async (page) => { await page.evaluate(() => pbOpenNotifications()); await page.waitForTimeout(700); };
const state = (page) => page.evaluate(() => window.pbPushState());
const visible = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }, id);
const device = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('pbPushDevice') || 'null'));
const rpcs = (page, re) => page.evaluate((s) => (window.__rpcLog || []).filter(x => new RegExp(s).test(x.fn)), re ? re.source : '^pb_push_');
module.exports = { M, check: M.check, ANDROID, IPHONE, VAPID, pushInit, ctxFor, open, openNotif, state, visible, device, rpcs };
