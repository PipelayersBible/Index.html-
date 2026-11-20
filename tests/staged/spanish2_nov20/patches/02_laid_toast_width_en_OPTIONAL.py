#!/usr/bin/env python3
"""OPTIONAL, changes English: the laid-rows toast ("Laid to 10.0 (2 rows)" + Undo) can only be half the screen wide,
because it is centred with left:50% and has no width, so long text is cut with "…" in English too.
One CSS value: width: max-content (its max-width: calc(100vw - 32px) still holds). Spanish already has this from 01.
    python3 02_laid_toast_width_en_OPTIONAL.py in.html out.html"""
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(s, old, new):
    assert s.count(old) == 1, (s.count(old), old[:80])
    return s.replace(old, new)
src = rep(src, '#pbApp .pb-laid-toast { position: fixed; left: 50%; bottom:', '#pbApp .pb-laid-toast { width: max-content; position: fixed; left: 50%; bottom:')
open(sys.argv[2], 'w', encoding='utf-8').write(src)
