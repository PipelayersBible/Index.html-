def rep(s, old, new, label=''):
    n = s.count(old)
    assert n == 1, 'anchor %s found %d times (want exactly 1)' % (label or old[:60], n)
    return s.replace(old, new)
