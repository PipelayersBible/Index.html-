# survey s2: the cutsheet reader takes the cut/fill written with a space or as a word: "C 4.60", "CUT 4.60", "F 0.03",
# "FILL 0.03", "C. 4.60" (many sheets and PDF text print it that way). Only a LETTER or WORD decides cut or fill: a bare
# "+0.03" / "-4.60" is still "couldn't be read", because sheets use + and - both ways. The rewrite is anchored right
# before the last three numbers (stake elevation, northing, easting), so nothing in the description can be taken for it,
# and a row with a second cut/fill in the middle (two rows run together) is still refused.
# python3 s2_cutsheet_cut_fill_words.py in.html out.html  (applies alone on r17.13)
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

rep("""    const m = trimmed.match(new RegExp('^((?:\\\\d{1,3}(?:,\\\\d{3})+|\\\\d+)[A-Za-z]?)\\\\s+(.+?)\\\\s+' + N + '\\\\s+([CF][+-]?\\\\d+\\\\.\\\\d+)\\\\s+' + N + '\\\\s+' + N + '\\\\s+' + N + '\\\\s*$'));""",
"""    const cfNorm = trimmed.replace(new RegExp('\\\\s(CUT|FILL|C|F)\\\\.?\\\\s*([+-]?\\\\d+\\\\.\\\\d+)((?:\\\\s+' + N + '){3}\\\\s*)$', 'i'), (m0, w, v, rest) => ' ' + w.charAt(0).toUpperCase() + v + rest); // survey s2: "C 4.60" / "CUT 4.60" -> "C4.60"
    const m = cfNorm.match(new RegExp('^((?:\\\\d{1,3}(?:,\\\\d{3})+|\\\\d+)[A-Za-z]?)\\\\s+(.+?)\\\\s+' + N + '\\\\s+([CF][+-]?\\\\d+\\\\.\\\\d+)\\\\s+' + N + '\\\\s+' + N + '\\\\s+' + N + '\\\\s*$'));""")

rep("""    if (/(^|\\s)[CF][+-]?\\d+\\.\\d+(?=\\s|$)/.test(midPart)) return null; // two rows run together: listed as unreadable""",
"""    if (/(^|\\s)(?:CUT|FILL|C|F)\\.?\\s*[+-]?\\d+\\.\\d+(?=\\s|$)/i.test(midPart)) return null; // two rows run together: listed as unreadable (survey s2: "C 4.60" / "CUT 4.60" too)""")

rep("""The numbers need a decimal point (2394.00, not 2394).""",
"""The numbers need a decimal point (2394.00, not 2394). Cut or fill can be written C4.60, C 4.60 or CUT 4.60 (F, FILL the same); a bare +4.60 or &minus;4.60 isn&rsquo;t read, because sheets use + and &minus; both ways.""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('s2 ok')
