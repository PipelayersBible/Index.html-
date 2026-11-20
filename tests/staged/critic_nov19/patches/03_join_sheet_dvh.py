#!/usr/bin/env python3
# critic_nov19 03: the join / Home Screen / link sheets are capped at 100vh - 32px. In iPhone Safari 100vh is the page
# height with the toolbars hidden, so with the toolbars showing (a first visit from a text link) the bottom of a tall
# sheet (the Terms tick and Join Crew: the sheet is about 830 px tall) can sit under Safari's bottom bar.
# 100dvh is the height you can actually see. Old phones that don't know dvh keep the 100vh line.
# Not checked on a real iPhone (the test box has none): the test only checks the rule and that the sheet still scrolls.
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global src
    assert src.count(a) == 1, (src.count(a), a[:70])
    src = src.replace(a, b)
rep("max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;}'",
    "max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;}'")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
