#!/usr/bin/env python3
"""Spanish setting, phase 1. python3 01_spanish.py in.html out.html
Adds (a) the translation layer (../engine.js with the dictionary ../dict.json inside it) right after <body>,
(b) Settings > Preferences > Language / Idioma. Nothing else in the page changes."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(sys.argv[1], encoding='utf-8').read()
def rep(s, old, new):
    assert s.count(old) == 1, (s.count(old), old[:80])
    return s.replace(old, new)
eng = open(os.path.join(HERE, '..', 'engine.js'), encoding='utf-8').read()
dct = open(os.path.join(HERE, '..', 'dict.json'), encoding='utf-8').read()
a = eng.index('/*PB_I18N_DICT*/'); b = eng.index('/*END_PB_I18N_DICT*/')
eng = eng[:a] + dct + eng[b + len('/*END_PB_I18N_DICT*/'):]
assert '</script' not in eng.lower()
src = rep(src, '</head>\n<body>\n<div id="pbOldPhone"', '</head>\n<body>\n<script id="pbI18n">\n' + eng + '</script>\n<div id="pbOldPhone"')
src = rep(src, '        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>\n',
  '        <p class="pb-help" id="textSizeMsg" style="display:none;"></p>\n'
  '        <p class="pb-set-label" id="langLabel" data-noi18n>Language / Idioma</p><!-- spanish phase 1 -->\n'
  '        <div class="pb-toggle" id="langToggle" role="group" aria-labelledby="langLabel" data-noi18n>\n'
  '          <button type="button" data-val="en" class="active" aria-pressed="true" onclick="pbSetLang(\'en\')">English</button>\n'
  '          <button type="button" data-val="es" aria-pressed="false" onclick="pbSetLang(\'es\')" lang="es">Español</button>\n'
  '        </div>\n')
open(sys.argv[2], 'w', encoding='utf-8').write(src)
