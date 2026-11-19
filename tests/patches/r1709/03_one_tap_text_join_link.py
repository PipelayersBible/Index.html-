#!/usr/bin/env python3
# r17.09 (Tommy, Nov 19): Text a Join Link is ONE tap. "Make Join Link" then "Text It" becomes "Text Join Link": the tap
# makes the link and opens Messages with it filled in (on a phone). The made-link card stays as the fallback
# (Text It Again / Share / Copy Link, the code to read out), with a line saying Messages should have opened.
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

rep("""<button type="button" class="pb-btn" id="pbObMakeBtn" onclick="pbObInvMake()">Make Join Link</button>""",
    """<button type="button" class="pb-btn" id="pbObMakeBtn" onclick="pbObInvMake()">' + (pbObPhoneSms() ? 'Text Join Link' : 'Make Join Link') + '</button>""")

rep("""        + '<div class="pbob-btns"><a class="pb-btn" id="pbObTextIt" href="' + escapeHtml(I.sms) + '">Text It</a>'""",
    """        + (I.texted ? '<div class="s" id="pbObTexted">Messages opened with the link in it. Didn\\u2019t open? Tap Text It Again.</div>' : '')
        + '<div class="pbob-btns"><a class="pb-btn' + (I.texted ? ' secondary' : '') + '" id="pbObTextIt" href="' + escapeHtml(I.sms) + '">' + (I.texted ? 'Text It Again' : 'Text It') + '</a>'""")

rep("""    PB_OB.busy = true; const b = document.getElementById('pbObMakeBtn'); if (b) { b.disabled = true; b.textContent = 'Making…'; }""",
    """    PB_OB.busy = true; const b = document.getElementById('pbObMakeBtn'); if (b) { b.disabled = true; b.textContent = pbObPhoneSms() ? 'Opening Messages…' : 'Making…'; }""")

rep("""    I.made = r; I.nameDraft = ''; pbObInvRender(); pbObInvLoad();
  };""",
    """    I.made = r; I.nameDraft = ''; I.texted = pbObPhoneSms(); pbObInvRender(); pbObInvLoad();
    if (I.texted && I.sms) { try { window.__pbObSmsOpened = I.sms; if (!window.__pbObNoNav) window.location.href = I.sms; } catch (e) {} } // r17.09: one tap: Messages opens with the link
  };
  // A phone that can text (iPhone or Android): Text Join Link opens Messages itself.
  function pbObPhoneSms() { try { return window.__pbObForceSms === true || /iPhone|iPod|Android/i.test(navigator.userAgent || ''); } catch (e) { return false; } }
  window.pbObPhoneSms = pbObPhoneSms;""")

open(out, 'w', encoding='utf-8').write(s); print('ok')
