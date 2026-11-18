import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# beta audit 05: on a brand-new beta company nobody is linked yet. A pipelayer with no foreman link never sees any crew
# run (pb_prod.rr_crew_can_view needs an open crew link), but Crew runs today only said "No crew runs today. A run shows
# here once your foreman ... locks it", so he waits for something that can't come. With no foreman linked (the crew links
# the app already loaded say so) the empty list now says how to fix it, with a button to My production.
rep("""    if (!L.length) return '<p class="pbd-dim" id="cvEmpty">No crew runs today. A run shows here once your foreman or a crew member locks it and their phone has signal.</p>';""",
    """    if (!L.length) { /* beta audit 05: no foreman picked yet: say so */
      let noFm = false; try { const uid = pbArchiveOwnerUid, a = pbProdAccMem.get(uid), CL = pbCrew && pbCrew.uid === uid ? pbCrew.links : null; noFm = !!(a && a.role === 'pipelayer' && CL && typeof CL === 'object' && !(CL.my_foreman && CL.my_foreman.id)); } catch (e) { noFm = false; }
      if (noFm) return '<p class="pbd-dim" id="cvEmpty">You haven\\u2019t picked your foreman yet, so no crew runs show here. Pick him in My production.</p><div class="pb-btn-wrap"><button type="button" class="pb-btn secondary" id="cvPickFm" onclick="pbOpenProdMine()">Open My Production</button></div>';
      return '<p class="pbd-dim" id="cvEmpty">No crew runs today. A run shows here once your foreman or a crew member locks it and their phone has signal.</p>'; }""")
open(out, 'w', encoding='utf-8').write(s)
