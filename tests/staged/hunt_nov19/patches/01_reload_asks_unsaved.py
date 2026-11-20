# hunt_nov19 01: "New version ready > Reload" asks first for EVERYTHING a reload would lose, not only the run form.
# r17.08's Reload asked only for pbScreenFormWork (the run form, cutsheet import, the permit form, the management report
# form). Foreman quantities typed with Save Production not tapped, a run note typed with Save Note not tapped, note
# photos still waiting, a run that never saved to Records, unsaved permit work, and the forms other screens guard
# (ticket, job plan, material, inspection checklist, toolbox talk, new job, app problem) were lost with no question.
# The page's own beforeunload question covers those, but iPhone Safari and the iPhone Home Screen app never show it.
# Now Reload uses the same checks as beforeunload and as leaving a screen. Usage: python3 01_reload_asks_unsaved.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""      let busy = null; try { busy = pbScreenFormWork(pbCurrentScreen); } catch (e) { busy = null; }
      if (!busy) { reloadNow(); return; }""",
"""      let busy = null; try { busy = pbScreenFormWork(pbCurrentScreen); } catch (e) { busy = null; }
      // hunt_nov19 01: also what beforeunload asks about (iPhone never shows that question) and what leaving the screen asks about
      if (!busy) { try { busy = pbReloadLosesRunWork() || !!(typeof pbConfinedUnsavedWork === 'function' && (pbConfinedUnsavedWork() || []).length) || pbShellScreenDirty(pbCurrentScreen); } catch (e) { busy = null; } }
      if (!busy) { reloadNow(); return; }""")
p.save()
