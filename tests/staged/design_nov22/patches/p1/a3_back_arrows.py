# A-3: a Back arrow on the pushed screens that had none (their old yellow Home square is hidden by design since the
# tab bar came in): Education & Reference, Management report, Report Receipt, Confined Space, Active Permit,
# Quick Run, Run Results. Back goes to the screen before, stepping over the forms behind (run form / Review /
# cutsheet import behind Run Results, the permit form behind Active Permit, the report form behind its receipt);
# with nothing behind, Home. Every leave-without-saving question still runs (it goes through pbGoto).
# Run Setup keeps its Cancel. The hidden Home buttons stay as they were (same element, same function).
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
BTN = '<button type="button" class="pb-back pb-back-hdr" title="Back" aria-label="Back" onclick="pbHeaderBack()"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-back"/></svg></button>'
for scr, eyebrow in [('formulasHub', 'EDUCATION &amp; REFERENCE'), ('reportIssue', 'REPORT TO MANAGEMENT'), ('reportReceipt', 'REPORT TO MANAGEMENT'),
                     ('confinedHub', 'CONFINED SPACE'), ('confinedActive', 'ACTIVE PERMIT'), ('quickrun', 'QUICK RUN'), ('results', 'LOCKED RESULT')]:
    p.rep('<div class="pb-screen" id="screen-%s">\n    <div class="pb-header">\n      <p class="pb-eyebrow"><span>%s</span><button class="pb-back" title="Home"' % (scr, eyebrow),
          '<div class="pb-screen" id="screen-%s">\n    <div class="pb-header">\n      <p class="pb-eyebrow"><span>%s</span>%s<button class="pb-back" title="Home"' % (scr, eyebrow, BTN))
p.rep("""  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""",
"""  // design A-3: the header Back arrow of a screen that had none. The forms behind it are stepped over.
  window.pbHeaderBack = function() {
    const here = pbCurrentScreen;
    const skip = (n) => /^(input|review|cutsheetImport|confinedPermit|login|setPassword)$/.test(n) || n === here
      || (here === 'reportReceipt' && n === 'reportIssue') || (here === 'confinedActive' && n === 'confinedHub');
    while (pbHistory.length && skip(pbHistory[pbHistory.length - 1])) pbHistory.pop();
    if (pbHistory.length) pbGoto(pbHistory[pbHistory.length - 1], true); else pbGoto('home', true);
  };
  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""")
p.save()
