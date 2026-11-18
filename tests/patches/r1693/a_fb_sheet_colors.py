import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.93 (owner, Nov 17): the Feedback sheet used a colour token the app doesn't define (--pb-bg), so in dark mode it was
# a white sheet with light text (title, Idea and the help line unreadable). It now uses the app's raised-surface token,
# with inputs on the canvas colour, in both themes.
rep(""".pb-fb-card { width: 100%; max-width: 560px; box-sizing: border-box; background: var(--pb-bg, #fff);""",
    """.pb-fb-card { width: 100%; max-width: 560px; box-sizing: border-box; background: var(--pb-raised, #fff); border-top: 1px solid var(--pb-divider, #ccc);""")
rep("""border: 1.5px solid var(--pb-divider, #ccc); background: var(--pb-surface, #fff); color: inherit; }
.pb-fb-card textarea { min-height: 120px;""", """border: 1.5px solid var(--pb-divider, #ccc); background: var(--pb-canvas, #fff); color: inherit; }
.pb-fb-card textarea::placeholder, .pb-fb-card input::placeholder { color: var(--pb-text-2, #555); opacity: 1; }
.pb-fb-card textarea { min-height: 120px;""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
rep('''placeholder="Your phone (optional), if you’re OK with a call"''', '''placeholder="Phone for a call back (optional)"''')
open(out, 'w', encoding='utf-8').write(s)
