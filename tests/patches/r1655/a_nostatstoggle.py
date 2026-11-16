import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:80])
    s = s.replace(a, b)
# every run counts in Stats and has its notes box: the old on/off box stays checked and out of sight
rep("""  window.pbToggleStatsArchiveFields = function() {
    const on = document.getElementById('saEnableToggle').checked;""",
"""  window.pbToggleStatsArchiveFields = function() {
    { const tg = document.getElementById('saEnableToggle'); if (tg && !tg.checked) tg.checked = true; } /* r16.55: the app tracks every run; no Count in Stats box */
    const on = document.getElementById('saEnableToggle').checked;""")
rep("""  function saFieldsEnabled() {
    return document.getElementById('saEnableToggle').checked;""",
"""  function saFieldsEnabled() {
    const tg = document.getElementById('saEnableToggle'); if (tg && !tg.checked) { tg.checked = true; try { window.pbToggleStatsArchiveFields(); } catch (e) {} } /* r16.55 */
    return true;""")
rep("if (lead.parentNode !== lr) lr.appendChild(lead); if (rb.parentNode !== lr) lr.appendChild(rb); }",
    "if (lead.parentNode !== lr) lr.appendChild(lead); if (rb.parentNode !== lr) lr.appendChild(rb); }\n"
    "      { var jnF = document.getElementById('saJobNumber'), fJ0 = jnF && jnF.closest('.pb-field'), lr0 = document.getElementById('pbJobLastRow'); /* r16.55: company: From your last run · Clear sits above the job */\n"
    "        if (fJ0 && lr0 && wrap) { var top = fJ0.parentNode !== wrap ? fJ0 : wrap.firstChild; if (top && lr0.nextSibling !== top && lr0 !== top) top.parentNode.insertBefore(lr0, top); } }")
css = """<style>
/* r16.55: no Count in Stats box: every run is tracked, the notes box is always there */
/* Light: hubs back to the app's gold (the brand text color #775600 had been used, which reads dark brown) */
html.pb-light #pbApp#pbApp :is(#screen-input, #screen-results) { --hub-c: var(--pbl-yellow, #F5BF1F); }
html.pb-light #pbApp#pbApp #screen-results #resultsBody tr.pb-hubrow { --pb-rs-edge: var(--pbl-yellow, #F5BF1F); } /* Results hub rows: the same gold */
/* point stripes 50% thicker (4px -> 6px) */
#pbApp#pbApp#pbApp #screen-input :is(.pb-section.start, .pb-section.hub, .pb-section.end, .pb-hub-card, .pb-xing-card, .pb-add-hub-section, .pb-add-xing-section) { border-left-width: 6px !important; }
/* a fitting hub: what the card colors (photo count, outlined boxes) takes the fitting orange */
#pbApp#pbApp #screen-input .pb-hub-card.pb-hub-fit .pb-photo-count { color: var(--pb-fit-c); }
#pbApp#pbApp #screen-input .pb-hub-card.pb-hub-fit .pb-ai-filled { box-shadow: 0 0 0 2px var(--pb-fit-c) !important; }
#pbApp#pbApp #screen-input .pb-field:has(> label > #saEnableToggle), #pbApp#pbApp #screen-input #saDisabledNote { display: none !important; }
</style>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + css + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.54 · 2026-11-16';", "const PB_APP_BUILD = 'r16.55 · 2026-11-16';")
assert "r16.55 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
