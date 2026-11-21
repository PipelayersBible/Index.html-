const R = '/home/claude/index.html-/tests/rig/'; const boot = require(R + 'boot'), co = require(R + 'co');
(async () => { const { b, p } = await boot(process.env.PB_URL, { init: co }); await p.setViewportSize({ width: 390, height: 844 });
  const r = await p.evaluate(async () => { try { await window.pbShowScreen && pbShowScreen('confinedPermit'); } catch (e) {} const a = document.getElementById('cpAddress'); if (!a) return 'no cpAddress';
    const out = {}; for (const ad of ['1 Main St, Riverside, CA 92501', '5 Elm St, Lansing, MI 48933', '9 Oak St, Austin, TX 78701']) { a.value = ad; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 300)); out[ad.slice(-8)] = (document.getElementById('cpRulesLine') || {}).textContent; } return out; });
  console.log(JSON.stringify(r, null, 1));
  await p.evaluate(() => pbSrShow('WA')); await p.waitForTimeout(400); await p.screenshot({ path: '../work/rules_wa.png', fullPage: true });
  await b.close(); })();
