import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.96 (Nov 17): (1) the crew notice says that linked crew members can see a read-only copy of the crew's runs (r16.95
# crew view), so it's shown once more (value '3'); (2) "Got It" is recorded on the server (pb_notice_ack: insert-only
# pb_legal.notice_acks, notice 'crew_notice', version '3'), queued on the phone when there's no signal and sent on the
# next Home visit; (3) Settings › App gets an "Email support" row (admin@pipelayersbible.com).
rep("""and when each was made or changed.\\n\\nYour location is used only while Run Setup or Run Results is open""",
    """and when each was made or changed. Crew members linked to the same foreman can see a read-only copy of the crew\\u2019s runs (the grade numbers and when rows were marked laid).\\n\\nYour location is used only while Run Setup or Run Results is open""")
rep("""[{ label: 'Got It', primary: true, onClick: () => { try { localStorage.setItem('pbCrewNotice:' + uid, '2'); } catch (e) {} } }], 'What Your Company Sees');""",
    """[{ label: 'Got It', primary: true, onClick: () => { try { localStorage.setItem('pbCrewNotice:' + uid, '3'); localStorage.setItem('pbCrewNoticeAck:' + uid, JSON.stringify({ v: '3', at: new Date().toISOString() })); } catch (e) {} pbCrewNoticeAckSend(uid); } }], 'What Your Company Sees');""")
rep("""      let ok = null; try { ok = localStorage.getItem('pbCrewNotice:' + uid); } catch (e) {} if (ok === '2') return;""",
    """      pbCrewNoticeAckSend(uid); /* r16.96: a "Got It" that couldn't be sent yet */
      let ok = null; try { ok = localStorage.getItem('pbCrewNotice:' + uid); } catch (e) {} if (ok === '3') return;""")
rep("""  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'home') setTimeout(() => window.pbCrewNoticeCheck(), 1500); });""",
    """  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'home') setTimeout(() => window.pbCrewNoticeCheck(), 1500); });
  // r16.96: the server's record that this person was shown the crew notice (pb_notice_ack, insert-only). Kept on the phone until sent.
  let pbCrewAckBusy = false;
  async function pbCrewNoticeAckSend(uid) {
    let p = null; try { p = JSON.parse(localStorage.getItem('pbCrewNoticeAck:' + uid) || 'null'); } catch (e) { p = null; }
    if (!p || !p.v || pbCrewAckBusy || !sbClient || typeof sbClient.rpc !== 'function' || navigator.onLine === false) return;
    pbCrewAckBusy = true;
    try {
      const r = await sbClient.rpc('pb_notice_ack', { p_notice: 'crew_notice', p_version: String(p.v), p_phone_at: p.at || null, p_build: String(window.PB_APP_BUILD || '').slice(0, 60) });
      if (r && !r.error && r.data && r.data.ok) { try { localStorage.removeItem('pbCrewNoticeAck:' + uid); } catch (e) {} }
    } catch (e) { /* tried again on the next Home visit */ } finally { pbCrewAckBusy = false; }
  }
  window.pbCrewNoticeAckSend = pbCrewNoticeAckSend;""")
rep("""<span class="name">Send Feedback</span><span class="sub">A problem or an idea, straight to the app&rsquo;s owner</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>""",
    """<span class="name">Send Feedback</span><span class="sub">A problem or an idea, straight to the app&rsquo;s owner</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>
          <a class="pb-edu-row pb-tool-row" id="settingsSupportEmail" data-ic="people" href="mailto:admin@pipelayersbible.com?subject=The%20Pipelayer%27s%20Bible%20help" style="text-decoration:none;color:inherit"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Email Support</span><span class="sub">admin@pipelayersbible.com</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></a>""")
open(out, 'w', encoding='utf-8').write(s)
