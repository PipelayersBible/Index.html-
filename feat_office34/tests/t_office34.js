// feat_office34 (r15.33) regression: flipped from the overnight OFFICE probes (/home/claude/night/office/p0*.js).
//  O1 the company account keeps its copies after Inspections › Back, Work without a run, and the launch race; a demoted
//     manager still forgets (control); a manager on a crew is unaffected (control)
//  O2 Company production card prints the real share ("All of what’s ordered used"), as the alerts list does
//  T3app the company account gets no New Ticket; the empty line / chip / banner say tickets are typed on the crews' phones
//  O4 Company tickets › View: "Entered by Frank Ortiz · <time>" (and the plain time when the server sends no by_name)
//  O5 a foreman's New Ticket starts on the Current job, lists the company's jobs, fills the jobsite
//  O6 Cancel Item asks its reason in a pb modal (no native dialog), needs a reason, sends it
//  O7 inspections no-signal wording; "Invited <date>"; inbox preview ellipsis; "LF per stick"
//  O8 Materials tab › Field tickets row opens Company tickets on this job
//  O9 Edit project › Project details: pre-filled form, pb_prod_job_info_set, hero and Home card follow
const O = require('./olib.js'); const { M, check } = O;
const DIR = '/home/claude/feat_office34/tests/';
const state = (p) => p.evaluate(() => { const r = (id) => { const e = document.getElementById(id); if (!e) return 'missing'; const b = e.getBoundingClientRect(); return e.hidden ? 'hidden' : b.height > 0 ? 'shown' : 'zero'; }; return { title: (document.getElementById('pjTitle') || {}).textContent, hero: r('pjCxHero'), tabs: r('pjCxTabs'), cards: document.querySelectorAll('#homeCxJobs .pbx-job').length }; });
const cards = (p) => p.evaluate(() => document.querySelectorAll('#homeCxJobs .pbx-job').length);
const cacheKeys = (p, uid) => p.evaluate((u) => { try { return Object.keys(JSON.parse(localStorage.getItem(u + ':prodCache') || '{}')); } catch (e) { return []; } }, uid);
(async () => {
  const browser = await M.chromium.launch();
  try {
    // ================= O1: the owner keeps its company copies =================
    { const { ctx, page, uid } = await O.setup(browser, { who: 'company' });
      await O.home(page);
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(3000);
      const s0 = await state(page);
      check('O1 company: job page shows hero, tabs, "Job 24-101"', s0.hero === 'shown' && s0.tabs === 'shown' && /24-101/.test(s0.title || ''), JSON.stringify(s0));
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pjDaily button')].find(x => /Open Inspections/.test(x.textContent)); b.click(); }); await page.waitForTimeout(2500);
      check('O1 company: lands on the job inspections screen', (await O.scr(page)) === 'screen-inspJob');
      const acc = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_access').length);
      check('O1 the inspections screen asked pb_prod_access (the call that used to purge)', acc >= 1, acc);
      await page.click('#ijBack'); await page.waitForTimeout(2000);
      const s1 = await state(page);
      check('O1 after Back the job page is intact: hero, tabs, "Job 24-101"', s1.hero === 'shown' && s1.tabs === 'shown' && /24-101/.test(s1.title || ''), JSON.stringify(s1));
      await page.evaluate(() => pbProdJobBack()); await page.waitForTimeout(1500);
      check('O1 Home still has its job cards', (await cards(page)) >= 2, await cards(page));
      check('O1 the phone keeps the company copies (dash, job:…)', (await cacheKeys(page, uid)).includes('dash'), JSON.stringify(await cacheKeys(page, uid)));
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
      const s2 = await state(page);
      check('O1 opening the job again paints it in full', s2.hero === 'shown' && s2.tabs === 'shown', JSON.stringify(s2));
      await page.evaluate(() => pbProdJobBack()); await page.waitForTimeout(500);
      await page.evaluate(() => pbOpenNoRun()); await page.waitForTimeout(2500); await M.dismiss(page);
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
      check('O1 after Work without a run, Home still has the jobs', (await cards(page)) >= 2, await cards(page));
      // the offline copy survives a visit to Company inspections
      await page.evaluate(() => pbOpenInspCompany()); await page.waitForTimeout(2500);
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline')); await page.reload(); await page.waitForTimeout(4000); await M.dismiss(page); await ctx.setOffline(true);
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      const offTx = (await O.screenText(page)).replace(/\s+/g, ' ');
      check('O1 reload with no signal after Company inspections: Home shows the last copy of the jobs', (await cards(page)) >= 2 && /copy from/.test(offTx), offTx.slice(0, 200));
      await O.online(ctx, page);
      check('O1 no page errors (company)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // the launch race (p09): a job tapped from the copy before the startup access answer
    { const { ctx, page } = await O.setup(browser, { who: 'company' });
      await O.home(page); await page.waitForTimeout(1500);
      await ctx.addInitScript(() => { const o = window.__rpc; window.__rpc = async (fn, args) => { if (fn === 'pb_prod_access') await new Promise(r => setTimeout(r, 2500)); return o(fn, args); }; });
      await page.reload(); await page.waitForTimeout(1500); await M.dismiss(page);
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(300);
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(600);
      await page.waitForTimeout(4000);
      const s1 = await state(page);
      check('O1 launch race: the job opened before the access answer stays a full company job page after it', s1.hero === 'shown' && /24-101/.test(s1.title || ''), JSON.stringify(s1));
      await page.evaluate(() => pbProdJobBack()); await page.waitForTimeout(1000);
      check('O1 launch race: Home keeps its cards', (await cards(page)) >= 2, await cards(page));
      check('O1 no page errors (race)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // controls: a manager on a crew is intact; a demoted manager forgets the company copies
    { const { ctx, page, uid } = await O.setup(browser, { who: 'manager' });
      await O.home(page);
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(3000);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pjDaily button')].find(x => /Open Inspections/.test(x.textContent)); b.click(); }); await page.waitForTimeout(2500);
      await page.click('#ijBack'); await page.waitForTimeout(2000);
      const s1 = await state(page);
      check('O1 control manager on a crew: job page intact after Back', s1.hero === 'shown' && s1.tabs === 'shown', JSON.stringify(s1));
      check('O1 control manager: the company copies are on the phone', (await cacheKeys(page, uid)).includes('dash'));
      // demoted: pb_prod_access answers manager:false → the company copies go
      await page.evaluate(() => localStorage.setItem('__manager', '0'));
      await page.evaluate(() => pbOpenInspCompany()); await page.waitForTimeout(2500); await M.dismiss(page); // pbDlyAccFresh → pbProdAccessRefresh
      const acc = await page.evaluate(() => window.__debugProd().acc);
      check('O1 control demoted manager: the access answer is manager:false, member:true', !!acc && acc.manager === false && acc.member === true, JSON.stringify(acc));
      check('O1 control demoted manager: the company copies are forgotten (no dash / job copies)', !(await cacheKeys(page, uid)).some(k => k === 'dash' || /^job:/.test(k)), JSON.stringify(await cacheKeys(page, uid)));
      check('O1 no page errors (manager)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // ================= O2 / O4 / T3app / O7c / O7b / O8 / O9: the office's screens =================
    { const { ctx, page } = await O.setup(browser, { who: 'company' });
      await O.home(page);
      // O2 the dashboard card
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(2500);
      const card = await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /24-101/.test(x.textContent)); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
      const pipeLine = (card.split('8" C900 PVC:')[1] || '').split('3/4"')[0];
      check('O2 Company production card: the pipe reads "All of what’s ordered used" (480 / 500 + 60 waiting)', /All of what’s ordered used/.test(pipeLine) && /480 \/ 500/.test(pipeLine) && !/80% of ordered/.test(pipeLine), pipeLine);
      await page.evaluate(() => pbCxOpenList('mat')); await page.waitForTimeout(1500);
      check('O2 the Material alerts list says the same', /All of what’s ordered used/.test(await O.screenText(page)));
      // sql/33 live: the company account's Field tickets reach the company (T3app dropped by the lead)
      await page.evaluate(() => pbOpenTickets()); await page.waitForTimeout(1500);
      check('company account: New Ticket is offered (sql/33: the owner\u2019s tickets sync)', await O.shown(page, 'tkNewBtn'));
      check('no "need a company account" wording', !/need a company account/i.test(await O.screenText(page)));
      // O4 Company tickets › View: who entered it
      await O.home(page);
      await page.evaluate(() => pbOpenTicketsDashboard()); await page.waitForTimeout(2500);
      await page.evaluate(() => pbTicketsDashView(0)); await page.waitForTimeout(600);
      const open = await O.text(page, 'tkdList');
      const entered = ((open || '').match(/Entered [^\n]*?(?= Read by AI|$)/) || [''])[0];
      check('O4 View reads "Entered by Frank Ortiz · <short time>" — no US date with seconds', /Entered by Frank Ortiz · /.test(open || '') && !/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2}/.test(open || ''), entered || (open || '').slice(0, 300));
      // the old server shape (no by_name): the plain time
      await page.evaluate(() => localStorage.setItem('__noByName', '1'));
      await page.evaluate(() => pbTicketsDashJob('')); await page.waitForTimeout(2000);
      await page.evaluate(() => pbTicketsDashView(0)); await page.waitForTimeout(600);
      const open2 = await O.text(page, 'tkdList');
      check('O4 without by_name from the server: "Entered <time>" with no "by"', /Entered (\d|[A-Z][a-z]{2} \d)/.test(open2 || '') && !/Entered by/.test(open2 || '') && !/\d{1,2}:\d{2}:\d{2}/.test(open2 || ''), ((open2 || '').match(/Entered[^\n]{0,40}/) || [''])[0]);
      await page.evaluate(() => localStorage.removeItem('__noByName'));
      // O7c inbox preview ellipsis
      await page.evaluate(() => pbOpenReportsInbox()); await page.waitForTimeout(2500);
      const prev = await O.text(page, 'inboxList');
      check('O7 inbox list: a long body is cut with an ellipsis ("…for two d…"), a short one is not', /for two d…/.test(prev || '') && /we stopped using it\./.test(prev || ''), (prev || '').slice(0, 300));
      // O7b crew members: Invited <date>
      await page.evaluate(() => pbOpenCrewMembers()); await page.waitForTimeout(2500);
      const walt = await page.evaluate(() => { const r = [...document.querySelectorAll('#crList > *')].find(x => /walt\.ruiz/.test(x.textContent)); return r ? r.innerText.replace(/\s+/g, ' ') : null; });
      const frank = await page.evaluate(() => { const r = [...document.querySelectorAll('#crList > *')].find(x => /frank\.ortiz/.test(x.textContent)); return r ? r.innerText.replace(/\s+/g, ' ') : null; });
      check('O7 an invitee reads "Invited <date>", not "Joined"', /Invited — hasn’t opened the link yet/.test(walt || '') && /Invited [A-Z][a-z]{2} \d/.test(walt || '') && !/Joined/.test(walt || ''), walt);
      check('O7 a member still reads "Joined <date>"', /Joined [A-Z][a-z]{2} \d/.test(frank || ''), frank);
      // O8 Materials tab › Field tickets row
      await O.home(page); await page.evaluate(() => window.pbCxOpenJob('24-101', 'materials')); await page.waitForTimeout(3000);
      const tk = await O.text(page, 'pjTicketsSec');
      check('O8 Field tickets block still shows the totals (Tickets 3 · Concrete 21.5 yd³ · Sub hours 0)', /Tickets 3/.test(tk || '') && /21\.5/.test(tk || '') && /Sub hours 0/.test(tk || ''), tk);
      check('O8 it is a row that says where it goes ("Company tickets on this job")', (await O.shown(page, 'pjTicketsRow')) && /Company tickets on this job/.test(tk || ''), tk);
      const rowH = await page.evaluate(() => document.getElementById('pjTicketsRow').getBoundingClientRect().height);
      check('O8 the row is a real tap target (≥ 44 px)', rowH >= 44, rowH);
      const n0 = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_ticket_company_page2').length);
      await page.click('#pjTicketsRow'); await page.waitForTimeout(2500);
      const tot = await O.text(page, 'tkdTotals'), sel = await page.evaluate(() => ({ v: document.getElementById('tkdJob').value, t: document.getElementById('tkdJob').selectedOptions[0].textContent })), list3 = await O.text(page, 'tkdList'), st3 = await O.text(page, 'tkdStatus');
      check('O8 opens Company tickets filtered on Job 24-101 (3 tickets, the select says so)', (await O.scr(page)) === 'screen-ticketsDashboard' && /Tickets 3/.test(tot || '') && sel.v === '24-101' && /24-101/.test(sel.t) && /3 tickets on Job 24-101/.test(st3 || ''), JSON.stringify([tot, sel, st3]));
      check('O8 only this job’s tickets are listed (no S-4 from 24-202)', /58012/.test(list3 || '') && !/S-4/.test(list3 || ''), (list3 || '').slice(0, 200));
      const dashCalls = await page.evaluate((n) => window.__rpcLog.filter(x => x.fn === 'pb_ticket_company_page2').slice(n).map(x => x.args.p_job_number), n0);
      check('O8 one filtered page load, no unfiltered one', dashCalls.length === 1 && dashCalls[0] === '24-101', JSON.stringify(dashCalls));
      await page.selectOption('#tkdJob', ''); await page.waitForTimeout(2000);
      check('O8 back to All jobs: the job list fills and 4 tickets show', /Tickets 4/.test((await O.text(page, 'tkdTotals')) || '') && (await page.evaluate(() => document.getElementById('tkdJob').options.length)) >= 3);
      await page.click('#tkdBack'); await page.waitForTimeout(1500);
      check('O8 Back from Company tickets lands on the job page, intact', (await O.scr(page)) === 'screen-prodJob' && (await state(page)).hero === 'shown');
      // O9 Project details
      await page.evaluate(() => pbCxTab('overview')); await page.waitForTimeout(400);
      await page.evaluate(() => pbCxMenu()); await page.waitForTimeout(500);
      const menu = await O.text(page, 'pjCxMenu');
      check('O9 Edit project offers a fifth row "Project details — Name, address and start date"', /Project details/.test(menu || '') && /Name, address and start date/.test(menu || '') && (await page.evaluate(() => document.querySelectorAll('#pjCxMenu .pbx-menu-btn').length)) === 5, menu);
      await page.click('#pjCxEdit_info'); await page.waitForTimeout(600);
      const m1 = await O.modal(page);
      check('O9 the form opens in a modal titled "Project details · Job 24-101" with name / address / start date', !!m1 && /Project details · Job 24-101/.test(m1.title) && !!(await page.$('#cxiName')) && !!(await page.$('#cxiAddr')) && !!(await page.$('#cxiStart')), JSON.stringify(m1));
      const pre = await page.evaluate(() => ({ n: cxiName.value, a: cxiAddr.value, s: cxiStart.value }));
      check('O9 pre-filled from the job (no name yet on the seed: empty fields)', pre.n === '' && pre.a === '' && pre.s === '', JSON.stringify(pre));
      await page.fill('#cxiName', 'Elm St water main — Phase 2'); await page.fill('#cxiAddr', '400 Elm St, Springfield, IL'); await page.fill('#cxiStart', '2026-09-01');
      // no signal first
      await O.offline(ctx, page);
      await O.click(page, '^Save$'); await page.waitForTimeout(1000);
      const m2 = await O.modal(page);
      check('O9 Save with no signal: the form comes back with "No signal. Nothing was saved; what you typed is still here." and the typing', !!m2 && /No signal\. Nothing was saved; what you typed is still here\./.test(m2.msg) && (await page.evaluate(() => cxiName.value)) === 'Elm St water main — Phase 2' && (await page.evaluate(() => cxiStart.value)) === '2026-09-01', JSON.stringify(m2));
      check('O9 nothing was sent with no signal', (await O.rpcs(page, 'pb_prod_job_info_set')).length === 0);
      await O.online(ctx, page);
      await O.click(page, '^Save$'); await page.waitForTimeout(3000);
      const sent = (await O.rpcs(page, 'pb_prod_job_info_set')).pop();
      check('O9 one pb_prod_job_info_set with the job, name, address, date and p_expect_uid', !!sent && sent.args.p_job_number === '24-101' && sent.args.p_project_name === 'Elm St water main — Phase 2' && sent.args.p_address === '400 Elm St, Springfield, IL' && sent.args.p_start_date === '2026-09-01' && sent.args.p_expect_uid === 'acctA', JSON.stringify(sent && sent.args));
      const hero = await O.text(page, 'pjCxHero');
      check('O9 the hero shows the new name and address', /Elm St water main — Phase 2/.test(hero || '') && /400 Elm St/.test(hero || ''), (hero || '').slice(0, 200));
      check('O9 the modal is closed, no error', !(await O.modal(page)));
      // the server's copy came back through pbCxRefresh(true): the dashboard answer carries it
      const refreshed = await page.evaluate(() => window.__rpcLog.filter(x => x.fn === 'pb_prod_company_dashboard').length);
      check('O9 pbCxRefresh(true) reloaded the dashboard', refreshed >= 2, refreshed);
      await page.evaluate(() => pbProdJobBack()); await page.waitForTimeout(1500);
      const cardTx = await page.evaluate(() => { const c = document.querySelector('#homeCxJobs .pbx-job[data-job="24-101"]'); return c ? c.innerText.replace(/\s+/g, ' ') : ''; });
      check('O9 the Home card shows the new project name', /Elm St water main — Phase 2/.test(cardTx), cardTx.slice(0, 160));
      // reopen: pre-filled with the saved values
      await page.evaluate(() => window.pbCxOpenJob('24-101', 'overview')); await page.waitForTimeout(2500);
      await page.evaluate(() => pbCxEdit('info')); await page.waitForTimeout(600);
      const pre2 = await page.evaluate(() => ({ n: cxiName.value, a: cxiAddr.value, s: cxiStart.value }));
      check('O9 reopened: the form is pre-filled with the saved details', pre2.n === 'Elm St water main — Phase 2' && pre2.a === '400 Elm St, Springfield, IL' && pre2.s === '2026-09-01', JSON.stringify(pre2));
      await O.click(page, '^Cancel$'); await page.waitForTimeout(300);
      // a bad date is refused in words
      await page.evaluate(() => pbCxEdit('info')); await page.waitForTimeout(400);
      await page.evaluate(() => { const el = document.getElementById('cxiStart'); el.type = 'text'; el.value = '09/01/2026'; el.dispatchEvent(new Event('input')); });
      await O.click(page, '^Save$'); await page.waitForTimeout(800);
      const m3 = await O.modal(page);
      check('O9 a start date that isn’t a date is refused in words, the form stays', !!m3 && /isn’t a date/.test(m3.msg), JSON.stringify(m3));
      await O.click(page, '^Cancel$'); await page.waitForTimeout(300);
      console.log('unmocked:', JSON.stringify(await O.unmocked(page)));
      check('O2/O4/T3app/O7/O8/O9 no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // ================= O6 / O7a / O7d: inspections and materials (company account) =================
    { const { ctx, page } = await O.setup(browser, { who: 'company' });
      page._dialogs = []; page.on('dialog', async d => { page._dialogs.push(d.type() + ': ' + d.message()); await d.dismiss(); });
      await O.home(page);
      await page.evaluate(() => pbOpenInspJob('24-101', 'Elm St water main')); await page.waitForTimeout(2500);
      check('O6 the inspections screen lists Open (3)', /Open \(3\)/.test(await O.screenText(page)));
      await page.evaluate(() => window.pbInsCancel('it-4')); await page.waitForTimeout(600);
      const m1 = await O.modal(page);
      check('O6 Cancel Item asks in the app’s modal ("Cancel Compaction test") with a textarea, no native prompt', !!m1 && /Cancel Compaction test/.test(m1.title) && !!(await page.$('#ijCancelReason')) && !page._dialogs.length, JSON.stringify(m1) + ' dialogs=' + JSON.stringify(page._dialogs));
      await O.click(page, '^Cancel Item$'); await page.waitForTimeout(600);
      const m2 = await O.modal(page);
      check('O6 without a reason it asks again: "Canceling an item needs a reason."', !!m2 && /Canceling an item needs a reason\./.test(m2.msg) && !!(await page.$('#ijCancelReason')), JSON.stringify(m2));
      check('O6 nothing was sent without a reason', (await O.rpcs(page, 'pb_insp_edit')).length === 0);
      await page.fill('#ijCancelReason', 'Retest scheduled under a new item');
      await O.click(page, '^Cancel Item$'); await page.waitForTimeout(1800);
      const ed = (await O.rpcs(page, 'pb_insp_edit')).pop();
      check('O6 pb_insp_edit sent with p_status canceled and the reason', !!ed && ed.args.p_status === 'canceled' && ed.args.p_reason === 'Retest scheduled under a new item' && ed.args.p_item_id === 'it-4', JSON.stringify(ed && ed.args));
      const body3 = await O.screenText(page);
      check('O6 canceled: Open (3) → Open (2), the compaction item under Canceled (1)', /Open \(2\)/.test(body3) && /Canceled \(1\)/.test(body3), body3.replace(/\s+/g, ' ').slice(0, 300));
      check('O6 Keep It leaves the item alone', await (async () => { await page.evaluate(() => window.pbInsCancel('it-1')); await page.waitForTimeout(400); await O.click(page, '^Keep It$'); await page.waitForTimeout(400); return (await O.rpcs(page, 'pb_insp_edit')).length === 1 && !(await O.modal(page)); })());
      // O7a: no signal, nothing loaded on the job's inspections screen
      await O.home(page);
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline')); await page.reload(); await page.waitForTimeout(4000); await M.dismiss(page); await ctx.setOffline(true);
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(1500);
      await page.evaluate(() => pbOpenInspJob('24-101', 'Elm St water main')); await page.waitForTimeout(2000);
      const ij = (await O.screenText(page)).replace(/\s+/g, ' ');
      check('O7 no signal: "No signal. The latest loads with signal." — not "Sign in with signal"', /No signal\. The latest loads with signal\./.test(ij) && !/Sign in with signal/.test(ij), ij.slice(0, 300));
      check('O7 no signal: one "Loads with signal." line, no "Open (0) None open." / "Done (0) None done yet."', /Loads with signal\./.test(ij) && !/Open \(0\)/.test(ij) && !/None open/.test(ij) && !/None done yet/.test(ij), ij.slice(0, 300));
      await page.evaluate(() => pbOpenInspCompany()); await page.waitForTimeout(1500);
      const ic = (await O.screenText(page)).replace(/\s+/g, ' ');
      check('O7 Company inspections with no signal says "No signal. The latest loads with signal."', /No signal\. The latest loads with signal\./.test(ic), ic.slice(0, 200));
      await O.online(ctx, page);
      // O7d: "LF per stick" on the Count It form
      await O.home(page); await page.evaluate(() => window.pbCxOpenJob('24-101', 'materials')); await page.waitForTimeout(3000);
      const linkBtn = await page.evaluate(() => { const b = [...document.querySelectorAll('#pjMatSec button')].find(x => /^Assign/.test(x.textContent.trim()) && /row-0/.test(x.getAttribute('onclick') || '')); if (b) { b.click(); return b.textContent.trim(); } return null; });
      await page.waitForTimeout(500);
      if (linkBtn) {
        await page.selectOption('#pmf_material', 'mp1'); await page.waitForTimeout(400);
        const lab = await page.evaluate(() => { const f = document.getElementById('pmf_factor'); return f ? f.parentNode.textContent.replace(/\s+/g, ' ') : null; });
        check('O7 the factor field reads "LF per stick" (singular) and "how many LF one stick is"', /LF per stick(?!s)/.test(lab || '') && !/per sticks/.test(lab || '') && /one stick is/.test(lab || ''), lab);
      } else check('O7 Count It button found on the Materials tab', false, await page.evaluate(() => document.getElementById('pjMatSec').innerText.slice(0, 300)));
      check('O6/O7 no page errors', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
    // ================= O5: a foreman's New Ticket =================
    { const { ctx, page } = await O.setup(browser, { who: 'foreman' });
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(2500);
      await page.click('#homeCurrentJob'); await page.waitForTimeout(1500);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pbModalOverlay button')].find(x => /24-202/.test(x.textContent)); if (b) b.click(); }); await page.waitForTimeout(800);
      check('O5 Current job set to 24-202', /24-202/.test((await O.text(page, 'homeCurrentJob')) || ''));
      await page.evaluate(() => pbOpenTickets()); await page.waitForTimeout(1000);
      check('O5 a foreman still has New Ticket', await O.shown(page, 'tkNewBtn'));
      await page.click('#tkNewBtn'); await page.waitForTimeout(800);
      const tkJob = await page.inputValue('#tkJobNumber'), tkSite = await page.inputValue('#tkJobsite');
      const opts = await page.evaluate(() => [...document.querySelectorAll('#tkJobList option')].map(o => o.value + (o.label ? ' — ' + o.label : '')));
      check('O5 New Ticket starts on the Current job: 24-202 — Oak Ave sewer', tkJob === '24-202' && tkSite === 'Oak Ave sewer', JSON.stringify([tkJob, tkSite]));
      check('O5 the job list offers the company’s jobs (24-101 Elm St water main, 24-202 Oak Ave sewer)', opts.some(o => /^24-101 — Elm St water main/.test(o)) && opts.some(o => /^24-202 — Oak Ave sewer/.test(o)), JSON.stringify(opts));
      await page.fill('#tkJobsite', ''); await page.fill('#tkJobNumber', '24-101'); await page.evaluate(() => pbTicketJobInput(true)); await page.waitForTimeout(500);
      check('O5 typing 24-101 fills the jobsite from the company’s list', (await page.inputValue('#tkJobsite')) === 'Elm St water main', await page.inputValue('#tkJobsite'));
      await page.evaluate(() => pbTicketFormBack()); await page.waitForTimeout(300);
      // no Current job: the form starts empty as before
      await page.evaluate(() => pbGotoTab('home')); await page.waitForTimeout(500);
      await page.evaluate(() => window.pbCurJobOpen()); await page.waitForTimeout(800); await page.click('#cjClear'); await page.waitForTimeout(600);
      check('O5 Current job cleared', !(await O.modal(page)) && !/24-202/.test((await O.text(page, 'homeCurrentJob')) || ''), await O.text(page, 'homeCurrentJob'));
      await page.evaluate(() => pbOpenTickets()); await page.waitForTimeout(800); await page.evaluate(() => pbNewTicket()); await page.waitForTimeout(600);
      check('O5 with no Current job the form starts empty', (await page.inputValue('#tkJobNumber')) === '', await page.inputValue('#tkJobNumber'));
      check('O5 no page errors (foreman)', !page._errors.length, page._errors.join(' | '));
      await ctx.close(); }
  } catch (e) { check('script ran', false, e && e.stack); }
  await browser.close();
})();
