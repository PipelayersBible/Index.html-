// r1716_candidate: records_nov22 PHASE B app parts (B3 phoneAt on the open-permit backup, B8 run history in Export for
// Records). Checks both work, and that the app goes on quietly when the server part is NOT there yet.
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_phaseb.js   (hooks build; PASS/FAIL lines, exit 1 on any FAIL)
const RIG = __dirname + '/../../../rig/';
const boot = require(RIG + 'boot'), co = require(RIG + 'co'), F = require(RIG + 'flow'), mk = require(RIG + 'mkrun');
const cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:8761/cur.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const OUT = fs.mkdtempSync(path.join(process.env.PB_OUT || os.tmpdir(), 'phaseb-'));
(async () => {
  // ---------------- B3: open permit snapshot carries phoneAt; nothing changed = nothing sent ----------------
  {
    const extra = `;window.__op=[];window.__rpcOverride.pb_permit_open_put=(a)=>{window.__op.push(a);return {ok:true,same:false};};window.__rpcOverride.pb_em_taken=()=>({taken:false});`;
    const { b, p } = await boot(URL0, { init: co + extra, wait: 4000 });
    const ev = (s) => p.evaluate(s);
    const modalLast = async () => { for (let i = 0; i < 4; i++) { if (await ev("(()=>{const m=document.getElementById('pbModalMessage');return !!(m&&m.offsetParent)})()")) { await ev("[...document.querySelectorAll('#pbModalButtons button')].pop().click()"); await p.waitForTimeout(700); } } };
    await ev("pbGoto('confinedPermit')"); await p.waitForTimeout(500);
    const now = new Date(), hm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const vals = { cpJobsite: 'Test Job', cpJobNumber: '26014', cpAddress: '1 Main St, Beaumont CA', cpSpace: 'MH1', cpPurpose: 'Inspect', cpDate: ymd, cpStart: hm(new Date(now - 600000)), cpEnd: hm(new Date(+now + 3 * 3600000)), cpSupervisor: 'Tom', cpSupervisorInitials: 'TF', cpAttendant: 'Brandon Jones', cpComms: 'Radio', cpHazards: 'None', cpControls: 'Vent', cpVentFail: 'Monitor', cpRescue: '911' };
    for (const [k, v] of Object.entries(vals)) await p.fill('#' + k, v);
    await ev('pbLockConfinedPermit()'); await p.waitForTimeout(1500); await modalLast(); await p.waitForTimeout(1000);
    for (let i = 0; i < 12; i++) { const n = await ev('window.__op.length'); if (n) break; await ev('window.__pbOpenBackupTick && window.__pbOpenBackupTick()'); await p.waitForTimeout(1000); }
    const op = await ev('window.__op');
    ok(op.length >= 1, 'B3 the open permit was backed up (' + op.length + ' sends)');
    const s = op.length ? op[op.length - 1].p_snapshot : null, t = s && Date.parse(s.phoneAt);
    ok(!!s && /^\d{4}-\d\d-\d\dT/.test(String(s.phoneAt)) && Math.abs(t - await ev('Date.now()')) < 120000, 'B3 the snapshot carries phoneAt = the phone clock (' + (s && s.phoneAt) + ')');
    ok(!!s && s.kind === 'confined-open' && s.space === 'MH1', 'B3 the rest of the snapshot is as before (kind/space)');
    const n1 = op.length;
    await ev('window.__pbOpenBackupTick()'); await p.waitForTimeout(1500); await ev('window.__pbOpenBackupTick()'); await p.waitForTimeout(1500);
    ok(await ev('window.__op.length') === n1, 'B3 nothing changed: nothing sent again (phoneAt is added after the change check)');
    // server answers as an old server would with an error: the app keeps going (no page error, permit still open)
    await ev("window.__rpcOverride.pb_permit_open_put=()=>{throw new Error('Could not find the function public.pb_permit_open_put')}");
    await ev('pbQuickAddAtmoTest()'); await p.fill('#cpAtmoO2', '20.9'); await p.fill('#cpAtmoLEL', '0'); await p.fill('#cpAtmoTester', 'Tom'); await ev('pbSaveAtmoReading()'); await p.waitForTimeout(1500); await modalLast();
    await ev('window.__pbOpenBackupTick()'); await p.waitForTimeout(1500);
    ok(await ev("!!document.querySelector('#screen-confinedActive.active')"), 'B3 an upload error leaves the permit open on screen');
    ok(p.errs.length === 0, 'B3 no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  // ---------------- B8: Export for Records with and without the server function ----------------
  const exportZip = async (p, mode) => {
    await p.evaluate((mode) => {
      const R = window.__rpcOverride;
      if (mode === 'missing') R.pb_prod_run_versions = () => { throw new Error('Could not find the function public.pb_prod_run_versions(p_expect_uid, p_run_id) in the schema cache'); };
      else if (mode === 'refused') R.pb_prod_run_versions = () => { throw new Error('pb:not_company_account'); };
      else if (mode === 'null') delete R.pb_prod_run_versions;
      else R.pb_prod_run_versions = (a) => { window.__pv = a; return { ok: true, run_id: a.p_run_id, current_version: 3, server_at: '2026-11-22T18:00:00Z', versions: [{ version: 1, saved_at: '2026-11-20T15:00:00Z', record_md5: 'aaa', record: null }, { version: 2, saved_at: '2026-11-21T15:00:00Z', record_md5: 'bbb', record: { v: 2, notes: 'second' } }, { version: 3, saved_at: '2026-11-22T15:00:00Z', record_md5: 'ccc', record: { v: 3, notes: 'third' } }], events: [{ action: 'removed', at: '2026-11-22T16:00:00Z', by: 'Tom', note: 'duplicate' }], setup: [] }; };
    }, mode);
    const t0 = Date.now();
    const zip = await p.evaluate(async () => {
      const e = window.__pbRrDebug.run(); const rec = window.__pbRrDebug.copy(e.id); window.__pbRrDebug.open({ id: 'run-uuid', job_number: '24-017' }, rec);
      let blob = null; const oc = URL.createObjectURL; URL.createObjectURL = (b) => { blob = b; return oc(b); }; await window.pbRrExport(); await new Promise(r => setTimeout(r, 500)); URL.createObjectURL = oc;
      if (!blob) return null; const a = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s);
    });
    const ms = Date.now() - t0;
    if (!zip) return { ms, files: [], man: '' };
    const d = path.join(OUT, mode); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(d + '.zip', Buffer.from(zip, 'base64'));
    cp.execSync('unzip -q -o ' + JSON.stringify(d + '.zip') + ' -d ' + JSON.stringify(d));
    const files = cp.execSync('cd ' + JSON.stringify(d) + ' && find . -type f | sort').toString().trim().split('\n').map(x => x.replace(/^\.\//, ''));
    const man = fs.existsSync(d + '/MANIFEST.txt') ? fs.readFileSync(d + '/MANIFEST.txt', 'utf8') : '';
    return { ms, files, man, d };
  };
  {
    const { b, p } = await boot(URL0, { init: co, wait: 4000 }); const H = F(p);
    await p.getByText('New Run', { exact: true }).click(); await p.waitForTimeout(1000); await H.f('saJobNumber', '24-017');
    await p.evaluate(() => pbGoto('home', true, true)); await p.waitForTimeout(300);
    await mk(p, 100); await H.click('Lock This Run'); await p.waitForTimeout(800);
    for (let i = 0; i < 4; i++) { const m = await H.modal(); if (!m) break; const bt = await H.modalBtns(); await H.modalClick(bt.includes('Lock Without It') ? 'Lock Without It' : bt[bt.length - 1]); await p.waitForTimeout(1000); }
    await p.waitForTimeout(1500);
    ok(!!(await p.evaluate(() => window.__pbRrDebug.run())), 'B8 setup: a locked run is in Records');
    for (const mode of ['missing', 'refused', 'null']) {
      const r = await exportZip(p, mode);
      ok(r.files.includes('record.json') && r.files.includes('MANIFEST.txt') && r.files.includes('run-report.pdf'), 'B8 server ' + mode + ': export still made (' + r.files.length + ' files, ' + r.ms + ' ms)');
      ok(!r.files.includes('history.json') && !r.files.some(f => f.startsWith('versions/')), 'B8 server ' + mode + ': no history files');
      ok(/Versions: the server.s version history could not be read for this export/.test(r.man), 'B8 server ' + mode + ': the manifest says the history could not be read');
      ok(!await p.evaluate(() => { const o = document.getElementById('pbModalOverlay'); return o && getComputedStyle(o).display !== 'none' && /error|failed/i.test(o.innerText); }), 'B8 server ' + mode + ': no error message on screen');
    }
    const r = await exportZip(p, 'ok');
    ok(r.files.includes('history.json') && r.files.includes('versions/run-v2.json') && r.files.includes('versions/run-v3.json') && !r.files.includes('versions/run-v1.json'), 'B8 server ok: history.json + versions/run-v2.json, run-v3.json (v1 had no record) (' + r.files.filter(f => /history|versions/.test(f)).join(', ') + ')');
    let h = null; try { h = JSON.parse(fs.readFileSync(r.d + '/history.json', 'utf8')); } catch (e) {}
    ok(!!h && h.versions.length === 3 && h.versions[0].file === null && h.versions[2].file === 'versions/run-v3.json' && h.events[0].note === 'duplicate', 'B8 history.json lists the 3 versions with md5/time and the removal reason');
    ok(/Versions: 3 stored on the server/.test(r.man), 'B8 manifest says "Versions: 3 stored on the server"');
    ok(/versions\/run-v3\.json/.test(r.man) && /history\.json/.test(r.man), 'B8 the new files are in the manifest SHA-256 list');
    const pv = await p.evaluate(() => window.__pv);
    ok(!!pv && pv.p_run_id === 'run-uuid' && typeof pv.p_expect_uid === 'string' && pv.p_expect_uid.length > 0, 'B8 asks with the run id and the signed-in account (' + JSON.stringify(pv) + ')');
    ok(p.errs.length === 0, 'B8 no page errors ' + JSON.stringify(p.errs.slice(0, 3)));
    await b.close();
  }
  console.log(fails ? 'DONE ' + fails + ' FAIL' : 'DONE all pass'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed', e && e.stack); process.exit(1); });
