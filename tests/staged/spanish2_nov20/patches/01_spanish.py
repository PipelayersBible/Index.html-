#!/usr/bin/env python3
"""Spanish setting, phases 1 + 2 (replaces tests/staged/spanish_nov19/patches/01_spanish.py; do not stack both).
    python3 01_spanish.py in.html out.html
Adds (a) the dictionary as plain data and the translation layer (../engine.js) right after <body>,
(b) Settings > Preferences > Language / Idioma (in the page hidden; shown only when the feature is on).
Nothing else in the page changes.

THE SWITCH: PB_ES_ENABLED below. False = ships hidden (no Language row, no Spanish offer bar, a saved choice is
ignored, the dictionary is never read). True = Spanish is offered. One edit. (Tests set the env var PB_ES_ENABLED=1.)"""
import sys, os
PB_ES_ENABLED = False          # <- flip to True when the safety Spanish has been reviewed
PB_ES_REVIEW_LINK = True       # while hidden: opening the app once with #es-review turns Spanish on for that one phone (for the reviewer).
                               # False (with PB_ES_ENABLED False) = fully off, and the page then carries no Spanish words at all.
if os.environ.get('PB_ES_ENABLED') in ('1', '0'): PB_ES_ENABLED = os.environ['PB_ES_ENABLED'] == '1'
if os.environ.get('PB_ES_REVIEW_LINK') in ('1', '0'): PB_ES_REVIEW_LINK = os.environ['PB_ES_REVIEW_LINK'] == '1'
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(sys.argv[1], encoding='utf-8').read()
def rep(s, old, new):
    assert s.count(old) == 1, (s.count(old), old[:80])
    return s.replace(old, new)
eng = open(os.path.join(HERE, '..', 'engine.js'), encoding='utf-8').read()
dct = open(os.path.join(HERE, '..', 'dict.json'), encoding='utf-8').read()
if not PB_ES_ENABLED and not PB_ES_REVIEW_LINK: dct = '{"t":{},"p":[]}'   # fully off: do not ship the Spanish words at all (saves about 220 KB)
eng = rep(eng, '/*PB_ES_ENABLED*/false/*END*/', 'true' if PB_ES_ENABLED else 'false')
eng = rep(eng, '/*PB_ES_REVIEW_LINK*/true/*END*/', 'true' if PB_ES_REVIEW_LINK else 'false')
assert '</script' not in eng.lower() and '</script' not in dct.lower() and '<!--' not in dct
# the few words the page draws from CSS (no text node to translate): Spanish versions, used only when <html lang="es">
CSS = ('<style id="pbI18nCss">\n'
  'html[lang="es"] #screen-input summary.pb-runsec-head::after { content: \'Cerrar \\25B4\'; }\n'
  'html[lang="es"] #screen-input details.pb-runsec:not([open]) > summary.pb-runsec-head::after { content: \'Abrir \\25BE\'; }\n'
  '@container (max-width: 63.9px) { html[lang="es"] #pbTabBar .pb-tab[data-tab="calculators"] .lb::after { content: "Calc."; } }\n'
  'html[lang="es"] #pbApp .pb-laid-toast { width: max-content; }\n'
  'html[lang="es"] #pbApp #screen-results #resultsBody tr.pb-laid-armed:not([data-laid-strip]) > td:nth-child(2)::before { content: "Suelte: instalado"; }\n'
  'html[lang="es"] #pbApp #screen-results #resultsBody tr.pb-laid-armedundo:not([data-laid-strip]) > td:nth-child(2)::before { content: "Suelte: deshacer"; }\n'
  '@media (max-width: 380px) { html[lang="es"] #pbApp.pb-text-big #screen-rodElevCalc #rodElevLogSection table.pb-table td:nth-child(2)::before { content: "Lectura "; } }\n'
  '</style>\n')
src = rep(src, '</head>\n<body>\n<div id="pbOldPhone"',
  '</head>\n<body>\n<script type="application/json" id="pbI18nDict">' + dct + '</script>\n<script id="pbI18n">\n' + eng + '</script>\n' + CSS + '<div id="pbOldPhone"')
src = rep(src, '        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>\n',
  '        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>\n'
  '        <p class="pb-set-label" id="langLabel" data-noi18n style="display:none">Language / Idioma</p><!-- spanish -->\n'
  '        <div class="pb-toggle" id="langToggle" role="group" aria-labelledby="langLabel" data-noi18n style="display:none">\n'
  '          <button type="button" data-val="en" class="active" aria-pressed="true" onclick="pbSetLang(\'en\')">English</button>\n'
  '          <button type="button" data-val="es" aria-pressed="false" onclick="pbSetLang(\'es\')" lang="es">Español</button>\n'
  '        </div>\n')
open(sys.argv[2], 'w', encoding='utf-8').write(src)
