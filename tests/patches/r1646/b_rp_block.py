import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""            else if (r !== null && fromShots) { txt = 'Above the instrument: out of reach from this setup. Move the instrument.'; cls = 'reach'; }""",
    """            else if (r !== null) { txt = 'CAN\\u2019T BE LAID FROM HERE. The invert is above the instrument. Move the instrument before laying this pipe.'; cls = 'block'; }""")
rep("""          if (!typed && pbStakeShotReading(prefix) === null && elev !== null && lay - elev < -1e-9) { txt = 'Out of reach from this setup.'; cls = 'reach'; }""",
    """          if (!typed && pbStakeShotReading(prefix) === null && elev !== null && lay - elev < -1e-9) { txt = 'CAN\\u2019T BE LAID FROM HERE. The invert is above the instrument. Move the instrument before laying this pipe.'; cls = 'block'; }""")
rep("""        } else if (mode === 'elev' && fromShots) {""", """        } else if (mode === 'elev') {""")
rep("""#pbApp#pbApp #screen-input .pb-rp-line.lay strong { color: inherit; }""",
    """#pbApp#pbApp #screen-input .pb-rp-line.lay strong { color: inherit; }
#pbApp#pbApp #screen-input .pb-rp-line.block { display: block; margin: 6px 0 8px 0; padding: 10px 12px; border-radius: 8px; border: 2px solid var(--pb-danger); background: var(--pb-danger-soft); color: var(--pb-danger-text); font-weight: 700; }
#pbApp#pbApp #screen-input .pb-rp-line.block::before { content: '\\26D4\\FE0E'; margin-right: 6px; }""")
open(out, 'w', encoding='utf-8').write(s)
