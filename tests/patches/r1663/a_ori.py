import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
a = "    try { var D = window.DeviceOrientationEvent; if (!D) return; if (typeof D.requestPermission === 'function') D.requestPermission().then(function (r) { if (r === 'granted') listen(); }).catch(function () {}); else listen(); } catch (e) {}"
assert s.count(a) == 1
s = s.replace(a, "    try { var D = window.DeviceOrientationEvent; if (!D) return; var asked = false; try { asked = localStorage.getItem('pbOriAsked') === '1'; } catch (e) {}\n"
  "      if (typeof D.requestPermission === 'function' && !asked) { try { localStorage.setItem('pbOriAsked', '1'); } catch (e) {} D.requestPermission().then(function (r) { if (r === 'granted') listen(); }).catch(function () {}); } else listen(); } catch (e) {} /* r16.63: asked once, ever; after that the compass is used only if the phone still allows it, never asked again */")
s = s.replace("const PB_APP_BUILD = 'r16.62 · 2026-11-16';", "const PB_APP_BUILD = 'r16.63 · 2026-11-16';")
assert "r16.63 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
