import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# bughunt tonight 01: "Lock Without It" is kept only for the Lock it answered (opts.ai2nd rides on every re-call of that
# Lock); a Lock that stopped (Go Back on the AI check, a photo still processing ...) no longer marks the next record.
rep("""  window.pbLock = async function(opts) {
    if (!lastCalc) return;
    if (pbLockInFlight) return;
""", """  window.pbLock = async function(opts) {
    if (!lastCalc) return;
    if (pbLockInFlight) return;
    if (!(opts && opts.ai2nd)) window._pbAiNo2nd = false; // bughunt: only the Lock "Lock Without It" answered
""")
open(out, 'w', encoding='utf-8').write(s)
