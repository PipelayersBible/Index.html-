#!/usr/bin/env python3
# critic_nov19 02: the iPhone "Put the App on Your Home Screen" card on Home lists its steps in an order nobody can
# follow: step 3 says "Open the new icon. Tap Get a Code below, then Paste Join Code in the new app", but once the new
# icon is open, "below" (this card, in Safari) is gone. The r17.10 sheet has the right order (code first). Same words now.
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global src
    assert src.count(a) == 1, (src.count(a), a[:70])
    src = src.replace(a, b)
rep("'<ol><li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open the new icon. Tap <strong>Get a Code</strong> below, then <strong>Paste Join Code</strong> in the new app.</li></ol>'",
    "'<ol><li>Tap <strong>Get a Code</strong> below, then <strong>Copy Code</strong>.</li><li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li><li>Open the new icon and tap <strong>Paste Join Code</strong>.</li></ol>'")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
