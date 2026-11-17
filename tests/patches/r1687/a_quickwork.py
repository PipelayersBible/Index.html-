import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.87 (owner, Nov 17: "Quick Production" for laser crews): Work Without a Run gets a Home tile for the people who can
# use it, and its form shows the quick part first (job, day, stations, footage, notes, photos); materials, production
# quantities and hours fold under "More details" (open when any of them has a value, or when editing).
rep("""    <div class="pb-home-tile" role="button" tabindex="0" data-pb-a11y-btn="1" id="homeTileNewPermit" onclick="pbHomeStartPermit()">""",
"""    <div class="pb-home-tile" role="button" tabindex="0" data-pb-a11y-btn="1" id="homeTileNoRun" style="display:none;" onclick="pbRecFromHome('norun')">
      <div><div class="name">Log Work Without a Run</div><div class="sub">Footage, photos and a note: for laser crews or work not set up as a run</div></div>
      <div>&rsaquo;</div>
    </div>
    <div class="pb-home-tile" role="button" tabindex="0" data-pb-a11y-btn="1" id="homeTileNewPermit" onclick="pbHomeStartPermit()">""")
rep("""  function pbNrShowRows() { const b = pbNrEl('archiveNoRunBtn'); if (b) b.style.display = pbNrAcc(pbArchiveOwnerUid).ok ? '' : 'none'; }""",
"""  function pbNrShowRows() { const ok = pbNrAcc(pbArchiveOwnerUid).ok; const b = pbNrEl('archiveNoRunBtn'); if (b) b.style.display = ok ? '' : 'none'; const t = pbNrEl('homeTileNoRun'); if (t) t.style.display = ok ? '' : 'none'; /* r16.87 */ }
  // r16.87: "More details" folds the materials, production and hours cards
  function pbNrMoreOpen(F, edit) {
    if (F.more === true || edit) return true;
    const f = F.f || {}, has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    if (['pipeTyped', 'size', 'od', 'bedTyped', 'bedThk', 'shadeTyped', 'shadeThk', 'width', 'manH', 'eqH'].some(k => has(f[k]))) return true;
    if (['pipe', 'bed', 'shade'].some(k => has(f[k]) && f[k] !== 't|' && f[k] !== '')) return true;
    return !!(F.q && Object.keys(F.q).some(k => has(F.q[k])));
  }
  window.pbNrMoreToggle = function(open) { if (pbNrF) pbNrF.more = !!open; };""")
rep("""      + '<section class="pbnr-card" id="nrMatCard"><h3 class="pbnr-h3">Pipe, bedding and shading</h3>'""",
    """      + '<details class="pbnr-more" id="nrMore"' + (pbNrMoreOpen(F, edit) ? ' open' : '') + ' ontoggle="pbNrMoreToggle(this.open)"><summary class="pbnr-h3" style="cursor:pointer;margin:12px 0;">More details: materials, production quantities, hours</summary>'
      + '<section class="pbnr-card" id="nrMatCard"><h3 class="pbnr-h3">Pipe, bedding and shading</h3>'""")
rep("""      + '<section class="pbnr-card" id="nrNoteCard"><h3 class="pbnr-h3">Who, notes and photos</h3>'""",
    """      + '</details>'
      + '<section class="pbnr-card" id="nrNoteCard"><h3 class="pbnr-h3">Who, notes and photos</h3>'""")
open(out, 'w', encoding='utf-8').write(s); print('ok')
