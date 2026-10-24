// Batch 27 CONSOLE copy: homeCoProd -> homeCxJobs / homeCxDash (the Company Home redesign).
// Batch 20 HOME (lead check, Oct 19): the real owner account's shape on live (checked with a rolled-back query as that
// user): NO public.subscriptions row, NO company_members row; pb_report_access / pb_prod_access answer
// member false, manager true, managed_company_id set; that company's status is 'active'.
// The app's plan check (pbRefreshSubscriptionCache) then gives it the contractor plan as "Company account"
// (pb_report_access.managed_company_id -> companies.status 'active'), so it gets the Company Home.
const L = require('/home/claude/batch20/HOME/tests/pd_lib.js'); const { M, check } = L;
const errs = [];
(async () => {
  const browser = await M.chromium.launch();
  const { ctx, page } = await L.setup(browser, { tier: 'none', extra: { __ownerCo: '1' } }); // the phone starts with no plan kept
  try {
    const on = await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 15000);
    const sub = await page.evaluate(() => JSON.parse(localStorage.getItem('acctA:cachedSubscription') || 'null'));
    check('owner, no subscriptions row, active company: the plan check gives contractor / active as "Company account" (' + JSON.stringify(sub) + ')', !!sub && sub.tier === 'contractor' && sub.status === 'active' && sub.companyRole === 'Company account' && sub.companyId === 'co-dig');
    check('owner: the Company Home shows, with Company production', on && await page.evaluate(() => !!document.getElementById('homeCxJobs') && !!document.getElementById('homeCxDash') && window.pbIsCompanyHome() === true));
    // next start with no signal: the kept answers still give the Company Home
    await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
    await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none'); await M.dismiss(page);
    check('owner, next start with no signal: still the Company Home', await L.waitFor(page, () => document.getElementById('screen-home').classList.contains('pb-coh-on'), 10000));
    errs.push(...page._errors);
  } finally { await ctx.close(); }
  check('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'), !errs.length);
  console.log('JS errors: ' + (errs.length ? errs.join(' | ') : 'none'));
  await browser.close();
})();
