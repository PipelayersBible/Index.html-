# PHASE 2, A-1 (Tommy Nov 21): yellow shows where a decision is still needed. A required box or choice that is still
# empty gets a yellow outline ("needs a pick"); it goes calm the moment it is filled. Run Setup: Pipe size (Select).
# Entry Permit: its required boxes (the same list the permit already counts: "3 of 15 required boxes filled").
# Display only: nothing is blocked or asked that wasn't before.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""      const miss = Object.keys(g.req).filter(id => !pbCpVal(id)).map(id => ({ msg: g.req[id] + (id === 'cpRescue' ? ' are required.' : ' is required.'), field: id })); /* clean_c: a plural label */""",
"""      const miss = Object.keys(g.req).filter(id => !pbCpVal(id)).map(id => ({ msg: g.req[id] + (id === 'cpRescue' ? ' are required.' : ' is required.'), field: id })); /* clean_c: a plural label */
      Object.keys(g.req).forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('pb-need-pick', !pbCpVal(id)); }); /* design A-1: still to fill = yellow outline */""")
p.rep("""</style>
<!-- PB2:tabbar -->""", """/* A-1: a box or choice still to fill: a yellow outline ("needs a pick"); calm once it is filled */
#pbApp#pbApp#pbApp :is(input, select, textarea).pb-need-pick, #pbApp#pbApp#pbApp #screen-input #runIdSel:has(option[value=""]:checked) { border-color: var(--pb-brand); box-shadow: inset 0 0 0 1px var(--pb-brand); }
html.pb-light #pbApp#pbApp#pbApp :is(input, select, textarea).pb-need-pick, html.pb-light #pbApp#pbApp#pbApp #screen-input #runIdSel:has(option[value=""]:checked) { border-color: #D9A300; box-shadow: inset 0 0 0 1px #D9A300; }
</style>
<!-- PB2:tabbar -->""")
p.save()
