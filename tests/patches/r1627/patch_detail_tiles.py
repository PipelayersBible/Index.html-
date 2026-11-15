import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(s.count(a),a[:80]); s=s.replace(a,b)
# r16.27: one photo with a question (a stake, paint marks, a ticket) also sends its 4 full-detail quarters, marked
# detail, so Ask can read small handwritten digits. Plan questions keep their plan tiles.
rep("""    cur.forEach(p => { const i = out.length; out.push({ media_type: p.media_type, data: p.data, turn: 0 }); if (plan) (p.tiles || []).forEach(t => tiles.push({ at: i, t })); });""",
"""    const detail = !plan && cur.length === 1;
    cur.forEach(p => { const i = out.length; out.push({ media_type: p.media_type, data: p.data, turn: 0 }); if (plan || detail) (p.tiles || []).forEach(t => tiles.push({ at: i, t })); });""")
rep("""keep.filter(k => k.at === i).forEach(k => res.push({ media_type: 'image/jpeg', data: k.t.data, turn: 0, zoom: k.t.zoom, of: at.get(i) })); });""",
"""keep.filter(k => k.at === i).forEach(k => res.push(Object.assign({ media_type: 'image/jpeg', data: k.t.data, turn: 0, zoom: k.t.zoom, of: at.get(i) }, detail ? { detail: true } : {}))); });""")
# and a copy turned upside down: paint on the ground is often written facing the other way
rep("""      const t = draw(112), th = t.toDataURL('image/jpeg', 0.6);""", """      let rot = '';
      try { const rc = document.createElement('canvas'); rc.width = c.width; rc.height = c.height; const rg = rc.getContext('2d'); rg.translate(rc.width, rc.height); rg.rotate(Math.PI); rg.drawImage(c, 0, 0);
        let rq = 0.75, rd = rc.toDataURL('image/jpeg', rq); while (rd.length > PB_AI_PHOTO_B64_MAX && rq > 0.4) { rq -= 0.1; rd = rc.toDataURL('image/jpeg', rq); }
        if (rd.length <= PB_AI_PHOTO_B64_MAX + 23 && rd.indexOf('data:image/jpeg;base64,') === 0) rot = rd.slice(rd.indexOf(',') + 1); rc.width = rc.height = 0; } catch (e) { rot = ''; }
      const t = draw(112), th = t.toDataURL('image/jpeg', 0.6);""")
rep("""      return { media_type: 'image/jpeg', data: d.slice(d.indexOf(',') + 1), thumb: th, tiles };""", """      return { media_type: 'image/jpeg', data: d.slice(d.indexOf(',') + 1), thumb: th, tiles, rot };""")
rep("""if (plan || detail) (p.tiles || []).forEach(t => tiles.push({ at: i, t })); });""", """if (detail && p.rot) tiles.push({ at: i, t: { zoom: 'rot', data: p.rot } }); if (plan || detail) (p.tiles || []).forEach(t => tiles.push({ at: i, t })); });""")
rep("sentPhotos.forEach(p => { p.tiles = []; });", "sentPhotos.forEach(p => { p.tiles = []; p.rot = ''; });")
open(sys.argv[2],'w').write(s); print('ok')
