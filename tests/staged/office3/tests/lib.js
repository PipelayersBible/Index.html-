// office3 tests: shared helpers (rig = tests/rig; page = PB_URL)
const path = require('path'), fs = require('fs');
const RIG = fs.existsSync(path.resolve(__dirname, '../../../rig/co.js')) ? path.resolve(__dirname, '../../../rig') : path.resolve(__dirname, '../rig');
const boot = require(RIG + '/boot'), co = require(RIG + '/co'), mgr = require(RIG + '/mgr');
const URL = process.env.PB_URL || 'http://127.0.0.1:8953/cur.html';
const OUT = (() => { const d = process.env.PB_OUT || '/tmp/claude-0/-home-claude/301429b0-ad8e-5cc1-a9ea-816c5040b6d3/scratchpad/office3w/out'; try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} return d; })();
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };
const done = async (b) => { try { await b.close(); } catch (e) {} console.log(fail ? 'RESULT FAIL ' + fail : 'RESULT PASS ' + pass); process.exit(fail ? 1 : 0); };
const modal = (p) => p.evaluate(() => { const o = document.getElementById('pbModalOverlay'); return o && getComputedStyle(o).display !== 'none' ? o.innerText : ''; });
const clickModal = (p, label) => p.evaluate((l) => { const b = [...document.querySelectorAll('#pbModalOverlay button')].find(x => x.textContent.trim() === l); if (b) b.click(); return !!b; }, label);
const rpcs = (p, n) => p.evaluate((n) => (window.__rpcArgs || []).filter(x => x[0] === n).map(x => x[1]), n);
const overflow = (p) => p.evaluate(() => { const d = document.documentElement, W = d.clientWidth; const bad = []; if (d.scrollWidth > W + 1) bad.push('page scrolls sideways: ' + d.scrollWidth + ' > ' + W); const s = document.querySelector('.pb-screen.active') || document.body; [...s.querySelectorAll('*')].forEach(e => { if (bad.length > 5) return; const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > W + 1) || getComputedStyle(e).position === 'fixed') return; let a = e.parentElement, clipped = false; while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } a = a.parentElement; } if (!clipped) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.right)); }); return bad; }); // page-level sideways scroll, or something off the side that no scroller holds
module.exports = { RIG, boot, co, mgr, URL, OUT, ok, done, modal, clickModal, rpcs, overflow, fs, path };
