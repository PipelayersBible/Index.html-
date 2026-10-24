// Shared helper for permit/live tests (site_m17). Supabase mocked (hunt6 mock5).
const M = require('/home/claude/test/hunt6/confined/mock5.js');
const L = require('/home/claude/test/lib.js');
async function setup(browser, { clockAt = null, seedPermit = null, extra = null } = {}) {
  const ctx = await M.newCtx(browser);
  if (clockAt !== null) await ctx.clock.install({ time: clockAt });
  await ctx.addInitScript(([pa, ex]) => {
    if (localStorage.getItem('__seeded')) return; localStorage.setItem('__seeded', '1');
    localStorage.setItem('__mockSess', JSON.stringify({ id: 'acctA', email: 'a@x.com' }));
    localStorage.setItem('lastKnownUserId', 'acctA'); localStorage.setItem('legacyDataMigrated', 'true');
    if (pa) localStorage.setItem('acctA:activeConfinedSession', pa);
    if (ex) for (const k in ex) localStorage.setItem(k, ex[k]);
  }, [seedPermit, extra]);
  const page = await M.open(ctx); await M.dismiss(page);
  return { ctx, page };
}
const modal = (p) => p.evaluate(() => { const ov = document.getElementById('pbModalOverlay'); if (!ov || getComputedStyle(ov).display === 'none') return null; return { title: document.getElementById('pbModalTitle').textContent, msg: document.getElementById('pbModalMessage').textContent, buttons: [...document.querySelectorAll('#pbModalButtons button')].map(b => b.textContent) }; });
const click = (p, re) => p.evaluate((s) => { const ov = document.getElementById('pbModalOverlay'); if (getComputedStyle(ov).display === 'none') return false; const b = [...document.querySelectorAll('#pbModalButtons button')].find(x => new RegExp(s).test(x.textContent)); if (b) b.click(); return !!b; }, re);
const FORM = { cpJobsite: 'J', cpAddress: '1 Main St', cpSpace: 'MH-1', cpPurpose: 'tie-in', cpStart: '00:00', cpEnd: '23:59', cpHazards: 'h', cpControls: 'c', cpVentFail: 'v', cpRescue: 'FD', cpComms: 'radio', cpSupervisor: 'Sam Sup', cpSupervisorInitials: 'SS', cpAttendant: 'Al Att' };
async function lockPermit(page, over = {}, { confirmAll = true } = {}) {
  await page.evaluate(() => pbOpenConfinedPermitForm()); await page.waitForTimeout(300); await M.dismiss(page);
  const f = { ...FORM, ...over };
  for (const [id, v] of Object.entries(f)) await page.evaluate(([i, val]) => { document.getElementById(i).value = val; }, [id, v]);
  await page.evaluate(() => pbLockConfinedPermit()); await page.waitForTimeout(500);
  if (confirmAll) for (let i = 0; i < 3; i++) { if (!(await click(page, 'Lock|Continue|OK'))) break; await page.waitForTimeout(400); }
  return page.evaluate(() => window.__debugGetConfinedPermit());
}
async function reading(page, { o2 = '20.9', lel = '0', h2s = '', co = '', tester = 'Tess' } = {}) {
  await page.evaluate((r) => { pbQuickAddAtmoTest(); document.getElementById('cpAtmoTester').value = r.tester; document.getElementById('cpAtmoO2').value = r.o2; document.getElementById('cpAtmoLEL').value = r.lel; document.getElementById('cpAtmoH2S').value = r.h2s; document.getElementById('cpAtmoCO').value = r.co; }, { o2, lel, h2s, co, tester });
  await page.evaluate(() => pbSaveAtmoReading()); await page.waitForTimeout(300);
}
async function addPerson(page, name, role = 'Entrant') {
  await page.evaluate(([n, r]) => { pbOpenRosterAddForm(); document.getElementById('cpRosterName').value = n; document.getElementById('cpRosterRole').value = r; }, [name, role]);
  await page.evaluate(() => pbAddRosterPerson()); await page.waitForTimeout(300);
}
// Taps Check In/Out on the roster row "name — role" (DOM), returns false if no row.
async function toggle(page, name, role = 'Entrant') {
  const ok = await page.evaluate(([n, r]) => { const it = [...document.querySelectorAll('#cpRosterList .pb-review-item')].find(d => d.querySelector('.k').textContent === n + ' \u2014 ' + r); if (!it) return false; it.querySelector('button').click(); return true; }, [name, role]);
  await page.waitForTimeout(300); return ok;
}
const roster = (page) => page.evaluate(() => [...document.querySelectorAll('#cpRosterList .pb-review-item')].map(d => d.querySelector('.k').textContent + ':' + d.querySelector('span[style*="float"]').textContent));
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('acctA:activeConfinedSession') || 'null'));
module.exports = { toggle, roster, M, L, check: M.check, chromium: M.chromium, setup, modal, click, lockPermit, reading, addPerson, stored, FORM };
