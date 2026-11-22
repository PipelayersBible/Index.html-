# firstweek_web_nov22 patch 02: the trial line on Home (pbBetaRender).
# * One word: "Trial" / "Trial ended" in the chip (was "Beta" / "Beta ended"); "After the trial:" in the office's price line.
# * During the trial the day countdown shows only to the office (company account, PMs/superintendents: pbBresCanSee).
#   Foremen and pipelayers see no trial line at all.
# * When the trial has ended, a crew member (not the company account, no individual plan, nothing requested) sees only:
#   "Your company's trial has ended. Your records are safe. Your office decides what's next." No price, no buttons.
#   Removed members and accounts with no company keep the individual offer (those are other branches, unchanged).
# Usage: python3 02_trial_chip_crew_end.py in.html out.html
import sys, json

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:120])
    s = s.replace(old, new)

def raw(k, v):
    return (json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)).replace('</', '<\\/')

def dict_add(pairs):
    i = s.index('id="pbI18nDict">') + 16; d = json.loads(s[i:s.index('</script>', i)])
    for k, _ in pairs: assert k not in d['t'], ('already in the dictionary', k)
    body = ','.join(raw(k, v) for k, v in pairs)
    rep('id="pbI18nDict">{"t":{', 'id="pbI18nDict">{"t":{' + body + ',')

rep("""          const officeNow = !!(sbCachedSubscription && sbCachedSubscription.companyRole === 'Company account');
          if (!ended) line.innerHTML = '<span class="pb-beta-chip">Beta</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>'
            + (officeNow ? '<span class="pb-beta-price">After the beta: ' + pbPriceCo() + ' Start your plan before the beta ends and this price is locked for ' + pbPr().fm + ' months.</span>' : ''); /* pricing_nov20 */""",
    """          const officeNow = !!(sbCachedSubscription && sbCachedSubscription.companyRole === 'Company account');
          const officeSees = officeNow || (typeof window.pbBresCanSee === 'function' && window.pbBresCanSee()); /* firstweek_web_nov22: the countdown is for the office only */
          if (!ended && !officeSees) { line.hidden = true; line.innerHTML = ''; }
          else if (!ended) line.innerHTML = '<span class="pb-beta-chip">Trial</span><span>' + (daysLeft === 1 ? '1 day left' : daysLeft + ' days left') + '</span>'
            + (officeNow ? '<span class="pb-beta-price">After the trial: ' + pbPriceCo() + ' Start your plan before the trial ends and this price is locked for ' + pbPr().fm + ' months.</span>' : ''); /* pricing_nov20 */""")

rep("""              : plan.requested ? pbReqSent(pbReqKind(false))
              : '<span class="pb-beta-price">Your own plan is ' + pbPriceInd() + '.</span><span class="pb-beta-acts"><button type="button" class="pb-btn small" data-plan="company">Company Plan</button></span>' + pbIndPick('data-plan', 'My Own Plan: ');
            line.innerHTML = '<span class="pb-beta-chip">Beta ended</span><span>' + (office ? whatOffice : what) + '</span>' + own;""",
    """              : plan.requested ? pbReqSent(pbReqKind(false))
              : null; /* firstweek_web_nov22: a crew member of a company whose trial ended: no price, no buttons; the office decides */
            line.innerHTML = '<span class="pb-beta-chip">Trial ended</span>' + (own === null ? '<span>Your company\\u2019s trial has ended. Your records are safe. Your office decides what\\u2019s next.</span>'
              : '<span>' + (office ? whatOffice : what) + '</span>' + own);""")

dict_add([
    ('Trial', 'Prueba'),
    ('Trial ended', 'Prueba terminada'),
    ('Your company’s trial has ended. Your records are safe. Your office decides what’s next.',
     'La prueba de su compañía terminó. Sus registros están a salvo. Su oficina decide qué sigue.'),
])

open(dst, 'w', encoding='utf-8').write(s)
print('02_trial_chip_crew_end: ok')
