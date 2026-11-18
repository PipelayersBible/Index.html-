import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# cs2 02: the Feedback pill (r16.92) floated over the Active Permit screen, on top of the emergency panel's dispatcher
# script. Not shown on that screen; Feedback stays on every other screen.
rep("""['appProblem', 'appProblems', 'login', 'auth'].includes(typeof pbCurrentScreen""",
    """['appProblem', 'appProblems', 'login', 'auth', 'confinedActive'].includes(typeof pbCurrentScreen""")
open(out, 'w', encoding='utf-8').write(s)
