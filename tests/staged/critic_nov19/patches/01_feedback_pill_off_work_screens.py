#!/usr/bin/env python3
# critic_nov19 01: the floating Feedback pill sits on top of things people must tap or read.
#  - Choose Your Password: over the Terms line.  Run Setup: over the Notes box.  Run Results: over the Dist. box of a
#    grade row (the box you tap to mark pipe laid) at every scroll position.  Entry Permit: over the section headers.
#  - Computer layout: over the "Signed in as" line at the bottom of the side menu.
# Fix: hide the pill on those work screens (Feedback stays on Home and every other screen, and in Settings > Send
# Feedback), and on a computer put it bottom-right. Usage: python3 01_...py in.html out.html
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global src
    assert src.count(a) == 1, (src.count(a), a[:70])
    src = src.replace(a, b)
rep("['appProblem', 'appProblems', 'login', 'auth', 'confinedActive'].includes(typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '');",
    "['appProblem', 'appProblems', 'login', 'auth', 'confinedActive', 'setPassword', 'input', 'review', 'results', 'confinedPermit'].includes(typeof pbCurrentScreen === 'string' ? pbCurrentScreen : ''); /* critic_nov19 01: not over the Terms line, the grade rows or a permit form */")
rep("html.pb-kb-open .pb-fb-pill, html.pb-fb-open .pb-fb-pill { display: none !important; }",
    "html.pb-kb-open .pb-fb-pill, html.pb-fb-open .pb-fb-pill { display: none !important; }\n@media (min-width: 1024px) { .pb-fb-pill { left: auto; right: 18px; } } /* critic_nov19 01: not over the side menu's Signed in line */")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
