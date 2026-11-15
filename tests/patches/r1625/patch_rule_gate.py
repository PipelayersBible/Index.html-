import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
# r16.25 (Tommy, Nov 14): trench protection questions ("do we need shoring", "ok without a box") go to Ask, which
# now answers with the OSHA rule and leaves the site call to the competent person; entry, gas and permit calls stay local.
rep("""    /\\b(do|does|would|will|should)\\s+(i|we|you|they|it|my|our|this|that|the)\\b.{0,30}\\b(need|require|have to have|got to have)\\b.{0,20}\\b(shor\\w*|a (trench )?box|shield|slop\\w*|bench\\w*|protective system|protection)\\b/,
    /\\b(ok|okay|fine|safe|alright|good|legal|allowed)\\b.{0,20}\\bwithout (a |any |the )?(trench )?(box|shoring|shield|sloping|benching|protection|protective system)\\b/,
    /\\bwithout (a |any |the )?(trench )?(box|shoring|shield|protection)\\b.{0,20}\\b(ok|okay|fine|safe|alright|allowed)\\b/,
""","")
open(sys.argv[2],'w').write(s); print('ok')
