import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
rep("    pbAiShow(st, 'info', back ? 'Reading the stake (front and back)…' : 'Reading the stake…', '');",
    "    pbAiShow(st, 'info', back ? 'Reading the stake (front and back)…' : 'Reading the stake…', '');\n"
    "    const mySeq = (pbStakeAiSeqN[prefix] = (pbStakeAiSeqN[prefix] || 0) + 1); /* r16.60: a later read (front + back) replaces this one */\n"
    "    if (!back) { pbStakeAiAfter[prefix] = { img, ctx }; if (st) st.insertAdjacentHTML('beforeend', '<div class=\"pb-btn-row\"><button type=\"button\" class=\"pb-btn ghost small\" onclick=\"pbStakeAiAddBack(\\'' + prefix + '\\')\">Add Back Photo</button></div>'); }")
rep("    const r = await pbAiRequest('stake', { image: { mediaType: img.mediaType, data: img.data }, images: images.slice(0, 11) });",
    "    const r = await pbAiRequest('stake', { image: { mediaType: img.mediaType, data: img.data }, images: images.slice(0, 11) });\n"
    "    if (pbStakeAiSeqN[prefix] !== mySeq) return; /* r16.60: the back came in while this read was running: the front + back read fills the point */")
rep("  const pbStakeAiAfter = {}; // r16.58",
    "  const pbStakeAiSeqN = {}; // r16.60\n  const pbStakeAiAfter = {}; // r16.58")
s = s.replace("const PB_APP_BUILD = 'r16.59 · 2026-11-16';", "const PB_APP_BUILD = 'r16.60 · 2026-11-16';")
assert "r16.60 · 2026-11-16" in s
open(out, 'w', encoding='utf-8').write(s)
