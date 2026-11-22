# firstweek_web_nov22: the other pages (items 8 header/footer Sign in, 11 share line, 14 footer, 15 table region).
# Run in the website clone root: python3 edit_pages.py
import glob, re, urllib.parse
def load(f): return open(f, encoding='utf-8').read()
def save(f, s): open(f, 'w', encoding='utf-8').write(s)
def rep1(s, old, new, f):
    n = s.count(old); assert n == 1, (f, n, old[:90]); return s.replace(old, new)

# css/site.css: Sign in link in the header, the share line under the trial box
f = 'css/site.css'; s = load(f)
s = rep1(s, '.top-call .num{display:none}', '.top-call .num{display:none}\n.top-signin{margin-left:auto;color:var(--on-dark);font-weight:700;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;min-height:44px;padding:0 6px}\n.top-signin:hover{color:var(--yellow)}\n@media (max-width:419px){.topbar .wrap{gap:0 10px}.top-signin{padding:0 2px}.top-call{padding:0 12px}.top-call .word{display:none}}', f)
s = rep1(s, '  .site-nav ul{gap:0 24px}\n  .top-call{order:4}\n}', '  .site-nav ul{gap:0 24px}\n  .top-signin{order:3;margin-left:0}\n  .top-call{order:4}\n}', f)
s = rep1(s, '@media (min-width:520px){.cta-band .btns{flex-direction:row;max-width:none}}',
         '@media (min-width:520px){.cta-band .btns{flex-direction:row;max-width:none}}\n.cta-share{margin:20px 0 0;color:var(--on-dark-2);font-size:16px}\n.cta-share a{color:var(--yellow);font-weight:700;display:inline-block;padding:8px 0}\n.cta-share a:hover{color:#fff}', f)
save(f, s)

pages = sorted(p for p in glob.glob('**/*.html', recursive=True) if p != 'index.html')
for f in pages:
    s = load(f)
    s = rep1(s, '    <a class="top-call" href="tel:+19094355250"', '    <a class="top-signin" href="https://app.pipelayersbible.com">Sign in</a>\n    <a class="top-call" href="tel:+19094355250"', f)
    s = rep1(s, '<li><a href="https://app.pipelayersbible.com">Open the app</a></li>', '<li><a href="https://app.pipelayersbible.com">Sign in</a></li>', f)
    s = rep1(s, '<p class="copy">&copy; 2026 The Pipelayer\'s Bible</p>', '<p class="copy">&copy; 2026 Desert Infrastructure Group</p>', f)
    if 'class="cta-band"' in s:
        url = re.search(r'<link rel="canonical" href="([^"]+)">', s).group(1)
        body = "Have a look at this for our crew: " + url
        sms = 'sms:?&body=' + urllib.parse.quote(body, safe='')
        mail = 'mailto:?subject=' + urllib.parse.quote("The Pipelayer's Bible", safe='') + '&body=' + urllib.parse.quote(body, safe='')
        line = ('    <p class="cta-share">Pipelayer? Send this page to your foreman or super. '
                '<a href="' + sms + '">Text it</a> or <a href="' + mail + '">email it</a>.</p>\n')
        s = rep1(s, '<a class="btn btn-ghost" href="tel:+19094355250">Call (909) 435-5250</a></div>\n',
                 '<a class="btn btn-ghost" href="tel:+19094355250">Call (909) 435-5250</a></div>\n' + line, f)
    save(f, s)
    print('ok', f)

# 15. grade calculator tables: a focusable, named scroll region (keyboard users can scroll them sideways)
f = 'tools/pipe-grade-calculator/index.html'; s = load(f)
s = rep1(s, '<div class="tbl-wrap"><table><thead><tr><th class="num">Slope</th>', '<div class="tbl-wrap" tabindex="0" role="region" aria-label="Slope table: inches per foot and fall in 100 ft"><table><thead><tr><th class="num">Slope</th>', f)
s = rep1(s, "h += '<div class=\"tbl-wrap\"><table id=\"g-table\">", "h += '<div class=\"tbl-wrap\" tabindex=\"0\" role=\"region\" aria-label=\"Invert elevation at each station\"><table id=\"g-table\">", f)
save(f, s); print('ok tbl-wrap')
