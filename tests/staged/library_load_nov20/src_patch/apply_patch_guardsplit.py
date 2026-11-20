# apply_patch_guardsplit.py <src_in> <src_out> : the answer checker (gonogo.ts) no longer cuts sentences at "App. B", "Subpart A.", "No. 5", "e.g."
# (it left fragments like "... makes that call on site. B)."). Applies to the live source (b7ad) and to every later build. Exact-once.
import sys, os, shutil
src, out = sys.argv[1], sys.argv[2]
if src != out:
    if os.path.exists(out): shutil.rmtree(out)
    shutil.copytree(src, out)
def rep(f, old, new, n=1):
    p = os.path.join(out, f); s = open(p).read(); assert s.count(old) == n, (f, old[:70], s.count(old)); open(p, 'w').write(s.replace(old, new))
# ---------------- E: gonogo.ts sentence split ----------------
rep('gonogo.ts', '''const splitSentences = (t) =>
    String(t).split(/(?<=[.!?])\\s+|\\n+/).map((x) => x.trim()).filter(Boolean),''', '''// lib7: a period after a short abbreviation or a lone letter ("App. B", "Subpart A.", "No. 5", "e.g.") does not end a sentence, and
// a piece that is only a few characters ("B).", "A.") is glued back to the sentence before it. Every piece stays an exact substring of
// the answer (the replace below needs that).
const ABBR_END = /(?:\\b(?:App|Apps|Appx|No|Nos|Sec|Secs|Fig|Figs|Vol|Pt|Pts|Ch|Art|Para|Ref|Rev|Ed|Std|Tbl|Div|Subpt|approx|vs|etc|Inc|Co|St|Ave|Dept|Gov|Mr|Mrs|Ms|Dr|Jr|Sr)|\\b[A-Z]|\\b(?:e\\.g|i\\.e|U\\.S|C\\.F\\.R))\\.$/;
const splitSentences = (t) => {
  const out = [];
  for (const line of String(t).split(/\\n+/)) {
    let start = 0;
    for (const m of line.matchAll(/[.!?]\\s+/g)) {
      const end = m.index + 1, piece = line.slice(start, end), next = line.slice(m.index + m[0].length);
      if (ABBR_END.test(piece) || /^[a-z(\\[0-9]/.test(next) || next.trim().length < 6) continue;
      out.push(piece.trim()), start = m.index + m[0].length;
    }
    out.push(line.slice(start).trim());
  }
  return out.filter(Boolean);
},''')
print('guard split patched', out)
