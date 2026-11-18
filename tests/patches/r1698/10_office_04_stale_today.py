import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# office2 04: a saved copy from an earlier day (no signal, a page left open overnight) must not call that day "today".
rep("""  function pbProdJobView(plan, sums) {""",
"""  function pbProdTodayOf(D, j) { /* office2 04: the copy's "today" is an earlier day: nothing is reported today in it */
    const t = D && D.today ? String(D.today).slice(0, 10) : '';
    if (!j || !t || t === pbTkToday()) return j;
    return Object.assign({}, j, { reporters_today: 0, cats: Array.isArray(j.cats) ? j.cats.map(c => c && typeof c === 'object' ? Object.assign({}, c, { today: 0 }) : c) : j.cats });
  }
  window.pbProdTodayOf = pbProdTodayOf;
  function pbProdJobView(plan, sums) {""")
rep("""    const D = pbPd.data, jobs = D && Array.isArray(D.jobs) ? D.jobs.filter(j => j && typeof j === 'object') : null;
    let s = '';
    if (pbPd.busy && !jobs) s = 'Loading company production…';""",
"""    const D = pbPd.data, jobs = D && Array.isArray(D.jobs) ? D.jobs.filter(j => j && typeof j === 'object').map(j => pbProdTodayOf(D, j)) : null; /* office2 04 */
    let s = '';
    if (pbPd.busy && !jobs) s = 'Loading company production…';""")
rep("""        h = shown.map((j, i) => pbCxJobCard(j, i, L, A)).join('')""",
    """        h = shown.map((j, i) => pbCxJobCard(pbProdTodayOf(D.data, j), i, L, A)).join('') /* office2 04 */""")
rep("""  function pbCxHeroHtml(C) {
    const job = pbPj.job, D = pbPj.data;""",
"""  function pbCxHeroHtml(C) {
    const job = pbPj.job, D = pbProdTodayOf(pbPj.data, pbPj.data); /* office2 04 */""")
rep("""    const job = pbPj.job, D = pbPj.data;
    if (!job) { head.innerHTML = ''; body.innerHTML = ''; return; }""",
"""    const job = pbPj.job, D = pbProdTodayOf(pbPj.data, pbPj.data); /* office2 04 */
    if (!job) { head.innerHTML = ''; body.innerHTML = ''; return; }""")
open(out, 'w', encoding='utf-8').write(s)
