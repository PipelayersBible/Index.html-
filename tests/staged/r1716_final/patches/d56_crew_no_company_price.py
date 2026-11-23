# r1716_final decision 56: Settings > What each plan includes hides the company price paragraphs from foremen and pipelayers.
# Hidden from a signed-in foreman or pipelayer of a company (sbCachedSubscription.companyRole 'foreman' / 'pipelayer', and
# not the company account by pb_my_plan's is_owner): the Company plan $99 / $12 / yearly paragraph, the plan-reading add-on
# price ($1 a sheet, company plans only) and the company-account / company-pool AI allowance sentences. They see one line
# "Company plan: your company pays for it." instead. Managers (PMs / supers), the company account, people with no company
# and signed-out phones see everything as before. The Individual plan price and the per-person / individual AI limits stay
# for everyone. Display only (the server still sends prices to every member in pb_my_plan; see NOTES.md).
# Re-checked each time prices are filled (pbBetaRender) and whenever the box is opened.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""<div class="pb-help" id="settingsPlanHelp"><!-- pricing_nov20 -->
          <p><b>Company plan: <span data-pbp="base">$99</span> a month</b>""",
"""<div class="pb-help" id="settingsPlanHelp"><!-- pricing_nov20 -->
          <p data-pb-crew-only hidden><b>Company plan:</b> your company pays for it.</p><!-- r1716 decision 56 -->
          <p data-pb-co-price><b>Company plan: <span data-pbp="base">$99</span> a month</b>""")
p.rep("""          <p><b>Plan reading (add-on for company plans): <span data-pbp="sheet">$1</span> a sheet</b>""",
"""          <p data-pb-co-price><b>Plan reading (add-on for company plans): <span data-pbp="sheet">$1</span> a sheet</b>""")
p.rep("""A person on a company plan: 25 a day. The company account: 5 a day. An individual plan: 15 a day, 50 a month. A company shares 60 a month for each person on its plan. The app tells you""",
"""A person on a company plan: 25 a day. <span data-pb-co-price>The company account: 5 a day. </span>An individual plan: 15 a day, 50 a month. <span data-pb-co-price>A company shares 60 a month for each person on its plan. </span>The app tells you""")
p.rep("""        document.querySelectorAll('[data-pbp]').forEach((el) => { const t = v[el.getAttribute('data-pbp')]; if (t && el.textContent !== t) el.textContent = t; }); } catch (e) {}
    }""",
"""        document.querySelectorAll('[data-pbp]').forEach((el) => { const t = v[el.getAttribute('data-pbp')]; if (t && el.textContent !== t) el.textContent = t; }); } catch (e) {}
      try { const crew = pbCrewNoCoPrice(); /* r1716 decision 56 */
        document.querySelectorAll('[data-pb-co-price]').forEach((el) => { el.hidden = crew; });
        document.querySelectorAll('[data-pb-crew-only]').forEach((el) => { el.hidden = !crew; }); } catch (e) {}
    }
    function pbCrewNoCoPrice() { /* r1716 decision 56: a foreman or pipelayer of a company doesn't see the company's price */
      const s = sbCachedSubscription;
      if (!sbUser || !s || typeof s !== 'object' || !s.companyId || (plan && plan.is_owner)) return false;
      return s.companyRole === 'foreman' || s.companyRole === 'pipelayer';
    }
    window.pbPriceFill = pbPriceFill;
    document.addEventListener('toggle', (e) => { if (e.target && e.target.id === 'settingsPlanMore') { try { pbPriceFill(); } catch (x) {} } }, true);""")
p.save()
