#!/usr/bin/env python3
# feedback_btn_nov19 01: the Feedback button moves from a floating pill (bottom-left, on top of the page) into the
# header bar of the screen that is showing: top-right corner, same yellow pill, same word, same sheet.
# The header is a sticky bar of its own, so the button never sits on top of page content, and dialogs / sheets /
# the keyboard cover or leave it like the rest of the header. Same element (#pbFbPill), same pbFeedbackOpen().
# If a screen's header is not shown (computer layout hides Home's), the button falls back to a fixed top-right pill.
# Usage: python3 01_feedback_in_header.py in.html out.html
import sys
src = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global src
    assert src.count(a) == 1, (src.count(a), a[:70])
    src = src.replace(a, b)

# 1. CSS: in-header button (default) + fixed fallback (.pb-fb-float)
rep(""".pb-fb-pill { position: fixed; left: 14px; bottom: calc(14px + var(--pb-shell-h, 0px)); z-index: 39; border: 0; border-radius: 999px; padding: 9px 14px; font: 600 14px/1 'Inter', sans-serif; color: #14171C; background: var(--pbl-yellow, #F5BF1F); box-shadow: 0 4px 14px rgba(0,0,0,.28); }
html.pb-kb-open .pb-fb-pill, html.pb-fb-open .pb-fb-pill { display: none !important; }""",
""".pb-fb-pill { -webkit-appearance: none; appearance: none; position: relative; box-sizing: border-box; flex: 0 0 auto; order: 1; align-self: center; width: auto; min-width: 0; height: 36px; min-height: 0; margin: 0; border: 0; border-radius: 999px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; font: 600 14px/1 'Inter', sans-serif; letter-spacing: 0; text-transform: none; white-space: nowrap; color: #14171C; background: var(--pbl-yellow, #F5BF1F); box-shadow: none; cursor: pointer; }
/* feedback_btn_nov19: in the header bar of the screen that is showing, top-right. 36 px tall to look at, 44 px to tap (the extra is inside the header's own padding) */
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill { -webkit-appearance: none; appearance: none; position: relative; flex: 0 0 auto; order: 1; align-self: center; width: auto; min-width: 0; max-width: none; height: 36px; min-height: 0; margin: 0; padding: 0 12px; border: 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font: 600 14px/1 'Inter', sans-serif; letter-spacing: 0; text-transform: none; white-space: nowrap; color: #14171C; background: var(--pbl-yellow, #F5BF1F); box-shadow: none; transform: none; filter: none; }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill::after { content: ""; position: absolute; left: -4px; right: -4px; top: -4px; bottom: -4px; }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill:active { filter: brightness(.92); }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill:focus-visible { outline: none; box-shadow: var(--pb-ring, 0 0 0 3px rgba(245,191,31,.5)); }
#pbApp#pbApp#pbApp .pb-header > .pb-eyebrow ~ .pb-fb-pill { margin-left: 0; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill { height: 34px; font-size: 13px; }
#pbApp#pbApp#pbApp #screen-confinedActive > .pb-header > .pb-fb-pill { background: none; color: var(--pb-text-2); border: 1px solid var(--pb-control, #8a8f98); font-weight: 600; } /* quiet beside EMERGENCY */
/* no header showing on this screen: a fixed pill in the top-right corner instead */
.pb-fb-pill.pb-fb-float { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); top: calc(10px + env(safe-area-inset-top, 0px)); z-index: 39; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
html.pb-fb-open .pb-fb-pill.pb-fb-float { display: none !important; }
@media print { .pb-fb-pill { display: none !important; } }""")

# 2. JS: put the one button into the showing screen's header (again on every screen change / render)
rep("""      if (!pill && fbOn) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'pbFbPill'; pill.className = 'pb-fb-pill'; pill.textContent = 'Feedback'; pill.onclick = () => window.pbFeedbackOpen(); document.body.appendChild(pill); }
      if (pill) pill.hidden = !fbOn || ['appProblem', 'appProblems', 'login', 'auth', 'confinedActive'].includes(typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '');""",
"""      if (!pill && fbOn) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'pbFbPill'; pill.className = 'pb-fb-pill'; pill.textContent = 'Feedback'; pill.setAttribute('aria-label', 'Send feedback'); pill.onclick = () => window.pbFeedbackOpen(); document.body.appendChild(pill); }
      if (pill) {
        const scrName = typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '';
        pill.hidden = !fbOn || ['login', 'auth'].includes(scrName); /* feedback_btn_nov19: every signed-in screen */
        /* feedback_btn_nov19: the button lives in the header bar of the screen that is showing (top-right), not on top of the page */
        try {
          const scr = document.getElementById('screen-' + scrName) || document.querySelector('#pbApp .pb-screen.active');
          const hd = scr && scr.querySelector(':scope > .pb-header');
          const shown = !!hd && getComputedStyle(hd).display !== 'none';
          if (shown) { if (pill.parentNode !== hd || hd.lastElementChild !== pill) hd.appendChild(pill); pill.classList.remove('pb-fb-float'); }
          else { if (pill.parentNode !== document.body) document.body.appendChild(pill); pill.classList.add('pb-fb-float'); }
        } catch (e) {}
      }""")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
