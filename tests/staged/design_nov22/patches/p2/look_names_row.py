# PHASE 2, A-11: Run Setup's Foreman and Pipelayer boxes were half width, so names were cut ("Tommy Fon",
# "Tommy Fontain"). Each now gets the full row. Display only.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""</style>
<!-- PB2:tabbar -->""", """/* A-11: Foreman and Pipelayer each on a full row (names were cut off) */
#pbApp#pbApp#pbApp #screen-input .pb-jobpair.pb-whorow { grid-template-columns: minmax(0, 1fr); }
</style>
<!-- PB2:tabbar -->""")
p.save()
