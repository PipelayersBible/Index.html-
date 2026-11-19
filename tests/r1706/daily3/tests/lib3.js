// daily3 tests: the daily2 audit helpers plus a verdict counter, run builders with set times, 390 px light/dark checks.
const L = require(__dirname + '/../../../bughunt_nov17/daily2/lib.js');
const X = Object.assign({}, L);
X.fails = 0;
X.ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) X.fails++; };
X.done = async (b, p) => { console.log('errs', JSON.stringify((p.errs || []).slice(0, 5))); X.ok(!(p.errs || []).length, 'no page errors'); await b.close(); process.exit(X.fails ? 1 : 0); };
X.T = (h, m) => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() + Math.round((h * 60 + (m || 0)) * 60000); };
// a run on job with the given start/end and each person's check-in/out (people: [[name, type, inMs, outMs]])
X.run = async (p, o) => {
  await L.mkrun(p, { job: o.job || '24-017', site: o.site, dist: o.dist || 100 });
  for (const c of (o.crew || [])) await L.crew(p, c[0], c[1] || 'Laborer');
  if (o.pipe) await L.prod(p, { by: 'Tommy', pipe: o.pipe });
  await L.endRun(p);
  await L.ev(p, `(()=>{const e=runArchive.slice().sort((a,b)=>b.id-a.id)[0];e.runStartTime=${o.start};e.runEndTime=${o.end};const C=${JSON.stringify(o.crew || [])};(e.crewLog||[]).forEach(c=>{const x=C.find(y=>y[0]===c.name);const i=x&&x[2]!=null?x[2]:${o.start},u=x&&x[3]!=null?x[3]:${o.end};c.log=[{action:'Checked In',time:i},{action:'Checked Out',time:u}];c.status='out';});return saveRunArchive();})()`);
  return L.ev(p, `(()=>{const e=runArchive.slice().sort((a,b)=>b.id-a.id)[0];return {id:e.id,job:e.jobNumber};})()`);
};
X.wide = (p) => p.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
X.both = async (p, name) => { // 390 px light and dark: no sideways scroll; screenshots
  await p.setViewportSize({ width: 390, height: 844 });
  const r = {};
  for (const cs of ['light', 'dark']) { await p.emulateMedia({ colorScheme: cs }); await p.waitForTimeout(300); r[cs] = await X.wide(p); await p.screenshot({ path: (process.env.PB_OUT || '/tmp') + '/' + name + '_' + cs + '.png' }); }
  await p.emulateMedia({ colorScheme: 'light' });
  X.ok(r.light <= 390 && r.dark <= 390, name + ': 390 px light/dark without sideways scroll (' + r.light + '/' + r.dark + ')');
};
X.lastSub = (p) => p.evaluate(() => { const s = window.__subs || []; return s.length ? s[s.length - 1] : null; });
module.exports = X;
