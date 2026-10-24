// shared helpers for the night Records probes: a page seeded with the realistic data p00_build.js made
const L = require('/home/claude/test/lib.js');
const fs = require('fs');
const { execFileSync } = require('child_process');
const UID = 'uNightRec';
const SH = '/home/claude/feat_records/tests/shots/', OUT = '/home/claude/feat_records/tests/data/';
const STORE = JSON.parse(fs.readFileSync(OUT + 'storage.json', 'utf8'));
const pdfText = (f) => { try { return execFileSync('pdftotext', ['-raw', f, '-']).toString(); } catch (e) { return ''; } };
const flat = (t) => String(t || '').replace(/\s+/g, ' ').trim();
async function seeded(browser, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, timezoneId: 'America/Denver', deviceScaleFactor: 2 });
  await ctx.addInitScript((st) => { Object.keys(st).forEach(k => localStorage.setItem(k, st[k])); }, Object.assign({}, STORE, o.store || {}));
  if (o.init) await ctx.addInitScript(o.init);
  const pg0 = await ctx.newPage(); if (o.time) await pg0.clock.install({ time: o.time }); await pg0.close();
  const page = await L.newPage(browser, UID, ctx);
  if (o.time) await page.clock.install({ time: o.time });
  await page.waitForTimeout(800); await L.dismiss(page);
  return page;
}
const modal = (page) => page.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return null; return { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, btns: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent.trim()) }; });
const clickBtn = (page, re) => page.evaluate((s) => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(b => new RegExp(s).test(b.textContent)); if (b) b.click(); return !!b; }, re.source);
const txt = (page, sel) => page.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel).then(flat);
const shot = (page, name) => page.screenshot({ path: SH + name + '.png', fullPage: true });
const ids = (page) => page.evaluate(() => { const A = window.__debugGetArchive(); const f = (p) => (A.find(p) || {}).id; return { A1: f(e => e.startLabel === 'MH-1'), A2: f(e => e.startLabel === 'MH-2' && e.kind === 'run'), B1: f(e => e.startLabel === 'CB-4' && e.incomplete), B2: f(e => e.startLabel === 'CB-4' && e.completed), P: f(e => e.kind === 'confined'), R: f(e => e.kind === 'report') }; });
const sink = async (page, fn, name) => { await page.evaluate(() => { window.__pdfData = null; window.__debugPdfSink = (d) => { window.__pdfData = d; }; }); await page.evaluate(fn); for (let i = 0; i < 60 && !(await page.evaluate(() => !!window.__pdfData)); i++) await page.waitForTimeout(250); const d = await page.evaluate(() => window.__pdfData); await page.evaluate(() => { window.__debugPdfSink = null; }); if (!d) return ''; const f = OUT + name; fs.writeFileSync(f, Buffer.from(d.split(',')[1], 'base64')); return f; };
const download = async (page, fn, name) => { const dl = page.waitForEvent('download', { timeout: 30000 }); await page.evaluate(fn); const d = await dl; const f = OUT + name; await d.saveAs(f); return { f, name: d.suggestedFilename() }; };
const csv = (page, fn) => page.evaluate((s) => { let out = null; window.__debugCsvSink = (f, rows) => { out = { f, rows }; }; eval(s); window.__debugCsvSink = null; return out; }, fn);
module.exports = { L, UID, SH, OUT, STORE, pdfText, flat, seeded, modal, clickBtn, txt, shot, ids, sink, download, csv };
