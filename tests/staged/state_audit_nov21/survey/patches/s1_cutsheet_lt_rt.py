# survey s1: the cutsheet reader takes LT / RT / LEFT / RIGHT offsets, the side written after the number
# ("15.00 LT", "15.00' RT"), "O/S 15.00 RT" and "R15.00". Today those keep the right station but lose the offset AND the
# line tag ("15/SS" -> "Other / Reference"), so an East Coast / DOT-style sheet can't be split into its lines.
# Only the offset words are rewritten to the form the reader already takes ("R 15.00"); stations, elevations and cut/fill
# are untouched. python3 s1_cutsheet_lt_rt.py in.html out.html  (applies alone on r17.13)
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

# 1. a helper next to the parser
rep("""  function parseCutsheetLine(line) {
    const trimmed = line.trim();""",
"""  // survey s1: "LT 15.00", "15.00 LT", "15.00' RT", "O/S 15.00 RT", "R15.00" -> "L 15.00" / "R 15.00", only right after the
  // station (hundreds+feet or decimal) at the start of the text. Nothing else in the row is changed.
  function pbCsSideNorm(t) {
    return String(t).replace(/^(-?\\d+\\+\\d{2}(?:\\.\\d+)?|-?\\d+\\.\\d+)\\s+(?:O\\/?S\\.?\\s*)?(?:(LEFT|RIGHT|LT|RT|L|R)\\.?\\s*(\\d+(?:\\.\\d+)?)'?|(\\d+(?:\\.\\d+)?)'?\\s*(LEFT|RIGHT|LT|RT|L|R)\\.?)(?=\\s|$)/i,
      (m0, sta, s1, d1, d2, s2) => sta + ' ' + String(s1 || s2).charAt(0).toUpperCase() + ' ' + (d1 || d2));
  }
  function parseCutsheetLine(line) {
    const trimmed = line.trim();""")

# 2. the hundreds+feet station forms read the normalized text
rep("""    const staPart = midPart.replace(/^STA\\.?\\s*(?=-?\\d+\\s*\\+\\s*\\d)/i, '').replace(/^(-?\\d+)\\s*\\+\\s*(?=\\d)/, '$1+');""",
"""    const staPart = pbCsSideNorm(midPart.replace(/^STA\\.?\\s*(?=-?\\d+\\s*\\+\\s*\\d)/i, '').replace(/^(-?\\d+)\\s*\\+\\s*(?=\\d)/, '$1+'));""")

# 3. the decimal station form too
rep("""      sm = midPart.match(/^(-?\\d+\\.\\d+)\\s+([LR])\\s+(-?\\d+(?:\\.\\d+)?)(?:\\s+(.*))?$/);""",
"""      sm = pbCsSideNorm(midPart).match(/^(-?\\d+\\.\\d+)\\s+([LR])\\s+(-?\\d+(?:\\.\\d+)?)(?:\\s+(.*))?$/);""")

# 4. the Education page says so
rep("""&ldquo;L 20.00&rdquo; or &ldquo;R 20.00&rdquo; is 20 ft left or right of the line.</div>""",
"""&ldquo;L 20.00&rdquo; or &ldquo;R 20.00&rdquo; is 20 ft left or right of the line. The app reads LT / RT, LEFT / RIGHT, &ldquo;20.00 LT&rdquo; and &ldquo;O/S 20.00 RT&rdquo; the same way. Left and right are looking up-station (the way the stations get bigger).</div>""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('s1 ok')
