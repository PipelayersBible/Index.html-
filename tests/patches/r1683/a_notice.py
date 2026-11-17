import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# feedback: how it's used (testimonial consent starts here)
rep("""+ '<input id="pbFbPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Your phone (optional), if you’re OK with a call" aria-label="Your phone (optional)">'""",
    """+ '<input id="pbFbPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Your phone (optional), if you’re OK with a call" aria-label="Your phone (optional)">' + '<p class="pb-help" style="margin:6px 0 0;">We use feedback to fix and improve the app. We won’t quote you or use your name without asking first.</p>' /* r16.83 */""")
JS = r'''
  // r16.83 (legal review: crew notice; CA SB 947 from 2027): a company member is told once, plainly, what the company sees.
  window.pbCrewNoticeCheck = function() {
    try {
      const uid = sbUser && sbUser.id; if (!uid || document.getElementById('pbTermsSheet') || document.getElementById('pbMfaSheet') || document.getElementById('pbCrewNotice')) return;
      let ok = null; try { ok = localStorage.getItem('pbCrewNotice:' + uid); } catch (e) {} if (ok === '1') return;
      if (pbTermsLs.get('pbTermsOk:' + uid) !== PB_TERMS_KEY && !pbTermsLs.get('pbTermsPend:' + uid)) return; // after the Terms
      const acc = pbProdAccMem.get(uid); if (!acc || !acc.member || !acc.companyId || acc.manager) return;
      const ov = document.getElementById('pbModalOverlay'); if (pbCurrentScreen !== 'home' || (ov && getComputedStyle(ov).display !== 'none')) return; // never over another question
      pbShowModal('Your company can see the work you record in this app: your runs and their reports, photos (with the time, place and direction stamped on them), run notes, delays, production and footage, permits and daily reports, and when each was made or changed.\n\nYour location is used only while Run Setup or Run Results is open, to stamp photos. The app doesn’t track where you go.\n\nYour company decides how it uses these records. The Privacy Policy is in Settings.', [{ label: 'Got It', primary: true, onClick: () => { try { localStorage.setItem('pbCrewNotice:' + uid, '1'); } catch (e) {} } }], 'What Your Company Sees');
    } catch (e) {}
  };
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'home') setTimeout(() => window.pbCrewNoticeCheck(), 1500); });
'''
rep("  window.pbRrSealPass = pbRrSealPass;\n", "  window.pbRrSealPass = pbRrSealPass;\n" + JS)
open(out, 'w', encoding='utf-8').write(s); print('ok')
