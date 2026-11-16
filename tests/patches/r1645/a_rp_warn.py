import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""#pbApp#pbApp #screen-input .pb-rp-line.reach { color: var(--pb-warn-text); }""",
    """#pbApp#pbApp #screen-input .pb-rp-line.reach { color: var(--pb-warn-text); }
#pbApp#pbApp #screen-input .pb-rp-line.lay, #pbApp#pbApp #screen-input .pb-rp-line.reach { display: block; margin: 6px 0 8px 0; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--pb-warn-text); background: color-mix(in srgb, var(--pb-warn-text) 12%, transparent); color: var(--pb-warn-text); font-weight: 600; }
#pbApp#pbApp #screen-input .pb-rp-line.lay::before, #pbApp#pbApp #screen-input .pb-rp-line.reach::before { content: '\\26A0\\FE0E'; margin-right: 6px; }
#pbApp#pbApp #screen-input .pb-rp-line.lay strong { color: inherit; }""")
# right under the rod reading box (before the invert line)
rep("""    if (anchor.nextElementSibling !== ln) anchor.insertAdjacentElement('afterend', ln);
    ln.className = 'pb-rp-line ' + cls;""",
    """    if (anchor.previousElementSibling !== ln) anchor.insertAdjacentElement('beforebegin', ln); // r16.45: a warning right under the rod reading box
    ln.className = 'pb-rp-line ' + cls;""")
rep("""txt = 'Stake top is above the instrument. Lay to ' + fmtReading(r, rod) + ' at the invert.';""",
    """txt = 'Stake is above the instrument, so it can\\u2019t be shot from here. Lay to ' + fmtReading(r, rod) + ' at the invert.';""")
rep("""else if (r !== null && fromShots) { txt = 'Out of reach from this setup.'; cls = 'reach'; }""",
    """else if (r !== null && fromShots) { txt = 'Above the instrument: out of reach from this setup. Move the instrument.'; cls = 'reach'; }""")
open(out, 'w', encoding='utf-8').write(s)
