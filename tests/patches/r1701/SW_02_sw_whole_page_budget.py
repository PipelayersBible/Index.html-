import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# perf audit 02 (Nov 17, on r16.97 sw.js) [high on a weak signal: the first open after every release]: network-first
# waited 4 s for the network's HEADERS only. On one bar the headers come back in well under 4 s, so the worker handed
# the page a response that then trickled in for ~50 s (2.4 MB gzipped at 400 kbps): a white screen for 13-16 s and no
# usable app for ~51-60 s, on the first open after each release (and whenever the phone's HTTP cache dropped the page),
# while a good copy sat in the cache. rig/loads2.js scenario C. Fix: the 4 s now covers the WHOLE page. A page that
# arrives whole in 4 s is shown (with signal the phone still gets the newest app, as before; an unchanged app comes back
# as a quick 304 from the HTTP cache, as before); one that doesn't, gets the kept copy at 4 s while the download goes on
# in the background and replaces the copy for the next open. 404 / 5xx, no answer, and supabase-js: unchanged.
rep("""function pbNetFirst(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;
  const net = fetch(req);
  event.waitUntil(net.then((res) => (ok(res) ? pbShellPut(req.url, res.clone()) : null)).catch(() => {}));
  event.respondWith((async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;
    let timer = null;
    const first = await Promise.race([
      net.then((res) => ({ res }), (err) => ({ err })),
      new Promise((r) => { timer = setTimeout(() => r({ late: true }), wait); }),
    ]);""",
"""function pbNetFirst(event, req, page) {
  const ok = page ? pbPageOk : pbLibOk;
  const net = fetch(req);
  // perf audit 02: the app page counts as answered only once ALL of it is here (a good one is read whole, then shown).
  const whole = net.then(async (res) => {
    if (!(page && pbPageOk(res))) { if (ok(res)) await pbShellPut(req.url, res.clone()); return res; }
    const copy = res.clone(), read = res.clone(); // res itself stays unread: with nothing kept it is what is shown, streamed
    const body = await read.blob();
    event.waitUntil(pbShellPut(req.url, copy)); // the copy for the next open is replaced even when this answer comes too late
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
  event.waitUntil(whole.catch(() => {}));
  event.respondWith((async () => {
    const wait = Date.now() < pbSlowUntil ? 0 : PB_NET_WAIT_MS;
    let timer = null;
    const first = await Promise.race([
      whole.then((res) => ({ res }), (err) => ({ err })),
      new Promise((r) => { timer = setTimeout(() => r({ late: true }), wait); }),
    ]);""")
rep("""    if (first.err) throw first.err;
    return net; // nothing kept yet: wait for the network, as without a worker""",
"""    if (first.err) throw first.err;
    return net; // nothing kept yet: the network's own answer, streamed as without a worker (perf audit 02: not the read-whole copy)""")
open(out, 'w', encoding='utf-8').write(s)
