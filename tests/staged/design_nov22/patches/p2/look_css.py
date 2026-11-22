# PHASE 2 (the look; needs Tommy's OK). One style block, display only: no element, id, text or behaviour changes.
#  A-1 (Tommy Nov 21: "clear where they need to make a decision"): solid yellow = the next step (primary buttons) and a
#      choice still to make (needs-a-pick outline, see look_needs_pick.py). A choice already made: dark ink fill (clear,
#      calmer). Decorative yellow goes: step numbers, Feedback pill, Home's Add note / Daily report icons. AI read buttons
#      ("Read All Stake Photos", "Read Stake w/ AI", "Read Ticket With AI"): outlined with a sparkle. Crew members:
#      "Invite Crew Member" outlined (the join link stays the one yellow button).
#  A-2 headers: Feedback is one fixed size everywhere (neutral outline, never shrinks, never an icon); titles keep one
#      size (24 px on pushed screens; no shrinking), never hyphenated, at most 2 lines; the calculator star and
#      Education's Add to Home become a small "Add to Home" chip on its own row under the title.
#  A-6 buttons: 3 tiers. Secondary = outlined (was grey filled: Run Notes tiles, Refresh, View Report, Copy From Last
#      Permit...). "Clear Calculation" (Quick Run) is not red (nothing is lost that can't be retyped; it still asks first).
#  A-10 red = danger only: the OSHA-table / "not an OSHA number" / "Full standard text" reference boxes use the blue
#      info style; Run Results "Flagged at Lock" (Backflow etc.) is yellow (check), as the Nov 4/5 colour rules say.
#  Also: Active Permit header like the others (A-3); Ask tab selected like the other tabs (D table).
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
CSS = r"""<style id="pbDesign22">
/* ===== design_nov22 PHASE 2 (display only) ===== */
#pbApp { --pb-sel-bg: #EEF0F3; --pb-sel-ink: #101318; --pb-sparkle: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l2.2 6.3L20 10l-5.8 1.7L12 18l-2.2-6.3L4 10l5.8-1.7z'/%3E%3Cpath d='M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z'/%3E%3C/svg%3E"); }
html.pb-light #pbApp { --pb-sel-bg: #1D2127; --pb-sel-ink: #FFFFFF; }
/* A-1: a choice already made: clear, but not the yellow of the next step */
#pbApp#pbApp#pbApp .pb-toggle > button:is(.active, [aria-pressed="true"]), #pbApp#pbApp#pbApp [role="group"] > button.active[aria-pressed="true"] { background: var(--pb-sel-bg); color: var(--pb-sel-ink); box-shadow: none; font-weight: 700; }
html.pb-light #pbApp#pbApp#pbApp .pb-toggle > button:is(.active, [aria-pressed="true"]) { background: var(--pb-sel-bg); color: var(--pb-sel-ink); }
/* A-1: decorative yellow off: step numbers, Home quick-action icons */
#pbApp#pbApp#pbApp #screen-input .pb-runsec-num, #pbApp#pbApp#pbApp #screen-confinedPermit .cp-group-num { background: var(--pb-raised); color: var(--pb-text); box-shadow: inset 0 0 0 1px var(--pb-control); }
#pbApp#pbApp#pbApp .dx-hic { background: var(--pb-text-2); }
/* A-1: AI read buttons are a side path: outlined with a sparkle, never the yellow of the next step */
#pbApp#pbApp#pbApp :is(#pbBatchBtn, #tkAiBtn, .pb-ai-stake-btn) { background: transparent; color: var(--pb-text); border: 1px solid var(--pb-control); box-shadow: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
#pbApp#pbApp#pbApp :is(#pbBatchBtn, #tkAiBtn, .pb-ai-stake-btn)::before { content: ""; flex: 0 0 auto; width: 18px; height: 18px; background: var(--pb-brand-line); -webkit-mask: var(--pb-sparkle) center / contain no-repeat; mask: var(--pb-sparkle) center / contain no-repeat; }
#pbApp#pbApp#pbApp #crAddBtn { background: transparent; color: var(--pb-text); border: 1px solid var(--pb-control); box-shadow: none; }
/* A-1/A-2: Feedback: one quiet size on every screen (the word stays; never shrinks or turns into an icon) */
#pbApp#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill, #pbApp#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill:is(.pb-fb-sm, .pb-fb-ic, .pb-fb-ssm, .pb-fb-sic), html.pb-scrolled #pbApp#pbApp#pbApp#pbApp .pb-screen.active > .pb-header > .pb-fb-pill { width: auto; height: 34px; padding: 0 12px; font-size: 13px; font-weight: 600; background: transparent; color: var(--pb-text); border: 1px solid var(--pb-control); }
#pbApp#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill > svg { display: none !important; }
#pbApp#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill > span { position: static !important; width: auto !important; height: auto !important; margin: 0 !important; overflow: visible !important; clip: auto !important; }
#pbApp#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill::after { top: -5px; bottom: -5px; }
/* A-2: titles: one size, never hyphenated, at most 2 lines */
#pbApp .pb-title, #pbApp .pb-header h1 { -webkit-hyphens: none; hyphens: none; }
html:not(.pb-scrolled) #pbApp#pbApp#pbApp#pbApp .pb-screen:not(#screen-home):not(#screen-login) > .pb-header > .pb-title { font-size: 24px; line-height: 1.2; overflow-wrap: normal; word-break: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; flex: 1 1 0; min-width: 0; }
html.pb-scrolled #pbApp#pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home):not(#screen-login) > .pb-header > .pb-title { font-size: 19px; }
/* A-2: Add to Home: a small chip on its own row under the title (calculators had a 48 px star in the title row) */
#pbApp#pbApp#pbApp .pb-screen > .pb-header > .pb-addhome-wrap { order: 2; flex: 1 0 100%; width: 100%; margin: 0; align-self: auto; }
#pbApp#pbApp#pbApp#pbApp .pb-header .pb-addhome-wrap > .pb-addhome { width: auto; height: 32px; min-height: 32px; padding: 0 12px 0 10px; gap: 6px; font-size: 13px; line-height: 1; font-weight: 600; color: var(--pb-text-2); background: transparent; border: 1px solid var(--pb-control); box-shadow: none; }
#pbApp#pbApp#pbApp#pbApp .pb-header .pb-addhome-wrap > .pb-addhome::before { width: 16px; height: 16px; -webkit-mask: var(--pb-icon-star) center / contain no-repeat; mask: var(--pb-icon-star) center / contain no-repeat; }
#pbApp#pbApp#pbApp#pbApp .pb-header .pb-addhome-wrap > .pb-addhome[aria-pressed="true"] { color: var(--pb-text); background: transparent; border-color: var(--pb-control); }
#pbApp#pbApp#pbApp#pbApp .pb-header .pb-addhome-wrap > .pb-addhome[aria-pressed="true"]::before { -webkit-mask-image: var(--pb-icon-star-fill, var(--pb-icon-star)); mask-image: var(--pb-icon-star-fill, var(--pb-icon-star)); background: var(--pb-brand-line); }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active > .pb-header > .pb-addhome-wrap { display: none; }
/* A-3: Active Permit's header like every other one (its quieter Feedback is now everyone's) */
#pbApp#pbApp#pbApp#pbApp #screen-confinedActive > .pb-header > .pb-fb-pill:not(.pb-fb-ic) { height: 34px; padding: 0 12px; font-size: 13px; }
/* A-6: three tiers. Secondary = outlined; the Quick Run clear is not red */
#pbApp#pbApp .pb-btn.secondary { background: var(--pb-surface); color: var(--pb-text); border: 1px solid var(--pb-control); box-shadow: none; }
#pbApp#pbApp#pbApp #screen-quickrun .pb-qr-clear .pb-btn { color: var(--pb-text-2); border-color: var(--pb-control); }
/* A-10: reference notes are information, not danger */
#pbApp#pbApp :is([data-edu-id="caution-full-standard-text"], [data-edu-id="caution-tabulated-data-not-a-substitute-for-a-competent"], #screen-trenchCalc > .pb-warn, #screen-ventCalc > .pb-warn) { background: var(--pb-info-soft); border-left-color: var(--pb-info); --pb-alert-icon: var(--pb-icon-info); }
#pbApp#pbApp :is([data-edu-id="caution-full-standard-text"], [data-edu-id="caution-tabulated-data-not-a-substitute-for-a-competent"], #screen-trenchCalc > .pb-warn, #screen-ventCalc > .pb-warn)::before { color: var(--pb-info); }
/* A-10: a flag raised at Lock is a "check" (yellow), like the other run warnings */
#pbApp#pbApp #screen-results #lockFlagsMore { margin: 0 16px 10px 16px; padding: 8px 12px; border-radius: 12px; background: var(--pb-warn-soft); border-left: 4px solid var(--pb-warn); }
#pbApp#pbApp #screen-results #lockFlagsMore > summary { color: var(--pb-text); font-weight: 650; }
#pbApp#pbApp #screen-results #lockFlagsMore > summary .pb-ic { color: var(--pb-warn); }
/* D: the Ask tab, when it is the tab showing, looks like the other tabs (it keeps its outline otherwise) */
#pbApp#pbTabBar .pb-tab.pb-tab-ask:not(.pb-tab-locked)[aria-current="page"] .ic, #pbTabBar#pbTabBar .pb-tab.pb-tab-ask:not(.pb-tab-locked)[aria-current="page"] .ic { background: var(--pb-brand-soft); color: var(--pb-brand); }
html.pb-light #pbTabBar#pbTabBar .pb-tab.pb-tab-ask:not(.pb-tab-locked)[aria-current="page"] .ic { background: var(--pb-brand-soft); color: #705105; }
</style>
"""
p.rep("""<!-- PB2:tabbar -->\n""", CSS + """<!-- PB2:tabbar -->\n""")
p.save()
