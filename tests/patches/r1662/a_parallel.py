import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (s.count(a), a[:70])
    s = s.replace(a, b)
i0 = s.index("  async function pbStakeAiRead(prefix, ctx, img, back) {")
i1 = s.index("  const pbStakeAiSeqN = {}; // r16.60")
f = s[i0:i1]
def frep(a, b, n=1):
    global f
    assert f.count(a) == n, (f.count(a), a[:70])
    f = f.replace(a, b)
frep("  async function pbStakeAiRead(prefix, ctx, img, back) {", "  async function pbStakeAiRead(prefix, ctx, img, back, only) { /* r16.62: only 'back': the back read on its own while the front's read runs */")
frep("    pbAiShow(st, 'info', back ? 'Reading the stake (front and back)…' : 'Reading the stake…', '');", "    pbAiShow(st, 'info', only === 'back' ? 'Reading the back of the stake…' : back ? 'Reading the stake (front and back)…' : 'Reading the stake…', '');")
frep("    const mySeq = (pbStakeAiSeqN[prefix] = (pbStakeAiSeqN[prefix] || 0) + 1);", "    const mySeq = only === 'back' ? null : (pbStakeAiSeqN[prefix] = (pbStakeAiSeqN[prefix] || 0) + 1);")
frep("    if (!back) { pbStakeAiAfter[prefix] = { img, ctx }; if (st)", "    if (!back && !only) { pbStakeAiAfter[prefix] = { img, ctx }; if (st)")
frep("    if (pbStakeAiSeqN[prefix] !== mySeq) return;", "    if (mySeq !== null && pbStakeAiSeqN[prefix] !== mySeq) return;")
frep("    if (!back) { const s2 = ", "    if (!back && !only) { const s2 = ")
frep("pbStakeAiKeepPhotos(prefix, ctx, [img, back])", "pbStakeAiKeepPhotos(prefix, ctx, only === 'back' ? [null, img] : [img, back])", 2)
f += "  window.pbStakeAiBackOnly = async function(prefix, file) { /* r16.62 */\n    const ctx = { photoGen: window._pbPhotoContextGen, life: (window._pbPointLifecycleGen || {})[prefix] || 0 };\n    let im = null; try { im = await pbAiPrepImage(file, 1600, { extras: true }); } catch (e) { return; }\n    if (pbStakeAiStale(prefix, ctx)) return;\n    pbStakeAiRead(prefix, ctx, im, null, 'back');\n  };\n"
frep("    pbStakeAiPending[prefix].auto = true;\n", "    pbStakeAiPending[prefix].auto = true;\n    if (only === 'back') pbStakeAiPending[prefix].fillEmpty = true; /* r16.62: the back adds to the front, never asks */\n")
s = s[:i0] + f + s[i1:]
rep("    if (conflicts.length) {\n      pbShowModal('Some of these fields already have values you typed:", "    if (conflicts.length && p.fillEmpty) { apply(true); return; }\n    if (conflicts.length) {\n      pbShowModal('Some of these fields already have values you typed:")
rep("onFail: () => { if (inp) inp.click(); } }); else if (inp) inp.click(); }); /* r16.61: in-app camera stays open for the back */",
    "onFail: () => { if (inp) inp.click(); } }); } else if (inp) inp.click(); }); /* r16.61: in-app camera stays open for the back */")
# the camera: Another Photo starts the front's read; Use Photos then reads the back on its own
rep("window.pbLiveCam.open({ max: 2, review: true, title: 'Front of the stake', onDone: (files) => window.pbStakeAiPhoto(prefix, { files, value: '' }),",
    "{ let started = false; window.pbLiveCam.open({ max: 2, review: true, title: 'Front of the stake', onAnother: (f0) => { started = true; window.pbStakeAiPhoto(prefix, { files: [f0], value: '' }); }, onDone: (files) => { if (started && files.length > 1) window.pbStakeAiBackOnly(prefix, files[1]); else if (!started || files.length) window.pbStakeAiPhoto(prefix, { files: started ? files.slice(1) : files, value: '' }); },")
rep("      if (more) r.querySelector('.pb-lc-more').onclick = function () { r.remove(); t.textContent = o.nextTitle || 'Back of the stake'; };",
    "      if (more) r.querySelector('.pb-lc-more').onclick = function () { r.remove(); t.textContent = o.nextTitle || 'Back of the stake'; if (o.onAnother && shots.length === 1 && !o._sent) { o._sent = true; o.onAnother(shots[0]); } }; /* r16.62: the front starts reading now */")
s = s.replace("const PB_APP_BUILD = 'r16.61 · 2026-11-16';", "const PB_APP_BUILD = 'r16.62 · 2026-11-16';")
assert "r16.62 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
