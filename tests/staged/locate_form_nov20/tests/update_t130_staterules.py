#!/usr/bin/env python3
# locate_form_nov20: three checks in tests/r1706/staterules/tests/t130_staterules.js looked for the state's rule text
# on the new-ticket form. That text is off the form now (it is in the "<State> rule >" sheet). This rewrites the three.
#   python3 update_t130_staterules.py <t130_staterules.js in> <out>
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
rep("""ok(/^Arizona: Marks are good for 15 working days/.test(await txt(p,'locExpHelp')),'expiry help names Arizona\\'s rule');""",
    """ok((await txt(p,'locExpHelp'))===''&&/^Arizona rule/.test(await txt(p,'locRuleLink')),'no rule text under the expiry; the "Arizona rule" link is there');""")
rep("""ok(/^Arizona: Call at least 2 working days/.test(await txt(p,'locRuleHelp')),'wait help names Arizona\\'s rule');""",
    """ok((await txt(p,'locRuleHelp'))==='','no rule text under the dig dates');""")
rep("""ok(/Check your state’s 811 rules\\./.test(await txt(p,'locExpHelp'))&&/Check your state’s 811 rules\\./.test(await txt(p,'locRuleHelp')),'Arkansas: "Check your state\\'s 811 rules" on both help lines');""",
    """ok(/^Enter the expiry on your ticket\\.$/.test(await txt(p,'locExpHelp'))&&/^Ask 811 when you can dig\\.$/.test(await txt(p,'locRuleHelp')),'Arkansas: "Enter the expiry on your ticket." and "Ask 811 when you can dig."');""")
open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('ok')
