// Batch 27 CONSOLE updated copy of /home/claude/batch18/M/tests/t_mat.js (cx_shim: the company job page shows all its sections, as before the tabs).
// Batch 18 M2: the job's material list (company account / listed managers). On the base build every material check
// fails (no Materials anywhere); on the patched build they pass.
// Covers: dashboard lines "Name: used / ordered / expected unit" with waiting, chips in words, bedding labelled an
// estimate everywhere with its note; job page section (pipe / bedding / entered notes, Details with orders, the calc,
// history); add from a bedding preset (densities 1.35 / 1.40 / 1.35 / 1.20, "verify with your supplier", 15%
// allowance); needs width (no guess); order (validation, offline keeps the typing, retry with the SAME client id);
// void needs a reason; Record Use only on entered; duplicate name message; unsaved-form guard; server not ready;
// the notification link; crew can't see any of it.
const T = require('/home/claude/batch18/M/tests/mat_lib.js'); const { M, check } = T;
require('/home/claude/batch27/CONSOLE/tests/cx_shim.js')(M); // batch 27 CONSOLE: the job page's sections all shown, as this test expects
(async () => {
  const browser = await M.chromium.launch();
  // ---------- crew: nothing asked ----------
  { const { ctx, page } = await T.setup(browser, { extra: { __psrv: T.seedServer(), __msrv: T.seedMats() } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(500); await M.dismiss(page);
      check('crew: no pb_mat function is ever asked', await page.evaluate(() => !(window.__matLog || []).length && !window.__rpcLog.some(x => /^pb_mat_/.test(x.fn))));
      check('crew: the notification link does not open company production', await page.evaluate(async () => { window.pbPushOpen('#/prod/materials'); await new Promise(r => setTimeout(r, 400)); return document.querySelector('.pb-screen.active').id !== 'screen-prodDashboard'; }));
      await M.dismiss(page);
      check('no JS errors (crew)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // ---------- company account ----------
  const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: T.seedMats(), __matWait: { '24-101': 40 } } });
  try {
    await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1200);
    const card = await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-101/.test(x.textContent)); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
    check('dashboard card: a Materials block headed "Used / Ordered / Expected"', /Materials Used \/ Ordered \/ Expected/.test(card), card.slice(0, 300));
    check('dashboard: "8in PVC SDR 35: 360 / 400 / 1,000 LF +40 waiting" with the 80% chip in words', /8in PVC SDR 35: 360 \/ 400 \/ 1,000 LF \+40 waiting 80% of ordered/.test(card));
    check('dashboard: bedding marked (est.) with ≈, and its key line', /Fine sand \(mason sand\) \(est\.\): ≈ 23 \/ — \/ 10 yd³/.test(card) && /est\. = estimate from footage × trench width × bedding thickness/.test(card) && /Over expected/.test(card));
    check('dashboard: no trench width = no number, "Needs trench width"', /3\/4" crushed rock \(est\.\): — \/ — \/ — ton Needs trench width/.test(card));
    check('dashboard: entered material "Tees: 3 / — / 12 EA"', /Tees: 3 \/ — \/ 12 EA/.test(card));
    check('dashboard: unassigned delivery tickets counted on the card', /3 delivery ticket lines not assigned to a material/.test(card));
    check('dashboard: a ticket link whose ticket changed or moved is flagged on the card (review S2)', /1 ticket link needs a look \(the ticket changed or moved; not counting\)/.test(card));
    check('dashboard: a job with no materials gets no block', await page.evaluate(() => { const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-202/.test(x.textContent)); return !!b && !b.querySelector('.pbm-dash'); }));
    check('dashboard lead mentions materials and estimates', await page.evaluate(() => /used \/ ordered \/ expected; bedding amounts are estimates/.test(document.querySelector('#screen-prodDashboard .pbp-lead').textContent)));
    // job page
    await T.openJob(page, '24-101');
    let t = await T.matText(page);
    check('job page: Materials section with the Used / Ordered / Expected key', /^Materials Used \/ Ordered \/ Expected/.test(t), t.slice(0, 200));
    check('job page: pipe row says it is from reported footage (not an estimate)', /8in PVC SDR 35 All of what’s ordered used 360 \/ 400 \/ 1,000 LF \+40 waiting Counts Pipe Installed footage/.test(t));
    const sandRow = await page.evaluate(() => document.getElementById('pjMat_ms1').innerText.replace(/\s+/g, ' '));
    check('job page: bedding row has the Estimate chip and the plain-words note', /Fine sand \(mason sand\) Over expected Estimate ≈ 23 \/ — \/ 10 yd³ (\+[\d.]+ waiting )?Bedding estimate from Pipe Installed footage\./.test(sandRow) /* r15.5.1: short row text (owner) */, sandRow);
    check('job page: a bedding (sand) + a shading (rock) pair is normal: no split warning (review S7)', !/Split unknown/.test(t) && !/Each one counts the whole job/.test(t));
    check('job page: entered row: "Amounts you record by hand" and a Record Use button (only there)', /Tees 3 \/ — \/ 12 EA Recorded by hand\. Details Add Order Record Use Add to Expected Edit/.test(t) /* r15.3.4: Add to Expected */ && (t.match(/Record Use/g) || []).length === 1);
    check('job page: the "How materials are counted" help explains the estimate, waiting, the alert and quiet hours', await page.evaluate(() => { const h = document.getElementById('pjMatHelp').textContent; return /estimate/.test(h) && /nothing taken off/.test(h) && /Shading/.test(h) && /15%/.test(h) && /\+ waiting/.test(h) && /80%/.test(h) && /8:55 PM to 6:00 AM/.test(h); }));
    // details: calc, orders, history
    await page.evaluate(() => document.querySelector('#pjMat_ms1 .pbm-head').click()); await page.waitForTimeout(200);
    t = await page.evaluate(() => document.getElementById('pjMatD_ms1').innerText.replace(/\s+/g, ' '));
    check('details: the calculation in numbers (3 × 0.5 ÷ 27, +15%, footage counted)', /3 ft wide × 0.5 ft thick ÷ 27 = 0\.0556 yd³ in place, \+ 15% compaction allowance\. Footage counted: 360 LF \(\+40 LF waiting\)/.test(t), t);
    await page.evaluate(() => document.querySelector('#pjMat_mp1 .pbm-head').click()); await page.waitForTimeout(200);
    await page.evaluate(() => [...document.querySelectorAll('#pjMatD_mp1 button')].find(b => b.textContent === 'Show History').click()); await page.waitForTimeout(500);
    t = await page.evaluate(() => document.getElementById('pjMatD_mp1').innerText.replace(/\s+/g, ' '));
    check('details: orders listed, history shows server time, phone time, who, and alerts with who they went to', /400 LF · ordered .* · PO 7/.test(t) && /Added · .*\(server time\) · owner-a.test/.test(t) && /Phone time/.test(t) && /Alert at 80% .* Sent · to owner-a.test/.test(t), t.slice(0, 400));
    // add from a preset
    await page.click('#pjMatAdd'); await page.waitForTimeout(200);
    const types = await page.evaluate(() => [...document.querySelectorAll('#pmf_category option')].map(o => o.textContent));
    check('r15.16: no Presets row; Type: Pipe, Bedding / Shading, Road base, Asphalt, Concrete, Fittings, Structures, Other', !(await page.$('.pbm-presets')) && types.join('|') === 'Pipe|Bedding / Shading|Road base|Asphalt|Concrete|Fittings|Structures|Other', types);
    await page.selectOption('#pmf_category', 'bedding'); await page.waitForTimeout(150);
    const presets = await page.evaluate(() => [...document.querySelectorAll('#pmf_bedkind option')].map(o => o.textContent));
    check('r15.16: Bedding / Shading > Which kind: the four presets, then Other rock / sand / Other', JSON.stringify(presets) === JSON.stringify(['3/4" crushed rock', 'Pea gravel (1/4" rock)', 'Coarse sand (concrete sand)', 'Fine sand (mason sand)', 'Other rock', 'Other sand', 'Other']), presets);
        await page.evaluate(() => ((re) => { const c = document.getElementById('pmf_category'); if (c.value !== 'bedding') { c.value = 'bedding'; c.dispatchEvent(new Event('change')); } const s = document.getElementById('pmf_bedkind'); const o = [...s.options].find(x => re.test(x.textContent)); s.value = o.value; s.dispatchEvent(new Event('change')); })(/Pea gravel/)); await page.waitForTimeout(150);
    let f = await page.evaluate(() => ({ name: pmf_name.value, cat: pmf_category.value === 'bedding' ? ({ 'p:rock34': 'bedding_rock', 'p:pea': 'bedding_rock', 'p:csand': 'bedding_sand', 'p:fsand': 'bedding_sand' }[pmf_bedkind.value] || pmf_bedkind.value.replace('c:', '')) : pmf_category.value, extra: pmf_extra_pct.value, dens: pmf_density_tpy.value, dl: pmf_density_tpy.parentNode.textContent, basis: document.querySelector('input[name="pmfBasis"]:checked').value, est: (document.getElementById('pmfEst') || {}).textContent || '' }));
    check('preset pea gravel: name, Bedding: rock, allowance 15, yd³ by default with the density 1.4 kept (optional, for tickets in tons), the estimate note shown', f.name === 'Pea gravel (1/4" rock)' && f.cat === 'bedding_rock' && f.extra === '15' && f.basis === 'volume' && f.dens === '1.4' && /optional/.test(f.dl) && /tickets in tons/.test(f.dl) && /^Estimate from footage × trench width × bedding thickness/.test(f.est), f);
    await page.check('input[name="pmfBasis"][value="weight"]'); await page.waitForTimeout(150);
    f = await page.evaluate(() => ({ dens: pmf_density_tpy.value, help: pmf_density_tpy.parentNode.textContent }));
    check('tons: density 1.4 filled from the preset, "Verify with your supplier" and all four preset values', f.dens === '1.4' && /Verify with your supplier/.test(f.help) && /1\.35.*1\.40.*1\.49.*1\.43/.test(f.help) /* r15.3.2: owner raised both sands Oct 21 */, f);
    await page.fill('#pmf_name', '  '); await page.click('#pmfSave'); await page.waitForTimeout(200);
    check('no name: "Name the material." and nothing sent', /Name the material/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_save')).length === 0);
    await page.fill('#pmf_name', 'Pea gravel (1/4" rock)'); await page.fill('#pmf_trench_width_ft', '2.5'); await page.fill('#pmf_bed_thick_ft', 'x'); await page.click('#pmfSave'); await page.waitForTimeout(200);
    check('not a number: says which field, nothing sent', /Bedding thickness: enter a number/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_save')).length === 0);
    await page.fill('#pmf_bed_thick_ft', '0.5'); await page.fill('#pmf_alert_pct', '75'); await page.click('#pmfSave'); await page.waitForTimeout(400);
    { const sh = await page.evaluate(() => [...document.querySelectorAll('#pbModalButtons button')].some(b => b.offsetParent && b.textContent === 'Share It')); // r15.4.3: a 2nd bedding on the same footage asks first
      check('a 2nd bedding on the same footage asks first (Share It / Pick Its Own Item)', sh);
      await page.evaluate(() => { const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => x.textContent === 'Share It'); if (b) b.click(); }); await page.waitForTimeout(900); }
    let sv = (await T.matLog(page, 'pb_mat_save')).pop();
    check('saved: job number, category, calculated, tons, density 1.4, allowance 15, alert 75, width / thickness, expect version 0', sv && sv.args.p_job_number === '24-101' && sv.args.p_material.category === 'bedding_rock' && sv.args.p_material.source === 'bedding_calc'
      && sv.args.p_material.basis === 'weight' && sv.args.p_material.density_tpy === '1.4' && sv.args.p_material.extra_pct === '15' && sv.args.p_material.alert_pct === '75' && sv.args.p_material.trench_width_ft === '2.5' && sv.args.p_expect_version === 0 && sv.args.p_expect_uid === 'acctA' && !!sv.args.p_phone_at, sv && sv.args);
    t = await T.matText(page);
    // 360 x 2.5 x 0.5 / 27 = 16.667 x 1.15 x 1.4 = 26.833
    check('a second BEDDING material (pea gravel next to the sand): both "Split unknown", no amount, and a warning naming both (review S3)', /Pea gravel \(1\/4" rock\) Shares footage( ›)? Estimate — \/ — \/ — ton/.test(t) && /Fine sand \(mason sand\) Shares footage/.test(t) /* chip is a button since r15.4.3 */ && /Fine sand \(mason sand\) and Pea gravel \(1\/4" rock\) share the Pipe Installed footage/.test(t) /* r15.4.1: shorter wording (owner) */, t.slice(0, 900));
    const card2 = await page.evaluate(async () => { await pbOpenProdDashboard(); await new Promise(r => setTimeout(r, 1200)); const b = [...document.querySelectorAll('#pdJobs .pbp-job')].find(x => /Job 24-101/.test(x.textContent)); return b ? b.innerText.replace(/\s+/g, ' ') : ''; });
    check('the dashboard card says "Split unknown" too (no doubled amounts)', /Fine sand \(mason sand\) \(est\.\): — \/ — \/ 10 yd³ Shares footage/.test(card2) && /Pea gravel \(1\/4" rock\) \(est\.\): — \/ — \/ — ton Shares footage/.test(card2), card2);
    await T.openJob(page, '24-101');
    const pg = await page.evaluate(() => window.__debugMat().jobs['24-101'].data.materials.find(m => /Pea gravel/.test(m.name)).id);
    await page.evaluate((i) => { document.querySelector('#pjMat_' + i + ' .pbm-head').click(); }, pg); await page.waitForTimeout(200);
    await page.evaluate((i) => [...document.querySelectorAll('#pjMatD_' + i + ' button')].find(x => x.textContent === 'Archive').click(), pg); await page.waitForTimeout(200);
    await T.click(page, '^Archive$'); await page.waitForTimeout(900);
    t = await T.matText(page);
    check('pea gravel archived: the sand counts again (≈ 23)', /Fine sand \(mason sand\) Over expected Estimate ≈ 23/.test(t) && !/Split unknown/.test(t), t.slice(0, 600));
    // duplicate name
    await page.click('#pjMatAdd'); await page.waitForTimeout(150);
    await page.evaluate(() => localStorage.setItem('__matMode', 'dup'));
    await page.fill('#pmf_name', 'tees'); await page.selectOption('#pmf_category', 'fittings'); await page.waitForTimeout(100); await page.fill('#pmf_unit', 'EA'); await page.click('#pmfSave'); await page.waitForTimeout(500);
    check('duplicate name: plain message, form kept', /already has a material with that name/.test(await page.evaluate(() => pmfErr.textContent)) && await page.evaluate(() => pmf_name.value === 'tees'));
    await page.evaluate(() => localStorage.setItem('__matMode', 'ok'));
    // unsaved guard
    await page.evaluate(() => pbGoto('prodDashboard')); await page.waitForTimeout(300);
    let md = await T.modal(page);
    check('leaving with a typed, unsaved material asks first', md && md.title === 'Unsaved Material' && (await T.screen(page)) === 'screen-prodJob', md);
    check('…with Stay / Leave choices', md && md.buttons.length === 2, md && md.buttons);
    await T.click(page, '^(Stay|Keep|Cancel|No)'); await page.waitForTimeout(200);
    check('staying keeps the typing', (await T.screen(page)) === 'screen-prodJob' && await page.evaluate(() => pmf_name.value === 'tees'));
    await page.click('#pmfCancel'); await page.waitForTimeout(200);
    // an order: validation, offline keeps the typing, retry with the same id
    await page.evaluate(() => [...document.querySelectorAll('#pjMat_mp1 button')].find(b => b.textContent === 'Add Order').click()); await page.waitForTimeout(200);
    await page.click('#pmfSave'); await page.waitForTimeout(150);
    check('order without an amount: "Enter an amount above 0."', /Enter an amount above 0/.test(await page.evaluate(() => pmfErr.textContent)));
    await page.fill('#pmf_qty', '300'); await page.fill('#pmf_ref', 'PO 9');
    await page.evaluate(() => localStorage.setItem('__matMode', 'offline')); await page.click('#pmfSave'); await page.waitForTimeout(500);
    check('order with no signal: says nothing was saved, the typing stays', /Nothing was saved/.test(await page.evaluate(() => pmfErr.textContent)) && await page.evaluate(() => pmf_qty.value === '300' && pmf_ref.value === 'PO 9'));
    await page.evaluate(() => localStorage.setItem('__matMode', 'ok')); await page.click('#pmfSave'); await page.waitForTimeout(900);
    const ol = await T.matLog(page, 'pb_mat_order_add');
    check('retry: the same client order id both times (the server keeps one order)', ol.length === 2 && ol[0].args.p_client_order_id === ol[1].args.p_client_order_id && ol[1].args.p_qty === 300 && ol[1].args.p_ordered_on === await page.evaluate(() => window.__pdDay(0)), ol.map(x => x.args.p_client_order_id));
    t = await T.matText(page);
    check('ordered now 700: "360 / 700 / 1,000 LF", the 80% chip gone (400 < 560)', /8in PVC SDR 35 360 \/ 700 \/ 1,000 LF \+40 waiting/.test(t), t.slice(0, 300));
    // void needs a reason
    await page.evaluate(() => { if (!document.getElementById('pjMatD_mp1')) document.querySelector('#pjMat_mp1 .pbm-head').click(); }); await page.waitForTimeout(200);
    await page.evaluate(() => [...document.querySelectorAll('#pjMatD_mp1 button')].find(b => b.textContent === 'Void').click()); await page.waitForTimeout(200);
    await page.click('#pmfSave'); await page.waitForTimeout(150);
    check('void without a reason: asks why, nothing sent', /Say why/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_order_void')).length === 0);
    await page.fill('#pmf_reason', 'Entered twice'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    check('void with a reason: sent with it', (await T.matLog(page, 'pb_mat_order_void')).pop().args.p_reason === 'Entered twice');
    t = await page.evaluate(() => (document.getElementById('pjMatD_mp1') || {}).innerText || '');
    check('the voided order stays listed, marked voided with the reason', /Voided .*Entered twice/.test(t.replace(/\s+/g, ' ')));
    // delivery tickets
    await page.evaluate(() => document.getElementById('pjMatSec').scrollIntoView()); 
    t = await T.matText(page);
    check('tickets: "Delivery tickets: 3 unassigned", each with its supplier, number and amount', /Delivery tickets: 3 unassigned/.test(t) && /Fine sand · 12 tons Rock Co · #5512/.test(t) && /Gaskets · 50 EA Rock Co · #5512/.test(t), t.slice(t.indexOf('Delivery tickets'), t.indexOf('Delivery tickets') + 400));
    check('tickets: a suggestion by name and unit, converted by the density, only applied on a tap', /Count toward Fine sand \(mason sand\) \(= 10 yd³\)/.test(t) && (await T.matLog(page, 'pb_mat_ticket_link')).length === 0);
    check('tickets: no match = "Assign" only', await page.evaluate(() => { const li = [...document.querySelectorAll('#pjTkList li')].find(x => /Gaskets/.test(x.textContent)); return !!li && !li.querySelector('.pbm-sugg') && /Assign/.test(li.textContent); }));
    await page.evaluate(() => [...document.querySelectorAll('#pjTkList button')].find(b => b.textContent === 'View Ticket').click()); await page.waitForTimeout(500);
    check('tickets: View Ticket shows the foreman\'s photo (pb_ticket_photo)', await page.evaluate(() => !!document.querySelector('#pjTkList img.pbm-photo') && (window.__matLog || []).some(x => x.fn === 'pb_ticket_photo' && x.args.p_ticket_id === 'tk1')));
    await page.evaluate(() => document.querySelector('#pjTkList .pbm-sugg').click()); await page.waitForTimeout(250);
    let cv = await page.evaluate(() => ({ m: pmf_material.value, conv: (document.getElementById('pmfConv') || {}).textContent || '' }));
    check('suggestion tapped: the form shows the match and both amounts (12 tons = 10 yd³, × 0.833333, density 1.2)', cv.m === 'ms1' && /12 tons = 10 yd³ \(× 0\.833333, density 1\.2 tons per yd³\)/.test(cv.conv), cv);
    await page.click('#pmfSave'); await page.waitForTimeout(900);
    let lk = (await T.matLog(page, 'pb_mat_ticket_link')).pop();
    check('linked: ticket, line, material, no order, no factor (the server converts)', lk && lk.args.p_ticket_id === 'tk1' && lk.args.p_line_no === 0 && lk.args.p_material_id === 'ms1' && lk.args.p_order_id === null && lk.args.p_factor === null, lk && lk.args);
    t = await T.matText(page);
    check('sand now ordered 10 from its ticket: "≈ 23 / 10 / 10 yd³"; 2 unassigned left', /Fine sand \(mason sand\) .*≈ 23 \/ 10 \/ 10 yd³/.test(t) && /Delivery tickets: 2 unassigned/.test(t));
    // sticks -> LF needs the PM's factor; counted inside an order
    await page.evaluate(() => { const li = [...document.querySelectorAll('#pjTkList li')].find(x => /sticks/.test(x.textContent)); [...li.querySelectorAll('button')].find(b => /Assign/.test(b.textContent)).click(); }); await page.waitForTimeout(250);
    await page.selectOption('#pmf_material', 'mp1'); await page.waitForTimeout(200);
    check('a unit that doesn\'t convert asks for the factor', await page.evaluate(() => !!document.getElementById('pmf_factor') && /LF per sticks/.test(pmf_factor.parentNode.textContent)));
    await page.click('#pmfSave'); await page.waitForTimeout(200);
    check('no factor: says what\'s needed, nothing sent', /how many LF one sticks is/.test(await page.evaluate(() => pmfErr.textContent)) && (await T.matLog(page, 'pb_mat_ticket_link')).length === 1);
    await page.fill('#pmf_factor', '20'); await page.waitForTimeout(100);
    const oid = await page.evaluate(() => [...pmf_order.options].map(o => o.value).filter(Boolean)[0]);
    await page.selectOption('#pmf_order', oid); await page.click('#pmfSave'); await page.waitForTimeout(900);
    lk = (await T.matLog(page, 'pb_mat_ticket_link')).pop();
    check('linked inside the remaining order with factor 20', lk.args.p_factor === 20 && lk.args.p_order_id === oid && lk.args.p_material_id === 'mp1');
    t = await T.matText(page);
    check('280 LF of tickets inside the 300 LF order: ordered stays 300 (not counted twice)', /8in PVC SDR 35 .*360 \/ 300 \/ 1,000 LF/.test(t), t.slice(0, 400));
    // unassign
    await page.evaluate(() => { if (!document.getElementById('pjMatD_ms1')) document.querySelector('#pjMat_ms1 .pbm-head').click(); }); await page.waitForTimeout(200);
    t = await page.evaluate(() => document.getElementById('pjMatD_ms1').innerText.replace(/\s+/g, ' '));
    check('sand details list its ticket: "Rock Co · #5512 · … Fine sand: 12 tons = 10 yd³ (× 0.833333)"', /Rock Co · #5512 · .* · Fine sand: 12 tons = 10 yd³ \(× 0\.833333\)/.test(t), t);
    await page.evaluate(() => [...document.querySelectorAll('#pjMatD_ms1 button')].find(b => b.textContent === 'Unassign').click()); await page.waitForTimeout(200);
    await page.click('#pmfSave'); await page.waitForTimeout(150);
    check('unassign needs a reason', /Say why it’s being unassigned/.test(await page.evaluate(() => pmfErr.textContent)));
    await page.fill('#pmf_reason', 'Wrong sand'); await page.click('#pmfSave'); await page.waitForTimeout(900);
    t = await T.matText(page);
    check('unassigned: back on the list (2 unassigned), sand back to "— ordered"', /Delivery tickets: 2 unassigned/.test(t) && /≈ 23 \/ — \/ 10 yd³/.test(t) && (await T.matLog(page, 'pb_mat_ticket_unlink')).pop().args.p_reason === 'Wrong sand');
    // the notification link
    await page.evaluate(() => pbGoto('home')); await page.waitForTimeout(300);
    await page.evaluate(() => window.pbPushOpen('#/prod/materials')); await page.waitForTimeout(800);
    check('a material notification opens Company production', (await T.screen(page)) === 'screen-prodDashboard');
    check('no JS errors (company)', page._errors.length === 0, page._errors);
  } finally { await ctx.close(); }
  // ---------- server not ready ----------
  { const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: T.seedMats(), __matMode: 'missing' } });
    try {
      await page.evaluate(() => pbOpenProdDashboard()); await page.waitForTimeout(1000);
      check('server not ready: the dashboard is as before (jobs listed, no materials block, no error shown)', await page.evaluate(() => document.querySelectorAll('#pdJobs .pbp-job').length === 3 && !document.querySelector('.pbm-dash') && !/materials/i.test(pdStatus.textContent)));
      await T.openJob(page, '24-101');
      const t = await T.matText(page);
      check('server not ready: the job page says so in the Materials section; the rest of the page is there', /The company server isn’t ready for materials yet/.test(t) && await page.evaluate(() => !!document.getElementById('pjTableSec')));
      check('no JS errors (missing)', page._errors.length === 0);
    } finally { await ctx.close(); }
  }
  // ---------- offline: the last copy ----------
  { const { ctx, page } = await T.setup(browser, { manager: true, extra: { __psrv: T.seedServer(), __msrv: T.seedMats() } });
    try {
      await T.openJob(page, '24-101'); await page.waitForTimeout(400);
      await page.evaluate(() => localStorage.setItem('__matMode', 'offline'));
      await page.reload(); await M.dismiss(page); await page.waitForTimeout(1400);
      await page.evaluate(() => localStorage.setItem('__rpcMode', 'offline'));
      await T.openJob(page, '24-101');
      const t = await T.matText(page);
      check('offline after a reload: the last copy of the materials, with its time', /No signal\. Showing the copy from/.test(t) && /8in PVC SDR 35/.test(t), t.slice(0, 200));
      check('no JS errors (offline)', page._errors.length === 0, page._errors);
    } finally { await ctx.close(); }
  }
  await browser.close();
  console.log('JS errors: none');
})().catch(e => { console.log('SCRIPT ERROR', e); process.exit(1); });
