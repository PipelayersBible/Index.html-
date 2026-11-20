#!/usr/bin/env python3
# builds t_loc_form_state_rule_p02.js from the locate_form_nov20 test: the checks p02 changes, plus new ones.
#   python3 make_test.py ../../locate_form_nov20/tests/t_loc_form_state_rule.js t_loc_form_state_rule_p02.js
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:80])
    s = s.replace(a, b)
# Nevada: the message now says when to call
rep(r"""/Nevada allows two renewals on a ticket, and this one has had both\. Call in a new ticket and add it here\./""",
    r"""/Nevada allows two renewals on a ticket, and this one has had both\. Call in a new ticket at least 2 working days before this one runs out, and add it here\./""")
# Utah: now asks for the new number too (the same number typed again is accepted)
rep("""  await p.fill('#locRen',d0);await p.dispatchEvent('#locRen','change');
  await p.click('#locSave');await p.waitForTimeout(1500);
  ok((await srvT(p,T4)).exp===await day(p,25)""",
    """  await p.fill('#locRen',d0);await p.dispatchEvent('#locRen','change');
  ok(await has(p,'locNo')&&await val(p,'locNo')==='','Utah: asks for the new ticket number (Blue Stakes: an Update has a different number)');
  await p.fill('#locNo','B2611-004');
  await p.click('#locSave');await p.waitForTimeout(1500);
  ok((await srvT(p,T4)).exp===await day(p,25)""")
rep("""/counts a renewal from the old expiry/.test(sheet),""", """/counts a renewal from the old expiry\\. It asks for the new ticket number\\./.test(sheet),""")
# Georgia, Virginia, Michigan, Iowa: the number box; Colorado, California, Nevada still none
rep("""  await state(p,'IA');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
""", """  for(const [c,nm] of [['GA','Georgia'],['VA','Virginia'],['MI','Michigan']]){await state(p,c);await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
    ok(await has(p,'locNo')&&await val(p,'locNo')===''&&/New ticket number/.test(await txt(p,'locForm')),nm+': Renew asks for the new ticket number');
    await p.click('#locCancel');await p.waitForTimeout(200);}
  const tbl=await p.evaluate(()=>{const t=window.__debugLocRen.table;return Object.keys(t).filter(k=>t[k].no).sort().join(' ');});
  ok(tbl==='CT FL GA IA IN ME MI MN NC NJ OK OR TN TX UT VA WA','new-number states: '+tbl);
  await state(p,'IA');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  ok(await has(p,'locNo'),'Iowa: Renew asks for the new ticket number');
""")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('ok')
