// shared helpers: find the Feedback button, and what it covers on the screen that is showing
exports.SEL = '#pbFbPill';
exports.probe = (p) => p.evaluate(() => {
  const fb = document.getElementById('pbFbPill');
  const scr = [...document.querySelectorAll('.pb-screen')].find(x => x.offsetParent);
  const out = { screen: scr ? scr.id.replace('screen-', '') : null, shown: false, covers: [], text: [] };
  if (!fb || fb.hidden) return out;
  const cs = getComputedStyle(fb); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return out;
  const r = fb.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return out;
  out.rect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  out.inView = r.left >= 0 && r.top >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5;
  // is the button itself on top (not under a bar / sheet)?
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  out.onTop = !!top && (top === fb || fb.contains(top));
  out.shown = true;
  const hit = (q) => !(q.right <= r.left + 1 || q.left >= r.right - 1 || q.bottom <= r.top + 1 || q.top >= r.bottom - 1);
  // what is really under it: hide it, then ask the page what is at points inside the shared area
  const ov = fb.style.visibility; fb.style.visibility = 'hidden';
  const under = (q, e) => { const x0 = Math.max(q.left, r.left), x1 = Math.min(q.right, r.right), y0 = Math.max(q.top, r.top), y1 = Math.min(q.bottom, r.bottom);
    for (const fx of [.2, .5, .8]) for (const fy of [.2, .5, .8]) { const t = document.elementFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy); if (t && (t === e || e.contains(t))) return true; } return false; };
  const name = (e) => ((e.getAttribute('aria-label') || e.textContent || e.placeholder || e.id || e.tagName) + '').trim().replace(/\s+/g, ' ').slice(0, 40);
  for (const e of document.querySelectorAll('button,a[href],a[onclick],select,textarea,input:not([type=hidden]),summary,label,[role=button],[onclick],[tabindex]')) {
    if (e === fb || fb.contains(e) || !e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
    const q = e.getBoundingClientRect(); if (q.width < 1 || q.height < 1 || !hit(q)) continue;
    if (under(q, e)) out.covers.push(e.tagName.toLowerCase() + ':' + name(e));
  }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const rg = document.createRange();
  while ((n = w.nextNode())) { if (!n.textContent.trim() || !n.parentElement || fb.contains(n)) continue; const pe = n.parentElement; if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.tagName)) continue;
    rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 1 || !hit(q)) continue; if (under(q, pe)) { out.text.push(n.textContent.trim().slice(0, 40)); break; } } }
  fb.style.visibility = ov;
  out.covers = [...new Set(out.covers)]; out.text = [...new Set(out.text)];
  return out;
});
