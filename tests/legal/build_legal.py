# r16.78: builds terms.html and privacy.html from the legal review text (report 01), with the owner's details filled in.
import re, sys, markdown, html
src = open(sys.argv[1], encoding='utf-8').read()
outdir = sys.argv[2]
def section(start, end):
    a = src.index(start); b = src.index(end, a)
    t = src[a:b]
    t = t[t.index('\n---\n') + 5:]
    t = t[:t.rindex('\n---')]
    return t.strip()
terms = section('## 5. Proposed revised Terms of Use', '## 6. Proposed revised Privacy Policy')
priv = section('## 6. Proposed revised Privacy Policy', '## 7. Outline: Customer Agreement')
NAME, EMAIL, DATE, VER = 'Desert Infrastructure Group', 'admin@pipelayersbible.com', 'November 17, 2026', '1.0'
def fill(t):
    t = t.replace('**[Company legal name]**, [business address] ("we", "us")', '**' + NAME + '** ("we", "us")')
    t = t.replace('[Company legal name], [business address], [support email].', NAME + ', ' + EMAIL + '.')
    t = t.replace('[Company legal name], [business address], [privacy email].', NAME + ', ' + EMAIL + '.')
    t = t.replace('[Company legal name]', NAME).replace('[support email]', EMAIL).replace('[privacy email]', EMAIL)
    t = t.replace('[name], [address], [email]', NAME + ', ' + EMAIL)
    t = t.replace('Version [1.0]. Effective [date].', 'Version ' + VER + '. Effective ' + DATE + '.')
    t = t.replace('[Riverside]', 'Riverside').replace('[4 years]', '4 years').replace('[24 months]', '24 months').replace('[90 days]', '90 days')
    t = re.sub(r'\s*\*\[if the app fix is not made:[^\]]*\]\*', '', t)
    return t
terms, priv = fill(terms), fill(priv)
# facts corrected to match the app (r16.77)
def rep(t, a, b):
    assert t.count(a) == 1, a[:70]
    return t.replace(a, b)
terms = rep(terms, "6.3 **When it ends.** The account becomes read-only. Nothing is charged automatically. To keep working you choose a paid plan.",
    "6.3 **When it ends.** Records already sent stay in the company's account. New runs and reports stay on each phone and are sent once the company starts a paid plan. A beta never turns into a paid plan by itself, and we don't ask for a card to start one. We may end a beta at any time.")
terms = rep(terms, "Users cannot change or delete a sealed copy. Later edits create a new version, and the Service logs who made each edit and when.",
    "Users cannot change or delete a sealed copy in the app. Later edits create a new sealed version; earlier versions are kept.")
terms = rep(terms, "- Nothing the AI reads is final until a person has reviewed it. When you tap to use a value, you are confirming you checked it.", "- Nothing the AI reads is final until a person has reviewed it. When you lock a run that has values read by AI, you are confirming you checked them.")
priv = rep(priv, "| GitHub, Cloudflare, jsDelivr, Google Fonts |", "| GitHub, jsDelivr, Google Fonts |")
priv = rep(priv, "| Confined space permits | While the account is open. Users cannot delete them except by deleting the whole job as the account owner |",
    "| Confined space permits | While the account is open |")
priv = rep(priv, "Your company cannot see who sent it through the Service.",
    "Your company cannot see who sent it through the Service. Our hosting provider's logs, kept for up to 7 days, could match a report to a phone; we do not look unless the law requires it.")
CSS = """:root{--bg:#f6f7f9;--fg:#15181d;--mut:#5b6472;--card:#fff;--line:#e2e5ea;--acc:#c2410c}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--fg:#e8eaee;--mut:#9aa3b2;--card:#171a20;--line:#2a2f38;--acc:#fb923c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.6rem;line-height:1.25;margin:.2em 0 .4em}h2{font-size:1.15rem;margin:1.8em 0 .5em;padding-top:.6em;border-top:1px solid var(--line)}
a{color:var(--acc)}table{border-collapse:collapse;width:100%;font-size:.92rem;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{background:var(--card)}
.top{font-size:.9rem;color:var(--mut)}.top a{margin-right:14px}"""
def page(title, body, other):
    h = markdown.markdown(body, extensions=['tables'])
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>' + title + ' · The Pipelayer’s Bible</title><meta name="robots" content="index"><style>' + CSS + '</style></head><body><main>'
            '<p class="top"><a href="./">Open the app</a><a href="' + other[0] + '">' + other[1] + '</a></p>' + h + '</main></body></html>\n')
open(outdir + '/terms.html', 'w', encoding='utf-8').write(page('Terms of Use', terms, ('privacy.html', 'Privacy Policy')))
open(outdir + '/privacy.html', 'w', encoding='utf-8').write(page('Privacy Policy', priv, ('terms.html', 'Terms of Use')))
left = re.findall(r'\[[^\]]{2,40}\]', terms + priv)
print('ok; leftover brackets:', [x for x in left if not x.startswith('[if')])
