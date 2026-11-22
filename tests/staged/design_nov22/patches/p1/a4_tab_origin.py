# A-4: the bottom tab that lights up is the tab you came from. Opening Daily report, Log Work Without a Run or
# New record > Field ticket from Home lit Records; More > Account & Settings lit Home. Rule: a pushed screen keeps the
# tab of the screen it was opened from (Back restores the tab the screen had); tab roots (Home, Calculators, More,
# Records, Ask), a tab tap, a screen under no tab (run form, results, permit) and a first screen (deep link) keep the
# screen's own tab as before. Display only: no navigation, plan check or history change.
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""    if (stepsBack) { pbHistory.pop(); } else if (name !== pbCurrentScreen) { pbHistory.push(pbCurrentScreen); }""",
"""    let pbTabPrev = null; try { pbTabPrev = window.pbScreenTab(pbCurrentScreen); } catch (e) {} /* design A-4 */
    if (pbTabStack.length > pbHistory.length) pbTabStack.length = pbHistory.length;
    let pbTabBack; if (stepsBack && pbTabStack.length === pbHistory.length && pbHistory.length) pbTabBack = pbTabStack[pbTabStack.length - 1];
    if (stepsBack) { pbHistory.pop(); pbTabStack.pop(); } else if (name !== pbCurrentScreen) { pbHistory.push(pbCurrentScreen); while (pbTabStack.length < pbHistory.length - 1) pbTabStack.push(undefined); pbTabStack.push(pbTabPrev); }""")
p.rep("""    pbCurrentScreen = name;
    if (name === 'confinedActive') pbCheckStorageRoom();""",
"""    pbCurrentScreen = name;
    pbTabOrigin = null; /* design A-4: the tab this screen lights (null: its own) */
    try {
      const own = pbScreenTabOwn(name), roots = { home: 1, calcHub: 1, tools: 1, archive: 1, aiAsk: 1 };
      const tabMove = !!(pbTabMovePending && pbTabMovePending.root === name);
      const from = stepsBack ? pbTabBack : pbTabPrev;
      if (own && !roots[name] && !tabMove && from && from !== own) pbTabOrigin = { screen: name, tab: from };
    } catch (e) { pbTabOrigin = null; }
    if (name === 'confinedActive') pbCheckStorageRoom();""")
p.rep("""  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""",
"""  // design A-4: the screen's own tab (the map), and the tab it lights now (the tab it was opened from)
  function pbScreenTabOwn(n) { try { return pbScreenTabMap(n); } catch (e) { return null; } }
  const pbScreenTabMap = window.pbScreenTab;
  window.pbScreenTab = function(n) { if (pbTabOrigin && n === pbTabOrigin.screen && n === pbCurrentScreen) return pbTabOrigin.tab; return pbScreenTabMap.apply(this, arguments); };
  window.__pbTabOrigin = () => pbTabOrigin;
  window.pbGoBack = function() {
    if (pbCurrentScreen === 'setPassword') { pbSkipNewPassword(); return; }""")
p.rep("""  let pbHistory = [];
  let pbCurrentScreen = 'home';""",
"""  let pbHistory = [];
  let pbTabStack = []; // design A-4: the tab each history entry lit when it was left (same length as pbHistory)
  let pbTabOrigin = null;
  let pbCurrentScreen = 'home';""")
p.save()
