import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
a = """    pbStakeAiUse(prefix);
    pbStakeAiKeepPhotos(prefix, ctx, [img, back]);
  };
"""
assert s.count(a) == 1
s = s.replace(a, a + r"""  // r16.58: Read All Stake Photos: take the photos as fast as you walk, pick them all, and the app reads them (3 at a time),
  // pairs a back with its front by stake number, sorts by station and fills Start, the hubs and End.
  function pbStakeBatchApply(prefix, got, img, back) {
    const ctx = { photoGen: window._pbPhotoContextGen, life: (window._pbPointLifecycleGen || {})[prefix] || 0 };
    const sg = pbStakeAiSeg(prefix), distField = pbStakeAiDistField(prefix, sg);
    const startSta = pbStakeAiStations[sg.start], mySta = pbStakeAiParseStation(got.vals.station);
    got.vals.label = pbStakeAiSimpleLabel(prefix, got);
    if (distField && Number.isFinite(startSta) && mySta !== null && Math.abs(mySta - startSta) > 0.001) { got.vals.dist = Math.abs(mySta - startSta); got.distFrom = startSta; }
    pbStakeAiPending[prefix] = Object.assign(got, ctx, { distField });
    pbStakeAiRender(prefix);
    const box = document.getElementById(prefix + 'AiStakeReview'); if (box) box.style.display = 'none';
    pbStakeAiPending[prefix].auto = true;
    window.pbStakeAiUse(prefix);
    pbStakeAiKeepPhotos(prefix, ctx, [img, back]);
  }
  window.pbStakeBatch = async function(input) {
    const files = Array.from(input.files || []).slice(0, 30); input.value = '';
    if (!files.length) return;
    const st = document.getElementById('pbBatchStatus'), btn = document.getElementById('pbBatchBtn'), gen = window._pbPhotoContextGen;
    if (btn) btn.disabled = true;
    try {
      pbAiShow(st, 'info', 'Reading ' + files.length + ' stake photo' + (files.length > 1 ? 's' : '') + '…', 'Keep working. The points fill in when it’s done.');
      const items = [];
      for (const f of files) { try { items.push({ img: await pbAiPrepImage(f, 1600, { extras: true }), t: Number(f.lastModified) || 0 }); } catch (e) {} }
      let done = 0, limitHit = null, netFail = 0;
      const one = async (it) => {
        const r = await pbAiRequest('stake', { image: { mediaType: it.img.mediaType, data: it.img.data }, images: (it.img.extras || []).slice(0, 5) });
        done++; pbAiShow(st, 'info', 'Reading stake photos… ' + done + ' of ' + items.length, 'Keep working. The points fill in when it’s done.');
        if (!r.ok) { if (r.code === 'daily_limit') limitHit = r.message; else netFail++; return; }
        const got = pbStakeAiFromReply(r.text); if (got.refused || got.bad) return;
        if (r.truncated) got.notes.unshift('The AI’s answer was cut off — check every value.');
        it.got = got; it.sta = pbStakeAiParseStation(got.vals.station || '');
      };
      const q = items.slice(); await Promise.all([0, 1, 2].map(async () => { while (q.length) await one(q.shift()); }));
      if (window._pbPhotoContextGen !== gen) return;
      const ok = items.filter(i => i.got), num = (i) => String(i.got.vals.stakeNum || (i.got.thought && i.got.thought.stakeNum) || '').replace(/\D/g, '');
      const groups = [];
      ok.filter(i => i.sta !== null).sort((a, b) => a.sta - b.sta || a.t - b.t).forEach(i => { const g = groups.find(x => Math.abs(x.sta - i.sta) < 0.05); if (g) g.items.push(i); else groups.push({ sta: i.sta, items: [i] }); });
      let unplaced = 0;
      ok.filter(i => i.sta === null).forEach(i => { const n = num(i), g = n && groups.find(x => x.items.some(y => num(y) === n)); if (g) { i.back = true; g.items.push(i); } else unplaced++; });
      groups.forEach(g => {
        const main = g.items.find(i => !i.back) || g.items[0], got = main.got;
        g.items.forEach(i => { if (i === main) return; const v = i.got.vals || {}; Object.keys(v).forEach(k => { if (got.vals[k] === undefined || got.vals[k] === '') { got.vals[k] = v[k]; if (got.flags) delete got.flags[k]; } }); });
        g.got = got; g.img = main.img; const b2 = g.items.find(i => i !== main); g.back = b2 ? b2.img : null;
      });
      const why = [limitHit, netFail ? netFail + ' photo' + (netFail > 1 ? 's' : '') + ' couldn’t reach the AI (signal).' : '', unplaced ? unplaced + ' photo' + (unplaced > 1 ? 's' : '') + ' had no station or matching stake number.' : ''].filter(Boolean).join(' ');
      if (!groups.length) { pbAiShow(st, 'warn', 'No stakes read.', why || 'The AI didn’t find a station on these photos.'); return; }
      const targets = ['start'];
      if (groups.length > 1) {
        const empty = getAllHubPrefixes().filter(h => { const e = document.getElementById(h + 'StakeElev'), sv = document.getElementById(h + 'StaTxt'), d = document.getElementById(h + 'Station'); return !(e && e.value.trim()) && !(sv && sv.value.trim()) && !(d && d.value.trim()); });
        for (let k = 0; k < groups.length - 2; k++) { if (empty[k]) targets.push(empty[k]); else { const before = new Set(getAllHubPrefixes()); window.pbAddHub(); const nu = getAllHubPrefixes().find(h => !before.has(h)); if (nu) targets.push(nu); } }
        targets.push('end');
      }
      groups.forEach((g, k) => { const p = k === groups.length - 1 && groups.length > 1 ? 'end' : targets[k]; if (p) { try { pbStakeBatchApply(p, g.got, g.img, g.back); } catch (e) { console.error('batch apply', e); } } });
      const hubs = Math.max(0, groups.length - 2);
      pbAiShow(st, why ? 'warn' : 'ok', 'Read ' + ok.length + ' of ' + items.length + ' photos.', (groups.length === 1 ? 'Start filled.' : 'Start, ' + hubs + ' hub' + (hubs === 1 ? '' : 's') + ' and End filled.') + ' Check the outlined boxes against the stakes.' + (why ? ' ' + why : ''));
    } catch (e) { console.error('r16.58 batch', e); pbAiShow(st, 'warn', 'Stakes not read.', 'Something went wrong. Try again, or read them one at a time.'); }
    finally { const b = document.getElementById('pbBatchBtn'); if (b) b.disabled = false; }
  };
  function pbStakeBatchUi() {
    const inp0 = document.getElementById('startAiStakePhoto'), sec = inp0 && inp0.closest('.pb-section'); if (!sec || document.getElementById('pbBatchBox')) return;
    const d = document.createElement('div'); d.id = 'pbBatchBox'; d.className = 'pb-batch';
    d.innerHTML = '<button type="button" class="pb-btn" id="pbBatchBtn">Read All Stake Photos</button><input type="file" accept="image/*" multiple id="pbBatchInput" hidden><div class="pb-ai-status" id="pbBatchStatus" role="status"></div>';
    sec.parentNode.insertBefore(d, sec);
    d.querySelector('#pbBatchInput').addEventListener('change', (ev) => window.pbStakeBatch(ev.target));
    d.querySelector('#pbBatchBtn').addEventListener('click', () => pbAiEnsurePrivacy(() => { const i = document.getElementById('pbBatchInput'); if (i) i.click(); }));
  }
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push(function (name) { if (name === 'input') setTimeout(pbStakeBatchUi, 0); });
  setTimeout(pbStakeBatchUi, 200);
""")
rep2 = [("""    if (waiting) return pbStakeAiRead(prefix, ctx, waiting, imgs[0]);
    if (imgs.length === 2) return pbStakeAiRead(prefix, ctx, imgs[0], imgs[1]);
    pbStakeAiFront[prefix] = { img: imgs[0], ctx };
    pbStakePend.put(prefix, imgs[0]);
    pbStakeAiFrontShow(prefix);""", """    if (waiting) return pbStakeAiRead(prefix, ctx, waiting, imgs[0]);
    if (imgs.length === 2) return pbStakeAiRead(prefix, ctx, imgs[0], imgs[1]);
    return pbStakeAiRead(prefix, ctx, imgs[0], null); /* r16.58: one tap: the photo is read right away; Add Back Photo after, if the back has more */"""),
 ("""    pbStakeAiUse(prefix);
    pbStakeAiKeepPhotos(prefix, ctx, [img, back]);
  };
""", """    pbStakeAiUse(prefix);
    pbStakeAiKeepPhotos(prefix, ctx, [img, back]);
    if (!back) { const s2 = document.getElementById(prefix + 'AiStakeStatus'); if (s2) s2.insertAdjacentHTML('beforeend', '<div class="pb-btn-row"><button type="button" class="pb-btn ghost small" onclick="pbStakeAiAddBack(\\'' + prefix + '\\')">Add Back Photo</button></div>'); pbStakeAiAfter[prefix] = { img, ctx }; }
  };
  const pbStakeAiAfter = {}; // r16.58: a front already read: Add Back Photo reads it again with the back
  window.pbStakeAiAddBack = function(prefix) { const a = pbStakeAiAfter[prefix]; if (!a || pbStakeAiStale(prefix, a.ctx)) return; pbStakeAiFront[prefix] = { img: a.img, ctx: a.ctx }; const inp = document.getElementById(prefix + 'AiStakePhoto'); if (inp) inp.click(); };
""")]
for a, b in rep2:
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
a3 = "    else { flags.stakeElev = true; if (se.as_written || (se.feet != null && Number.isFinite(seFeet))) thought.stakeElev = String(se.as_written || seFeet); }"
assert s.count(a3) == 1
s = s.replace(a3, "    else { flags.stakeElev = true; if (se.as_written || (se.feet != null && Number.isFinite(seFeet))) thought.stakeElev = String(se.as_written || seFeet);\n      { const gs = se.feet != null && Number.isFinite(seFeet) ? seFeet : seWritten; if (gs !== null && Number.isFinite(gs) && Math.abs(gs) < 30000) vals.stakeElev = gs; } } /* r16.58: an unsure elevation (e.g. a short (88.10) on the hub lath) is filled and outlined, not left blank */")
css = """<style>
/* r16.58: Read All Stake Photos */
#pbApp#pbApp #screen-input .pb-batch { margin: 0 16px 12px 16px; }
#pbApp#pbApp #screen-input .pb-batch > .pb-btn { width: 100%; }
#pbApp#pbApp #screen-input .pb-batch > .pb-ai-status:empty { display: none; }
#pbApp#pbApp #screen-input .pb-batch > .pb-ai-status { margin-top: 8px; }
</style>
</body>
</html>"""
i = s.rstrip().rfind('</body>')
s = s[:i] + css + '\n'
s = s.replace("const PB_APP_BUILD = 'r16.57 · 2026-11-16';", "const PB_APP_BUILD = 'r16.58 · 2026-11-16';")
assert "r16.58 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
