// askgrade #42: the short-elevation helper borrows leading digits only from the same job.
// The phone's stored references: job "24-017" last 2598.68 (and, before #42, "the phone's last" 2598.68 from any job).
// A short elevation typed (keyboard) in Run 1 Start's stake elevation box, then the box loses focus:
//   1. job 24-017:            97.27 -> 2597.27 (same job: borrowed, as before)
//   2. a new job 25-100:       97.27 stays 97.27 (was 2597.27 from the other job)
//   3. no job number / site:   97.27 stays 97.27
//   4. job 25-100, after a full 1097.50 on this run: 98.10 -> 1098.10 (this run's own elevations still count)
//   5. job 25-100 typed first, then the job changed to 24-017 on the same form: 97.27 -> 2597.27 (that job's), not 1097.27
const { L } = require('./glib');
(async () => {
  const T = await L(); const p = T.p, fails = [];
  const fresh = async (job) => {
    await T.E((job) => {
      pbOpenNewRun({ ask: false });
      const b = document.querySelector('#rodToggle button[data-val="engineer"]'); if (b && !b.classList.contains('active')) b.click();
      const k = pbSeKey(); localStorage.setItem(k, JSON.stringify({ phone: 2598.68, jobs: { '24-017': 2598.68 } })); pbSeMem = {}; pbSeLast = null;
      ['saJobNumber', 'saJobsite'].forEach(id => { const el = document.getElementById(id); if (el) { el.value = id === 'saJobNumber' ? job : ''; el.dispatchEvent(new Event('input', { bubbles: true })); } });
      const t = document.querySelector('#startModeToggle button[data-val="stake"]'); if (t && !t.classList.contains('active')) t.click();
    }, job);
  };
  const typeIn = async (id, txt) => {
    await T.E((id) => { const el = document.getElementById(id); el.value = ''; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ block: 'center' }); }, id);
    await p.focus('#' + id); await p.keyboard.type(txt); await T.E((id) => document.getElementById(id).blur(), id); await p.waitForTimeout(150);
    return T.E((id) => document.getElementById(id).value, id);
  };
  const want = (n, got, w) => { console.log(n + ': ' + got + (got === w ? '' : '   <- want ' + w)); if (got !== w) fails.push(n + ': got ' + got + ', want ' + w); };
  await fresh('24-017'); want('1. job 24-017, 97.27', await typeIn('startStakeElev', '97.27'), '2597.27');
  await fresh('25-100'); want('2. new job 25-100, 97.27', await typeIn('startStakeElev', '97.27'), '97.27');
  await fresh(''); want('3. no job, 97.27', await typeIn('startStakeElev', '97.27'), '97.27');
  await fresh('25-100'); await typeIn('startStakeElev', '1097.50'); want('4. job 25-100 after 1097.50, 98.10', await typeIn('endStakeElev', '98.10'), '1098.10');
  await fresh('25-100'); await typeIn('startStakeElev', '1097.50');
  await T.E(() => { const el = document.getElementById('saJobNumber'); el.value = '24-017'; el.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('startStakeElev').value = ''; });
  want('5. job changed to 24-017 on the form, 97.27', await typeIn('endStakeElev', '97.27'), '2597.27');
  await T.done(fails);
})();
