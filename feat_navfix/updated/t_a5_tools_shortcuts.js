// UX batch 2, A5: Tools (search + one grouped list), My Shortcuts on Home, the shortcut editor, Add to Home,
// batch 10 A (F33): loss-of-work dialogs now name their actions (Keep Editing / Leave Without Saving, Stay / Leave and Clear Import, Keep X / Remove X ...); this copy clicks the new labels.
// and calculator Back falling back to Tools. Fails on base (no shortcuts, no Tools search, no Add to Home,
// a calculator Back with no history does nothing); passes on A5.
// UX batch 3: calcHub is the Calculators tab again (calculators only); Quick Run, Education, Confined Space
// Reference and Stats are listed on the new Tools screen (screen-tools, #toolsAllList).
const L = require('/home/claude/test/lib.js');
const sleep = (p, ms) => p.waitForTimeout(ms);
async function ctxFor(browser, uid, tier, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 400, height: opts.height || 900 } });
  await ctx.route(/fonts\.googleapis|cdn\.jsdelivr/, r => r.abort());
  await ctx.addInitScript(({ u, t, ts, sc }) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('lastKnownUserId', u); localStorage.setItem('legacyDataMigrated', 'true');
    if (t) localStorage.setItem(u + ':cachedSubscription', JSON.stringify({ tier: t, status: 'active' }));
    if (ts) localStorage.setItem(u + ':textSize', ts);
    if (sc !== undefined) localStorage.setItem(u + ':homeShortcuts', sc);
  }, { u: uid, t: tier, ts: opts.textSize || null, sc: opts.sc });
  return ctx;
}
async function openPage(ctx) {
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  page._errors = []; page.on('pageerror', e => page._errors.push(e.message));
  await page.goto(L.ORIGIN);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 20000 });
  await sleep(page, 700); await L.dismiss(page);
  return page;
}
const active = (page) => page.evaluate(() => document.querySelector('.pb-screen.active').id);
const modalTitle = (page) => page.evaluate(() => getComputedStyle(document.getElementById('pbModalOverlay')).display !== 'none' ? document.getElementById('pbModalTitle').textContent : null);
const clickModal = async (page, label) => { await page.click('#pbModalButtons button:has-text("' + label + '")'); await sleep(page, 300); };
const tiles = (page) => page.evaluate(() => { const s = document.getElementById('homeShortcuts'); return s && getComputedStyle(s).display !== 'none' ? [...s.querySelectorAll('.pb-sc-tile')].map(b => b.dataset.dest) : null; });
const stored = (page, uid) => page.evaluate((u) => { const r = localStorage.getItem(u + ':homeShortcuts'); return r === null ? null : JSON.parse(r); }, uid);
const toHome = (page) => page.evaluate(() => pbGoto('home', false, true));
const searchTools = async (page, q) => { if (!(await page.$('#screen-tools.active'))) { await page.evaluate(() => pbGotoTab('tools')); await sleep(page, 300); } await page.fill('#toolsAllSearchBox', q); await sleep(page, 150); return page.evaluate(() => [...document.querySelectorAll('#toolsAllResults [data-dest]')].map(b => b.dataset.dest)); };
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

(async () => {
  const browser = await L.chromium.launch();
  try {
    // ---------- 1. Home defaults (D5), launching, Add to Home ----------
    {
      const ctx = await ctxFor(browser, 'a5u', 'individual');
      const page = await openPage(ctx);
      L.check('Home: My Shortcuts shows the D5 defaults in order (Material Volume, Trench, Tenths, Bedding)', JSON.stringify(await tiles(page)) === '["volume","trench","frac","bedding"]');
      L.check('Home: the shortcuts have readable labels and an Edit button', await page.evaluate(() => {
        const t = [...document.querySelectorAll('#homeShortcutsList .pb-sc-tile .name')].map(x => x.textContent);
        const e = document.getElementById('homeShortcutsEdit'); return t[0] === 'Material Volume' && t[1] === 'Trench Sloping & Shoring' && !!e && e.offsetHeight >= 44; }));
      L.check('Home: no setting is stored just by looking (never set stays never set)', await stored(page, 'a5u') === null);
      await page.click('#homeShortcutsList [data-dest="volume"]'); await sleep(page, 300);
      L.check('a shortcut opens its calculator through the normal opener', await active(page) === 'screen-volumeCalc');
      L.check('...whose header says Added to Home (it is a default shortcut)', await page.evaluate(() => { const b = document.querySelector('#screen-volumeCalc .pb-addhome'); return b && b.textContent === 'Added to Home' && b.getAttribute('aria-pressed') === 'true'; }));
      await page.click('#screen-volumeCalc .pb-back'); await sleep(page, 300);
      L.check('calculator Back returns to Home, where it was opened from', await active(page) === 'screen-home');
      // Add to Home from a calculator
      await page.evaluate(() => pbGoto('slopeConvCalc')); await sleep(page, 200);
      L.check('a calculator not on Home says Add to Home', await page.textContent('#screen-slopeConvCalc .pb-addhome') === 'Add to Home');
      await page.click('#screen-slopeConvCalc .pb-addhome'); await sleep(page, 300);
      let st = await stored(page, 'a5u');
      L.check('Add to Home saves this account’s list {v:1, ids, setAt} with it appended', st && st.v === 1 && typeof st.setAt === 'number' && JSON.stringify(st.ids) === '["volume","trench","frac","bedding","slopeConv"]');
      L.check('...and the button changes to Added to Home', await page.textContent('#screen-slopeConvCalc .pb-addhome') === 'Added to Home');
      await page.click('#screen-slopeConvCalc .pb-addhome'); await sleep(page, 300);
      L.check('tapping Added to Home asks before removing (Already on Home)', await modalTitle(page) === 'Already on Home');
      await clickModal(page, 'Keep It');
      st = await stored(page, 'a5u');
      L.check('...Keep It changes nothing, and there is never a duplicate', st.ids.length === 5 && st.ids.filter(x => x === 'slopeConv').length === 1);
      await page.evaluate(() => pbAddToHome('slopeConv')); await sleep(page, 300); await L.dismiss(page); await sleep(page, 200);
      // L.dismiss clicks the last button = Remove From Home
      st = await stored(page, 'a5u');
      L.check('...Remove From Home takes only that shortcut off', JSON.stringify(st.ids) === '["volume","trench","frac","bedding"]' && await page.textContent('#screen-slopeConvCalc .pb-addhome') === 'Add to Home');
      // the Education hub
      await page.evaluate(() => pbGoto('formulasHub')); await sleep(page, 300);
      await page.click('#screen-formulasHub .pb-addhome'); await sleep(page, 300);
      st = await stored(page, 'a5u');
      L.check('the Education hub has Add to Home too', st.ids.includes('edu') && await page.textContent('#screen-formulasHub .pb-addhome') === 'Added to Home');
      await toHome(page); await sleep(page, 200);
      L.check('Home shows the added shortcut at the end', JSON.stringify(await tiles(page)) === '["volume","trench","frac","bedding","edu"]');
      L.check('every calculator header has an Add to Home button (13)', await page.evaluate(() => ['bendCalc','beddingCalc','flowCalc','volumeCalc','ventCalc','trenchCalc','pipeWeightCalc','liftCalc','slopeConvCalc','fracCalc','manningCalc','manholeDepthCalc','rodElevCalc'].every(s => document.querySelector('#screen-' + s + ' .pb-header .pb-addhome'))));
      L.check('no page errors', page._errors.length === 0);
      if (page._errors.length) console.log(page._errors);

      // ---------- 2. Tools: list and search ----------
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 300);
      const hub = await page.evaluate(() => ({
        title: document.querySelector('#screen-calcHub .pb-title').textContent,
        heads: [...document.querySelectorAll('#toolsList .pb-edu-h')].map(h => h.textContent),
        ids: [...document.querySelectorAll('#toolsList [data-dest]')].map(b => b.dataset.dest) }));
      console.log('   Calculators groups:', hub.heads.join(' | '));
      L.check('UX batch 3: calcHub is titled Calculators again', hub.title === 'Calculators');
      L.check('one list grouped under the old category names (Grade & Elevation, Safety, Pipe & Flow, Structures)', ['Grade & Elevation', 'Safety', 'Pipe & Flow', 'Structures'].every(h => hub.heads.includes(h)));
      L.check('the list has all 13 calculators (Ventilation included)', ['rodElev','slopeConv','frac','lift','bedding','trench','vent','pipeWeight','manning','flow','volume','bend','manhole'].every(i => hub.ids.includes(i)));
      // UX batch 3: Quick Run, Education, Confined Space Reference and Stats are on the Tools screen
      await page.evaluate(() => pbGotoTab('tools')); await sleep(page, 300);
      const tl = await page.evaluate(() => [...document.querySelectorAll('#toolsAllList [data-dest]')].map(b => b.dataset.dest));
      L.check('Tools lists Education, Confined Space Reference and Stats, not Quick Run or permits (on Home)', ['edu','confinedRef','stats'].every(i => tl.includes(i)) && !tl.includes('quickRun') && !tl.includes('confinedHub'));
      L.check('Reports actions are not listed as tools (UX batch 3: Stats is, in Tools)', !hub.ids.includes('reportIssue') && !tl.includes('reportIssue') && !hub.ids.includes('stats'));
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 300);
      const s1 = await searchTools(page, 'concrete'); const s2 = await searchTools(page, 'rod shot'); const s3 = await searchTools(page, 'fall');
      const s4 = await searchTools(page, 'shoring'); const s5 = await searchTools(page, 'HI'); const s6 = await searchTools(page, 'cubic yards');
      const s7 = await searchTools(page, 'flow rate');
      console.log('   concrete:', s1.join(','), '| rod shot:', s2.join(','), '| fall:', s3.join(','), '| shoring:', s4.join(','), '| HI:', s5.join(','), '| flow rate:', s7.join(','));
      L.check('search by field words: concrete finds Material Volume', s1.includes('volume'));
      L.check('search: rod shot finds Rod Reading -> Elevation', s2[0] === 'rodElev');
      L.check('search: fall finds the Slope / Grade Converter', s3.includes('slopeConv'));
      L.check('search: shoring finds Trench Sloping & Shoring first', s4[0] === 'trench');
      L.check('search: HI (Education synonym: height of instrument) finds Rod Reading, as a whole word only', s5.includes('rodElev') && !s5.includes('pipeWeight'));
      L.check('search: two words (cubic yards) both have to match', JSON.stringify(s6) === '["volume","bedShade"]'); // r15.5.1: Bedding & Shading also gives cubic yards
      L.check('search: an Education synonym group (flow rate = gpm) finds Flush / Flow Rate', s7.includes('flow'));
      L.check('while searching, the grouped list is hidden', await page.evaluate(() => getComputedStyle(document.getElementById('toolsAllList')).display === 'none'));
      const none = await searchTools(page, 'xyzzy');
      const empty = await page.evaluate(() => document.getElementById('toolsAllResults').textContent);
      L.check('no match: says so and offers suggestions and an Education search (not an empty page)', none.length === 0 && /No tool matches/.test(empty) /* UX batch 3: the Calculators search */ && /Search Education/.test(empty));
      await page.click('#toolsAllResults button:has-text("Search Education")'); await sleep(page, 400);
      L.check('...which opens Education & Reference with the same words searched', await active(page) === 'screen-formulasHub' && await page.inputValue('#eduSearchBox') === 'xyzzy');
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 200);
      await searchTools(page, 'manhole depth');
      await page.click('#toolsAllResults [data-dest="manhole"]'); await sleep(page, 300);
      L.check('a search result opens the calculator', await active(page) === 'screen-manholeDepthCalc');
      await page.click('#screen-manholeDepthCalc .pb-back'); await sleep(page, 300);
      L.check('...and its Back returns to Tools with the search kept', await active(page) === 'screen-tools' && await page.inputValue('#toolsAllSearchBox') === 'manhole depth');
      await page.fill('#toolsAllSearchBox', ''); await page.dispatchEvent('#toolsAllSearchBox', 'input'); await sleep(page, 100);
      await page.evaluate(() => pbGotoTab('home')); await sleep(page, 300); // feat_navfix: Quick Run lives on Home > Start work
      await page.click('#homeTileQuickRun'); await sleep(page, 300);
      L.check('Quick Run opens from Home', await active(page) === 'screen-quickrun');
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 200);
      await page.click('#screen-calcHub [onclick="pbGoto(\'calcCatPipe\')"]'); await sleep(page, 200);
      L.check('CONTROL: the old category screens are still reachable from Tools', await active(page) === 'screen-calcCatPipe');
      await page.click('#screen-calcCatPipe .pb-back'); await sleep(page, 200);
      L.check('CONTROL: category Back still returns to Tools', await active(page) === 'screen-calcHub');

      // ---------- 3. calculator Back with no history ----------
      await toHome(page); await sleep(page, 200);
      await page.evaluate(() => { for (let i = 0; i < 30; i++) pbGoto('pipeWeightCalc', true); }); await sleep(page, 200); // steps "back": no history left
      await page.click('#screen-pipeWeightCalc .pb-back'); await sleep(page, 300);
      L.check('a calculator Back (pbGoBack) with no history goes to Calculators instead of doing nothing', await active(page) === 'screen-calcHub'); // UX batch 3: calcHub is Calculators
      await toHome(page); await sleep(page, 200);
      await page.evaluate(() => { pbOpenTrenchCalc(); }); await sleep(page, 300);
      await page.evaluate(() => { for (let i = 0; i < 30; i++) pbGoto('bendCalc', true); }); await sleep(page, 200);
      await page.click('#screen-bendCalc .pb-back'); await sleep(page, 300);
      L.check('a calculator Back (pbCalcBack) with no history goes to Calculators too', await active(page) === 'screen-calcHub');
      L.check('no page errors (Tools)', page._errors.length === 0);
      if (page._errors.length) console.log(page._errors);

      // ---------- 4. the editor ----------
      await toHome(page); await sleep(page, 200);
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      const ed = await page.evaluate(() => ({ items: [...document.querySelectorAll('#scEditList .pb-sc-item')].map(x => x.dataset.dest), add: [...document.querySelectorAll('#scEditAdd [data-dest]')].map(x => x.dataset.dest) }));
      L.check('Edit opens screen-shortcutsEdit with the current list', await active(page) === 'screen-shortcutsEdit' && JSON.stringify(ed.items) === '["volume","trench","frac","bedding","edu"]');
      L.check('...and the Add list offers only what is not already on Home (no duplicates)', !ed.add.includes('volume') && ed.add.includes('manning') && ed.add.includes('reportIssue'));
      L.check('...first Move Up and last Move Down are disabled', await page.evaluate(() => { const it = document.querySelectorAll('#scEditList .pb-sc-item'); return it[0].querySelector('.up').disabled && it[it.length - 1].querySelector('.down').disabled; }));
      await page.click('#scEditList [data-sc-idx="4"] .up'); await sleep(page, 150);
      L.check('Move Up moves it and keeps focus on the moved shortcut', await page.evaluate(() => [...document.querySelectorAll('#scEditList .pb-sc-item')].map(x => x.dataset.dest).join() === 'volume,trench,frac,edu,bedding' && document.activeElement.closest('[data-sc-idx="3"]') !== null));
      await page.click('#scEditList [data-sc-idx="0"] .down'); await sleep(page, 150);
      await page.click('#scEditList [data-sc-idx="1"] .remove'); await sleep(page, 150); // removes volume
      await page.fill('#scEditSearch', 'manning'); await sleep(page, 150);
      await page.click('#scEditAdd [data-dest="manning"]'); await sleep(page, 150);
      const draft = await page.evaluate(() => [...document.querySelectorAll('#scEditList .pb-sc-item')].map(x => x.dataset.dest).join());
      L.check('Move Down, Remove and search-to-Add edit the list', draft === 'trench,frac,edu,bedding,manning');
      L.check('...nothing is saved before Save', JSON.stringify((await stored(page, 'a5u')).ids) === '["volume","trench","frac","bedding","edu"]');
      await page.click('#scEditCancel'); await sleep(page, 300);
      L.check('Cancel with changes asks first (Unsaved Shortcut Changes)', await modalTitle(page) === 'Unsaved Shortcut Changes');
      await clickModal(page, 'Keep Editing');
      L.check('...Keep Editing stays with the changes', await active(page) === 'screen-shortcutsEdit' && await page.evaluate(() => document.querySelectorAll('#scEditList .pb-sc-item').length) === 5);
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 300);
      L.check('leaving by any other route (pbGoto: tab) with changes asks too, through pbExtraUnsavedChecks', await modalTitle(page) === 'Unsaved Shortcut Changes');
      await clickModal(page, 'Keep Editing');
      await page.evaluate(() => pbGoBack()); await sleep(page, 300);
      L.check('...and so does pbGoBack (edge swipe); Cancel keeps the editor and the changes', await modalTitle(page) === 'Unsaved Shortcut Changes');
      await clickModal(page, 'Keep Editing');
      L.check('...still on the editor with the changes', await active(page) === 'screen-shortcutsEdit' && await page.evaluate(() => document.querySelectorAll('#scEditList .pb-sc-item').length) === 5);
      await page.click('#scEditCancel'); await sleep(page, 300); await clickModal(page, 'Leave Without Saving');
      L.check('...Leave Without Saving goes back Home with the old shortcuts', await active(page) === 'screen-home' && JSON.stringify(await tiles(page)) === '["volume","trench","frac","bedding","edu"]');
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      L.check('reopening Edit starts from the saved list, not the abandoned draft', await page.evaluate(() => document.querySelectorAll('#scEditList .pb-sc-item').length) === 5);
      for (let i = 0; i < 5; i++) { await page.click('#scEditList [data-sc-idx="0"] .remove'); await sleep(page, 80); }
      await page.click('#scEditSave'); await sleep(page, 400);
      st = await stored(page, 'a5u');
      L.check('Save with none keeps "none" (set, ids [])', st && Array.isArray(st.ids) && st.ids.length === 0 && await active(page) === 'screen-home');
      const emptyHome = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('homeShortcuts')).display !== 'none', tiles: document.querySelectorAll('#homeShortcutsList .pb-sc-tile').length, edit: document.getElementById('homeShortcutsEdit').offsetHeight > 0, text: document.getElementById('homeShortcutsNotice').textContent }));
      L.check('Home with no shortcuts: no tiles, a short line, and Edit still visible', emptyHome.shown && emptyHome.tiles === 0 && emptyHome.edit && /No shortcuts/.test(emptyHome.text));
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 20000 }); await sleep(page, 700); await L.dismiss(page);
      L.check('after a restart "none" is still none (the defaults do not come back)', JSON.stringify(await tiles(page)) === '[]');
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      await page.click('#scEditRestore'); await sleep(page, 300);
      L.check('Restore Default Shortcuts asks first', await modalTitle(page) === 'Restore Default Shortcuts');
      await clickModal(page, 'Restore Defaults');
      L.check('...fills the list with the defaults, not saved until Save', await page.evaluate(() => [...document.querySelectorAll('#scEditList .pb-sc-item')].map(x => x.dataset.dest).join()) === 'volume,trench,frac,bedding' && (await stored(page, 'a5u')).ids.length === 0);
      await page.click('#scEditSave'); await sleep(page, 400);
      L.check('...Save stores the defaults', JSON.stringify((await stored(page, 'a5u')).ids) === '["volume","trench","frac","bedding"]' && JSON.stringify(await tiles(page)) === '["volume","trench","frac","bedding"]');
      // a failed save keeps the editor open with a message and changes nothing
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      await page.click('#scEditList [data-sc-idx="0"] .remove'); await sleep(page, 100);
      await page.evaluate(() => { window._o = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k.includes('homeShortcuts')) throw new Error('sim'); return window._o(k, v); }; });
      await page.click('#scEditSave'); await sleep(page, 500);
      const fail = await page.evaluate(() => ({ msg: document.getElementById('scEditMsg'), }));
      L.check('a failed Save stays on the editor and says it wasn’t saved', await active(page) === 'screen-shortcutsEdit' && await page.evaluate(() => getComputedStyle(document.getElementById('scEditMsg')).display !== 'none' && /couldn.t be saved/.test(document.getElementById('scEditMsg').textContent)));
      await page.evaluate(() => { localStorage.setItem = window._o; });
      L.check('...and Home keeps the old list', JSON.stringify((await stored(page, 'a5u')).ids) === '["volume","trench","frac","bedding"]');
      await page.click('#scEditCancel'); await sleep(page, 300); await clickModal(page, 'Leave Without Saving');
      // a contractor-only action on an individual plan: shown locked with the reason, and it does not open
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      L.check('Job Summary is gated like the Archive: locked on the individual plan, with the reason', await page.evaluate(() => /Locked — needs a Contractor/.test(document.querySelector('#scEditAdd [data-dest="jobSummary"]').textContent) && (pbDestinations.find(d => d.id === 'jobSummary') || {}).gate === 'archive'));
      await page.evaluate(() => pbOpenDest('jobSummary')); await sleep(page, 300);
      L.check('...and pbOpenDest refuses it (jobSummary itself is not in any plan list)', await modalTitle(page) === 'Subscription Required' && await active(page) === 'screen-shortcutsEdit');
      await L.dismiss(page);
      await page.click('#scEditAdd [data-dest="reportIssue"]'); await sleep(page, 100);
      await page.click('#scEditSave'); await sleep(page, 400);
      const lockTxt = await page.evaluate(() => { const t = document.querySelector('#homeShortcutsList [data-dest="reportIssue"]'); return t ? t.textContent : null; });
      L.check('a shortcut the plan does not allow shows the reason (needs a Contractor subscription)', /Locked/.test(lockTxt || '') && /Contractor/.test(lockTxt || ''));
      await page.click('#homeShortcutsList [data-dest="reportIssue"]'); await sleep(page, 300);
      L.check('...and tapping it explains instead of opening', await modalTitle(page) === 'Subscription Required' && await active(page) === 'screen-home');
      await L.dismiss(page);
      L.check('no page errors (editor)', page._errors.length === 0);
      if (page._errors.length) console.log(page._errors);
      await ctx.close();
    }
    // ---------- 5. more than six; ids that no longer exist ----------
    {
      const eight = JSON.stringify({ v: 1, ids: ['volume', 'trench', 'frac', 'bedding', 'manning', 'flow', 'bend', 'lift'], setAt: 1 });
      const ctx = await ctxFor(browser, 'a5many', 'individual', { sc: eight });
      const page = await openPage(ctx);
      L.check('more than six: six show, with Show all 8', (await tiles(page)).length === 6 && await page.textContent('#homeShortcutsMore') === 'Show all 8');
      await page.click('#homeShortcutsMore'); await sleep(page, 200);
      L.check('...Show all shows all eight in order', JSON.stringify(await tiles(page)) === '["volume","trench","frac","bedding","manning","flow","bend","lift"]');
      await page.evaluate((v) => localStorage.setItem('a5many:homeShortcuts', v), JSON.stringify({ v: 1, ids: ['volume', 'oldGoneCalc', 'frac', 'otherGone'], setAt: 1 }));
      await page.reload(); await page.waitForFunction(() => getComputedStyle(document.getElementById('pbBootCover')).display === 'none', null, { timeout: 20000 }); await sleep(page, 700); await L.dismiss(page);
      const gone = await page.evaluate(() => document.getElementById('homeShortcutsNotice').textContent);
      L.check('unknown ids: the valid ones show and "2 shortcuts no longer exist" offers Remove', JSON.stringify(await tiles(page)) === '["volume","frac"]' && /2 shortcuts no longer exist/.test(gone));
      await page.click('#homeShortcutsRemoveGone'); await sleep(page, 400);
      L.check('...Remove drops only the unknown ones and keeps the order', JSON.stringify((await stored(page, 'a5many')).ids) === '["volume","frac"]' && !/no longer/.test(await page.evaluate(() => document.getElementById('homeShortcutsNotice').textContent)));
      await page.evaluate(() => pbOpenDest('nope')); await sleep(page, 200);
      L.check('an unknown id never opens some other tool', await modalTitle(page) === 'Shortcut Not Found' && await active(page) === 'screen-home');
      await L.dismiss(page);
      L.check('no page errors', page._errors.length === 0);
      await ctx.close();
    }
    // ---------- 6. no plan: shortcuts locked, explained, never opened ----------
    {
      const ctx = await ctxFor(browser, 'a5none', null);
      const page = await openPage(ctx);
      const t = await page.evaluate(() => [...document.querySelectorAll('#homeShortcutsList .pb-sc-tile')].map(b => [b.dataset.dest, b.classList.contains('locked'), b.textContent]));
      L.check('signed out with no plan: the default shortcuts show as locked, saying to log in', t.length === 4 && t.every(x => x[1] && /log in first/.test(x[2])));
      await page.click('#homeShortcutsList [data-dest="volume"]'); await sleep(page, 300);
      L.check('...tapping one shows Subscription Required and stays Home (the plan is checked first)', await modalTitle(page) === 'Subscription Required' && await active(page) === 'screen-home');
      await L.dismiss(page);
      await page.evaluate(() => pbOpenDest('trench')); await sleep(page, 300);
      L.check('...pbOpenDest refuses a calculator too (calculator screens are not gated by pbGoto)', await active(page) === 'screen-home');
      await L.dismiss(page);
      await page.click('#homeShortcutsEdit'); await sleep(page, 300);
      L.check('...Edit still opens (shortcutsEdit is allowed for everyone)', await active(page) === 'screen-shortcutsEdit');
      L.check('no page errors', page._errors.length === 0);
      await ctx.close();
    }
    // ---------- 7. 320 px Extra Large: no sideways scroll; screenshots ----------
    for (const [w, ts, tag] of [[400, null, '400_normal'], [320, '140', '320_xl']]) {
      const ctx = await ctxFor(browser, 'a5shot' + tag, 'contractor', { width: w, height: 800, textSize: ts });
      const page = await openPage(ctx);
      const dir = '/home/claude/batch3/T1/shots/a5/'; // UX batch 3: don't overwrite batch 2's review shots
      const sec = await page.$('#homeShortcuts');
      await sec.scrollIntoViewIfNeeded(); await sleep(page, 200);
      L.check(tag + ': Home has no sideways scroll', await noSideScroll(page));
      await page.screenshot({ path: dir + 'home_' + tag + '.png', fullPage: true });
      await page.evaluate(() => pbGoto('calcHub')); await sleep(page, 500);
      L.check(tag + ': Tools has no sideways scroll', await noSideScroll(page));
      await page.screenshot({ path: dir + 'tools_' + tag + '.png', fullPage: true });
      await searchTools(page, 'concrete'); await sleep(page, 200);
      await page.screenshot({ path: dir + 'tools_search_' + tag + '.png' });
      await page.fill('#toolsAllSearchBox', 'xyzzy'); await sleep(page, 200);
      await page.screenshot({ path: dir + 'tools_noresult_' + tag + '.png' });
      await page.evaluate(() => pbOpenVolumeCalc()); await sleep(page, 400);
      L.check(tag + ': a calculator header with Add to Home has no sideways scroll', await noSideScroll(page));
      await page.screenshot({ path: dir + 'calc_addhome_' + tag + '.png' });
      await page.evaluate(() => pbGoto('slopeConvCalc')); await sleep(page, 300);
      await page.screenshot({ path: dir + 'calc_addtohome_' + tag + '.png' });
      await toHome(page); await sleep(page, 200);
      await page.evaluate(() => pbOpenShortcutsEdit()); await sleep(page, 500);
      L.check(tag + ': the shortcut editor has no sideways scroll', await noSideScroll(page));
      const btns = await page.evaluate(() => [...document.querySelectorAll('#scEditList .pb-sc-btn')].every(b => b.getBoundingClientRect().height >= 40));
      L.check(tag + ': editor buttons are at least 40 px tall on screen', btns);
      await page.screenshot({ path: dir + 'shortcuts_edit_' + tag + '.png', fullPage: true });
      L.check(tag + ': no page errors', page._errors.length === 0);
      await ctx.close();
    }
  } finally { await browser.close(); }
})();
