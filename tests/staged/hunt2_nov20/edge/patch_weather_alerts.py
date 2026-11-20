# hunt2 (staged, NOT deployed): weather-alerts says so when the database refuses pb_wx_due.
# Until Nov 20 pb_wx_due answered 403 and every run logged {"runs":0,...,"pushes":0,"sent":0}: no alert was ever sent
# and the log looked healthy. Now a refused pb_wx_due / pb_wx_finish is counted ("refused") and logged with
# console.error, and index.ts logs the whole summary as an error when anything was refused.
# usage: python3 patch_weather_alerts.py <live logic.ts> <out logic.ts> <live index.ts> <out index.ts>
#        (get the live files with Supabase get_edge_function weather-alerts; this script changes only the lines below)
import sys
def patch(src, dst, pairs):
    s = open(src, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, 'expected 1 match, found %d: %r' % (s.count(a), a[:90]); s = s.replace(a, b)
    open(dst, 'w', encoding='utf-8').write(s)
patch(sys.argv[1], sys.argv[2], [
 ("export type Counts = { runs: number; jobs: number; locations: number; fetched: number; failed: number; flagged: number; pushes: number; sent: number; dropped: number };",
  "export type Counts = { runs: number; jobs: number; locations: number; fetched: number; failed: number; flagged: number; pushes: number; sent: number; dropped: number; refused?: { rpc: string; status: number }[] };"),
 ("  const runs = due.ok && due.data && due.data.ok && Array.isArray(due.data.runs) ? due.data.runs : [];\n",
  "  const runs = due.ok && due.data && due.data.ok && Array.isArray(due.data.runs) ? due.data.runs : [];\n"
  "  // hunt2: a refused call (403: a missing GRANT, 404, 5xx, no answer) is not \"nothing is due\"\n"
  "  const refuse = (rpc: string, status: number) => { (c.refused = c.refused || []).push({ rpc, status }); (deps.log || console.error)('weather-alerts: ' + rpc + ' was refused (HTTP ' + status + ')'); };\n"
  "  if (!due.ok) refuse('pb_wx_due', due.status);\n"),
 ("    if (fin.ok && fin.data && fin.data.ok) { c.sent += Number(fin.data.sent) || 0; c.dropped += Number(fin.data.dropped) || 0; }\n",
  "    if (fin.ok && fin.data && fin.data.ok) { c.sent += Number(fin.data.sent) || 0; c.dropped += Number(fin.data.dropped) || 0; }\n"
  "    else if (!fin.ok) refuse('pb_wx_finish', fin.status);\n"),
])
if len(sys.argv) > 3:
    patch(sys.argv[3], sys.argv[4], [
     ("    .then((c) => console.log('weather-alerts:', JSON.stringify(c)))\n",
      "    .then((c) => (c.refused && c.refused.length ? console.error : console.log)('weather-alerts:', JSON.stringify(c)))\n"),
     ("  if (!s.ok || !secretMatches(given, typeof s.data === 'string' ? s.data : null)) { console.log('weather-alerts: caller not confirmed'); return empty(); }\n",
      "  if (!s.ok) console.error('weather-alerts: pb_push_svc_cron_secret was refused (HTTP ' + s.status + '), so the caller could not be checked and nothing ran');\n"
      "  if (!s.ok || !secretMatches(given, typeof s.data === 'string' ? s.data : null)) { console.log('weather-alerts: caller not confirmed'); return empty(); }\n"),
    ])
