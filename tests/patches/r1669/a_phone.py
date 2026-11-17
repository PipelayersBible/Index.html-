import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""p_kind: it.kind === 'idea' ? 'idea' : 'problem', p_body: it.body, p_app_build: it.build, p_screen: it.screen, p_expect_uid: uid });""",
"""p_kind: it.kind === 'idea' ? 'idea' : 'problem', p_body: it.body, p_app_build: it.build, p_screen: it.screen, p_expect_uid: uid, p_phone: it.phone || null }); /* r16.69: phone */""")
rep("""        + '<textarea id="pbFbText" maxlength="3000" aria-label="Feedback"></textarea>'""",
"""        + '<textarea id="pbFbText" maxlength="3000" aria-label="Feedback"></textarea>'
        + '<input id="pbFbPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="Your phone (optional), if you’re OK with a call" aria-label="Your phone (optional)">'""")
rep("""      const ta = ov.querySelector('#pbFbText'), st = ov.querySelector('#pbFbSt'), send = ov.querySelector('#pbFbSend');""",
"""      const ta = ov.querySelector('#pbFbText'), st = ov.querySelector('#pbFbSt'), send = ov.querySelector('#pbFbSend'), ph = ov.querySelector('#pbFbPhone');
      const phKey = 'pbFbPhone:' + (sbUser ? sbUser.id : ''); try { ph.value = localStorage.getItem(phKey) || ''; } catch (e) {}""")
rep("""          const item = { cid: pbGenerateClientRunId(), kind: k, body: text.slice(0, PB_SUP_MAX_BODY),""",
"""          const phone = ph.value.trim().slice(0, 30); try { if (phone) localStorage.setItem(phKey, phone); else localStorage.removeItem(phKey); } catch (e) {}
          const item = { cid: pbGenerateClientRunId(), kind: k, phone, body: text.slice(0, PB_SUP_MAX_BODY),""")
open(sys.argv[2],'w').write(s)
