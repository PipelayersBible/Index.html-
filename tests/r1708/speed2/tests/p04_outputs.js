// speed2 #52 bug hunt 04: what leaves the phone is the same after the move. The same Records is read by r17.04
// (photos inside the text) and by the patched build (photos stored apart, after the move and a reload): every run's
// PDF report embeds the same number of images and has the same record fingerprint, the "Export record data (JSON)"
// text is identical, and the photos the cloud upload would send (office copy photo list) are the same.
const T = require('./phlib');
const BASE = T.ROOT + 'base.html';
const probe = (p) => p.evaluate(async () => {
  const out = {};
  for (const e of window.__ra().filter((x) => x && x.kind === 'run')) {
    let pdf = null;
    try {
      const un = await window.__ev('pbPreflightPdfImages')([e], () => {});
      const doc = window.__ev('pbRptMakeSafe')(e, { unreadable: un });
      const buf = new Uint8Array(doc.output('arraybuffer'));
      let txt = ''; for (let i = 0; i < buf.length; i += 65536) txt += String.fromCharCode.apply(null, buf.subarray(i, i + 65536));
      pdf = { images: (txt.match(/\/Subtype\s*\/Image/g) || []).length, notIncluded: (txt.match(/not included/gi) || []).length };
    } catch (x) { pdf = 'ERR ' + x.message; }
    let json = null; window.__debugJsonSink = (n, t) => { json = t; };
    window.pbExportRecordJSON(window.__ra().indexOf(e)); delete window.__debugJsonSink;
    const copy = window.__pbRrDebug.copy(e.id);
    out[e.id] = { pdf, fp: window.pbRptFingerprintOf(e), jsonLen: json ? json.length : 0, jsonHash: json ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)))).slice(0, 8).join('.') : null,
      officePhotos: ((copy && copy.pbOffice && copy.pbOffice.photos) || []).map((x) => x.sha).join(',') };
  }
  return out;
});
(async () => {
  const { page, close } = await T.open();
  let p = await page();
  await T.makeRun(p);
  await T.seedOld(p, 3, 90);
  p = await page(BASE, 4000);
  const before = await probe(p);
  console.log('r17.04 read it:', Object.keys(before).length, 'runs; first:', JSON.stringify(Object.values(before)[0]));
  await p.close({ runBeforeUnload: false });
  p = await page();
  const st = await T.waitSweep(p);
  T.ok(st && st.verified === 'ok', 'patched build moved the photos', st && st.last);
  await p.close({ runBeforeUnload: false });
  p = await page();
  const s1 = await T.stored(p);
  T.ok(s1.inline === 0 && s1.refs > 0, 'photos are stored apart now', s1);
  const after = await probe(p);
  for (const id of Object.keys(before)) {
    const a = before[id], b = after[id];
    T.ok(!!b, 'run ' + id + ' still there');
    if (!b) continue;
    T.ok(JSON.stringify(a.pdf) === JSON.stringify(b.pdf) && a.pdf && a.pdf.images > 0, 'run ' + id + ' PDF embeds the same images', { before: a.pdf, after: b.pdf });
    T.ok(a.fp === b.fp && !!a.fp, 'run ' + id + ' record fingerprint unchanged', a.fp.slice(0, 12));
    T.ok(a.jsonHash === b.jsonHash && a.jsonLen === b.jsonLen, 'run ' + id + ' exported record JSON identical');
    T.ok(a.officePhotos === b.officePhotos && a.officePhotos.length > 0, 'run ' + id + ' cloud photo list identical');
  }
  T.ok(p.errs.length === 0, 'no page errors', p.errs.slice(0, 3));
  await close(); T.done();
})().catch((e) => { console.log('FAIL exception', e && e.stack); process.exit(1); });
