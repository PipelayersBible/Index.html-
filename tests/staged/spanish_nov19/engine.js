/* Spanish setting, phase 1 (pbI18n). Display-only translation layer.
   - English is the source. Nothing here runs for an English phone except reading one localStorage key
     (and showing a one-line offer when the phone's own language is Spanish).
   - Spanish: the text the app draws is looked up in PB_ES (key = the English text) and painted in Spanish. No match:
     the English stays (fallback). The app's own code still READS English from the page (textContent, innerText,
     innerHTML, option text/value are answered with the English original), so its logic, its records, PDFs and the
     texts it sends are unchanged.
   - window.pbSetLang('es' | 'en'), window.pbLang(), window.pbT(english) for code that wants a string directly. */
(function () {
  'use strict';
  var KEY = 'pbLang';
  var D = /*PB_I18N_DICT*/{ t: {}, p: [] }/*END_PB_I18N_DICT*/;
  var T = D.t, P = [];
  var lang = 'en', armed = false, obs = null;
  var rec = new WeakMap();   // Text node -> { en, es }   (what the app wrote, what is painted)
  var arec = new WeakMap();  // Element   -> { attr: { en, es } }
  var cache = Object.create(null), cacheN = 0;
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt', 'data-laid-tag']; // data-laid-tag: the Laid / Next tag on a grade sheet row is drawn from it
  // Records, reports and PDF previews are the company's official record: never translated (they stay as written).
  var NOI = { 'screen-archive': 1, 'screen-reportReceipt': 1, 'screen-reportsAll': 1, 'screen-myReports': 1, 'screen-reportsInbox': 1, 'screen-pdfView': 1, 'screen-companyPermits': 1, 'rrBody': 1 };
  var SKIP_SEL = 'script,style,textarea,noscript,svg,canvas,iframe,[contenteditable],[data-noi18n],#screen-archive,#screen-reportReceipt,#screen-reportsAll,#screen-myReports,#screen-reportsInbox,#screen-pdfView,#screen-companyPermits,#rrBody';
  var INLINE = { STRONG: 1, B: 1, EM: 1, I: 1, U: 1, A: 1, SPAN: 1, BR: 1, svg: 1, SVG: 1, INPUT: 1, CODE: 1, SMALL: 1, IMG: 1 };
  var dTC, dData, dNV, dIT, dIH, dOH, dOT, nGetAttr;

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function compile() {
    if (P.length || !D.p) return;
    for (var i = 0; i < D.p.length; i++) { try { P.push({ re: new RegExp(D.p[i][0]), es: D.p[i][1], c: D.p[i][2] || '' }); } catch (e) {} }
  }
  function pick(v, el) {
    if (typeof v === 'string') return v;
    for (var i = 0; i < v.length; i++) {
      if (typeof v[i] === 'string') return v[i];
      try { if (el && el.closest && el.closest(v[i][0])) return v[i][1]; } catch (e) {}
    }
    return null;
  }
  // a filled-in value that is itself app text: the whole value, else sentence by sentence
  function trv(g, el) {
    var k = norm(g), s = k ? look(k, el) : null;
    if (s != null) return g.match(/^\s*/)[0] + s + g.match(/\s*$/)[0];
    var bits = g.split(/([.!?;])\s+/), out = '', hit = false;
    if (bits.length < 3) return g;
    for (var i = 0; i < bits.length; i += 2) {
      var sent = bits[i] + (bits[i + 1] || ''), e = norm(sent) ? look(norm(sent), el) : null;
      if (e != null) hit = true;
      out += (i ? ' ' : '') + (e != null ? e : sent);
    }
    return hit ? out : g;
  }
  function look(k, el) {
    var v = T[k];
    if (v !== undefined) return pick(v, el);
    if (k.length > 1600) return null;
    var c = cache[k];
    if (c !== undefined) { if (c === 0) return null; if (typeof c === 'string') return c; }
    var out = null, ctxDep = false;
    for (var i = 0; i < P.length; i++) {
      var p = P[i], m = p.re.exec(k);
      if (!m) continue;
      if (p.c) { ctxDep = true; try { if (!(el && el.closest && el.closest(p.c))) continue; } catch (e) { continue; } }
      out = p.es.replace(/\{(\d)(:t)?\}/g, function (_, n, t) {
        var g = m[+n + 1]; if (g == null) g = '';
        if (t) return trv(g, el);
        return g;
      });
      break;
    }
    if (!ctxDep) { if (cacheN > 4000) { cache = Object.create(null); cacheN = 0; } cache[k] = out == null ? 0 : out; cacheN++; }
    return out;
  }
  function rawData(n) { return dData ? dData.get.call(n) : n.data; }
  function setData(n, v) { if (dData) dData.set.call(n, v); else n.data = v; }
  function enOf(n) { var d = rawData(n), r = rec.get(n); return r && r.es === d ? r.en : d; }
  function enText(el) {
    if (el.nodeType === 3) return enOf(el);
    var w = document.createTreeWalker(el, 4, null), s = '', n;
    while ((n = w.nextNode())) s += enOf(n);
    return s;
  }
  function skipped(el) { try { return !!(el && el.closest && el.closest(SKIP_SEL)); } catch (e) { return false; } }

  /* ---- one text node ---- */
  function doText(n) {
    var p = n.parentNode; if (!p || p.nodeType !== 1) return;
    var d = rawData(n), r = rec.get(n);
    if (r && r.es === d) { if (lang !== 'es') { setData(n, r.en); rec.delete(n); } return; }
    if (r) rec.delete(n);
    if (lang !== 'es') return;
    var k = norm(d);
    if (!k || !/[A-Za-z]/.test(k)) return;
    var es = look(k, p), out;
    if (es == null && /\n\s*\n/.test(d)) {
      // a message made of paragraphs: each paragraph is looked up on its own
      var parts = d.split(/\n\s*\n/), hit = false;
      for (var i = 0; i < parts.length; i++) { var pk = norm(parts[i]), pe = pk && /[A-Za-z]/.test(pk) ? look(pk, p) : null; if (pe != null) { parts[i] = pe; hit = true; } }
      if (!hit) return;
      out = parts.join('\n\n');
    } else {
      if (es == null || es === k) return;
      out = d.match(/^\s*/)[0] + es + d.match(/\s*$/)[0];
    }
    if (p.tagName === 'OPTION' && !p.hasAttribute('value')) { p.setAttribute('value', norm(enText(p))); p.setAttribute('data-pbi18n-val', '1'); }
    rec.set(n, { en: d, es: out });
    setData(n, out);
  }
  /* ---- an element whose sentence runs across inline children: "Tap <1>Share</1>, then <2>Add</2>." ---- */
  function atom(c) { var t = c.tagName; return t === 'BR' || t === 'svg' || t === 'SVG' || t === 'INPUT' || t === 'IMG' || !norm(enText(c)); }
  function mixedKey(el) {
    var kids = el.childNodes, n = kids.length, i, c, hasEl = false, hasTx = false;
    if (n < 2 || n > 40) return null;
    for (i = 0; i < n; i++) {
      c = kids[i];
      if (c.nodeType === 1) { if (!INLINE[c.tagName] || c.firstElementChild && !(c.tagName === 'svg' || c.tagName === 'SVG')) return null; hasEl = true; }
      else if (c.nodeType === 3) { if (!hasTx && /\S/.test(enOf(c))) hasTx = true; }
    }
    if (!hasEl || !hasTx) return null;
    var key = '', idx = 0, els = [];
    for (i = 0; i < n; i++) {
      c = kids[i];
      if (c.nodeType === 3) key += enOf(c);
      else if (c.nodeType === 1) { idx++; els.push(c); key += atom(c) ? '<' + idx + '/>' : '<' + idx + '>' + enText(c) + '</' + idx + '>'; }
    }
    return { key: norm(key), els: els };
  }
  function doMixed(el) {
    if (lang !== 'es') return false;
    var mk = mixedKey(el); if (!mk) return false;
    var key = mk.key, els = mk.els, kids = el.childNodes, i, c;
    var v = T[key], es = v !== undefined ? pick(v, el) : look(key, el);
    if (es == null) return false;
    // split the Spanish into: gap text, child 1, gap text, child 2, ... (children keep their order)
    var re = /<(\d+)>([\s\S]*?)<\/\1>|<(\d+)\/>/g, m, last = 0, gaps = [], inner = [];
    while ((m = re.exec(es))) { gaps.push(es.slice(last, m.index)); inner.push(m[2] == null ? null : m[2]); last = re.lastIndex; }
    gaps.push(es.slice(last));
    if (inner.length !== els.length) return false;
    var g = 0, first = null, live = [];
    for (i = 0; i < kids.length; i++) live.push(kids[i]);
    function put(node, text, before) {
      if (node) { var d = rawData(node), r = rec.get(node), en = r && r.es === d ? r.en : d; if (d !== text) { rec.set(node, { en: en, es: text }); setData(node, text); } else if (!r) rec.set(node, { en: en, es: text }); }
      else if (text) { var tn = document.createTextNode(text); rec.set(tn, { en: '', es: text }); el.insertBefore(tn, before); }
    }
    for (i = 0; i <= live.length; i++) {
      c = live[i];
      if (c && c.nodeType === 3) { if (!first) first = c; else put(c, '', null); continue; }
      if (c && c.nodeType !== 1) continue;
      put(first, gaps[g], c || null); first = null;
      if (c) {
        if (inner[g] != null) {
          var w = document.createTreeWalker(c, 4, null), tn2, f2 = true;
          while ((tn2 = w.nextNode())) { put(tn2, f2 ? inner[g] : '', null); f2 = false; }
        }
        g++;
      }
    }
    return true;
  }
  /* ---- attributes ---- */
  function doAttr(el, a) {
    if (el.tagName === 'SECTION') return; // a section's aria-label is looked up by name by the app (Calculators list)
    var v = (nGetAttr || el.getAttribute).call(el, a); if (v == null) return;
    var R = arec.get(el), r = R && R[a];
    if (r && r.es === v) { if (lang !== 'es') { el.setAttribute(a, r.en); delete R[a]; } return; }
    if (r) delete R[a];
    if (lang !== 'es') return;
    var k = norm(v); if (!k || !/[A-Za-z]/.test(k)) return;
    var es = look(k, el); if (es == null || es === k) return;
    if (!R) { R = {}; arec.set(el, R); }
    R[a] = { en: v, es: es };
    el.setAttribute(a, es);
  }
  function visit(el) {
    if (el.nodeType === 3) { doText(el); return; }
    if (el.nodeType !== 1) return;
    var t = el.tagName;
    if (t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || t === 'NOSCRIPT' || t === 'svg' || t === 'SVG' || t === 'CANVAS' || t === 'IFRAME') return;
    if (el.hasAttribute('data-noi18n') || el.id && NOI[el.id] === 1 || el.hasAttribute('contenteditable')) return;
    if (el.attributes.length) { for (var a = 0; a < ATTRS.length; a++) if (el.hasAttribute(ATTRS[a])) doAttr(el, ATTRS[a]); }
    if (lang !== 'es' && el.hasAttribute('data-pbi18n-val')) { el.removeAttribute('value'); el.removeAttribute('data-pbi18n-val'); }
    if (doMixed(el)) return;
    for (var c = el.firstChild, nx; c; c = nx) { nx = c.nextSibling; if (c.nodeType === 3) doText(c); else if (c.nodeType === 1) visit(c); }
  }
  function touch(node) {
    // a change at `node`: its sentence may belong to the parent (inline child of a mixed sentence)
    var el = node.nodeType === 1 ? node : node.parentNode;
    if (!el || el.nodeType !== 1 || skipped(el)) return;
    if (INLINE[el.tagName] && el.parentNode && el.parentNode.nodeType === 1 && doMixed(el.parentNode)) return;
    if (node.nodeType === 3) { if (!doMixed(el)) doText(node); } else visit(node);
  }
  function onMut(list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      try {
        if (m.type === 'characterData') touch(m.target);
        else if (m.type === 'attributes') { if (!skipped(m.target)) doAttr(m.target, m.attributeName); }
        else {
          var tg = m.target;
          if (tg.nodeType !== 1 || !tg.isConnected && !m.addedNodes.length) continue;
          if (skipped(tg)) continue;
          if (INLINE[tg.tagName] && tg.parentNode && tg.parentNode.nodeType === 1 && doMixed(tg.parentNode)) continue;
          if (doMixed(tg)) continue;
          for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.parentNode === tg) visit(n); }
        }
      } catch (e) {}
    }
  }
  /* ---- the app reads English ---- */
  function withEn(el, fn) {
    var sw = [], w = document.createTreeWalker(el, 4, null), n, r, d;
    while ((n = w.nextNode())) { r = rec.get(n); if (r) { d = rawData(n); if (r.es === d && r.en !== d) { setData(n, r.en); sw.push(n, r); } } }
    try { return fn(); } finally { for (var i = 0; i < sw.length; i += 2) setData(sw[i], sw[i + 1].es); }
  }
  function arm() {
    if (armed) return; armed = true; compile();
    try {
      dTC = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      dData = Object.getOwnPropertyDescriptor(CharacterData.prototype, 'data');
      dNV = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue');
      dIT = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
      dIH = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      dOH = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
      dOT = Object.getOwnPropertyDescriptor(HTMLOptionElement.prototype, 'text');
      Object.defineProperty(Node.prototype, 'textContent', { configurable: true, enumerable: dTC.enumerable, set: dTC.set,
        get: function () { var t = this.nodeType; if (t === 3) return enOf(this); if (t === 1 || t === 11) return enText(this); return dTC.get.call(this); } });
      Object.defineProperty(CharacterData.prototype, 'data', { configurable: true, enumerable: dData.enumerable, set: dData.set,
        get: function () { return this.nodeType === 3 ? enOf(this) : dData.get.call(this); } });
      Object.defineProperty(Node.prototype, 'nodeValue', { configurable: true, enumerable: dNV.enumerable, set: dNV.set,
        get: function () { return this.nodeType === 3 ? enOf(this) : dNV.get.call(this); } });
      Object.defineProperty(HTMLElement.prototype, 'innerText', { configurable: true, enumerable: dIT.enumerable, set: dIT.set,
        get: function () { var el = this; return withEn(el, function () { return dIT.get.call(el); }); } });
      Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, enumerable: dIH.enumerable, set: dIH.set,
        get: function () { var el = this; return withEn(el, function () { return dIH.get.call(el); }); } });
      Object.defineProperty(Element.prototype, 'outerHTML', { configurable: true, enumerable: dOH.enumerable, set: dOH.set,
        get: function () { var el = this; return withEn(el, function () { return dOH.get.call(el); }); } });
      // a copy the app makes of something on screen is a copy of the English
      var nClone = Node.prototype.cloneNode;
      Node.prototype.cloneNode = function (deep) { var n = this; if (!deep || n.nodeType !== 1 && n.nodeType !== 11) { var c = nClone.call(n, deep); if (n.nodeType === 3) { var r = rec.get(n); if (r && r.es === rawData(n)) setData(c, r.en); } return c; } return withEn(n, function () { return nClone.call(n, true); }); };
      nGetAttr = Element.prototype.getAttribute;
      Element.prototype.getAttribute = function (a) { var v = nGetAttr.call(this, a); if (v != null) { var R = arec.get(this), r = R && R[a]; if (r && r.es === v) return r.en; } return v; };
      Object.defineProperty(HTMLOptionElement.prototype, 'text', { configurable: true, enumerable: dOT.enumerable, set: dOT.set,
        get: function () { return norm(enText(this)); } });
    } catch (e) {}
    obs = new MutationObserver(onMut);
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function sweep() { if (document.body) visit(document.body); try { var ti = document.querySelector('title'); if (ti) visit(ti); } catch (e) {} }
  function syncUi() {
    try { document.documentElement.lang = lang === 'es' ? 'es' : 'en'; } catch (e) {}
    var bs = document.querySelectorAll('#langToggle button[data-val]');
    for (var i = 0; i < bs.length; i++) { var on = bs[i].getAttribute('data-val') === lang; bs[i].classList.toggle('active', on); bs[i].setAttribute('aria-pressed', String(on)); }
    offer();
  }
  function setLang(v, keep) {
    v = v === 'es' ? 'es' : 'en';
    if (!keep) { try { localStorage.setItem(KEY, v); } catch (e) {} }
    if (v === lang) { syncUi(); return; }
    lang = v;
    if (v === 'es') arm();
    if (armed) sweep();
    syncUi();
    try { window.dispatchEvent(new Event('pb-lang')); } catch (e) {}
  }
  /* ---- the offer: only when the phone's own language is Spanish and no choice was made yet ---- */
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function phoneEs() { try { var l = (navigator.languages && navigator.languages[0]) || navigator.language || ''; return /^es\b/i.test(l); } catch (e) { return false; } }
  function offer() {
    var want = !stored() && phoneEs() && !!document.body, bar = document.getElementById('pbLangOffer');
    if (!want) { if (bar) bar.parentNode.removeChild(bar); return; }
    if (bar) return;
    bar = document.createElement('div'); bar.id = 'pbLangOffer'; bar.setAttribute('data-noi18n', ''); bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Idioma / Language');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147482000;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#15181d;color:#fff;font:600 15px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 -2px 10px rgba(0,0,0,.35);';
    var s = document.createElement('span'); s.textContent = '¿Ver la app en español?'; s.setAttribute('lang', 'es'); bar.appendChild(s);
    function btn(txt, val, solid) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.id = val === 'es' ? 'pbLangOfferEs' : 'pbLangOfferEn';
      b.style.cssText = 'min-height:40px;padding:6px 16px;border-radius:10px;font:inherit;cursor:pointer;border:1px solid #fff;' + (solid ? 'background:#fff;color:#15181d;' : 'background:transparent;color:#fff;');
      b.onclick = function () { setLang(val); }; bar.appendChild(b);
    }
    btn('Español', 'es', true); btn('English', 'en', false);
    document.body.appendChild(bar);
  }
  window.pbSetLang = function (v) { setLang(v); };
  window.pbLang = function () { return lang; };
  window.pbT = function (en) { if (lang !== 'es') return en; compile(); var s = look(norm(String(en)), null); return s == null ? en : s; };
  window.pbI18nStats = function () { var n = 0, k; for (k in T) n++; return { lang: lang, armed: armed, strings: n, patterns: (D.p || []).length }; };
  /* test/harvest helper: what is on screen and whether the dictionary has it */
  window.pbI18nScan = function (root) {
    compile(); var out = [];
    function vis(el) { try { if (!el.getClientRects().length) return false; var cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; } catch (e) { return false; } }
    function has(k, el) { var v = T[k]; if (v !== undefined) return pick(v, el) != null; var s = look(k, el); return s != null; }
    (function go(el) {
      if (el.nodeType !== 1) return;
      var t = el.tagName;
      if (t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || t === 'NOSCRIPT' || t === 'svg' || t === 'SVG' || t === 'CANVAS' || t === 'IFRAME' || el.hasAttribute('data-noi18n') || el.id && NOI[el.id] === 1) return;
      if (!vis(el) && t !== 'OPTION' && t !== 'OPTGROUP') return;
      for (var a = 0; a < ATTRS.length; a++) { var av = t === 'SECTION' ? null : el.getAttribute(ATTRS[a]); if (av && /[A-Za-z]/.test(av)) out.push({ k: norm(av), kind: 'attr:' + ATTRS[a], hit: has(norm(av), el) }); }
      var mk = mixedKey(el);
      if (mk) { var mh = has(mk.key, el); out.push({ k: mk.key, kind: 'mixed', hit: mh }); if (mh) return; }
      for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) { var raw = enOf(c), k = norm(raw); if (k && /[A-Za-z]/.test(k)) { if (!has(k, el) && /\n\s*\n/.test(raw)) { raw.split(/\n\s*\n/).forEach(function (pp) { var pk = norm(pp); if (pk && /[A-Za-z]/.test(pk)) out.push({ k: pk, kind: 'para', hit: has(pk, el) }); }); } else out.push({ k: k, kind: mk ? 'part' : 'text', hit: has(k, el) }); } }
        else go(c);
      }
    })(root || document.body);
    return out;
  };
  if (stored() === 'es') setLang('es', true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (armed) sweep(); syncUi(); });
  else syncUi();
})();
