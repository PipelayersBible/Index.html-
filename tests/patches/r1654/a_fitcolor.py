import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
css = """<style>
/* r16.54: Light: a fitting hub's orange (#A65300) read as a lighter shade of the hub brown (#775600); a clear orange now */
:where(html.pb-light) #pbApp :is(#screen-input, #screen-results) { --pb-fit-c: #E8590C; }
</style>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + css + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.53 · 2026-11-16';", "const PB_APP_BUILD = 'r16.54 · 2026-11-16';")
assert "r16.54 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
