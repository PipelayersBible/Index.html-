// Browser tests for every page of pipelayersbible.com (home, tools, guides, use-case pages, 404) at 390 px and 1280 px.
// Usage:
//   python3 -m http.server 8863 --bind 127.0.0.1 --directory /tmp/claude-0/website &
//   NODE_PATH=/opt/npm-tools/node_modules node /tmp/claude-0/site/tools/test_seo_pages.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8863/'; const PROD = 'https://pipelayersbible.com';
const SHOTS = path.resolve(__dirname, '../shots/seo'); fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('PASS', m); } else { fail++; console.log('FAIL', m); } };

const PAGES = [
  { p: '/', kind: 'home', types: ['Organization', 'WebSite', 'SoftwareApplication', 'FAQPage'] },
  { p: '/tools/', kind: 'index', types: ['CollectionPage', 'BreadcrumbList'] },
  { p: '/tools/pipe-grade-calculator/', kind: 'tool', types: ['WebApplication', 'BreadcrumbList'] },
  { p: '/tools/rod-reading-to-invert/', kind: 'tool', types: ['WebApplication', 'BreadcrumbList'] },
  { p: '/tools/trench-sloping/', kind: 'tool', types: ['WebApplication', 'BreadcrumbList'] },
  { p: '/tools/pipe-volume-weight/', kind: 'tool', types: ['WebApplication', 'BreadcrumbList'] },
  { p: '/guides/', kind: 'index', types: ['CollectionPage', 'BreadcrumbList'] },
  { p: '/guides/how-to-read-a-grade-stake/', kind: 'guide', types: ['Article', 'BreadcrumbList'] },
  { p: '/guides/rod-reading-to-invert-step-by-step/', kind: 'guide', types: ['Article', 'BreadcrumbList'] },
  { p: '/guides/what-goes-on-a-confined-space-permit/', kind: 'guide', types: ['Article', 'BreadcrumbList'] },
  { p: '/grade-and-cut-sheet-app/', kind: 'landing', types: ['WebPage', 'BreadcrumbList'] },
  { p: '/daily-reports-for-underground-crews/', kind: 'landing', types: ['WebPage', 'BreadcrumbList'] },
  { p: '/confined-space-permit-app/', kind: 'landing', types: ['WebPage', 'BreadcrumbList'] },
  { p: '/404.html', kind: '404', types: [] },
];
const BANNED = /time[- ]sav|saves? (you )?(time|hours|money)|money[- ]sav|accura|court|tamper|OSHA[- ]compliant|compliant|expert|guarantee|testimonial|trusted by|\bstars?\b|\d+\+? (crews|companies|users)/i;

async function open(b, vp, url) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: vp.width < 500, hasTouch: vp.width < 500, colorScheme: 'light' });
  let gc = 0;
  await ctx.route(/gc\.zgo\.at|goatcounter\.com/, (r) => { gc++; r.fulfill({ contentType: 'application/javascript', body: '' }); });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') p.errs.push(m.text()); });
  p.bad = []; p.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(SITE) && !/404\.html/.test(url)) p.bad.push(r.status() + ' ' + r.url()); });
  await p.goto(SITE.replace(/\/$/, '') + url, { waitUntil: 'load' });
  p.gc = () => gc;
  return { ctx, p };
}
const overflow = (p) => p.evaluate(() => {
  const w = document.documentElement.clientWidth, bad = [];
  if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth + '>' + w);
  document.querySelectorAll('body *').forEach((e) => {
    if (!e.offsetParent || e.closest('.shots') || e.closest('.tbl-wrap') || e.closest('.hp') || e.classList.contains('skip')) return;
    const r = e.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  return bad.slice(0, 8);
});
const scrollAll = (p) => p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300)); });

(async () => {
  const b = await chromium.launch();
  const seenTitle = {}, seenDesc = {}, internal = new Set();
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const tag = vp.width + 'px';
    for (const pg of PAGES) {
      const { ctx, p } = await open(b, vp, pg.p);
      const at = tag + ' ' + pg.p + ': ';
      const info = await p.evaluate(() => {
        const g = (s, a) => { const e = document.querySelector(s); return e ? e.getAttribute(a) : null; };
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { __bad: e.message }; } });
        return {
          title: document.title, desc: g('meta[name=description]', 'content'), canon: g('link[rel=canonical]', 'href'), robots: g('meta[name=robots]', 'content'),
          ogUrl: g('meta[property="og:url"]', 'content'), ogImg: g('meta[property="og:image"]', 'content'), ogTitle: g('meta[property="og:title"]', 'content'), twCard: g('meta[name="twitter:card"]', 'content'),
          h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang, ld,
          cta: [...document.querySelectorAll('a[href]')].filter((a) => /^(\/#start|#start)$/.test(a.getAttribute('href'))).length,
          gcTag: !!document.querySelector('script[data-goatcounter="https://pipelayersbible.goatcounter.com/count"][src="https://gc.zgo.at/count.js"]'),
          nav: [...document.querySelectorAll('header .site-nav a')].map((a) => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), h: a.getAttribute('href'), ht: r.height, l: r.left, r: r.right, vis: !!a.offsetParent }; }),
          text: document.body.innerText.replace(/\s+/g, ' '), links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
          noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
          unlabeled: [...document.querySelectorAll('input:not([type=hidden]):not([type=radio]),select,textarea')].filter((e) => !(e.id && document.querySelector('label[for="' + e.id + '"]'))).length,
          radiosOut: [...document.querySelectorAll('input[type=radio]')].filter((r) => !r.closest('label') || !r.closest('fieldset')).length,
          words: (() => { const m = document.querySelector('article.prose') || document.querySelector('.split .prose'); return m ? m.innerText.trim().split(/\s+/).length : null; })(),
        };
      });
      const html = await p.content();
      ok((await overflow(p)).length === 0, at + 'nothing runs off the side ' + JSON.stringify(await overflow(p)));
      ok(info.title && info.desc && info.desc.length >= 50, at + 'title and description present (' + info.title + ')');
      ok(info.h1 === 1 && info.lang === 'en', at + 'one h1, lang=en');
      ok(info.ld.every((x) => !x.__bad), at + 'every JSON-LD block parses');
      const types = []; info.ld.forEach((x) => (x['@graph'] || [x]).forEach((n) => types.push(n['@type'])));
      ok(pg.types.every((ty) => types.includes(ty)), at + 'JSON-LD has ' + pg.types.join(', ') + ' (' + types.join(', ') + ')');
      ok(info.cta >= 1, at + 'a CTA links to /#start (' + info.cta + ')');
      ok(info.gcTag && p.gc() >= 1, at + 'GoatCounter script present and requested');
      ok(p.errs.length === 0, at + 'no console or page errors ' + JSON.stringify(p.errs));
      ok(p.bad.length === 0, at + 'no failed requests ' + JSON.stringify(p.bad));
      ok(info.noAlt === 0 && info.unlabeled === 0 && info.radiosOut === 0, at + 'images have alt, fields have labels, radios in a labelled fieldset');
      ok(info.nav.length === 4 && info.nav.map((n) => n.t).join('|') === 'Home|Free tools|Guides|Start a free trial' && info.nav[3].h === '/#start' && info.nav.every((n) => n.vis && n.ht >= 44 && n.l >= 0 && n.r <= vp.width), at + 'header nav: 4 links, visible, 44 px tall, on screen');
      ok(!/—/.test(html), at + 'no em-dash in the page source');
      ok(!BANNED.test(info.text), at + 'none of the banned claims ' + ((info.text.match(BANNED) || [])[0] || ''));
      ok(!/contractor/i.test(info.text) && !/DIG Civil|Desert Infrastructure|\bLLC\b/i.test(info.text), at + 'nobody called a contractor; no entity named');
      ok(!/\$\s?\d|\bprice|pricing|per month|\/mo\b|per user/i.test(info.text), at + 'no pricing in the visible text');
      if (pg.kind === '404') {
        ok(info.robots === 'noindex' && /Off grade/i.test(info.text) && info.links.includes('/'), at + 'noindex, Off grade, link home');
      } else {
        ok(info.canon === PROD + pg.p && /\/$/.test(info.canon), at + 'canonical ' + info.canon);
        ok(info.ogUrl === info.canon && info.ogImg === PROD + '/img/og-share.png' && info.ogTitle && info.twCard === 'summary_large_image', at + 'Open Graph url = canonical, share image, title, twitter card');
        if (vp.width === 390) {
          ok(!seenTitle[info.title], at + 'title is unique'); seenTitle[info.title] = pg.p;
          ok(!seenDesc[info.desc], at + 'description is unique'); seenDesc[info.desc] = pg.p;
          info.links.forEach((h) => internal.add(h.split('#')[0] || '/'));
        }
      }
      if (pg.kind === 'landing') ok(info.words >= 300 && info.words <= 600, at + 'copy is 300 to 600 words (' + info.words + ')');
      if (pg.kind === 'guide') {
        ok(info.words >= 600 && info.words <= 1000, at + 'guide is 600 to 1000 words (' + info.words + ')');
        const art = info.ld[0]['@graph'].find((n) => n['@type'] === 'Article');
        ok(art.author.name === 'Thomas Fontaine' && art.publisher.name === "The Pipelayer's Bible" && art.headline && art.datePublished === '2026-11-19', at + 'Article: author Thomas Fontaine, publisher, headline, date');
        ok(!/\b(when I|I was|I've seen|I remember)\b/.test(info.text.split('Related')[0].replace(/I work directly/g, '')), at + 'no first-person stories');
      }
      if (pg.kind === 'home') {
        const g = info.ld[0]['@graph'], org = g.find((n) => n['@type'] === 'Organization'), app = g.find((n) => n['@type'] === 'SoftwareApplication'), faq = g.find((n) => n['@type'] === 'FAQPage');
        ok(org.name === "The Pipelayer's Bible" && org.url === PROD + '/' && org.logo && org.telephone === '+1-909-435-5250' && org.email === 'tfontaine@pipelayersbible.com' && !org.legalName, 'home: Organization name, url, logo, telephone, email, no legal name');
        ok(app.applicationCategory === 'BusinessApplication' && app.operatingSystem === 'iOS, Android (web app)' && app.offers['@type'] === 'Offer' && app.offers.price === '0' && /30-day/.test(app.offers.description), 'home: SoftwareApplication with the free 30-day trial Offer (price 0)');
        const vis = await p.evaluate(() => [...document.querySelectorAll('.faq details')].map((d) => ({ q: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), a: d.querySelector('.ans').textContent.replace(/\s+/g, ' ').trim() })));
        ok(faq.mainEntity.length === vis.length && faq.mainEntity.every((q, i) => q.name === vis[i].q && q.acceptedAnswer.text === vis[i].a), 'home: FAQPage questions and answers match the visible FAQ word for word');
      }
      // tools compute the expected values for sample inputs
      if (pg.p === '/tools/pipe-grade-calculator/') {
        const r = await p.evaluate(() => ({ end: document.querySelector('#g-end .v').textContent, endS: document.querySelector('#g-end .s').textContent, ch: document.querySelector('#g-change .v').textContent, pct: document.querySelector('#g-pct').textContent, rows: [...document.querySelectorAll('#g-table tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent)) }));
        ok(r.end === '99.00 ft' && r.endS === '99\'-0"' && r.ch === '1.00 ft' && /0\.40%/.test(r.pct) && /0\.048 in per ft/.test(r.pct), at + 'defaults: 250 ft at 0.40% from 100.00 ends at 99.00 (' + JSON.stringify(r).slice(0, 160) + ')');
        ok(r.rows.length === 11 && r.rows[5].join('|') === '1+25.00|125.00|99.50|99\'-6"' && r.rows[10][2] === '99.00', at + 'table: 11 rows, 1+25.00 is 99.50');
        await p.check('input[name=g-mode][value=drop]'); await p.fill('#g-drop', '1.5'); await p.fill('#g-len', '300'); await p.fill('#g-sta', '1000'); await p.check('input[name=g-dir][value=up]');
        const r2 = await p.evaluate(() => ({ pct: document.querySelector('#g-pct .v').textContent, end: document.querySelector('#g-end .v').textContent, first: document.querySelector('#g-table tbody tr td').textContent, slopeHidden: document.getElementById('g-slope-wrap').hidden }));
        ok(r2.pct === '0.50%' && r2.end === '101.50 ft' && r2.first === '10+00.00' && r2.slopeHidden, at + 'drop 1.5 ft over 300 ft rising from station 10+00 = 0.50%, ends 101.50');
        await p.fill('#s-a', '96.03'); await p.fill('#s-b', '95.03'); await p.fill('#s-d', '250');
        const r3 = await p.evaluate(() => document.getElementById('s-out').textContent);
        ok(/0\.40%/.test(r3) && /Falls/.test(r3) && /1\.00 ft/.test(r3) && /0\.048 in/.test(r3), at + 'two inverts 96.03 to 95.03 over 250 ft: falls 0.40%, 1.00 ft');
        await p.fill('#g-len', '-5'); ok(/more than 0/.test(await p.textContent('#g-out')), at + 'bad length shows a message');
      }
      if (pg.p === '/tools/rod-reading-to-invert/') {
        const v = (id) => p.evaluate((i) => { const e = document.querySelector('#' + i + ' .v'); return e ? e.textContent : null; }, id);
        ok((await v('r-hi')) === '109.560 ft' && (await v('r-elev')) === '96.710 ft' && (await v('r-inv')) === '96.030 ft' && (await v('r-target')) === '13.550 ft' && (await v('r-diff')) === 'On grade', at + 'defaults: HI 109.560, shot 96.710, invert 96.030, lay to 12.850 on top of 8" SDR 35');
        await p.check('input[name=r-where][value=inv]');
        ok((await v('r-target')) === '13.550 ft' && !(await p.evaluate(() => document.getElementById('r-pipe-wrap').hidden)), at + 'rod on the invert: lay to 13.530, pipe choice hidden');
        await p.fill('#r-fs', '13.60'); ok((await v('r-diff')) === '0.070 ft low', at + 'reading 13.60 on the invert is 0.070 ft low');
        await p.check('input[name=r-where][value=bop]'); await p.selectOption('#r-pipe', 'c900-8'); await p.fill('#r-fs', '13.50');
        ok((await v('r-inv')) === '96.102 ft', at + 'BOP shot on 8" C900: invert = 96.06 + 0.042 = 96.102');
      }
      if (pg.p === '/tools/trench-sloping/') {
        const v = (id) => p.evaluate((i) => { const e = document.querySelector('#' + i + ' .v'); return e ? e.textContent : null; }, id);
        ok((await v('t-slope')) === '1 : 1' && (await v('t-side')) === '8.00 ft' && (await v('t-top')) === '19.00 ft', at + 'defaults: 8 ft Type B, 3 ft bottom: 1:1, 8.00 back, 19.00 top');
        const rows = await p.evaluate(() => [...document.querySelectorAll('#t-table tbody tr')].map((tr) => tr.lastElementChild.textContent));
        ok(rows.join('|') === '3.00 ft|15.00 ft|19.00 ft|27.00 ft', at + 'table: rock 3, A 15, B 19, C 27');
        await p.selectOption('#t-soil', 'C'); ok((await v('t-top')) === '27.00 ft', at + 'Type C: 27.00 top');
        await p.fill('#t-depth', '20'); ok(await p.evaluate(() => !!document.getElementById('t-pe') && !document.getElementById('t-slope') && /registered professional engineer/.test(document.getElementById('t-pe').textContent)), at + '20 ft: engineer message, no slope');
        await p.fill('#t-depth', '4'); ok(await p.evaluate(() => !!document.getElementById('t-shallow')), at + '4 ft: the under-5-ft note');
        ok(/Your competent person classifies the soil and decides the protective system\./.test(info.text), at + 'competent person line');
      }
      if (pg.p === '/tools/pipe-volume-weight/') {
        const v = (id) => p.evaluate((i) => { const e = document.querySelector('#' + i + ' .v'); return e ? e.textContent : null; }, id);
        ok((await v('w-gal')) === '261.1 gal' && /^34\.91/.test(await v('w-cf')) && (await v('w-perft')) === '2.611 gal', at + 'defaults: 100 ft of 8" = 261.1 gal, 34.91 ft3');
        ok((await v('b-zone')).startsWith('23.02') && (await v('b-above')).startsWith('42.22') && (await v('b-fill')).startsWith('65.24') && (await v('b-total')).startsWith('66.67') && (await v('b-pipecf')).startsWith('1.43'), at + 'defaults: trench 66.67, pipe 1.43, zone 23.02, above 42.22, fill 65.24 yd3');
        await p.selectOption('#w-pipe', 'c900-8'); ok((await p.inputValue('#w-id')) === '8.044', at + 'picking 8" C900 fills ID 8.044');
        await p.selectOption('#b-pipe', 'sdr35-12'); ok((await p.inputValue('#b-od')) === '12.5', at + 'picking 12" SDR 35 fills OD 12.5');
        await p.fill('#b-d', '1'); ok(/deeper than the trench/.test(await p.textContent('#b-out')), at + 'pipe zone deeper than the trench is refused');
      }
      await scrollAll(p);
      ok(await p.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.offsetParent).every((i) => i.naturalWidth > 0)), at + 'every visible image loaded');
      ok((await overflow(p)).length === 0, at + 'still nothing runs off the side after using it');
      if (pg.kind !== 'home') await p.screenshot({ path: SHOTS + '/' + tag + (pg.p.replace(/\//g, '_') || '_') + '.png', fullPage: vp.width === 390 });
      await ctx.close();
    }
  }
  // every internal link resolves
  const dead = [];
  for (const h of internal) { const r = await fetch(SITE.replace(/\/$/, '') + h); if (r.status !== 200) dead.push(r.status + ' ' + h); }
  ok(dead.length === 0, 'every internal link answers 200 (' + internal.size + ' checked) ' + JSON.stringify(dead));
  // sitemap and robots
  const sm = await (await fetch(SITE + 'sitemap.xml')).text(), rb = await (await fetch(SITE + 'robots.txt')).text();
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const want = PAGES.filter((x) => x.kind !== '404').map((x) => PROD + x.p);
  ok(locs.length === want.length && want.every((u) => locs.includes(u)) && (sm.match(/<lastmod>2026-11-19<\/lastmod>/g) || []).length === want.length, 'sitemap lists all ' + want.length + ' pages with lastmod 2026-11-19');
  ok(/^Sitemap: https:\/\/pipelayersbible\.com\/sitemap\.xml$/m.test(rb) && /Allow: \//.test(rb), 'robots.txt allows all and has the Sitemap line');
  const unlinked = want.filter((u) => u !== PROD + '/' && ![...internal].some((h) => PROD + h === u));
  ok(unlinked.length === 0, 'every page in the sitemap is linked from another page ' + JSON.stringify(unlinked));
  await b.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
