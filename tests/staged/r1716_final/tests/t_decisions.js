// r1716_final: Tommy's Nov 22 decisions in the built app. PASS/FAIL per item; exit 1 on any FAIL.
//   56 company price paragraphs hidden from foremen / pipelayers (Settings > What each plan includes)
//   21 "Crew hours by day" (the office spreadsheet; behaviour checked by the updated r1706 t_o3_34_36_office.js)
//   11 join links 72 hours (the app's words; the expired-link sheet is checked by t_fw_trial_72h.js)
//   12 one official contact email admin@pipelayersbible.com
//   22 Washington: no "Every 2 weeks" toolbox-talk schedule; an existing one shows a note and switches on the next change
//   + the H2S words in the shared emergency text, and the long-title rule of the new look (2 lines at one size)
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_decisions.js   (build_hooks served with sw.js, data/, pbx/)
const R = '/home/claude/index.html-/tests/rig/';
const boot = require(R + 'boot'), co = require(R + 'co'), coFm = require(R + 'co_fm');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:10951/cur.html';
const UID = '00000000-0000-4000-8000-000000000001';
let fails = 0; const ok = (c, m, got) => { console.log((c ? 'PASS ' : 'FAIL ') + m + (c || got === undefined ? '' : '  [got: ' + String(got).slice(0, 300) + ']')); if (!c) fails++; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const member = (role) => `;window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'${role}',companies:{name:'Test Co',status:'active'}}});`;
const plan = (o) => `;window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_my_plan:()=>(${JSON.stringify(Object.assign({ ok: true, plan: 'paid' }, o))})});`;

async function planText(init) {
  const { b, p } = await boot(URL0, { init });
  await p.evaluate(() => { try { pbGoto('settings'); } catch (e) {} }); await sleep(1500);
  const r = await p.evaluate(() => {
    const d = document.getElementById('settingsPlanMore'); if (!d) return null;
    d.open = true; return null;
  }); await sleep(400);
  const out = await p.evaluate(() => {
    const h = document.getElementById('settingsPlanHelp'); const vis = (el) => !!el && el.offsetParent !== null;
    return { text: h ? h.innerText : '', settings: (document.getElementById('screen-settings') || {}).innerText || '', crewOnly: vis(document.querySelector('[data-pb-crew-only]')) };
  });
  out.errs = p.errs.slice(); await b.close(); return out;
}

(async () => {
  // ---- 56: who sees the company price ----
  const cases = [
    ['foreman', co + member('foreman'), true],
    ['pipelayer', co + member('pipelayer'), true],
    ['PM / superintendent', co + member('pm'), false],
    ['company account (pb_my_plan is_owner)', co + member('foreman') + plan({ is_owner: true }), false],
    ['no company (own plan)', co, false],
  ];
  for (const [nm, init, crew] of cases) {
    const o = await planText(init);
    const t = o.text;
    if (crew) {
      ok(!/\$99|\$12 a month for each|12 months for the price|Plan reading|\$1 a sheet|company account: 5 a day|60 a month for each person/i.test(t) && o.crewOnly && /Company plan: your company pays for it\./.test(t),
        '56 ' + nm + ': no company price, yearly deal, plan-reading price or company AI allowance; one line "Company plan: your company pays for it."', t);
      ok(/Individual plan: \$15 a month/.test(t) && /A person on a company plan: 25 a day/.test(t) && /An individual plan: 15 a day, 50 a month/.test(t), '56 ' + nm + ': the individual price and the per-person limits still show', t);
      ok(!/\$99/.test(o.settings), '56 ' + nm + ': no $99 anywhere on Settings', (o.settings.match(/.{60}\$99.{40}/) || [''])[0]);
    } else {
      ok(/Company plan: \$99 a month/.test(t) && /\$12 a month for each extra person/.test(t) && /12 months for the price of 10/.test(t) && /Plan reading/.test(t) && /The company account: 5 a day\./.test(t) && /60 a month for each person/.test(t) && !o.crewOnly,
        '56 ' + nm + ': sees every company price paragraph as before', t);
    }
    ok(!o.errs.length, '56 ' + nm + ': no page errors', o.errs.join(' | '));
  }

  // ---- source-level checks on the served build ----
  const { b, p } = await boot(URL0, { init: co });
  const html = await p.evaluate(async () => (await fetch(location.href, { cache: 'no-store' })).text());
  // 21
  ok(/Crew hours by day/.test(html) && /Crew Hours by Day/.test(html) && /crew-hours-by-day-/.test(html) && !/[Ff]or [Pp]ayroll/.test(html) && /pb_prod_export_hours/.test(html),
    '21 "Crew hours by day" (button, titles, file name); no "for payroll" name left; server function name kept');
  ok(/before you run payroll/.test(html), '21 the "check them against your time records before you run payroll" warning stays');
  // 11
  ok(/PB_OB_LINK_HOURS\s*=\s*72\b/.test(html) && /Links last "\s*\+\s*PB_OB_LINK_HOURS\s*\+\s*" hours/.test(html) && /works once, for '?"?\s*\+\s*PB_OB_LINK_HOURS/i.test(html), '11 join-link hours constant is 72 and the messages use it');
  ok(!/(works once, for|Links last) 24 hours/.test(html), '11 no "24 hours" join-link wording left');
  // 12
  const mails = [...new Set((html.match(/[A-Za-z0-9._%+-]+@pipelayersbible\.com/g) || []))];
  ok(mails.length === 1 && mails[0] === 'admin@pipelayersbible.com', '12 the only @pipelayersbible.com address in the app is admin@pipelayersbible.com', mails.join(','));
  // H2S line (decision with emergency_nov22 #1): the same words as the server's emergency.ts
  ok(/rotten-egg or sewer smell \(often hydrogen sulfide, H2S\): everyone out now\./.test(html) && /olor a huevo podrido o a drenaje \(casi siempre ácido sulfhídrico, H2S\): todos afuera ya\./.test(html), 'H2S: the sewer-smell line names hydrogen sulfide in English and Spanish');
  // Settings Email Support row and the billing contact
  await p.evaluate(() => { try { pbGoto('settings'); } catch (e) {} }); await sleep(1200);
  const sup = await p.evaluate(() => { const a = document.getElementById('settingsSupportEmail'); return a ? a.getAttribute('href') + ' | ' + a.innerText : ''; });
  ok(/^mailto:admin@pipelayersbible\.com\?/.test(sup) && /admin@pipelayersbible\.com/.test(sup), '12 Settings > Email Support is admin@pipelayersbible.com', sup);
  // long titles (new look, Tommy: yes): at most 2 lines, same size as a short title
  const tt = await p.evaluate(async () => {
    const out = {};
    for (const s of ['trenchCalc', 'formulasHub']) { try { pbGoto(s); } catch (e) {} await new Promise(r => setTimeout(r, 700)); }
    const t = document.querySelector('.pb-screen.active > .pb-header > .pb-title'); if (!t) return null;
    const short = getComputedStyle(t).fontSize; const old = t.textContent;
    t.textContent = 'Rod Reading to Elevation and Education and Reference and More Words Here To Wrap';
    const cs = getComputedStyle(t), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    out.size = cs.fontSize; out.short = short; out.lines = Math.round(t.getBoundingClientRect().height / lh); out.clamp = cs.webkitLineClamp || cs.getPropertyValue('-webkit-line-clamp'); out.hy = cs.hyphens;
    t.textContent = old; return out;
  });
  ok(tt && tt.size === tt.short && tt.lines <= 2 && String(tt.clamp) === '2' && tt.hy === 'none', 'look: a long title wraps to at most 2 lines at the same size as a short one, never hyphenated', JSON.stringify(tt));
  ok(!p.errs.length, 'no page errors (source checks)', p.errs.join(' | '));
  await b.close();

  // ---- 22: Washington toolbox talks ----
  const talks = (every, st) => `;try{localStorage.setItem('pbSr:${UID}',JSON.stringify({co_local:'${st}',jobs:{},jobs_local:{}}));localStorage.setItem('${UID}:pbTalks',JSON.stringify({plan:{days:[1,3],every:${every},anchor:'2026-11-16',queue:[],rnd:false,months:12,rndNext:null,rndAt:null,at:Date.now(),sent:true,err:null},recs:{}}));}catch(e){}`;
  const openPlan = async (init) => {
    const x = await boot(URL0, { init }); const pp = x.p;
    await pp.evaluate(() => { try { pbGoto('talks'); } catch (e) {} }); await sleep(1200);
    await pp.evaluate(() => { try { window.pbTtTab('plan'); } catch (e) {} }); await sleep(800);
    return x;
  };
  const sel = (pp) => pp.evaluate(() => { const s = document.getElementById('ttEvery'); return s ? { opts: [...s.options].map(o => o.textContent + (o.disabled ? '(disabled)' : '') + (o.selected ? '*' : '')), wa: (document.getElementById('ttEveryWa') || {}).innerText || '', wafn: typeof window.pbTtWa === 'function' ? window.pbTtWa() : null } : null; });
  const stored = (pp) => pp.evaluate((u) => { try { return JSON.parse(localStorage.getItem(u + ':pbTalks')).plan.every; } catch (e) { return null; } }, UID);
  {
    const { b, p } = await openPlan(coFm + talks(1, 'WA'));
    const s = await sel(p);
    ok(s && s.wafn === true && s.opts.length === 1 && s.opts[0] === 'Every week*' && !s.wa, '22 WA job, weekly schedule: only "Every week" is offered, no note', JSON.stringify(s));
    await p.evaluate(() => window.pbTtEvery('2')); await sleep(600);
    ok((await stored(p)) === 1, '22 WA: asking for every 2 weeks anyway (old screen) stays weekly', await stored(p));
    ok(!p.errs.length, '22 WA weekly: no page errors', p.errs.join(' | ')); await b.close();
  }
  {
    const { b, p } = await openPlan(coFm + talks(2, 'WA'));
    let s = await sel(p);
    ok(s && s.opts.join('|') === 'Every week|Every 2 weeks(disabled)*' && /Washington job: talks are weekly there\. This changes to every week the next time you change the schedule\./.test(s.wa),
      '22 WA job, existing every-2-weeks schedule: shown greyed out with the one-line note', JSON.stringify(s));
    ok((await stored(p)) === 2, '22 WA: opening the schedule changes nothing by itself', await stored(p));
    await p.evaluate(() => window.pbTtDay(5)); await sleep(800);  // any change = the next save
    s = await sel(p);
    ok((await stored(p)) === 1 && s && s.opts.join('|') === 'Every week*' && !s.wa, '22 WA: the next change saves it as every week; the note goes', JSON.stringify(s) + ' stored=' + (await stored(p)));
    ok(!p.errs.length, '22 WA 2-week: no page errors', p.errs.join(' | ')); await b.close();
  }
  {
    const { b, p } = await openPlan(coFm + talks(2, 'OR'));
    const s = await sel(p);
    ok(s && s.wafn === false && s.opts.join('|') === 'Every week|Every 2 weeks*' && !s.wa, '22 Oregon job: both choices as before, no note', JSON.stringify(s));
    await p.evaluate(() => window.pbTtDay(5)); await sleep(800);
    ok((await stored(p)) === 2, '22 Oregon: a change keeps every 2 weeks', await stored(p));
    ok(!p.errs.length, '22 Oregon: no page errors', p.errs.join(' | ')); await b.close();
  }
  console.log(fails ? fails + ' FAIL' : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL crashed: ' + (e && e.stack || e)); process.exit(1); });
