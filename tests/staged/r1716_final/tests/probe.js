const R = '/home/claude/index.html-/tests/rig/';
const boot = require(R + 'boot');
(async () => {
  for (const [nm, init] of [['co', require(R + 'co')], ['co_fm', require(R + 'co_fm')], ['co_pl', require(R + 'co_pl')], ['co+mgr', require(R + 'co') + require(R + 'mgr')]]) {
    const { b, p } = await boot(process.env.PB_URL, { init });
    const r = await p.evaluate(() => { try { return JSON.stringify({ s: sbCachedSubscription, u: !!sbUser }); } catch (e) { return 'ERR ' + e.message; } });
    console.log(nm, r.slice(0, 400)); await b.close();
  }
})();
