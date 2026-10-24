// Batch 28 MANUAL: shared setup for the "work without a run" tests. Builds on batch 20 HOME's pd_lib (hunt6 mock5
// Supabase, window.__rpc: a fake of the pb_prod_* functions, state in localStorage '__psrv'). On top of it an init
// script answers pb_mat_crew_list (the job's material list and trench settings, batch 18 M3) and the batch 23 daily
// functions the daily report calls (no inspections, no other crews, no weather; a signed report is accepted).
//   localStorage: '__role' foreman | pipelayer, '__manager' '1', '__ownerCo' '1' (the company account, no crew row),
//   '__rpcMode' ok | offline (pd_lib).
const L = require('/home/claude/batch20/HOME/tests/pd_lib.js');
const { M } = L;
const EXTRA = () => {
  const orig = window.__rpc;
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  window.__rpc = async (fn, args) => {
    const off = (localStorage.getItem('__rpcMode') || 'ok') === 'offline';
    const log = () => window.__rpcLog.push({ fn, args: JSON.parse(JSON.stringify(args || {})) });
    if (fn === 'pb_mat_crew_list') {
      log(); if (off) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      if (String(args.p_job_number).trim().toLowerCase() !== '24-101') return { data: { job_key: String(args.p_job_number).toLowerCase(), materials: [], settings: null }, error: null };
      return { data: { job_key: '24-101', company_id: 'c1', server_at: new Date().toISOString(), materials: [
        { id: 'm-pipe', name: '8" C900 PVC', category: 'pipe', use: 'pipe', unit: 'LF' }, { id: 'm-rock', name: '3/4" crushed rock', category: 'bedding_rock', use: 'bedding', unit: 'tons' },
        { id: 'm-sand', name: 'Coarse sand', category: 'bedding_sand', use: 'shading', unit: 'yd³' }], settings: { trench_width_ft: 3, bed_thick_ft: 0.5, shade_thick_ft: 1, od_in: 9.05 } }, error: null };
    }
    // sql/01_norun.sql (batch 28 review S4 / S5)
    if (fn === 'pb_prod_company_jobs') {
      log(); if (off) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      if (localStorage.getItem('__noJobsFn') === '1') return { data: null, error: { message: 'Could not find the function public.pb_prod_company_jobs' } };
      return { data: { server_at: new Date().toISOString(), company_id: 'c1', jobs: [{ job_key: '24-101', job_number: '24-101', jobsite: 'Elm St water main', plan: null, last_at: new Date().toISOString() },
        { job_key: '25-900', job_number: '25-900', jobsite: 'Pine Rd force main', plan: { categories: [{ key: 'pipe', name: 'Force main', unit: 'LF', planned: 900 }] }, last_at: null }] }, error: null };
    }
    if (fn === 'pb_prod_company_norun_save') {
      log(); if (off) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      const me = (JSON.parse(localStorage.getItem('__mockSess') || 'null') || {}).id;
      if (localStorage.getItem('__ownerCo') !== '1') return { data: null, error: { message: 'pb:not_company_account' } };
      if (!/^norun:[A-Za-z0-9]{6,80}$/.test(args.p_client_entry_id)) return { data: null, error: { message: 'pb:bad_id' } };
      const srv = JSON.parse(localStorage.getItem('__psrv') || '{"entries":{},"plans":{}}'), k = me + '|' + args.p_client_entry_id, row = srv.entries[k];
      if (row && row.voided) return { data: null, error: { message: 'pb:voided' } };
      const items = args.p_items.map(x => ({ key: x.key, qty: x.qty == null ? null : Number(x.qty), unit: x.unit || null }));
      const r = row || (srv.entries[k] = { id: '00000000-0000-0000-0000-' + String(900 + Object.keys(srv.entries).length).padStart(12, '0'), user: me, email: 'office@x.com', company: 'c1', versions: [], crew: null });
      if (JSON.stringify([r.record, r.items]) !== JSON.stringify([args.p_record, items]) || !r.versions.length) r.versions.push(1);
      r.record = args.p_record; r.items = items; r.updated_at = new Date().toISOString(); r.kind = 'run';
      localStorage.setItem('__psrv', JSON.stringify(srv));
      return { data: { ok: true, id: r.id, version: r.versions.length, role: 'manager', counted: true, server_at: new Date().toISOString() }, error: null };
    }
    if (/^pb_(insp|daily)_/.test(fn)) {
      log(); if (off) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      if (fn === 'pb_insp_job') return { data: { ok: true, company_id: 'c1', can_add: false, is_foreman: true, items: [] }, error: null };
      if (fn === 'pb_insp_mine') return { data: { ok: true, company_id: 'c1', foreman: true, items: [] }, error: null };
      if (fn === 'pb_daily_prod_day') return { data: { ok: true, company_id: 'c1', server_at: new Date().toISOString(), entries: [] }, error: null };
      if (fn === 'pb_daily_list') return { data: { ok: true, reports: [] }, error: null };
      if (fn === 'pb_daily_weather_get') return { data: { ok: true, company_id: 'c1', can_set_location: false, weather: null, location: null }, error: null };
      if (fn === 'pb_daily_submit') return { data: { ok: true, id: 'rep-1', version: 1, received_at: new Date().toISOString(), server_sha256: args.p_sha256, sha_matches: true, phone_clock_ahead_s: 0 }, error: null };
      return { data: null, error: { message: 'not mocked' } };
    }
    return orig(fn, args);
  };
};
// One run on job 24-101 today, Sta 10+00 to 12+00 (MH-7 to MH-8), with foreman production; the company's plan for
// the job (with an extra "Thrust blocks" category) and one earlier entry by this foreman (so the job is in his scope).
function seed() {
  const day = (off) => { const d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const now = Date.now(), sod = new Date(new Date().setHours(0, 0, 0, 0)).getTime(), t0 = Math.max(now - 4 * 3600000, sod + 60000);
  const rows = [1000, 1050, 1100, 1150, 1200].map((s, i) => ({ stationFt: s, station: String(s.toFixed(1)), label: i === 0 ? 'start' : i === 4 ? 'end' : '', pointId: i === 0 ? 'start' : i === 4 ? 'end' : null }));
  const run = { id: 9101, kind: 'run', jobNumber: '24-101', jobsite: 'Elm St water main', startLabel: 'MH-7', endLabel: 'MH-8', runStartTime: new Date(t0).toISOString(), runEndTime: new Date(Math.max(t0 + 60000, now - 1800000)).toISOString(), lockTime: new Date(t0).toISOString(),
    distance: 200, completedDistance: 200, durationMin: 180, beddingVolumeYd3: 11.1, volumeYd3: 40, foreman: { feetPipeInstalled: 200, feetExcavated: 200, enteredBy: 'Frank Ortiz', enteredAt: now - 3000000 }, crewLog: [], fieldNotes: [], intervalRows: rows, summary: {} };
  const plan = { categories: [{ key: 'demo', name: 'Demo', unit: 'LF' }, { key: 'excavation', name: 'Excavation', unit: 'LF', planned: 2400 }, { key: 'pipe', name: 'Pipe Installed', unit: 'LF', planned: 2400 },
    { key: 'backfill', name: 'Backfill', unit: 'LF', planned: 2400 }, { key: 'restoration', name: 'Restoration', unit: 'SY' }, { key: 'structures', name: 'Structures', unit: 'EA' }, { key: 'thrust_blocks', name: 'Thrust blocks', unit: 'EA' }] };
  const srv = { entries: { 'acctA|run:old1': { id: '00000000-0000-0000-0000-00000000aaaa', user: 'acctA', email: 'a@x.com', company: 'c1', versions: [1], crew: null, updated_at: new Date(now - 86400000).toISOString(),
    record: { jobNumber: '24-101', jobsite: 'Elm St water main', workDate: day(-1), enteredBy: 'Frank Ortiz' }, items: [{ key: 'pipe', qty: 100, unit: 'LF' }] } }, plans: { 'c1|24-101': { plan, version: 1, job_number: '24-101' } } };
  return { 'acctA:runArchive': [run], '__psrv': srv };
}
async function setup(browser, o) {
  o = o || {};
  const ex = Object.assign(o.seed === false ? {} : seed(), o.extra || {});
  const c2 = await browser.newContext({ viewport: { width: o.width || 390, height: o.height || 900 }, acceptDownloads: true });
  await c2.route(/supabase-js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
  await c2.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await c2.addInitScript(M.mockInit);
  await c2.addInitScript(L.RPC);
  await c2.addInitScript(EXTRA);
  await c2.addInitScript(([mg, ex2]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    localStorage.setItem('acctA:cachedSubscription', JSON.stringify({ tier: 'contractor', status: 'active' }));
    if (mg) localStorage.setItem('__manager', '1');
    for (const k in ex2) localStorage.setItem(k, typeof ex2[k] === 'string' ? ex2[k] : JSON.stringify(ex2[k]));
  }, [!!o.manager, ex]);
  const page = await M.open(c2); await M.dismiss(page);
  await page.waitForTimeout(1500);
  return { ctx: c2, page };
}
const text = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return el ? el.textContent : null; }, id);
const shown = (p, id) => p.evaluate((i) => { const el = document.getElementById(i); return !!el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0; }, id);
const rpcs = (p, name) => p.evaluate((n) => window.__rpcLog.filter(x => x.fn === n), name);
const modal = L.modal, click = L.click;
async function pdfText(page, trigger) {
  const fs = require('fs'), cp = require('child_process'), os = require('os'), path = require('path');
  try {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), trigger()]);
    const f = path.join(os.tmpdir(), 'pbnr_' + Date.now() + '.pdf'); await dl.saveAs(f);
    const txt = cp.execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }), raw = cp.execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });
    try { fs.unlinkSync(f); } catch (e) {}
    return { name: dl.suggestedFilename(), txt, raw };
  } catch (e) { return null; }
}
module.exports = { M, check: L.check, setup, text, shown, rpcs, modal, click, pdfText, seed };
