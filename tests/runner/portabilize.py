#!/usr/bin/env python3
"""Make test files portable (safe to run again; files already converted are left as they are).

  python3 tests/runner/portabilize.py FILE.js [FILE.js ...]     # rewrite in place, prints what changed
  python3 tests/runner/portabilize.py --check FILE.js ...       # only report what would change

What it rewrites, inside string literals only (old values stay as the defaults, so a test still runs by hand the old way):
  require('/home/claude/rig/X')          -> require(__dirname+'/<rel>/rig/X')            (the repo's own copy, tests/rig)
  '/home/claude/rig/X' (file reads)      -> __dirname+'/<rel>/rig/X'
  '/home/claude/index.html-/tests/...'   -> __dirname+'/<rel>/...'
  '/tmp/claude-0/audit/offline/rig/X'    -> __dirname+'/<rel>/bughunt_nov17/offline/rig/X'
  '/tmp/claude-0/evimg/..', '/tmp/claude-0/fx/..'  -> fixtures under tests/fixtures
  'http://127.0.0.1:NNNN/cur.html'       -> (process.env.PB_URL||'http://127.0.0.1:NNNN/cur.html')
  'http://127.0.0.1:NNNN/base.html'      -> (process.env.PB_BASE||'http://127.0.0.1:NNNN/base.html')
  'http://127.0.0.1:NNNN/<rest>'         -> (process.env.PB_ROOT||'http://127.0.0.1:NNNN/')+'<rest>'
  any other '/tmp/claude-0/<dir>/<name>' -> (process.env.PB_OUT||'/tmp/claude-0/<dir>')+'/<name>'   (scratch output)
"""
import os, re, sys

TESTS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUOTES = "'\"`"


def rel(path_from_file, target):
    r = os.path.relpath(os.path.join(TESTS, target), os.path.dirname(os.path.abspath(path_from_file)))
    return r.replace(os.sep, '/')


def find_literal(line, i):
    """(start, end, quote) of the string literal around index i on this line, or None."""
    j = i - 1
    while j >= 0:
        if line[j] in QUOTES and (j == 0 or line[j - 1] != '\\'):
            q = line[j]
            k = i
            while k < len(line):
                if line[k] == q and line[k - 1] != '\\':
                    return j, k, q
                k += 1
            return None
        j -= 1
    return None


def splice(q, expr):
    """text that closes a literal of quote q, inserts expr, reopens it"""
    if q == '`':
        return '${' + expr + '}'
    return q + '+' + expr + '+' + q


def convert_line(fname, line):
    changed = True
    guard = 0
    while changed and guard < 50:
        changed = False
        guard += 1
        for m in re.finditer(r"/home/claude/rig/|/home/claude/index\.html-/tests/|/tmp/claude-0/|http://127\.0\.0\.1:\d+/", line):
            i = m.start()
            lit = find_literal(line, i)
            if not lit:
                continue
            s, e, q = lit
            body = line[s + 1:e]
            off = i - (s + 1)
            before, after = body[:off], body[off:]
            tok = m.group(0)
            new = None
            if tok == '/home/claude/rig/':
                tail = after[len(tok):]
                expr = "__dirname+'/" + rel(fname, 'rig') + "/'"
                new = splice_body(q, before, expr, tail)
            elif tok == '/home/claude/index.html-/tests/':
                tail = after[len(tok):]
                expr = "__dirname+'/" + rel(fname, '.') + "/'"
                new = splice_body(q, before, expr, tail)
            elif tok == '/tmp/claude-0/':
                if line[max(0, s - 18):s].endswith('PB_OUT||'):
                    continue
                rest = after[len(tok):]
                if rest.startswith('audit/offline/rig/'):
                    expr = "__dirname+'/" + rel(fname, 'bughunt_nov17/offline/rig') + "/'"
                    new = splice_body(q, before, expr, rest[len('audit/offline/rig/'):])
                elif rest.startswith('evimg/') or rest.startswith('fx/'):
                    sub = rest.split('/', 1)
                    sub = ('evimg/' + sub[1]) if rest.startswith('evimg/') else sub[1]
                    expr = "__dirname+'/" + rel(fname, 'fixtures') + "/'"
                    new = splice_body(q, before, expr, sub)
                else:
                    # scratch output: the folder part becomes PB_OUT
                    mm = re.match(r"([A-Za-z0-9_.\-/]*)", rest)
                    pathpart = mm.group(1)
                    if '/' in pathpart:
                        d, name = pathpart.rsplit('/', 1)
                        dirp = '/tmp/claude-0/' + d
                    else:
                        d, name = '', pathpart
                        dirp = '/tmp/claude-0'
                    tail = '/' + name + rest[len(pathpart):]
                    expr = "(process.env.PB_OUT||'" + dirp + "')"
                    new = splice_body(q, before, expr, tail)
            else:  # http://127.0.0.1:NNNN/
                if before == '' and line[max(0, s - 2):s] == '||':
                    continue  # already a default
                rest = after[len(tok):]
                port_url = tok
                mm = re.match(r"([A-Za-z0-9_.\-]*\.html)$", rest) if before == '' else None
                if mm and rest == 'cur.html':
                    new_full = "(process.env.PB_URL||" + q + port_url + rest + q + ")"
                    line = line[:s] + new_full + line[e + 1:]
                    changed = True
                    break
                if mm and rest == 'base.html':
                    new_full = "(process.env.PB_BASE||" + q + port_url + rest + q + ")"
                    line = line[:s] + new_full + line[e + 1:]
                    changed = True
                    break
                expr = "(process.env.PB_ROOT||'" + port_url + "')"
                new = splice_body(q, before, expr, rest)
            if new is not None:
                line = line[:s] + new + line[e + 1:]
                changed = True
                break
    return line


def splice_body(q, before, expr, tail):
    if q == '`':
        return '`' + before + '${' + expr + '}' + tail + '`'
    if expr.endswith("/'") and tail and q not in tail and "'" not in tail and '\\' not in tail:
        expr = expr[:-1] + tail + "'"
        tail = ''
    parts = []
    if before:
        parts.append(q + before + q)
    parts.append(expr)
    if tail:
        parts.append(q + tail + q)
    out = '+'.join(parts)
    return '(' + out + ')' if len(parts) > 1 or before else out


def main():
    args = sys.argv[1:]
    check = False
    if args and args[0] == '--check':
        check = True
        args = args[1:]
    for f in args:
        src = open(f, encoding='utf-8').read()
        lines = src.split('\n')
        out = []
        n = 0
        for ln in lines:
            st = ln.lstrip()
            if st.startswith('//') or st.startswith('#') or len(ln) > 20000:
                out.append(ln)
                continue
            nl = convert_line(f, ln)
            if nl != ln:
                n += 1
            out.append(nl)
        if n:
            print(f'{f}: {n} line(s)' + (' would change' if check else ' changed'))
            if not check:
                open(f, 'w', encoding='utf-8').write('\n'.join(out))


if __name__ == '__main__':
    main()
