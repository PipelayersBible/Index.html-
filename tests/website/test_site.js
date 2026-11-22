// Browser tests for the website (site/www). Usage (from site/):
//   python3 -m http.server 8861 --bind 127.0.0.1 --directory www &      (the site)
//   node tools/mock_supabase.js 8862 &                                    (fake PostgREST for the live edge-function run)
//   SUPABASE_URL=http://127.0.0.1:8862 SUPABASE_SERVICE_ROLE_KEY=k deno run --allow-net --allow-env edge/trial-request/index.ts &   (port 8000)
//   NODE_PATH=/opt/npm-tools/node_modules node tools/test_site.js
// Google Fonts is answered from the npm copy of Oswald (the sandbox can't reach Google), so screenshots show the real font.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8863/'; const FN = 'https://rogfassochneycezecxa.supabase.co/functions/v1/trial-request';
const LIVE_FN = process.env.LIVE_FN || 'http://127.0.0.1:8000/'; const MOCK = process.env.MOCK || 'http://127.0.0.1:8862';
const SHOTS = path.resolve(__dirname, '../shots'); fs.mkdirSync(SHOTS, { recursive: true });
const FONTS = path.resolve(__dirname, 'fonts');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };

async function open(b, vp, opts = {}) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: opts.dpr || 1, isMobile: !!opts.mobile, hasTouch: !!opts.mobile, colorScheme: 'light' });
  await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => r.fulfill({ contentType: 'application/javascript', body: '' }));
  await ctx.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: fs.readFileSync(FONTS + '/oswald.css', 'utf8') }));
  await ctx.route(/\/__fonts\//, (r) => r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(FONTS + '/package/files/' + path.basename(new URL(r.request().url()).pathname)) }));
  if (opts.fn) await ctx.route(FN, opts.fn);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.reqs = []; p.on('requestfinished', async (rq) => { try { const s = await rq.sizes(); p.reqs.push({ url: rq.url(), bytes: s.responseBodySize + s.responseHeadersSize }); } catch (e) {} });
  await p.goto(opts.url || SITE, { waitUntil: 'load' });
  return { ctx, p };
}
const overflow = (p) => p.evaluate(() => {
  const w = document.documentElement.clientWidth, bad = [];
  if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth + '>' + w);
  document.querySelectorAll('body *').forEach((e) => {
    if (!e.offsetParent || e.closest('.shots') || e.closest('.hp') || e.classList.contains('skip')) return;
    const r = e.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  return bad.slice(0, 8);
});
const scrollAll = async (p) => { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)); } document.querySelectorAll('.shots').forEach((s) => { s.scrollLeft = s.scrollWidth; }); await new Promise((r) => setTimeout(r, 300)); window.scrollTo({ top: 0, behavior: 'instant' }); document.querySelectorAll('.shots').forEach((s) => { s.scrollLeft = 0; }); }); await p.waitForTimeout(500); };
const fillGood = async (p) => {
  await p.fill('#f-name', 'Joe Smith'); await p.fill('#f-company', 'Acme Pipeline'); await p.selectOption('#f-role', 'Superintendent');
  await p.fill('#f-email', 'joe@example.com'); await p.fill('#f-phone', '(555) 010-2000'); await p.selectOption('#f-crew', '8-15'); await p.fill('#f-msg', 'Two crews on a sewer job.');
};

(async () => {
  const b = await chromium.launch();

  // ---------- phone 390 x 844 ----------
  let { ctx, p } = await open(b, { width: 390, height: 844 }, { mobile: true, dpr: 2 });
  ok((await overflow(p)).length === 0, 'phone: nothing runs off the side at first paint ' + JSON.stringify(await overflow(p)));
  ok(await p.evaluate(() => { const i = document.querySelector('.hero-phone img'); return !!i.offsetParent && i.loading !== 'lazy'; }), 'phone: the hero screenshot shows on phones and loads right away (Nov 22 decision)');
  await p.keyboard.press('Tab'); const skip = await p.evaluate(() => { const a = document.activeElement; return a.className + '|' + a.getBoundingClientRect().left; });
  ok(/skip/.test(skip) && !/\|-/.test(skip), 'first Tab shows the skip link (' + skip + ')');
  const order = await p.evaluate(() => [...document.querySelectorAll('main > section')].map((s) => s.querySelector('h1,h2') ? s.querySelector('h1,h2').innerText.trim() : (s.getAttribute('aria-label') || '')));
  console.log('  sections:', JSON.stringify(order));
  ok(order.length === 8 && /no signal/i.test(order[0]) && /quick answers/i.test(order[1]) && /each person/i.test(order[2]) && /in the app/i.test(order[3]) && /30-day/i.test(order[4]) && /goal/i.test(order[5]) && /Questions/i.test(order[6]) && /Start a free trial/i.test(order[7]), 'sections in order: hero, quick answers, roles, screenshots, trial, goal, FAQ, form');
  const text = await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  ok(/Grade sheets, confined space permits and daily reports on your crew's phones\. Works with no signal\./i.test(text) && text.includes("A phone app built for underground pipe crews. The day's work, with its delay log, reaches the foreman and the office without anyone retyping it."), 'hero: headline and sub-line exactly as given');
  const roles = await p.evaluate(() => [...document.querySelectorAll('.role')].map((r) => ({ h: r.querySelector('h3').innerText, li: [...r.querySelectorAll('li')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()) })));
  const WANT = {
 "PIPELAYER": [
  "Works out pipe grades from survey stake photos (read by AI, then checked by you) or from numbers you enter",
  "Imports cut sheets: a PDF, a photo, or rows pasted in",
  "Lenker, engineer's and architect's rods",
  "HI cross-check: flags it when two shots don't agree on the instrument height",
  "Check shots, footage, slope and pipe info at a glance",
  "Time-stamped delay log: utility conflict, inspector, weather, equipment down, material, survey/stakes, traffic control",
  "Confined space permits and entry log, with an emergency button that opens the phone's dialer",
  "Calculators for trenching, grade, materials and more",
  "Built-in AI assistant for civil work questions on the job"
 ],
 "FOREMAN": [
  "Full access to all pipelayer features",
  "Sees his crew's run progress as their phones send it",
  "Daily reports filled in automatically from the day's work",
  "Field tickets with photo upload",
  "Warnings when an 811 ticket is nearly expired, in states where the ticket life is set by law",
  "811 and safety rules for all 50 states and DC: ticket dates, trench rules and injury reporting",
  "Extra work documentation",
  "Built-in AI assistant for civil work questions on the job"
 ],
 "OFFICE": [
  "Material takeoffs from your plan sets coming soon",
  "A PDF of every run, with the phone's time at every point",
  "Sealed run records: a sealed original of each run PDF, so a later change to that file would show",
  "Signed daily reports with production from every job and every crew",
  "Search your records and export runs, daily reports and permits",
  "Built-in AI for civil work questions and for questions about your company's own numbers"
 ]
};
  ok(roles.length === 3 && roles.every((r) => JSON.stringify(r.li) === JSON.stringify(WANT[r.h.toUpperCase()])), 'role columns: the approved wording, word for word');
  const colsPhone = await p.evaluate(() => { const r = [...document.querySelectorAll('.role')].map((e) => e.getBoundingClientRect()); return r[1].top > r[0].bottom - 1 && r[2].top > r[1].bottom - 1; });
  ok(colsPhone, 'phone: role columns stack');
  ok(text.includes("Your company account plus 6 people. No credit card, and no automatic payment when it's over. At the end, whoever ran it gets a one-page summary of what the crew logged (footage, delays, inspections, paperwork sent) to show the owner."), 'trial text exactly as given');
  ok(text.includes('Send the email of whoever will run it, usually the superintendent.') && text.includes('Thomas sets up your company, usually the same day, and sends them the invite. They add their own crew right from the app.') && text.includes('The crew installs it from the invite and starts logging runs.'), 'trial: the 3 steps');
  ok(text.includes('Our goal is simple: get real feedback from real crews to make the best product possible. I work directly with every company that tries it, and fixes go out fast.'), 'goal line as given');
  const goalStyle = await p.evaluate(() => { const q = document.querySelector('.goal blockquote'), s = getComputedStyle(q), t = getComputedStyle(q.querySelector('p')); return { bl: s.borderLeftColor, w: s.borderLeftWidth, fw: t.fontWeight }; });
  ok(goalStyle.bl === 'rgb(244, 197, 66)' && parseFloat(goalStyle.w) >= 4 && Number(goalStyle.fw) >= 700, 'goal line: bold with a yellow left rule ' + JSON.stringify(goalStyle));
  const faqs = await p.evaluate(() => [...document.querySelectorAll('.faq details summary')].map((s) => s.innerText.trim()));
  ok(faqs.length === 14 && faqs[0] === 'Does it work with no signal?' && faqs[1] === 'What does it cost?' && faqs[13] === 'What happens after 30 days?', 'FAQ: 14 questions in <details>');
  await p.click('.faq details:nth-of-type(3) summary'); ok(await p.evaluate(() => document.querySelectorAll('.faq details')[2].open), 'FAQ opens on tap');
  // wording rules
  const html = await p.content();
  ok(text.includes('$99 a month for your company and 5 people') && text.includes('$12 a month for each extra person') && !/\$\s?0\b|free forever/i.test(text), 'pricing shown: $99 for the company and 5 people, $12 each extra (Nov 22 decision)');
  ok(!/—/.test(html), 'no em-dash anywhere in the page source');
  ok(!/time[- ]sav|saves? (you )?(time|hours|money)|money[- ]sav|accura|court|tamper|OSHA[- ]compliant|compliant|expert|guarantee|testimonial|trusted by|\bstars?\b|\d+\+? (crews|companies|users)/i.test(text), 'none of the banned claims (time/money saved, accuracy, court, tamper, OSHA compliant, expert, user counts, stars)');
  ok(!/contractor/i.test(text) && !/DIG Civil|LLC/i.test(text) && (text.match(/Desert Infrastructure Group/g) || []).length === 1, 'Thomas not called a contractor; DIG Civil never named; the legal name only in the footer');
  // links
  const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  ok(links.includes('tel:+19094355250') && links.includes('sms:+19094355250') && links.includes('mailto:tfontaine@pipelayersbible.com'), 'tel:, sms: and mailto: links');
  ok(text.includes('Prefer to call or text?') && text.includes('(909) 435-5250') && text.includes('tfontaine@pipelayersbible.com'), 'phone number and email shown as text');
  ok(links.filter((h) => h === 'https://app.pipelayersbible.com').length >= 2 && links.includes('https://app.pipelayersbible.com/terms.html') && links.includes('https://app.pipelayersbible.com/privacy.html'), 'Open the app, Terms and Privacy links');
  ok(await p.evaluate(() => document.querySelector('.hero-ctas a').getAttribute('href') === '#start' && /Start a free trial/.test(document.querySelector('.hero-ctas a').innerText)), 'hero primary button goes to the form');
  ok(text.includes('© 2026 Desert Infrastructure Group'), 'footer copyright line');
  // meta
  const meta = await p.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? (e.content || e.href) : null; }; return { d: g('meta[name=description]'), c: g('link[rel=canonical]'), t: g('meta[name=theme-color]'), oi: g('meta[property="og:image"]'), ot: g('meta[property="og:title"]'), tc: g('meta[name="twitter:card"]'), ti: g('meta[name="twitter:image"]') }; });
  ok(meta.d && meta.c === 'https://pipelayersbible.com/' && meta.t === '#111318' && meta.oi === 'https://pipelayersbible.com/img/og-share.png' && meta.ot && meta.tc === 'summary_large_image' && meta.ti, 'meta description, canonical, theme-color, Open Graph and Twitter tags');
  // a11y basics
  const a11y = await p.evaluate(() => ({
    noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
    unlabeled: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((e) => !(e.id && document.querySelector('label[for="' + e.id + '"]'))).length,
    h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
    shotsAlt: [...document.querySelectorAll('.shot img')].every((i) => i.alt.length > 40),
  }));
  ok(a11y.noAlt === 0 && a11y.unlabeled === 0 && a11y.h1 === 1 && a11y.lang === 'en' && a11y.shotsAlt, 'every image has alt (screenshots described), every field labelled, one h1, lang=en');
  await p.focus('.skip'); await p.keyboard.press('Tab');
  const focusStyle = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); let e = document.activeElement, bg = ''; while (e && (!bg || bg === 'rgba(0, 0, 0, 0)')) { bg = getComputedStyle(e).backgroundColor; e = e.parentElement; } return s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor + ' on ' + bg; });
  ok(/solid 3px rgb\(244, 197, 66\) on rgb\(17, 19, 24\)/.test(focusStyle), 'visible focus outline on the dark header: yellow, 3px (' + focusStyle + ')');
  await p.focus('#f-name'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab');
  const fo = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
  ok(/solid 3px/.test(fo), 'form fields show a 3px focus ring (' + fo + ')');
  const hp = await p.evaluate(() => { const i = document.getElementById('f-website'); const r = i.getBoundingClientRect(); return { tab: i.tabIndex, off: r.right < 0, aria: i.closest('.hp').getAttribute('aria-hidden') }; });
  ok(hp.tab === -1 && hp.off && hp.aria === 'true', 'honeypot is off-screen, not tabbable, hidden from screen readers');
  // contrast of key pairs
  const contrast = await p.evaluate(() => {
    const L = (c) => { const m = c.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const R = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bgOf = (e) => { while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; e = e.parentElement; } return 'rgb(255,255,255)'; };
    const sel = ['.hero-sub', '.hero-note', '.eyebrow', '.role li', '.shot figcaption', '.trial-lead', '.steps li', '.goal p', '.faq summary', '.field label', '.opt', '.contact-card p', '.foot-links a', '.copy', '.btn-primary', 'a.mail', '.faq .ans a'];
    return sel.map((s) => { const e = document.querySelector(s); if (!e) return [s, 0]; return [s, Math.round(R(getComputedStyle(e).color, bgOf(e)) * 10) / 10]; });
  });
  console.log('  contrast:', JSON.stringify(contrast));
  ok(contrast.every((c) => c[1] >= 4.5), 'text contrast at least 4.5:1 for every checked style');
  // images
  await scrollAll(p);
  const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.offsetParent).map((i) => ({ s: i.getAttribute('src'), w: i.naturalWidth, cw: i.clientWidth })));
  ok(imgs.length >= 7 && imgs.every((i) => i.w > 0), 'phone: every visible image loaded (' + imgs.length + ')');
  ok(imgs.filter((i) => /shot-/.test(i.s)).every((i) => i.w >= i.cw * 1.9), 'screenshots are about 2x their shown size (sharp on retina)');
  const lazy = await p.evaluate(() => [...document.querySelectorAll('.shot img')].every((i) => i.loading === 'lazy'));
  ok(lazy, 'screenshots lazy-load');
  const shotScroll = await p.evaluate(() => { const s = document.querySelector('.shots'); return s.scrollWidth > s.clientWidth && getComputedStyle(s).overflowX === 'auto'; });
  ok(shotScroll, 'phone: screenshots swipe sideways inside their own row (the page itself does not)');
  ok((await overflow(p)).length === 0, 'phone: still nothing runs off the side after scrolling');
  const weight = p.reqs.reduce((n, r) => n + r.bytes, 0);
  console.log('  phone requests:', p.reqs.length, 'bytes', weight); p.reqs.forEach((r) => console.log('    ', r.bytes, r.url.replace(SITE, '/')));
  ok(weight < 1.5e6, 'phone: whole page with every image and font under 1.5 MB (' + Math.round(weight / 1024) + ' KB)');
  ok(p.errs.length === 0, 'phone: no page errors ' + JSON.stringify(p.errs));
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.screenshot({ path: SHOTS + '/phone_full.png', fullPage: true });
  await p.screenshot({ path: SHOTS + '/phone_top.png' });
  await ctx.close();

  // ---------- form: validation, success (mocked), failure, network error ----------
  let sent = null;
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { mobile: true, fn: async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' } });
    sent = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
  } }));
  await p.click('.hero-ctas a.btn-primary'); await p.waitForTimeout(2000);
  const formTop = await p.evaluate(() => document.getElementById('start').getBoundingClientRect().top);
  ok(Math.abs(formTop) < 40, 'Start a free trial scrolls to the form (' + Math.round(formTop) + ')');
  await p.click('#f-submit'); await p.waitForTimeout(300);
  const errs = await p.evaluate(() => ({ name: document.getElementById('e-name').innerText, email: document.getElementById('e-email').innerText, role: document.getElementById('e-role').innerText, focus: document.activeElement.id, inv: document.getElementById('f-name').getAttribute('aria-invalid') }));
  ok(errs.name && errs.email && errs.role && errs.focus === 'f-name' && errs.inv === 'true', 'empty submit: errors shown, first bad field focused, aria-invalid set');
  ok(sent === null, 'empty submit: nothing sent');
  await fillGood(p); await p.fill('#f-email', 'joe@nowhere'); await p.click('#f-submit'); await p.waitForTimeout(300);
  ok(/Check the email/.test(await p.innerText('#e-email')) && sent === null, 'bad email: message, nothing sent');
  await p.fill('#f-phone', 'call me'); await p.fill('#f-email', 'joe@example.com'); await p.click('#f-submit'); await p.waitForTimeout(300);
  const pe = await p.innerText('#e-phone'); ok(/phone/.test(pe) && sent === null, 'bad phone: message, nothing sent (' + pe + ', sent ' + JSON.stringify(sent) + ')');
  await p.fill('#f-phone', '(555) 010-2000'); await p.waitForTimeout(3100); await p.click('#f-submit');
  for (let i = 0; i < 30 && !sent; i++) await p.waitForTimeout(200);
  await p.waitForTimeout(800);
  if (!sent) console.log('  debug:', await p.evaluate(() => ({ st: document.getElementById('f-status').innerText, errs: [...document.querySelectorAll('.err')].map((e) => e.id + ':' + e.innerText).filter((x) => !/:$/.test(x)), btn: document.getElementById('f-submit').textContent })));
  ok(sent && sent.name === 'Joe Smith' && sent.company === 'Acme Pipeline' && sent.role === 'Superintendent' && sent.email === 'joe@example.com' && sent.crew_size === '8-15' && sent.website === '' && sent.elapsed_ms >= 3000, 'good submit: sends the fields, empty honeypot and the fill time ' + JSON.stringify(sent));
  const ty = await p.evaluate(() => ({ shown: !document.getElementById('f-thanks').hidden, formHidden: document.getElementById('trial-form').hidden, t: document.getElementById('f-thanks').innerText, focus: document.activeElement.id }));
  ok(ty.shown && ty.formHidden && /Thanks\. Thomas will reach out, usually the same day\./.test(ty.t) && ty.focus === 'f-thanks', 'success: plain thank-you replaces the form and takes focus ' + JSON.stringify(ty));
  await p.evaluate(() => document.getElementById('start').scrollIntoView()); await p.screenshot({ path: SHOTS + '/phone_form_thanks.png' });
  await ctx.close();

  // failure (500)
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { mobile: true, fn: (r) => r.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false,"error":"server"}' }) }));
  await fillGood(p); await p.waitForTimeout(3100); await p.click('#f-submit'); await p.waitForTimeout(1200);
  const fl = await p.evaluate(() => ({ t: document.getElementById('f-status').innerText, links: [...document.querySelectorAll('#f-status a')].map((a) => a.getAttribute('href')), form: !document.getElementById('trial-form').hidden, kept: document.getElementById('f-name').value, btn: document.getElementById('f-submit').disabled, role: document.getElementById('f-status').getAttribute('role') }));
  ok(/didn.t go through/.test(fl.t) && fl.links.includes('tel:+19094355250') && fl.links.includes('mailto:tfontaine@pipelayersbible.com') && fl.form && fl.kept === 'Joe Smith' && !fl.btn && fl.role === 'alert', 'server error: shows the phone and email to contact instead, keeps what was typed, button usable again');
  await p.evaluate(() => document.getElementById('f-status').scrollIntoView({ block: 'center' })); await p.screenshot({ path: SHOTS + '/phone_form_failure.png' });
  await ctx.close();
  // rate limited (429)
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { fn: (r) => r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":false,"error":"rate"}' }) }));
  await fillGood(p); await p.waitForTimeout(3100); await p.click('#f-submit'); await p.waitForTimeout(1000);
  ok(/didn.t go through/.test(await p.innerText('#f-status')), 'rate limited: same contact-us message');
  await ctx.close();
  // network down
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { fn: (r) => r.abort('internetdisconnected') }));
  await fillGood(p); await p.waitForTimeout(3100); await p.click('#f-submit'); await p.waitForTimeout(1000);
  ok(/didn.t go through/.test(await p.innerText('#f-status')), 'network error: same contact-us message');
  await ctx.close();
  // 200 but not {ok:true}
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { fn: (r) => r.fulfill({ status: 200, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<html>' }) }));
  await fillGood(p); await p.waitForTimeout(3100); await p.click('#f-submit'); await p.waitForTimeout(1000);
  ok(/didn.t go through/.test(await p.innerText('#f-status')), 'odd answer (200 without ok:true): treated as a failure');
  await ctx.close();

  // ---------- live edge function (deno, real CORS preflight) against the fake database ----------
  const live = await fetch(MOCK + '/__calls').then((r) => r.ok).catch(() => false);
  if (live) {
    const sendLive = async (fill) => {
      await fetch(MOCK + '/__reset');
      const c = await b.newContext({ viewport: { width: 390, height: 844 } });
      await c.route(/fonts\.googleapis\.com/, (r) => r.fulfill({ contentType: 'text/css', body: '' }));
      const pg = await c.newPage(); await pg.goto(SITE, { waitUntil: 'load' });
      await pg.evaluate((u) => document.getElementById('trial-form').setAttribute('data-endpoint', u), LIVE_FN);
      await fill(pg); await pg.click('#f-submit'); await pg.waitForTimeout(1500);
      const res = { thanks: await pg.evaluate(() => !document.getElementById('f-thanks').hidden), status: await pg.innerText('#f-status').catch(() => '') };
      const calls = await fetch(MOCK + '/__calls').then((r) => r.json());
      await c.close(); return { ...res, calls };
    };
    let r = await sendLive(async (pg) => { await fillGood(pg); await pg.waitForTimeout(3100); });
    const add = r.calls.find((x) => x.name === 'pb_trial_request_add'); console.log('  live:', JSON.stringify(r).slice(0, 600));
    ok(r.thanks && add && add.args.p_email === 'joe@example.com' && add.args.p_company === 'Acme Pipeline' && /^[0-9a-f]{32}$/.test(add.args.p_ip_hash) && add.auth === 'Bearer k', 'LIVE: browser form -> deno edge function (CORS preflight) -> pb_trial_request_add with service key and hashed IP -> thank-you');
    r = await sendLive(async (pg) => { await fillGood(pg); await pg.evaluate(() => { document.getElementById('f-website').value = 'http://spam.example'; }); await pg.waitForTimeout(3100); });
    ok(r.thanks && r.calls.length === 0, 'LIVE: honeypot filled -> thank-you shown, nothing stored');
    r = await sendLive(async (pg) => { await fillGood(pg); });
    ok(r.thanks && r.calls.length === 0, 'LIVE: sent under 3 s after the page opened -> thank-you shown, nothing stored');
    await fetch(MOCK + '/__mode?rate=1');
    r = await sendLive(async (pg) => { await fillGood(pg); await pg.waitForTimeout(3100); });
    ok(!r.thanks && /didn.t go through/.test(r.status), 'LIVE: database says rate limited -> 429 -> contact-us message');
    await fetch(MOCK + '/__mode?rate=0');
  } else console.log('SKIP live edge-function run (mock database not running)');

  // ---------- desktop 1280 x 800 ----------
  ({ ctx, p } = await open(b, { width: 1280, height: 800 }));
  ok((await overflow(p)).length === 0, 'desktop: nothing runs off the side');
  const cols = await p.evaluate(() => { const r = [...document.querySelectorAll('.role')].map((e) => e.getBoundingClientRect()); return Math.abs(r[0].top - r[2].top) < 2 && r[2].left > r[1].left; });
  ok(cols, 'desktop: three role columns side by side');
  const grid = await p.evaluate(() => { const s = document.querySelector('.shots'); return getComputedStyle(s).display === 'grid' && s.scrollWidth <= s.clientWidth + 1; });
  ok(grid, 'desktop: the four screenshots sit in one row, no sideways scroll');
  ok(await p.evaluate(() => !!document.querySelector('.hero-phone').offsetParent), 'desktop: hero shows the grade sheet in a phone frame');
  await scrollAll(p);
  ok((await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.offsetParent).every((i) => i.naturalWidth > 0))), 'desktop: every image loaded');
  ok(p.errs.length === 0, 'desktop: no page errors ' + JSON.stringify(p.errs));
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.screenshot({ path: SHOTS + '/desktop_full.png', fullPage: true });
  await p.screenshot({ path: SHOTS + '/desktop_top.png' });
  await ctx.close();

  // ---------- 404, robots, sitemap, CNAME, favicon ----------
  ({ ctx, p } = await open(b, { width: 390, height: 844 }, { url: SITE + '404.html' }));
  ok(/Off grade/i.test(await p.innerText('h1')) && (await p.evaluate(() => document.querySelector('a[href="/"]') !== null)) && (await overflow(p)).length === 0, '404 page: heading, link home, fits the phone');
  await p.screenshot({ path: SHOTS + '/phone_404.png' });
  await ctx.close();
  const get = (u) => fetch(SITE + u).then(async (r) => ({ s: r.status, t: await r.text() }));
  const [cn, rb, sm, fav, og] = await Promise.all([get('CNAME'), get('robots.txt'), get('sitemap.xml'), fetch(SITE + 'favicon.ico'), fetch(SITE + 'img/og-share.png')]);
  ok(cn.t.trim() === 'pipelayersbible.com', 'CNAME holds pipelayersbible.com');
  ok(/Sitemap: https:\/\/pipelayersbible\.com\/sitemap\.xml/.test(rb.t) && /<loc>https:\/\/pipelayersbible\.com\/<\/loc>/.test(sm.t), 'robots.txt points at the sitemap; sitemap lists the home page');
  ok(fav.status === 200 && og.status === 200, 'favicon and share image served');

  await b.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
