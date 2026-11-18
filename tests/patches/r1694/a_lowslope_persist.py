import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.94 (Nov 17, critique): (1) LOW SLOPE NOTE: a gravity-sewer section flatter than the usual minimum for its size
# (Recommended Standards for Wastewater Facilities ("Ten States"), 33.41: 8" 0.40% ... 36" 0.046%) gets one review note
# per run: a misread cut often gives a believable but too-flat slope, and nothing else catches it. Gravity pipe types only
# (PVC SDR 35 / blank, vitrified clay, concrete, corrugated HDPE); the plans govern, the note says so. Never blocks Lock.
# (2) navigator.storage.persist() once signed in: asks the browser not to clear the app's saved data (unsent records)
# under storage pressure. (3) The HI block names stakes, not "hubs" (it fires on start/end stakes too).
rep("""    const wtIdSeen = new Set(); // one wall/ID warning per run, not one per section""",
"""    const wtIdSeen = new Set(); // one wall/ID warning per run, not one per section
    const PB_MIN_SLOPE = { 8: 0.40, 10: 0.28, 12: 0.22, 14: 0.17, 15: 0.15, 16: 0.14, 18: 0.12, 21: 0.10, 24: 0.08, 27: 0.067, 30: 0.058, 33: 0.052, 36: 0.046 }; // r16.94: Ten States 33.41
    const lowSeen = new Set(); let ptLow = ''; try { ptLow = pbFitLayPipeType(); } catch (e) { ptLow = ''; }
    const gravityLow = ptLow === '' || ptLow === 'PVC SDR 35' || ptLow === 'Vitrified Clay' || ptLow === 'Concrete' || ptLow === 'Corrugated HDPE';
    if (gravityLow) segments.forEach((s) => {
      const run = pbRunOfPointId(s.from.id), sz = s.idFt !== null && s.idFt !== undefined ? Math.round(s.idFt * 12 * 1000) / 1000 : null, min = sz !== null ? PB_MIN_SLOPE[sz] : undefined;
      if (min === undefined || lowSeen.has(run) || !(s.to.station - s.from.station > 0) || Math.abs(s.slopePct) >= min - 1e-9) return;
      lowSeen.add(run);
      warnings.push({ type: 'low-slope', heading: 'Low Slope \\u2014 Check The Plans', text: `${Math.abs(s.slopePct).toFixed(2)}% from ${s.from.label} to ${s.to.label} is flatter than the usual minimum for ${sz}" sewer (${min < 0.1 ? min : min.toFixed(2)}%, Ten States Standards). If the plans don\\u2019t call for it, a stake may be misread or mistyped.` });
    });""")
rep("""  const PB_HD_BLOCK = 'Hubs disagree by more than 0.10 ft. Fix or reshoot before locking.'; // hidisc 3""",
    """  const PB_HD_BLOCK = 'The stake shots disagree by more than 0.10 ft. A stake may be misread or mistyped: fix it or reshoot before locking.'; // hidisc 3; r16.94: stakes, not hubs""")
rep("""  window.addEventListener('load', () => { setTimeout(() => { pbPushRegister(); }, 2500); });""",
    """  window.addEventListener('load', () => { setTimeout(() => { pbPushRegister(); }, 2500); });
  window.addEventListener('load', () => { setTimeout(() => { try { if (navigator.storage && navigator.storage.persisted && navigator.storage.persist) navigator.storage.persisted().then(p => { if (!p) return navigator.storage.persist(); }).catch(() => {}); } catch (e) {} }, 4000); }); /* r16.94: keep unsent records from being cleared */""")
open(out, 'w', encoding='utf-8').write(s)
