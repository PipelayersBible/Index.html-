import sys, json, re
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# 1. the state the phone is in, from the photo stamp's address lookup (kept 12 hours)
rep("        var s = [st, city, stz].filter(Boolean).join(', '); G.addr.set(k, s || null); return s || null;",
    "        var s = [st, city, stz].filter(Boolean).join(', '); G.addr.set(k, s || null);\n        try { var code = (a['ISO3166-2-lvl4'] || '').replace(/^US-/, ''); if (/^[A-Z]{2}$/.test(code) && /^US-/.test(a['ISO3166-2-lvl4'] || '')) localStorage.setItem('pbHereState', JSON.stringify({ s: code, at: Date.now() })); } catch (e) {} /* r16.79 */\n        return s || null;")
rep("  function wait(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }",
    "  window.pbHereState = function () { try { var o = JSON.parse(localStorage.getItem('pbHereState') || 'null'); return o && /^[A-Z]{2}$/.test(o.s) && Date.now() - o.at < 12 * 3600000 ? o.s : null; } catch (e) { return null; } }; /* r16.79 */\n  function wait(p, ms) { return Promise.race([p, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]); }")
# 2. cave-in protection depth by the job's state (strictest when not known)
rep("""  const PB_DEPTH_FLAG_TEXT = 'Stake data puts the trench bottom 5 ft or deeper. OSHA requires "an adequate protective system" (sloping, benching or shoring) unless the excavation is "made entirely in stable rock" (1926.652(a)(1)).';""",
    """  // r16.79 (Tommy, Nov 17): shoring follows the state the job is in (where this phone is); not known: the strictest (WA, 4 ft)
  function pbCaveTrig() { const st = typeof window.pbHereState === 'function' ? window.pbHereState() : null; return { ft: st && st !== 'WA' ? 5 : 4, state: st }; }
  function pbDepthFlagText(e) {
    const ft = e && (e.caveFt === 4 || e.caveFt === 5) ? e.caveFt : 5, st = e && e.caveFt ? e.caveState || null : null;
    const fed = 'OSHA requires "an adequate protective system" (sloping, benching or shoring) unless the excavation is "made entirely in stable rock" (1926.652(a)(1)).';
    if (ft === 4 && st === 'WA') return 'Stake data puts the trench bottom 4 ft or deeper. Washington requires cave-in protection (sloping, benching, shoring or a shield) from 4 ft (WAC 296-155-657), and a written trench work plan. The competent person decides on site.';
    if (ft === 4) return 'Stake data puts the trench bottom 4 ft or deeper. The phone didn\\u2019t know which state the job is in, so the app used the strictest rule: Washington requires cave-in protection from 4 ft (WAC 296-155-657); federal OSHA and most states from 5 ft (1926.652(a)(1)). The competent person decides on site.';
    return 'Stake data puts the trench bottom 5 ft or deeper. ' + fed + (st === 'CA' ? ' California also requires a Cal/OSHA permit for trenches 5 ft or deeper that anyone enters (8 CCR 341).' : '');
  }
  const PB_DEPTH_FLAG_TEXT = pbDepthFlagText(null);""")
rep("    if (maxDepth >= 5) {\n      const depthWork",
    "    const caveNow = pbCaveTrig(); /* r16.79 */\n    if (maxDepth >= caveNow.ft) {\n      const depthWork")
rep("Trench bottom up to ${maxDepth.toFixed(1)} ft. Over 5 ft, OSHA requires sloping, benching or shoring unless in stable rock (1926.652(a)(1)).",
    "Trench bottom up to ${maxDepth.toFixed(1)} ft. ${caveNow.state === 'WA' ? 'From 4 ft, Washington requires sloping, benching, shoring or a shield (WAC 296-155-657).' : caveNow.state ? 'From 5 ft, OSHA requires sloping, benching or shoring unless in stable rock (1926.652(a)(1)).' + (caveNow.state === 'CA' ? ' California also requires a Cal/OSHA trench permit at 5 ft (8 CCR 341).' : '') : 'The job\\u2019s state isn\\u2019t known on this phone, so the strictest rule is used: Washington requires protection from 4 ft; federal OSHA and most states from 5 ft (1926.652(a)(1)).'}")
rep("calc.capabilityNotes.length === 0 && maxDepth < 5 && !xingWarns.length)", "calc.capabilityNotes.length === 0 && maxDepth < caveNow.ft && !xingWarns.length)")
rep("    const depthFlagged = getMaxStakeCutDepth().maxDepth >= 5;\n    // Captured BEFORE",
    "    const caveLock = pbCaveTrig(); /* r16.79 */\n    const depthFlagged = getMaxStakeCutDepth().maxDepth >= caveLock.ft;\n    // Captured BEFORE")
rep("    recordArchiveEntry(calc, lockTime, cfv, photoCount, depthFlagged);",
    "    recordArchiveEntry(calc, lockTime, cfv, photoCount, depthFlagged);\n    try { runArchive[0].caveFt = caveLock.ft; runArchive[0].caveState = caveLock.state; } catch (e) {} /* r16.79: the rule the flag used */")
rep("const depthFlagged = Math.max(getMaxStakeCutDepth().maxDepth, extraDepthCheck || 0) >= 5;",
    "const depthFlagged = Math.max(getMaxStakeCutDepth().maxDepth, extraDepthCheck || 0) >= (entry.caveFt === 4 ? 4 : 5);")
rep("pbWcHTML(entry, 'depth', 'Trench 5 ft or Deeper', escapeHtml(PB_DEPTH_FLAG_TEXT),",
    "pbWcHTML(entry, 'depth', 'Trench ' + (entry.caveFt === 4 ? 4 : 5) + ' ft or Deeper', escapeHtml(pbDepthFlagText(entry)),")
rep("if (entry.depthFlagged) lines.push('⚠ ' + PB_DEPTH_FLAG_TEXT);", "if (entry.depthFlagged) lines.push('⚠ ' + pbDepthFlagText(entry));")
# 3. heat talk: the strictest state rules
m = re.search(r'(<script type="application/json" id="pbTalksLib">)(.*?)(</script>)', s, re.S)
raw = m.group(2)
old = '"Take rest breaks in shade or a cool place, more often on hot days or during heavy work."'
assert raw.count(old) == 1
new = old + ', "State heat rules (follow the strictest you work under): at least 1 quart of water per person per hour for the whole shift; shade up from 80°F (from 52°F in nonbreathable suits in Washington); high-heat steps from 90°F (Washington, Oregon, Maryland) or 95°F (California): watch each other, check in by radio, pre-shift reminder; rest at least 10 minutes every 2 hours from 90°F and 15 minutes every hour from 100°F (Washington, Maryland); anyone who asks gets a cool-down rest of at least 5 minutes in the shade (California); a new worker is watched closely for the first 14 days."'
raw = raw.replace(old, new)
oldref = '"State heat standards where they apply (California: Title 8 CCR 3395, outdoor heat illness prevention)"'
assert raw.count(oldref) == 1
raw = raw.replace(oldref, '"State heat standards where they apply: California Title 8 CCR 3395; Washington WAC 296-62-095; Oregon OAR 437-002-0156 and 437-004-1131; Maryland COMAR 09.12.32"')
json.loads(raw)
s = s[:m.start(2)] + raw + s[m.end(2):]
# 4. education page: the alarm defaults line
rep("(O2 19.5%–23.5%, LEL 10%, H2S 10 ppm, CO 35 ppm)", "(O2 19.5%–23.5%, LEL 10%, H2S 10 ppm, CO 25 ppm)")
open(out, 'w', encoding='utf-8').write(s); print('ok')
s = open(out, encoding='utf-8').read()
def rep2(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)
rep2("run report(s) had a trench depth flag (\\u22655 ft indicated). ", "run report(s) had a trench depth flag (cave-in protection depth reached). ")
rep2("'<span class=\"pb-arch-alert depth\">Trench ≥5 ft — protective system required (OSHA)</span>'", "'<span class=\"pb-arch-alert depth\">Trench ≥' + (e.caveFt === 4 ? 4 : 5) + ' ft — protective system required' + (e.caveFt === 4 ? '' : ' (OSHA)') + '</span>'")
open(out, 'w', encoding='utf-8').write(s); print('ok2')
