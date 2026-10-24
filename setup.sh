#!/bin/bash
# Checks the tools the suite needs. Run from /home/claude after the checkout.
ok=1
for t in node python3 pdftoppm pdftotext; do command -v $t >/dev/null || { echo "missing: $t"; ok=0; }; done
node -e "require('playwright')" 2>/dev/null || node -e "require('/home/claude/.npm-global/lib/node_modules/playwright')" 2>/dev/null || { echo "missing: playwright (node module)"; ok=0; }
python3 -c "import pdfplumber" 2>/dev/null || echo "note: python pdfplumber missing (only hunt2/sweep2-reports/pdf_off.py needs it): pip install pdfplumber --break-system-packages"
[ -d /home/claude/index.html- ] || echo "note: clone the app repo to /home/claude/index.html- first"
[ $ok = 1 ] && echo "setup OK" || exit 1
