# dates_xing_nov22 d8: "Add your spec books" named the Greenbook for everyone ("the Greenbook in Southern California").
# Now the example follows the company's state (else where the phone is): California the Greenbook; Arizona the MAG
# specs (Phoenix area); Texas NCTCOG (North Texas) and TxDOT; other states no example (the state DOT or city book).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""<p class="s">Your state DOT or city spec book (the Greenbook in Southern California), water and sewer district standards. Ask answers from them first, for everyone in the company.</p>""",
"""<p class="s" id="docsSpecText">Your state DOT or city spec book, water and sewer district standards. Ask answers from them first, for everyone in the company.</p>""")
p.rep("""    { const sc = pbDocsEl('docsSpecCard'); if (sc) sc.hidden = !(pbDocs.ready === true && can && !pbDocs.list.length) || !pbDocsEl('docsForm').hidden || pbDocs.busy; if (add && sc && !sc.hidden) add.hidden = true; } /* r16.24 */""",
"""    { const sc = pbDocsEl('docsSpecCard'); if (sc) sc.hidden = !(pbDocs.ready === true && can && !pbDocs.list.length) || !pbDocsEl('docsForm').hidden || pbDocs.busy; if (add && sc && !sc.hidden) add.hidden = true;
      const tx = pbDocsEl('docsSpecText'); if (tx && sc && !sc.hidden) { /* dates_xing_nov22: the example follows the company's state */
        let c = ''; try { const s = typeof window.pbSrJobState === 'function' ? window.pbSrJobState('') : null; c = s && (s.how === 'company' || s.how === 'here') ? s.code : ''; } catch (e) { c = ''; }
        const ex = { CA: 'the Greenbook in Southern California', AZ: 'the MAG specs in the Phoenix area', TX: 'NCTCOG in North Texas, TxDOT on state roads' }[c];
        const t = 'Your state DOT or city spec book' + (ex ? ' (' + ex + ')' : '') + ', water and sewer district standards. Ask answers from them first, for everyone in the company.';
        if (tx.textContent !== t) tx.textContent = t; } } /* r16.24 */""")
p.save()
