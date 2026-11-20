# declutter 02: Company Home (company account, PMs, superintendents), phone and computer.
#  - the loose pills (New record, Company production, Company tickets, My production, inspections) and the dashed
#    "Field tools" row become ONE group under a "Tools" heading: a plain list on a phone, a row of buttons on a computer.
#    Same buttons, same ids, same rules for who sees which.
#  - computer: "New job" was on the screen twice (side menu and Jobs heading). The side-menu button was also unstyled
#    (its style was written for inside the page; the menu is outside it). Now: the side menu's button is the yellow one,
#    and the Jobs heading keeps its button only where there is no side menu (phone / narrow window).
from _rep import P
p = P()
p.rep('''      <div class="pbx-links" role="group" aria-label="Company">''',
      '''      <h2 class="pbx-h dc-tools-h" id="homeCoToolsHead">Tools</h2>
      <div class="dc-tools" id="homeCoToolsGroup">
      <div class="pbx-links" role="group" aria-label="Company">''')
p.rep('''<span class="sub" id="homeCoToolsSub">New run, Quick Run, permits, shortcuts</span></span><span class="chev" aria-hidden="true"></span></button>
    </section>''', '''<span class="sub" id="homeCoToolsSub">New run, Quick Run, permits, shortcuts</span></span><span class="chev" aria-hidden="true"></span></button>
      </div>
    </section>''')
CSS = r'''
<style id="dcCoStyle">
/* declutter 02 (Nov 19): Company Home: one Tools group */
#pbApp#pbApp #homeCompany .dc-tools-h { margin: 28px var(--pb-gutter) 0 var(--pb-gutter); }
#pbApp#pbApp #homeCompany .dc-tools { margin: 10px var(--pb-gutter) 0 var(--pb-gutter); background: var(--pb-surface); border: 1px solid var(--pbx-line); border-radius: var(--pb-r-card, 14px); box-shadow: var(--pb-elev-1); overflow: hidden; }
#pbApp#pbApp #homeCompany .dc-tools .pbx-links { display: block; margin: -1px 0 0 0; }
#pbApp#pbApp #homeCompany .dc-tools .pbx-link { display: flex; width: 100%; box-sizing: border-box; min-height: 54px; padding: 0 16px; gap: 14px; border: 0; border-top: 1px solid var(--pb-divider); border-radius: 0; background: transparent; font-size: 16px; font-weight: 600; text-align: left; }
#pbApp#pbApp #homeCompany .dc-tools .pbx-link .pb-ic { width: 22px; height: 22px; flex: 0 0 auto; }
#pbApp#pbApp #homeCompany .dc-tools .pbx-link::after { content: ""; flex: 0 0 auto; width: 20px; height: 20px; margin-left: auto; background: var(--pb-text-2); -webkit-mask: var(--pb-icon-chevron-right) center / contain no-repeat; mask: var(--pb-icon-chevron-right) center / contain no-repeat; }
#pbApp#pbApp#pbApp #homeCompany .dc-tools #homeCoTools { width: 100%; max-width: none; margin: 0; min-height: 60px; padding-left: 16px; padding-right: 16px; column-gap: 14px; grid-template-columns: 22px minmax(0, 1fr) 20px; border: 0; border-top: 1px solid var(--pb-divider); border-radius: 0; background: transparent; box-shadow: none; }
#pbApp#pbApp #homeCompany .dc-tools #homeCoTools .pb-coh-ic { width: 22px; height: 22px; background: var(--pb-text-2); }
#pbApp#pbApp #homeCompany .dc-tools #homeCoTools .name { font-size: 16px; font-weight: 600; }
#pbApp#pbApp #homeCompany .dc-tools #homeCoTools .sub { font-size: 14px; }
#pbApp#pbApp #homeCompany .dc-tools :is(.pbx-link, #homeCoTools):focus-visible { box-shadow: inset 0 0 0 3px var(--pb-brand); }
@media (min-width: 1024px) {
  /* a computer has the room: the same group as a row of buttons */
  html.pb-cx.pbx-wide #pbApp#pbApp #homeCompany .dc-tools { display: flex; flex-wrap: wrap; gap: 10px; background: transparent; border: 0; box-shadow: none; overflow: visible; }
  html.pb-cx.pbx-wide #pbApp#pbApp #homeCompany .dc-tools .pbx-links { display: contents; }
  html.pb-cx.pbx-wide #pbApp#pbApp#pbApp #homeCompany .dc-tools :is(.pbx-link, #homeCoTools) { flex: 0 1 auto; width: auto; min-height: 48px; padding: 0 16px; border: 1px solid var(--pbx-line-2); border-radius: 12px; background: var(--pb-surface); }
  html.pb-cx.pbx-wide #pbApp#pbApp#pbApp #homeCompany .dc-tools #homeCoTools { display: inline-flex; align-items: center; gap: 10px; }
  html.pb-cx.pbx-wide #pbApp#pbApp #homeCompany .dc-tools #homeCoTools .sub { display: none; }
  html.pb-cx.pbx-wide #pbApp#pbApp #homeCompany .dc-tools .pbx-link::after { margin-left: 2px; }
  /* New job: once on the screen. The side menu has it on every screen. */
  html.pb-cx #pbApp#pbApp #screen-home #homeCxNew { display: none; }
}
/* the side menu's New job button: the app's main-button look (it had none) */
html.pb-cx #pbTabBar .pbx-side-new .pbx-newbtn { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin: 0; border: 0; background: var(--pb-brand); color: var(--pb-brand-ink); font: inherit; font-size: 15px; font-weight: 750; cursor: pointer; white-space: nowrap; }
html.pb-light.pb-cx #pbTabBar .pbx-side-new .pbx-newbtn { background: var(--pbl-yellow, #F5BF1F); }
html.pb-cx #pbTabBar .pbx-side-new .pbx-newbtn .pb-ic { width: 18px; height: 18px; stroke-width: 2.6; }
html.pb-cx #pbTabBar .pbx-side-new .pbx-newbtn:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--pb-canvas), 0 0 0 6px var(--pb-brand); }
</style>
'''
p.rep('''<script id="dcHomeScript">''', CSS + '''<script id="dcHomeScript">''')
p.save()
