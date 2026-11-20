# legal_nov19 02: the Terms sheet's "In short" line (liability limit, arbitration, 30-day opt-out) also shows under the
# tick on the two newer places a person agrees: the join-by-link screen and the Set Password screen (r17.05 / r17.10).
# Same words as the sheet (pbTermsShow). No new tap, no new step. `python3 02_terms_in_short.py in.html out.html`
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
AGREE = 'I have read and agree to the <a href="terms.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.'
SHORT = 'In short: check every number against the stakes and plans; AI can be wrong; the app never decides if a trench or space is safe; our liability is limited; disputes go to individual arbitration (you can opt out within 30 days).'
def span(i): return '<span>' + AGREE + '<span id="' + i + '" style="display:block;margin-top:6px;font-size:.88rem;opacity:.85;">' + SHORT + '</span></span></label>'
p.rep('id="pbObTerms"><span>' + AGREE + '</span></label>', 'id="pbObTerms">' + span('pbObTermsShort'))
p.rep('id="setPwTerms" style="width:24px;height:24px;flex:none;margin-top:1px;"><span>' + AGREE + '</span></label>',
      'id="setPwTerms" style="width:24px;height:24px;flex:none;margin-top:1px;">' + span('setPwTermsShort'))
p.save()
