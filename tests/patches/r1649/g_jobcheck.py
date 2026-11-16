import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
rep("""    window.pbCurJobChoices = cjChoices;""", """    window.pbCurJobCompany = () => (Array.isArray(pbCj.jobs) ? pbCj.jobs : []); // r16.49: the company's own job list (as last loaded)
    window.pbCurJobChoices = cjChoices;""")
rep("""  window.pbRfAskJob = function(opts) {
    const uid = pbArchiveOwnerUid; if (!pbRrMember(uid)) return false;
    const jn = document.getElementById('saJobNumber'); if (!jn || String(jn.value || '').trim()) return false;""",
"""  window.pbRfAskJob = function(opts) {
    const uid = pbArchiveOwnerUid; if (!pbRrMember(uid)) return false;
    const jn = document.getElementById('saJobNumber'); if (!jn) return false;
    if (String(jn.value || '').trim()) { // r16.49: a typed job the company doesn't have would start a new job on the office's board
      const typed = String(jn.value).trim(), co = typeof window.pbCurJobCompany === 'function' ? window.pbCurJobCompany() : [];
      if ((opts && opts.jobChecked) || !co.length || co.some(j => String(j.job_number || '').trim().toLowerCase() === typed.toLowerCase())) return false;
      const again = (x) => setTimeout(() => window.pbLock(Object.assign({}, opts || {}, { jobChecked: true }, x || {})), 0);
      const picks = co.slice(0, 5).map(j => ({ label: 'Job ' + j.job_number + (j.name ? ' — ' + String(j.name).slice(0, 40) : ''), onClick: () => { pbRfSetJob(j); again(); } }));
      pbShowModal('Job ' + typed + ' isn\\u2019t on your company\\u2019s job list. Its production would start a new job on the office\\u2019s board.', picks.concat([{ label: 'Use ' + typed + ' Anyway', onClick: () => again() }, { label: 'Cancel' }]), 'Check the Job Number');
      return true;
    }""")
open(out, 'w', encoding='utf-8').write(s)
s = open(out, encoding='utf-8').read()
old = """      + '<div class="pb-field"><label for="' + ids.len + '">Pipe laying length (ft)</label><div class="pb-unitbox">"""
new = """      + '<div class="pb-field"><label for="' + ids.len + '">Laying length<span class="pb-sr"> (ft)</span></label><div class="pb-unitbox">"""
assert s.count(old) == 1; s = s.replace(old, new)
old = """<label for="' + prefix + 'RedWT">Wall after this point</label>"""
assert s.count(old) == 1; s = s.replace(old, """<label for="' + prefix + 'RedWT">Wall after</label>""")
open(out, 'w', encoding='utf-8').write(s)
