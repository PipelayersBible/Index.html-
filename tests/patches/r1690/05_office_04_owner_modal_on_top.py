# 04: the Feedback / Beta Accounts sheets (.pb-fb) sat at z-index 60, above the app's dialog (#pbModalOverlay, 50), so
# the Make Paid confirmation, "Not Changed" alerts, and any alert raised while the Feedback sheet is open (a permit
# alarm included) were drawn underneath. Sheets go below the dialog, as the help sheet already does (45).
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep(""".pb-fb { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.5);""",
""".pb-fb { position: fixed; inset: 0; z-index: 48; /* bughunt 04: below the app's dialog (50), above the bars and sheets (<= 47) */ background: rgba(0,0,0,.5);""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
