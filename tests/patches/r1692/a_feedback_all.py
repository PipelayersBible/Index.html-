import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.92 (owner, Nov 17): the Feedback pill shows for every signed-in account, not only beta ones (the server already takes
# feedback from any account; Settings > Report a problem is unchanged).
rep("""      if (!pill && beta) { pill = document.createElement('button');""", """      const fbOn = !!sbUser; /* r16.92: every signed-in account */
      if (!pill && fbOn) { pill = document.createElement('button');""")
rep("""      if (pill) pill.hidden = !beta || ['appProblem',""", """      if (pill) pill.hidden = !fbOn || ['appProblem',""")
open(out, 'w', encoding='utf-8').write(s)
