# 08: plan sheet viewer: a tile that can't be downloaded says so ("No signal…" / "Couldn't load…", with Try Again), and
# the missing tiles are fetched again by themselves when the phone is back online.
import sys
s=open(sys.argv[1],encoding='utf-8').read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""  async function pbPlanTile(img) {
    if (img.dataset.loaded) return; img.dataset.loaded = '1';
    try {
      const { data, error } = await sbClient.storage.from('plan-sets').download(img.dataset.path);
      if (error || !data) { img.dataset.loaded = ''; return; }
      const u = URL.createObjectURL(data); pbPlanV.urls.push(u); img.src = u;
    } catch (e) { img.dataset.loaded = ''; }
  }""",
"""  /* bughunt 08: a sheet that can't be downloaded says so, and is fetched again when back online or on Try Again */
  function pbPlanMiss(on) {
    let el = pbPlansEl('planSheetMiss'); const view = pbPlansEl('planView');
    if (!on) { if (el) el.hidden = true; return; }
    if (!el && view && view.parentNode) { el = document.createElement('p'); el.id = 'planSheetMiss'; el.className = 'pb-docs-line'; el.setAttribute('role', 'status'); el.style.margin = '6px 16px'; view.parentNode.insertBefore(el, view); }
    if (!el) return;
    el.hidden = false;
    el.innerHTML = escapeHtml(navigator.onLine === false ? 'No signal. This sheet loads when you’re back online.' : 'Couldn’t load this sheet. Check your signal.') + ' <button type="button" class="pb-btn ghost small" onclick="pbPlanTilesAgain()">Try Again</button>';
  }
  window.pbPlanTilesAgain = function() {
    if (pbCurrentScreen !== 'planSheet') return;
    pbPlanMiss(false);
    const cv = pbPlansEl('planCanvas'); if (cv) cv.querySelectorAll('img[data-path]').forEach((im) => { if (!im.dataset.loaded) pbPlanTile(im); });
  };
  window.addEventListener('online', () => setTimeout(() => { try { window.pbPlanTilesAgain(); } catch (e) {} }, 1500));
  async function pbPlanTile(img) {
    if (img.dataset.loaded) return; img.dataset.loaded = '1';
    try {
      const { data, error } = await sbClient.storage.from('plan-sets').download(img.dataset.path);
      if (error || !data) { img.dataset.loaded = ''; if (img.isConnected) pbPlanMiss(true); return; }
      const u = URL.createObjectURL(data); pbPlanV.urls.push(u); img.src = u;
    } catch (e) { img.dataset.loaded = ''; if (img.isConnected) pbPlanMiss(true); }
  }""")
rep("""    pbPlanFree(); pbPlanV.i = Math.max(0, Math.min(k, pbPlanV.sheets.length - 1)); pbPlanV.zoom = 0;""",
"""    pbPlanFree(); pbPlanMiss(false); pbPlanV.i = Math.max(0, Math.min(k, pbPlanV.sheets.length - 1)); pbPlanV.zoom = 0;""")
open(sys.argv[2],'w',encoding='utf-8').write(s)
