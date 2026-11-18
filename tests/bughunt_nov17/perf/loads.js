// Load-time scenarios on a weak link (400 kbps, 400 ms RTT) with CPU throttling.
// usage: node loads.js <variant dir under /tmp/claude-0/audit/perf> <cpu rate>
const P = require('./perf'); const fs = require('fs');
const V = process.argv[2] || 'base', CPU = +process.argv[3] || 4;
const DIR = '/tmp/claude-0/audit/perf/' + V + '/', URL = P.ORIGIN + '/' + V + '/';
const short = (r) => ({ home: r.home, fcp: r.fcp, dcl: r.dcl, respEnd: r.respEnd, ltSum: r.ltSum, ltMax: r.ltMax, sw: r.sw, err: r.err });
(async () => {
  const orig = fs.readFileSync(DIR + 'index.html', 'utf8');
  const out = {};
  try {
    await P.net(P.NET.weak + '&maxage=600');
    const { b, ctx } = await P.launch();
    let p = await P.page(ctx, CPU);
    await P.log(true);
    out.A_cold = short(await P.open(p, URL, 240000));
    out.A_heap = await P.heap(p);
    out.A_req = (await P.log(true)).map((x) => x.p + ':' + x.code + ':' + (x.bytes || 0));
    await p.waitForTimeout(4000);
    out.sw = await P.swReady(p);
    await p.waitForTimeout(3000); await p.close();
    // B: reopen later (HTTP cache expired -> a 304 revalidation through the SW)
    await P.net(P.NET.weak + '&maxage=0'); await P.log(true);
    p = await P.page(ctx, CPU); out.B_warm_304 = short(await P.open(p, URL)); out.B_req = (await P.log(true)).map((x) => x.p + ':' + x.code); await p.close();
    // C: a new build was published since the last open
    fs.writeFileSync(DIR + 'index.html', orig + '\n<!-- new build ' + Date.now() + ' -->\n'); await P.log(true);
    p = await P.page(ctx, CPU); out.C_warm_newbuild = short(await P.open(p, URL, 240000)); out.C_req = (await P.log(true)).map((x) => x.p + ':' + x.code); await p.waitForTimeout(1500); await p.close();
    fs.writeFileSync(DIR + 'index.html', orig);
    // D: lie-fi (bars shown, nothing answers)
    await P.net(P.NET.hang);
    p = await P.page(ctx, CPU); out.D_warm_liefi = short(await P.open(p, URL)); await p.close();
    // E: offline (airplane mode); a fresh SW wait window: wait > 60 s after D first
    await P.net(P.NET.weak);
    await new Promise((r) => setTimeout(r, 61000));
    await ctx.setOffline(true);
    p = await P.page(ctx, CPU); out.E_warm_offline = short(await P.open(p, URL)); await p.close();
    await ctx.setOffline(false);
    await b.close();
  } finally { fs.writeFileSync(DIR + 'index.html', orig); await P.net(P.NET.fast + '&maxage=600'); }
  console.log(JSON.stringify({ V, CPU, out }, null, 1));
})();
