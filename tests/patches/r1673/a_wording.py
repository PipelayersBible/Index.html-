import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""'. Want your own plan to keep the AI tools?</span>'""", """'. Would you like to sign up for an individual plan?</span>'""")
rep("""'<span>You have your own plan, so your AI tools keep working.</span>'""", """'<span>You have an individual plan.</span>'""")
open(sys.argv[2],'w').write(s)
