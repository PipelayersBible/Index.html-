# firstweek_web_nov22 patch 03: Log In is no longer a dead end for someone with no account.
# Adds, under "Join a Crew or Use a Code": "No account yet? Start a free 30-day trial" -> https://pipelayersbible.com/#start
# (#start is the trial form on the website; #trial is the explainer above it. Both ids exist on the live site.)
# Usage: python3 03_login_trial_link.py in.html out.html
import sys, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:120]); s = s.replace(old, new)
def raw(k, v):
    return (json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)).replace('</', '<\\/')
def dict_add(pairs):
    i = s.index('id="pbI18nDict">') + 16; d = json.loads(s[i:s.index('</script>', i)])
    for k, _ in pairs: assert k not in d['t'], ('already in the dictionary', k)
    rep('id="pbI18nDict">{"t":{', 'id="pbI18nDict">{"t":{' + ','.join(raw(k, v) for k, v in pairs) + ',')

rep('<button type="button" class="pb-btn secondary" id="loginJoinBtn" onclick="pbObOpenCode()">Join a Crew or Use a Code</button></div><!-- onboard2 -->',
    '<button type="button" class="pb-btn secondary" id="loginJoinBtn" onclick="pbObOpenCode()">Join a Crew or Use a Code</button></div><!-- onboard2 -->\n'
    '    <p class="pb-help" id="loginTrialNote" style="text-align:center;margin:14px 16px 0;">No account yet? <a href="https://pipelayersbible.com/#start" target="_blank" rel="noopener">Start a free 30-day trial</a></p><!-- firstweek_web_nov22 -->')
dict_add([('No account yet? <1>Start a free 30-day trial</1>', '¿Todavía no tiene cuenta? <1>Empiece una prueba gratis de 30 días</1>')])
open(dst, 'w', encoding='utf-8').write(s)
print('03_login_trial_link: ok')
