# 07: Beta Accounts: a beta company with no end date is ended (as the server treats it), not "Beta · null days left".
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""left = beta && c.trial_ends_at ? Math.ceil((new Date(c.trial_ends_at) - Date.now()) / 86400000) : null, ended = beta && left !== null && left <= 0;""",
"""left = beta && c.trial_ends_at ? Math.ceil((new Date(c.trial_ends_at) - Date.now()) / 86400000) : null, ended = beta && (left === null || !(left > 0)); /* bughunt 07: no end date = ended, as on the server */""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
