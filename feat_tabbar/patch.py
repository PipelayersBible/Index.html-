#!/usr/bin/env python3
"""feat_tabbar (r15.31, owner 10:45 PM: "Navigation bar is floating again" — Safari tab restored from the phone's tab list,
the bar sat mid-screen with content below it). iOS brings a page back with a layout viewport SHORTER than what is visible
(a stale height from before the tab was put away); `position: fixed; bottom: 0` then sits at that stale bottom. The r14.1
re-seat computed the right shift (+840 px here) but threw it away as "not a stale offset" because it was larger than half
the layout height. Now: a positive shift (the bar needs to move DOWN to the visible bottom) is applied up to the visual
viewport's height; a negative one (which would push the bar off-screen) is still capped. A cheap periodic check (every
1.5 s while the page is visible) catches restores where no resize/pageshow event fires, and a detected stale layout also
nudges the scroll so iOS recomputes."""
import sys
R = []
def r(n, a, b, cnt=1): R.append((n, a, b, cnt))
r('T1', "          if (Math.abs(shift) < 2 || Math.abs(shift) > root.clientHeight / 2) shift = 0; // noise, or not a stale offset",
  "          if (Math.abs(shift) < 2 || (shift < 0 && -shift > root.clientHeight / 2) || shift > root.clientHeight) shift = 0; // feat_tabbar: noise, or a shift that would hide the bar; a stale SHORT layout viewport (bar mid-screen after a tab restore) is a positive shift and is applied")
r('T2', "    window.addEventListener('pageshow', pbVvSettle);",
  "    window.addEventListener('pageshow', pbVvSettle);\n    setInterval(() => { if (document.visibilityState === 'visible' && !pbShellKb) pbVvSeat(); }, 1500); // feat_tabbar: a restore with no event still gets seated")
def apply(s):
    for n, a, b, cnt in R:
        c = s.count(a); assert c == cnt, (n, c); s = s.replace(a, b)
    return s
if __name__ == '__main__':
    s = open(sys.argv[1], encoding='utf-8').read(); s = apply(s); open(sys.argv[2], 'w', encoding='utf-8').write(s); print('tabbar written', len(s))
