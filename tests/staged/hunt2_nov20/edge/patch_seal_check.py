# hunt2 (staged, NOT deployed): pb-seal-check says so when the database refuses one of its "what is waiting" calls.
# Until Nov 20 the three todo calls answered 403 (missing GRANTs) and the function logged
# {"seal_check":0,...,"waiting":0,...} 142 times a day: a refusal looked exactly like "nothing to do".
# Now: each refused call is logged with console.error as {"error":"rpc_refused","rpc":...,"status":...}, the summary
# line carries "refused":[...] and the answer is HTTP 500 instead of 204 (so pg_net's response table and the
# function's own invocation list show a failure). A call that works is unchanged.
# usage: python3 patch_seal_check.py <live index.ts> <out index.ts>
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, 'expected 1 match, found %d: %r' % (s.count(a), a[:90]); s = s.replace(a, b)
rep("const empty = () => new Response(null, { status: 204 });\n",
    "const empty = () => new Response(null, { status: 204 });\n"
    "// hunt2: a list call the database refused (403: a missing GRANT; 404: the function is gone; 5xx) is NOT an empty list\n"
    "const refused: { rpc: string; status: number }[] = [];\n"
    "function listOf<T>(name: string, r: { ok: boolean; status: number; data: unknown }): T[] {\n"
    "  if (!r.ok || !Array.isArray(r.data)) { refused.push({ rpc: name, status: r.status }); console.error(JSON.stringify({ error: 'rpc_refused', rpc: name, status: r.status, note: 'nothing was checked for this part' })); return []; }\n"
    "  return r.data as T[];\n"
    "}\n")
rep("  const todo = await rpc('pb_seal_check_todo', { p_limit: 5 });\n  const list = Array.isArray(todo.data) ? todo.data as { id: string; path: string; sha256: string; bytes: number }[] : [];\n",
    "  refused.length = 0;\n  const todo = await rpc('pb_seal_check_todo', { p_limit: 5 });\n  const list = listOf<{ id: string; path: string; sha256: string; bytes: number }>('pb_seal_check_todo', todo);\n")
rep("  const photos = Array.isArray(pt.data) ? pt.data as { name: string; at: string }[] : [];\n",
    "  const photos = listOf<{ name: string; at: string }>('pb_photo_check_todo', pt);\n")
rep("  const days = Array.isArray(dt.data) ? dt.data as { day: string; n: number; sha: string }[] : [];\n",
    "  const days = listOf<{ day: string; n: number; sha: string }>('pb_audit_day_todo', dt);\n")
rep("    await rpc('pb_seal_check_put', { p_seal: sl.id, p_sha: sha, p_bytes: bytes, p_tsa: tsa });\n    n++; if (sha !== sl.sha256) bad++;\n",
    "    const put = await rpc('pb_seal_check_put', { p_seal: sl.id, p_sha: sha, p_bytes: bytes, p_tsa: tsa });\n"
    "    if (!put.ok) { refused.push({ rpc: 'pb_seal_check_put', status: put.status }); console.error(JSON.stringify({ error: 'rpc_refused', rpc: 'pb_seal_check_put', status: put.status })); continue; } // not counted as checked\n"
    "    n++; if (sha !== sl.sha256) bad++;\n")
rep("      await rpc('pb_photo_check_put', { p_name: ph.name, p_sha: sha, p_bytes: buf.byteLength, p_at: ph.at });\n      pn++; if (!ph.name.endsWith(sha + '.jpg')) pbad++;\n",
    "      const put = await rpc('pb_photo_check_put', { p_name: ph.name, p_sha: sha, p_bytes: buf.byteLength, p_at: ph.at });\n"
    "      if (!put.ok) { if (!refused.some((x) => x.rpc === 'pb_photo_check_put')) { refused.push({ rpc: 'pb_photo_check_put', status: put.status }); console.error(JSON.stringify({ error: 'rpc_refused', rpc: 'pb_photo_check_put', status: put.status })); } continue; }\n"
    "      pn++; if (!ph.name.endsWith(sha + '.jpg')) pbad++;\n")
rep("  console.log(JSON.stringify({ seal_check: n, mismatched: bad, waiting: list.length - n, photos_checked: pn, photos_mismatched: pbad, log_days_stamped: dn, log_days_due: days.length }));\n  return empty();\n",
    "  const sum = { seal_check: n, mismatched: bad, waiting: list.length - n, photos_checked: pn, photos_mismatched: pbad, log_days_stamped: dn, log_days_due: days.length };\n"
    "  if (refused.length) { console.error(JSON.stringify({ ...sum, refused })); return new Response(null, { status: 500 }); }\n"
    "  console.log(JSON.stringify(sum));\n  return empty();\n")
rep("  if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();\n",
    "  if (!s.ok) console.error(JSON.stringify({ error: 'rpc_refused', rpc: 'pb_push_svc_cron_secret', status: s.status, note: 'the caller could not be checked, so nothing ran' })); // the caller still gets a plain 204\n"
    "  if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();\n")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
