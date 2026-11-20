# 07 Forgot password?: the reset box scrolls into view, with the cursor in the email box (or on Send when the email
# is already filled in from Log In). Usage: python3 07_forgot_focus.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""    document.getElementById('forgotPwMsg').style.display = 'none';
  };""", """    document.getElementById('forgotPwMsg').style.display = 'none';
    setTimeout(() => { try { panel.scrollIntoView({ block: 'nearest' }); const em = document.getElementById('forgotEmail'); (em.value ? document.getElementById('forgotPwBtn') : em).focus({ preventScroll: true }); } catch (e) {} }, 0); // streamline 07
  };""")
p.save()
