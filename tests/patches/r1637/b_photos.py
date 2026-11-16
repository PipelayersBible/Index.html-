import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)
rep("""    pbStakeAiPending[prefix].auto = true;
    pbStakeAiUse(prefix);
  };""", """    pbStakeAiPending[prefix].auto = true;
    pbStakeAiUse(prefix);
    pbStakeAiKeepPhotos(prefix, ctx, [img, back]);
  };
  // The stake photos the AI read go on the point's own photos (seen on Run Setup, saved with the run, in its report).
  async function pbStakeAiKeepPhotos(prefix, ctx, list) {
    const out = [];
    for (const [k, im] of list.entries()) {
      if (!im || !im.data) continue;
      try {
        const el = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:' + (im.mediaType || 'image/jpeg') + ';base64,' + im.data; });
        let w = el.width, h = el.height; const m = 900;
        if (w >= h && w > m) { h = Math.round(h * m / w); w = m; } else if (h > w && h > m) { w = Math.round(w * m / h); h = m; }
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(el, 0, 0, w, h);
        out.push({ url: c.toDataURL('image/jpeg', 0.72), name: k ? 'Stake back' : 'Stake front', captureId: 'cap-' + Date.now().toString(36) + '-ai' + k + '-' + Math.random().toString(36).slice(2, 7) });
      } catch (e) {}
    }
    if (!out.length || pbStakeAiStale(prefix, ctx)) return;
    window._pbPhotos[prefix] = window._pbPhotos[prefix] || [];
    out.forEach(ph => window._pbPhotos[prefix].push(ph));
    renderPhotoList(prefix);
    if (pbCurrentScreen === 'input') { try { pbStampFormEdit(); pbNoteFormEdit(); } catch (e) {} }
  }""")
rep("<p class=\"pb-ai-privacy\">Sent to Anthropic to be read; not stored by the app. Don’t use AI with confidential job info.</p>",
    "<p class=\"pb-ai-privacy\">Sent to Anthropic to be read, and kept with this point’s photos. Don’t use AI with confidential job info.</p>")
open(out, 'w', encoding='utf-8').write(s)
