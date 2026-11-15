import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
# r16.28 (1) a cut/fill written with small decimals ("F. 8 11", "C-3 83", "F+1 90") is 8.11 / 3.83 / 1.90: the check
# read only the first number and threw out every such stake's cut/fill.
rep("""    m = t.match(/(\\d+(?:\\.\\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }""", """    m = t.match(/(\\d+)\\s+(\\d{2})(?![\\d\\/.])/);
    if (m && !/\\d\\.\\d/.test(t)) return parseInt(m[1], 10) + parseInt(m[2], 10) / 100;
    m = t.match(/(\\d+(?:\\.\\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }""")
# (2) the stake photo also sends full-detail quarters and an upside-down copy, like Ask
rep("""  async function pbAiPrepImage(file, maxPx) {
    maxPx = maxPx || 1600;""", """  async function pbAiPrepImage(file, maxPx, opts) {
    maxPx = maxPx || 1600;""")
rep("""      while (data.length > 3500000 && q > 0.4) { q -= 0.15; data = c.toDataURL('image/jpeg', q); }
      return { mediaType: 'image/jpeg', data: data.slice(data.indexOf(',') + 1), w: c.width, h: c.height };""",
"""      while (data.length > 3500000 && q > 0.4) { q -= 0.15; data = c.toDataURL('image/jpeg', q); }
      const extras = [];
      if (opts && opts.extras) {
        const jpg = (cv) => { let qq = 0.78, d = cv.toDataURL('image/jpeg', qq); while (d.length > 1400000 && qq > 0.4) { qq -= 0.12; d = cv.toDataURL('image/jpeg', qq); } return d.length <= 1400023 ? d.slice(d.indexOf(',') + 1) : ''; };
        try { const r = document.createElement('canvas'); r.width = c.width; r.height = c.height; const rg = r.getContext('2d'); rg.translate(r.width, r.height); rg.rotate(Math.PI); rg.drawImage(c, 0, 0);
          const d = jpg(r); if (d) extras.push({ zoom: 'rot', mediaType: 'image/jpeg', data: d }); r.width = r.height = 0; } catch (e) {}
        if (Math.max(w, h) > maxPx * 1.25) {
          const tw = Math.round(w * 0.55), th = Math.round(h * 0.55);
          [['tl', 0, 0], ['tr', w - tw, 0], ['bl', 0, h - th], ['br', w - tw, h - th]].forEach(([z, x, y]) => {
            try { const kk = Math.min(1, maxPx / Math.max(tw, th)), t = document.createElement('canvas'); t.width = Math.round(tw * kk); t.height = Math.round(th * kk);
              t.getContext('2d').drawImage(img, x, y, tw, th, 0, 0, t.width, t.height); const d = jpg(t); if (d) extras.push({ zoom: z, mediaType: 'image/jpeg', data: d }); t.width = t.height = 0; } catch (e) {}
          });
        }
      }
      return { mediaType: 'image/jpeg', data: data.slice(data.indexOf(',') + 1), w: c.width, h: c.height, extras };""")
# (3) front and back: take or pick 1 or 2 photos per hub; the back usually has the stake number and hub elevation
rep("""<input type="file" accept="image/*" id="${prefix}AiStakePhoto" style="display:none;" onchange="pbStakeAiPhoto('${prefix}', this)">""",
"""<input type="file" accept="image/*" multiple id="${prefix}AiStakePhoto" style="display:none;" onchange="pbStakeAiPhoto('${prefix}', this)">""")
rep("""  window.pbStakeAiPhoto = async function(prefix, input) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    const st = document.getElementById(prefix + 'AiStakeStatus'), btn = document.getElementById(prefix + 'AiStakeBtn');
    const ctx = { photoGen: window._pbPhotoContextGen, life: (window._pbPointLifecycleGen || {})[prefix] || 0 };
    let img;
    try { img = await pbAiPrepImage(file); } catch (e) { pbAiShow(st, 'warn', 'Photo not read.', PB_AI_PHOTO_FAIL); return; }
    if (pbStakeAiStale(prefix, ctx)) return;
    pbAiShow(st, 'info', 'Reading the stake…', '');
    if (btn) btn.disabled = true;
    const r = await pbAiRequest('stake', { image: { mediaType: img.mediaType, data: img.data } });""",
"""  const pbStakeAiFront = {}; // prefix -> { img, ctx }: a front photo waiting for its back (or Read Now)
  window.pbStakeAiPhoto = async function(prefix, input) {
    const files = Array.from(input.files || []).slice(0, 2);
    input.value = '';
    if (!files.length) return;
    const st = document.getElementById(prefix + 'AiStakeStatus');
    const ctx = { photoGen: window._pbPhotoContextGen, life: (window._pbPointLifecycleGen || {})[prefix] || 0 };
    const imgs = [];
    try { for (const f of files) imgs.push(await pbAiPrepImage(f, 1600, { extras: true })); } catch (e) { pbAiShow(st, 'warn', 'Photo not read.', PB_AI_PHOTO_FAIL); return; }
    if (pbStakeAiStale(prefix, ctx)) return;
    const waiting = pbStakeAiFront[prefix] && !pbStakeAiStale(prefix, pbStakeAiFront[prefix].ctx) ? pbStakeAiFront[prefix].img : null;
    delete pbStakeAiFront[prefix];
    if (waiting) return pbStakeAiRead(prefix, ctx, waiting, imgs[0]);
    if (imgs.length === 2) return pbStakeAiRead(prefix, ctx, imgs[0], imgs[1]);
    pbStakeAiFront[prefix] = { img: imgs[0], ctx };
    pbAiShow(st, 'info', 'Front photo added.', 'Add the back if it has the stake number or hub elevation.');
    if (st) st.insertAdjacentHTML('beforeend', '<div class="pb-btn-row"><button type="button" class="pb-btn ghost small" onclick="pbStakeAiBack(\\'' + prefix + '\\')">Add Back Photo</button><button type="button" class="pb-btn small" onclick="pbStakeAiReadNow(\\'' + prefix + '\\')">Read Stake</button></div>');
  };
  window.pbStakeAiBack = function(prefix) { const inp = document.getElementById(prefix + 'AiStakePhoto'); if (inp) inp.click(); };
  window.pbStakeAiReadNow = function(prefix) {
    const w = pbStakeAiFront[prefix]; delete pbStakeAiFront[prefix];
    if (!w || pbStakeAiStale(prefix, w.ctx)) return;
    pbStakeAiRead(prefix, w.ctx, w.img, null);
  };
  async function pbStakeAiRead(prefix, ctx, img, back) {
    const st = document.getElementById(prefix + 'AiStakeStatus'), btn = document.getElementById(prefix + 'AiStakeBtn');
    pbAiShow(st, 'info', back ? 'Reading the stake (front and back)…' : 'Reading the stake…', '');
    if (btn) btn.disabled = true;
    const images = (img.extras || []).slice(0, 5);
    if (back) { images.push({ side: 'back', mediaType: back.mediaType, data: back.data }); (back.extras || []).slice(0, 5).forEach(x => images.push(Object.assign({ side: 'back' }, x))); }
    const r = await pbAiRequest('stake', { image: { mediaType: img.mediaType, data: img.data }, images: images.slice(0, 11) });""")
open(sys.argv[2],'w').write(s); print('ok')
