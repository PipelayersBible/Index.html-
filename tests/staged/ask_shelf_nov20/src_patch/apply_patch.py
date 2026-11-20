#!/usr/bin/env python3
# ask_shelf_nov20: makes the shelf-searching Ask source from the state-aware Ask source (ask_state_nov20, as it stands in
# /home/claude/ask_v24/src). Exact-once replacements; adds src/shelf.ts. Touches ask.ts and tools.ts only.
#   python3 apply_patch.py <src dir in> <src dir out>      (in and out may be the same folder)
import sys, os, shutil
SRC, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
if os.path.abspath(SRC) != os.path.abspath(OUT):
    if os.path.exists(OUT): shutil.rmtree(OUT)
    shutil.copytree(SRC, OUT)
def patch(name, reps):
    p = os.path.join(OUT, name); s = open(p).read()
    for old, new in reps:
        assert s.count(old) == 1, f'{name}: expected exactly once, found {s.count(old)}: {old[:70]!r}'
        s = s.replace(old, new)
    open(p, 'w').write(s)

patch('ask.ts', [
  # 1 import
  ('import { addressState, okState, resolveState, stateLines, stateSearch } from "./state.ts";\n',
   'import { addressState, okState, resolveState, stateLines, stateSearch } from "./state.ts";\n'
   'import { SHELF_FIRST, shelfSearch, withShelf } from "./shelf.ts";\n'),
  # 2 the shelf search starts the moment the job's state is settled, beside the document search: it adds no wait
  ('  let cityState = "", jobState = null;\n',
   '  let cityState = "", jobState = null, shelfP = Promise.resolve([]); // ask_shelf: the deep library\'s excerpts (shelf.ts)\n'),
  ('      if (sr?.error || !sr?.data?.ok) return [];\n      const row =',
   '      if (sr?.error || !sr?.data?.ok) return shelfP = shelfSearch(s.admin, q, st.code, SHELF_FIRST), [];\n      const row ='),
  ('        jobState = st.code;\n        return docsSearch(q);\n',
   '        jobState = st.code;\n        shelfP = shelfSearch(s.admin, q, st.code, SHELF_FIRST); // same moment as the document search\n        return docsSearch(q);\n'),
  # 3 its best excerpts go beside the core hits, inside the same 9,000 characters
  ('    usage.stateDropped = ss.dropped, usage.stateOwn = ss.own, usage.stateDep = ss.dependent;\n',
   '    usage.stateDropped = ss.dropped, usage.stateOwn = ss.own, usage.stateDep = ss.dependent;\n'
   '    // ask_shelf: the deep library\'s best excerpts for this job\'s state (and federal), beside the core hits. They are short\n'
   '    // and sit inside the same 9,000 characters: the core hits give up only the room the shelf excerpts take.\n'
   '    const shelf = analysis || plan ? [] : (await shelfP).filter((h) => !hits.some((x) => x.id === h.id || x.title === h.title)).slice(0, SHELF_FIRST.k),\n'
   '      shelfChars = shelf.reduce((a, h) => a + h.text.length, 0), shelfOwn = shelf.filter((h) => h.state !== "US").length;\n'
   '    usage.shelf = shelf.length;\n'),
  ('      ex = mergeExcerpts(phone, hits, 9e3),\n      hitText = new Map(hits.map((h) => [h.id, h.text])),\n',
   '      ex = withShelf(mergeExcerpts(phone, hits, 9e3 - shelfChars), shelf),\n      hitText = new Map([...hits, ...shelf].map((h) => [h.id, h.text])),\n'),
  # 4 a shelf excerpt of the job state's own rule counts as "the library has this state's rule"
  ('        analysis || plan ? "" : stateLines(st, ss.dependent, ss.own),\n',
   '        analysis || plan ? "" : stateLines(st, ss.dependent === "plan" && shelfOwn ? !0 : ss.dependent, ss.own + shelfOwn),\n'),
  # 5 the model's own search gets it too
  ('            docsSearch,\n            nextRef: () => ++dataN,\n',
   '            docsSearch,\n            shelfSearch: (text, o) => shelfSearch(s.admin, text, st.code, o),\n            nextRef: () => ++dataN,\n'),
  # 6 log line
  ('        state_own: usage.stateOwn || 0,\n', '        state_own: usage.stateOwn || 0,\n        shelf: usage.shelf || 0,\n'),
])

patch('tools.ts', [
  ('        let kbChars = 0, kbN = 0;\n',
   '        // ask_shelf: the deep library too (this job\'s state + federal). Its excerpts take up to 2 of the same 5 places\n'
   '        // and the same 7,000 characters; they are listed after the core ones.\n'
   '        const shelf = lib === "app" || !cx.shelfSearch ? [] : await cx.shelfSearch(q, { ...SHELF_TOOL, coll: lib === "osha" ? ["osha"] : null });\n'
   '        let kbChars = shelf.reduce((a, h) => a + h.text.length, 0), kbN = shelf.length;\n'),
  ('              }) ${h.title}: ${h.text.slice(0, 1800)}`,\n            );\n        }\n      }\n',
   '              }) ${h.title}: ${h.text.slice(0, 1800)}`,\n            );\n        }\n'
   '        for (const h of shelf) {\n'
   '          const n = cx.nextExcerpt();\n'
   '          cx.sources.push({ n, kind: "kb", title: h.title, lib: h.lib, source: h.source, url: h.url, verbatim: h.verbatim, id: h.id, _text: h.text }),\n'
   '            out.push(`[${n}] (${h.verbatim ? "OSHA VERBATIM: " + h.source : h.lib + " library: " + h.source}) ${h.title}: ${h.text}`);\n'
   '        }\n      }\n'),
])
# the import in tools.ts: beside its state.ts import
p = os.path.join(OUT, 'tools.ts'); s = open(p).read()
i = s.index('from "./state.ts";'); j = s.index('\n', i) + 1
assert s.count('from "./state.ts";') == 1
s = s[:j] + 'import { SHELF_TOOL } from "./shelf.ts";\n' + s[j:]
open(p, 'w').write(s)
shutil.copy(os.path.join(HERE, 'shelf.ts'), os.path.join(OUT, 'shelf.ts'))
print('patched ask.ts (9 spots), tools.ts (3 spots), added shelf.ts ->', OUT)
