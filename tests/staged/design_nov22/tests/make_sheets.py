# contact sheets: sheet_<screen>.png = BEFORE | AFTER side by side (top 1700 css px each), labelled
import sys
from PIL import Image, ImageDraw, ImageFont
D = sys.argv[1]
try: F = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 40)
except Exception: F = ImageFont.load_default()
for n in ['home', 'home_dark', 'runsetup', 'results', 'calculator', 'permit', 'records', 'permit_active', 'permit_active_scrolled']:
    a = Image.open('%s/before_%s.png' % (D, n)).convert('RGB'); b = Image.open('%s/after_%s.png' % (D, n)).convert('RGB')
    H = min(max(a.height, b.height), 3400)
    W = Image.new('RGB', (a.width + b.width + 60, H + 90), 'white'); d = ImageDraw.Draw(W)
    d.text((20, 20), 'BEFORE (r17.14)', fill='black', font=F); d.text((a.width + 60, 20), 'AFTER (design candidate)', fill='black', font=F)
    W.paste(a.crop((0, 0, a.width, min(a.height, H))), (0, 90)); W.paste(b.crop((0, 0, b.width, min(b.height, H))), (a.width + 60, 90))
    d.line([(a.width + 30, 90), (a.width + 30, H + 90)], fill=(200, 200, 200), width=4)
    W.save('%s/sheet_%s.png' % (D, n)); print('sheet', n, W.size)
