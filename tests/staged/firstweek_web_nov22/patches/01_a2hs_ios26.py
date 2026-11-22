# firstweek_web_nov22 patch 01: iPhone "Add to Home Screen" steps for iOS 26.
# iOS 26 Safari's default (Compact) layout has no Share button on screen: Share is inside the ••• menu next to the web
# address (MacRumors iOS 26 how-to: "Tap the ••• button ... then choose Share ... Scroll down and select Add to Home
# Screen ... 'Open as Web App' toggle"). The old steps ("Tap Share, the square with the arrow at the bottom of Safari")
# send a crew member looking for a button that isn't there. New wording everywhere (join sheet, Home card, the r17.10
# Home Screen step with its picture, Settings > Notifications steps, the notifications card line, the Copied button),
# plus the Spanish entries in the line-9 dictionary. The r17.10 step gets a drawn ••• picture next to the Share picture.
# Usage: python3 01_a2hs_ios26.py in.html out.html
import sys, json

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rep(old, new):
    global s
    n = s.count(old)
    assert n == 1, (n, old[:120])
    s = s.replace(old, new)

def raw(k, v):  # one dictionary pair exactly as the line-9 JSON writes it
    return (json.dumps(k, ensure_ascii=False) + ':' + json.dumps(v, ensure_ascii=False)).replace('</', '<\\/')

def dict_del(k):
    global s
    d = json.loads(s[s.index('id="pbI18nDict">') + 16: s.index('</script>', s.index('id="pbI18nDict">'))])
    v = d['t'][k]
    r = raw(k, v)
    if s.count(r + ',') == 1: rep(r + ',', '')
    else: rep(',' + r, '')

def dict_add(pairs):
    i = s.index('id="pbI18nDict">') + 16; d = json.loads(s[i:s.index('</script>', i)])
    for k, _ in pairs: assert k not in d['t'], ('already in the dictionary', k)
    body = ','.join(raw(k, v) for k, v in pairs)
    rep('id="pbI18nDict">{"t":{', 'id="pbI18nDict">{"t":{' + body + ',')

A_EN = 'Tap <strong>•••</strong>, then <strong>Share</strong>. If you see <strong>Share</strong> already, just tap it.'
B_EN = 'Scroll down, tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>. Leave <strong>Open as Web App</strong> on.'

# 1. Settings > Notifications, the iPhone steps
rep('<li>Tap <strong>Share</strong> (the square with an arrow pointing up): at the bottom of the screen on iPhone, at the top on iPad.</li>\n'
    '        <li>Scroll down, tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>',
    '<li>' + A_EN + '</li>\n        <li>' + B_EN + '</li>')

# 2. the notifications card's iPhone line
rep("add the app to your Home Screen first (Share → Add to Home Screen), then turn notifications on there.",
    "add the app to your Home Screen first (••• → Share → Add to Home Screen), then turn notifications on there.")

# 3. the join sheet (iPhone in Safari, Step 1 of 2)
rep("<li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari), then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>",
    "<li>" + A_EN + "</li><li>" + B_EN + "</li>")
rep("ok ? 'Copied. Now Share › Add to Home Screen'", "ok ? 'Copied. Now ••• › Share › Add to Home Screen'")

# 4. the one-time Home card
rep("<li>Tap <strong>Share</strong> (the square with the arrow, at the bottom of Safari).</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>",
    "<li>" + A_EN + "</li><li>" + B_EN + "</li>")

# 5. the r17.10 Home Screen step: text plus a drawn ••• button next to the Share picture
rep("  const PB_OB_SHARE_SVG = '",
    "  const PB_OB_MORE_SVG = '<svg viewBox=\"0 0 24 24\" width=\"24\" height=\"24\" role=\"img\" aria-label=\"the More button (three dots)\" style=\"vertical-align:-6px;margin:0 2px;color:var(--pb-brand-text,#0a66c2);\"><circle cx=\"12\" cy=\"12\" r=\"10.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"/><circle cx=\"7.2\" cy=\"12\" r=\"1.8\" fill=\"currentColor\"/><circle cx=\"12\" cy=\"12\" r=\"1.8\" fill=\"currentColor\"/><circle cx=\"16.8\" cy=\"12\" r=\"1.8\" fill=\"currentColor\"/></svg>'; // firstweek_web_nov22: iOS 26 Safari's ••• menu\n"
    "  const PB_OB_SHARE_SVG = '")
rep("+ '<li>Tap <strong>Share</strong> ' + PB_OB_SHARE_SVG + ' at the bottom of Safari.</li><li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>'",
    "+ '<li>Tap <strong>•••</strong> ' + PB_OB_MORE_SVG + ', then <strong>Share</strong> ' + PB_OB_SHARE_SVG + '. If you see <strong>Share</strong> already, just tap it.</li><li>" + B_EN + "</li>'")

# 6. Spanish: old entries out, new ones in (keys follow the engine's <n> numbering of inline children)
for k in ['Tap <1>Share</1> (the square with the arrow, at the bottom of Safari), then <2>Add to Home Screen</2>, then <3>Add</3>.',
          'Tap <1>Share</1> (the square with the arrow, at the bottom of Safari).',
          'Tap <1>Share</1> <2/> at the bottom of Safari.',
          'Tap <1>Share</1> (the square with an arrow pointing up): at the bottom of the screen on iPhone, at the top on iPad.',
          'Copied. Now Share › Add to Home Screen']:
    dict_del(k)
dict_add([
    ('Tap <1>•••</1>, then <2>Share</2>. If you see <3>Share</3> already, just tap it.',
     'Toque <1>•••</1> y luego <2>Compartir</2>. Si ya ve <3>Compartir</3>, solo tóquelo.'),
    ('Tap <1>•••</1> <2/>, then <3>Share</3> <4/>. If you see <5>Share</5> already, just tap it.',
     'Toque <1>•••</1> <2/> y luego <3>Compartir</3> <4/>. Si ya ve <5>Compartir</5>, solo tóquelo.'),
    ('Scroll down, tap <1>Add to Home Screen</1>, then <2>Add</2>. Leave <3>Open as Web App</3> on.',
     'Baje, toque <1>Agregar a Inicio</1> y luego <2>Agregar</2>. Deje <3>Abrir como app web</3> activado.'),
    ('the More button (three dots)', 'el botón Más (tres puntos)'),
    ('Copied. Now ••• › Share › Add to Home Screen', 'Copiado. Ahora ••• › Compartir › Agregar a Inicio'),
    ('On an iPhone, add the app to your Home Screen first (••• → Share → Add to Home Screen), then turn notifications on there. You’ll log in again there.',
     'En un iPhone, primero agregue la app a su pantalla de inicio (••• → Compartir → Agregar a Inicio) y luego active las notificaciones ahí. Ahí tendrá que iniciar sesión otra vez.'),
])

open(dst, 'w', encoding='utf-8').write(s)
print('01_a2hs_ios26: ok')
