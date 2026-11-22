# firstweek_web_nov22 patch 05: join links.
# * One constant for how long a join link lasts (PB_OB_LINK_HOURS = 24, the server's pb_onboard.make_link interval).
#   Every "24 hours" about join links reads it, so the 72-hour DECISION (05b + sql/DECISION_72h_links.sql) is one edit.
# * A dead join link (expired, already used, cancelled) offers "Ask for a New Link": it opens Messages with
#   "My join link for The Pipelayer's Bible doesn't work any more. Can you send me a new one?" (he picks who sent it).
#   Only on the join sheets ('Can't Join'); a sign-in code's errors ('Can't Sign In') are unchanged.
# Usage: python3 05_join_link_expired.py in.html out.html
import sys, json
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:120]); s = s.replace(old, new)
def raw(k, v):
    return (json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)).replace('</', '<\\/')
def dict_add(pairs):
    i = s.index('id="pbI18nDict">') + 16; d = json.loads(s[i:s.index('</script>', i)])
    for k, _ in pairs: assert k not in d['t'], ('already in the dictionary', k)
    rep('id="pbI18nDict">{"t":{', 'id="pbI18nDict">{"t":{' + ','.join(raw(k, v) for k, v in pairs) + ',')

rep("  const PB_OB_ROLES = { foreman: 'Foreman', pipelayer: 'Pipelayer' };\n",
    "  const PB_OB_ROLES = { foreman: 'Foreman', pipelayer: 'Pipelayer' };\n"
    "  const PB_OB_LINK_HOURS = 24; // firstweek_web_nov22: how long a join link lasts (server: pb_onboard.make_link). Change both together.\n")
rep("'pb:link_expired': 'This link has expired. Links last 24 hours. Ask whoever sent it for a new one.',",
    "'pb:link_expired': 'This link has expired. Links last ' + PB_OB_LINK_HOURS + ' hours. Ask whoever sent it for a new one.',")
rep("': ' + url + ' (works once, for 24 hours)';", "': ' + url + ' (works once, for ' + PB_OB_LINK_HOURS + ' hours)';")
rep("'. Works once, for 24 hours.' + (I.fmOnly ?", "'. Works once, for ' + PB_OB_LINK_HOURS + ' hours.' + (I.fmOnly ?")

rep("""  function pbObErrSheet(code, title) {
    pbObSheet('<h2>' + escapeHtml(title || 'Can’t Join') + '</h2><p id="pbObErrText">' + escapeHtml(pbObText(code)) + '</p><div class="pbob-btns"><button type="button" class="pb-btn" onclick="pbObClose()">OK</button></div>', title || 'Can’t join');
  }""", """  function pbObErrSheet(code, title) {
    const ask = (!title || title === 'Can’t Join') && ['pb:link_expired', 'pb:link_used', 'pb:link_revoked'].includes(code); // firstweek_web_nov22: a dead join link
    const sms = 'sms:?&body=' + encodeURIComponent('My join link for The Pipelayer’s Bible doesn’t work any more. Can you send me a new one?');
    pbObSheet('<h2>' + escapeHtml(title || 'Can’t Join') + '</h2><p id="pbObErrText">' + escapeHtml(pbObText(code)) + '</p><div class="pbob-btns">'
      + (ask ? '<a class="pb-btn" id="pbObAskNew" href="' + escapeHtml(sms) + '">Ask for a New Link</a><button type="button" class="pb-btn ghost" onclick="pbObClose()">OK</button>'
        : '<button type="button" class="pb-btn" onclick="pbObClose()">OK</button>') + '</div>', title || 'Can’t join');
  }""")
dict_add([('Ask for a New Link', 'Pedir un enlace nuevo')])
open(dst, 'w', encoding='utf-8').write(s)
print('05_join_link_expired: ok')
