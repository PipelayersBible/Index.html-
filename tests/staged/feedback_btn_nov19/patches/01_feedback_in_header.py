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
:is(#pbApp#pbApp#pbApp .pb-header, html.pb-cx #pbTabBar#pbTabBar#pbTabBar .pbx-side-foot) > .pb-fb-pill { -webkit-appearance: none; appearance: none; position: relative; flex: 0 0 auto; order: 1; align-self: center; width: auto; min-width: 0; max-width: none; height: 36px; min-height: 0; margin: 0; padding: 0 12px; border: 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; font: 600 14px/1 'Inter', sans-serif; letter-spacing: 0; text-transform: none; white-space: nowrap; color: #14171C; background: var(--pbl-yellow, #F5BF1F); box-shadow: none; transform: none; filter: none; }
:is(#pbApp#pbApp#pbApp .pb-header, html.pb-cx #pbTabBar#pbTabBar#pbTabBar .pbx-side-foot) > .pb-fb-pill::after { content: ""; position: absolute; left: -4px; right: -4px; top: -4px; bottom: -4px; }
:is(#pbApp#pbApp#pbApp .pb-header, html.pb-cx #pbTabBar#pbTabBar#pbTabBar .pbx-side-foot) > .pb-fb-pill:active { filter: brightness(.92); }
:is(#pbApp#pbApp#pbApp .pb-header, html.pb-cx #pbTabBar#pbTabBar#pbTabBar .pbx-side-foot) > .pb-fb-pill:focus-visible { outline: none; box-shadow: var(--pb-ring, 0 0 0 3px rgba(245,191,31,.5)); }
#pbApp#pbApp#pbApp .pb-header > .pb-eyebrow ~ .pb-fb-pill { margin-left: 0; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill { height: 34px; font-size: 13px; }
html:not(.pb-scrolled) #pbApp#pbApp#pbApp .pb-screen:not(#screen-home) > .pb-header.pb-fb-t > .pb-title { font-size: var(--pb-fb-ts); }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home):not(#screen-login) > .pb-header.pb-fb-u > .pb-title { font-size: var(--pb-fb-tss); }
/* sizes: the word when the title has room for it; a smaller word, then the icon alone, when the word would push the title onto another line (picked by pbFbFit, never taller than the header was) */
.pb-fb-pill > svg { display: none; width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; pointer-events: none; }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill.pb-fb-sm { height: 30px; padding: 0 8px; font-size: 12px; }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill.pb-fb-sm::after { top: -7px; bottom: -7px; }
#pbApp#pbApp#pbApp .pb-header > .pb-fb-pill.pb-fb-ic { width: 36px; height: 36px; padding: 0; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill.pb-fb-ic { width: 34px; height: 34px; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill:is(.pb-fb-sm, .pb-fb-ssm) { height: 30px; padding: 0 8px; font-size: 12px; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill.pb-fb-ssm::after { top: -7px; bottom: -7px; }
html.pb-scrolled #pbApp#pbApp#pbApp .pb-screen.active:not(#screen-home) > .pb-header > .pb-fb-pill.pb-fb-sic { width: 34px; height: 34px; padding: 0; }
.pb-fb-pill.pb-fb-ic > svg, html.pb-scrolled .pb-header > .pb-fb-pill.pb-fb-sic > svg { display: block; }
.pb-fb-pill.pb-fb-ic > span, html.pb-scrolled .pb-header > .pb-fb-pill.pb-fb-sic > span { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
#pbApp#pbApp#pbApp #screen-confinedActive > .pb-header > .pb-fb-pill:not(.pb-fb-ic) { height: 30px; padding: 0 10px; font-size: 13px; }
#pbApp#pbApp#pbApp #screen-confinedActive > .pb-header > .pb-fb-pill::after { top: -7px; bottom: -7px; }
#pbApp#pbApp#pbApp #screen-confinedActive > .pb-header > .pb-fb-pill { background: none; color: var(--pb-text-2); border: 1px solid var(--pb-control, #8a8f98); font-weight: 600; } /* quiet beside EMERGENCY */
/* computer layout, office Home: that screen's header is hidden, so the button sits in the side menu (always on screen), above Field tools */
html.pb-cx #pbTabBar#pbTabBar#pbTabBar .pbx-side-foot > .pb-fb-pill { order: 0; align-self: flex-start; margin: 0 0 10px 10px; }
/* last resort (a screen with no header and no such row): a fixed pill in the top-right corner */
.pb-fb-pill.pb-fb-float { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); top: calc(10px + env(safe-area-inset-top, 0px)); z-index: 39; box-shadow: 0 2px 8px rgba(0,0,0,.25); }
html.pb-fb-open .pb-fb-pill.pb-fb-float { display: none !important; }
@media print { .pb-fb-pill { display: none !important; } }""")

# 2. JS: put the one button into the showing screen's header (again on every screen change / render)
rep("""      let pill = document.getElementById('pbFbPill');
      const fbOn = !!sbUser; /* r16.92: every signed-in account */
      if (!pill && fbOn) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'pbFbPill'; pill.className = 'pb-fb-pill'; pill.textContent = 'Feedback'; pill.onclick = () => window.pbFeedbackOpen(); document.body.appendChild(pill); }
      if (pill) pill.hidden = !fbOn || ['appProblem', 'appProblems', 'login', 'auth', 'confinedActive'].includes(typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '');""",
"""      pbFbPlace(); pbFbSoon();""")
# 3. JS: pick the button's size so the header is never taller because of it
rep("""    function pbBetaRender() {""",
"""    /* feedback_btn_nov19: the header is never taller, and its title never squeezed onto another line, because of the Feedback button:
       the word if it fits, else a smaller word, else the icon alone. Measured once per screen / width / title (not while the header is in its scrolled, compact state). */
    const pbFbSizes = {};
    function pbFbFit(hd, pill, sid) {
      try {
        const t = hd.querySelector(':scope > .pb-title'), app = document.getElementById('pbApp');
        if (!hd.offsetWidth) return; /* not laid out yet: the next call measures */
        const k = sid + '|' + window.innerWidth + '|' + (app ? app.className : '') + '|' + (t ? t.textContent : '') + '|' + [...hd.children].map(c => c === pill || c === t ? '' : c.offsetWidth).join(',') + '|' + [...hd.querySelectorAll(':scope > .pb-eyebrow > *')].map(c => c.offsetWidth).join(',');
        const set = (c) => { pill.classList.toggle('pb-fb-sm', c === 'pb-fb-sm'); pill.classList.toggle('pb-fb-ic', c === 'pb-fb-ic'); };
        const setS = (c) => { pill.classList.toggle('pb-fb-ssm', c === 'pb-fb-ssm'); pill.classList.toggle('pb-fb-sic', c === 'pb-fb-sic'); }; /* its size while the page is scrolled (compact header) */
        if (pill._k === k) return;
        const tsz = (px) => { if (px) { hd.style.setProperty('--pb-fb-ts', px + 'px'); hd.classList.add('pb-fb-t'); } else { hd.style.removeProperty('--pb-fb-ts'); hd.classList.remove('pb-fb-t'); } };
        const tszS = (px) => { if (px) { hd.style.setProperty('--pb-fb-tss', px + 'px'); hd.classList.add('pb-fb-u'); } else { hd.style.removeProperty('--pb-fb-tss'); hd.classList.remove('pb-fb-u'); } };
        if (k in pbFbSizes) { set(pbFbSizes[k][0]); tsz(pbFbSizes[k][1]); setS(pbFbSizes[k][2]); tszS(pbFbSizes[k][3]); pill._k = k; return; }
        /* measure the header at full size: if the page is scrolled (compact header), switch that off for the measurement only, with the header's own transitions off so the numbers are final; nothing is painted in between */
        const root = document.documentElement, scrolled = root.classList.contains('pb-scrolled'), els = [hd, t, pill].filter(Boolean), was = els.map(e => e.style.transition);
        els.forEach(e => { e.style.transition = 'none'; }); if (scrolled) root.classList.remove('pb-scrolled');
        const spill = () => { if (!t) return 0; const r = document.createRange(); r.selectNodeContents(t); return Math.max(0, Math.ceil(r.getBoundingClientRect().right - t.getBoundingClientRect().right)); };
        let pick = null;
        pill.style.display = 'none'; const h0 = hd.getBoundingClientRect().height, s0 = spill(); pill.style.display = '';
        if (h0 > 0) {
          tsz(0); const f0 = t && sid !== 'screen-home' ? parseFloat(getComputedStyle(t).fontSize) || 0 : 0;
          const steps = f0 > 19 ? [0, Math.max(19, Math.round(f0 * 0.86)), Math.max(19, Math.round(f0 * 0.75))] : [0]; /* the title a little smaller before the word is given up */
          const tries = []; for (const z of steps) for (const c of ['', 'pb-fb-sm']) tries.push([c, z]); for (const z of steps) tries.push(['pb-fb-ic', z]);
          pick = tries[tries.length - 1];
          for (const q of tries) { set(q[0]); tsz(q[1]); if (hd.getBoundingClientRect().height <= h0 + 0.5 && spill() <= s0) { pick = q; break; } }
          set(pick[0]); tsz(pick[1]); pick[2] = ''; pick[3] = 0; tszS(0);
          if (sid !== 'screen-home') { /* the same for the compact header of a scrolled page: never bigger than above, smaller if the word would wrap the title there */
            root.classList.add('pb-scrolled'); setS('');
            pill.style.display = 'none'; const h1 = hd.getBoundingClientRect().height, s1 = spill(); pill.style.display = '';
            const ts2 = pick[0] === 'pb-fb-ic' ? [''] : pick[0] === 'pb-fb-sm' ? ['', 'pb-fb-sic'] : ['', 'pb-fb-ssm', 'pb-fb-sic'];
            pick[2] = ts2[ts2.length - 1]; let fit = false;
            for (const c of ts2) { setS(c); if (hd.getBoundingClientRect().height <= h1 + 0.5 && spill() <= s1) { pick[2] = c; fit = true; break; } }
            setS(pick[2]);
            if (!fit && t) for (const z of [17, 16]) { tszS(z); pick[3] = z; if (hd.getBoundingClientRect().height <= h1 + 0.5 && spill() <= s1) { fit = true; break; } }
            if (!fit) { pick[3] = 0; tszS(0); }
            root.classList.remove('pb-scrolled');
          }
        }
        if (scrolled) root.classList.add('pb-scrolled');
        void hd.offsetHeight; els.forEach((e, i) => { e.style.transition = was[i]; });
        if (pick !== null) { pbFbSizes[k] = pick; pill._k = k; } /* header not laid out yet: measured on the next call */
      } catch (e) {}
    }
    let pbFbT1 = 0, pbFbT2 = 0; /* again once the new screen has settled (its header can gain a back button or a star a moment later) */
    const pbFbSoon = () => { clearTimeout(pbFbT1); clearTimeout(pbFbT2); pbFbT1 = setTimeout(pbFbPlace, 0); pbFbT2 = setTimeout(pbFbPlace, 350); };
    window.addEventListener('resize', pbFbSoon);
    let pbFbMo = null, pbFbMoOn = null; /* the header's title or buttons change while the screen is open: fit again */
    const pbFbWatch = (hd) => { try { if (pbFbMoOn === hd || typeof MutationObserver !== 'function') return; if (!pbFbMo) pbFbMo = new MutationObserver(pbFbSoon); pbFbMo.disconnect(); pbFbMoOn = hd; if (hd) pbFbMo.observe(hd, { childList: true, characterData: true, subtree: true }); } catch (e) {} };
    function pbFbPlace() {
      try {
      let pill = document.getElementById('pbFbPill');
      const fbOn = !!sbUser; /* r16.92: every signed-in account */
      if (!pill && fbOn) { pill = document.createElement('button'); pill.type = 'button'; pill.id = 'pbFbPill'; pill.className = 'pb-fb-pill'; pill.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5h16v11H11l-5 4v-4H4z"/><path d="M8 9h8"/><path d="M8 12.2h5"/></svg><span>Feedback</span>'; pill.setAttribute('aria-label', 'Send feedback'); pill.title = 'Send feedback'; pill.onclick = () => window.pbFeedbackOpen(); document.body.appendChild(pill); }
      if (pill) {
        const scrName = typeof pbCurrentScreen === 'string' ? pbCurrentScreen : '';
        pill.hidden = !fbOn || ['login', 'auth'].includes(scrName); /* feedback_btn_nov19: every signed-in screen */
        /* feedback_btn_nov19: the button lives in the header bar of the screen that is showing (top-right), not on top of the page */
        try {
          const scr = document.getElementById('screen-' + scrName) || document.querySelector('#pbApp .pb-screen.active');
          const hd = scr && scr.querySelector(':scope > .pb-header');
          const shown = !!hd && getComputedStyle(hd).display !== 'none';
          const foot = !shown ? document.getElementById('pbxSideFoot') : null, alt = foot && foot.offsetWidth > 0 ? foot : null;
          if (shown) { if (pill.parentNode !== hd || hd.lastElementChild !== pill) hd.appendChild(pill); pill.classList.remove('pb-fb-float'); if (!pill.hidden) pbFbFit(hd, pill, scr.id); pbFbWatch(hd); }
          else if (alt) { if (pill.parentNode !== alt || alt.firstElementChild !== pill) alt.insertBefore(pill, alt.firstChild); pill.classList.remove('pb-fb-float', 'pb-fb-sm', 'pb-fb-ic', 'pb-fb-ssm', 'pb-fb-sic'); pill._k = ''; pbFbWatch(alt); }
          else { if (pill.parentNode !== document.body) document.body.appendChild(pill); pill.classList.remove('pb-fb-sm', 'pb-fb-ic', 'pb-fb-ssm', 'pb-fb-sic'); pill.classList.add('pb-fb-float'); pill._k = ''; pbFbWatch(null); }
        } catch (e) {}
      }
      } catch (e) {}
    }
    function pbBetaRender() {""")
open(sys.argv[2], 'w', encoding='utf-8').write(src)
