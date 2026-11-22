# firstweek_web_nov22 patch 04: a refused sign-in ("Account In Use") says what to do.
# Server facts (pb_session_gate / pb_device_seen, read-only): a device holds the login while it checked in within the
# last 5 minutes (or holds an open confined space permit). Logging out there ends its session, so the login is free at
# once; just closing the app frees it 5 minutes after its last check-in. The message says both.
# Usage: python3 04_in_use_msg.py in.html out.html
import sys, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:120]); s = s.replace(old, new)
def raw(k, v):
    return (json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)).replace('</', '<\\/')
OLD = 'This account is in use on another device right now. Try again in 5 minutes.'
NEW = 'This account is in use on another device right now. Log out there, or close the app there and try again in 5 minutes.'
rep("in_use: '" + OLD + "',", "in_use: '" + NEW + "',")
rep(raw(OLD, 'Esta cuenta se está usando en otro aparato ahorita. Vuelva a intentar en 5 minutos.'),
    raw(NEW, 'Esta cuenta se está usando en otro aparato ahorita. Cierre la sesión ahí, o cierre la app ahí y vuelva a intentar en 5 minutos.'))
open(dst, 'w', encoding='utf-8').write(s)
print('04_in_use_msg: ok')
