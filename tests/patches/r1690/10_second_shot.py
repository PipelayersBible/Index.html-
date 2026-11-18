import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.90 (owner, Nov 17): SECOND ROD SHOT. When stake values came from AI and only one stake has a rod shot, nothing can
# catch a misread cut or elevation (a 1 ft misread passes every check). Lock first asks for a rod shot on one more stake:
# the HI cross-check then compares the two. "Lock Without It" is still allowed and is kept on the record (entry.aiNo2nd)
# and in the run report.
rep("""    if (!(opts && opts.aiChecked)) { const ai = pbAiReadsNow(); if (ai.length) {""",
"""    if (!(opts && (opts.aiChecked || opts.ai2nd))) { const ai = pbAiReadsNow(); if (ai.length) { let hc = null; try { hc = computeHiCrossCheck(); } catch (e) { hc = null; }
      if (hc && hc.candidates.length < 2) {
        const shot = new Set(hc.candidates.map(c => c.prefix).filter(Boolean)), all = ['start'].concat(getAllHubPrefixes(), ['end']).concat(getAllActiveSegPrefixes()).filter(p => document.getElementById(p + 'ModeToggle') && activeVal(p + 'ModeToggle') === 'stake' && !shot.has(p));
        const aiP = new Set(Object.keys(typeof window.pbStakeAiProvOf === 'function' ? window.pbStakeAiProvOf() || {} : {})), pickL = all.filter(p => aiP.has(p)), tgt = (pickL.includes('end') ? 'end' : pickL[pickL.length - 1]) || (all.includes('end') ? 'end' : all[all.length - 1]) || null;
        if (tgt) { window._pbAiNo2nd = false; pbShowModal('Stake values were read from ' + (ai.length === 1 ? '1 photo' : ai.length + ' photos') + ' by AI, and only one stake has a rod shot, so nothing can catch a misread cut or elevation. Shoot the rod on ' + escapeHtml(getPointLabel(tgt, tgt === 'end' ? 'the End stake' : 'one more stake')) + ' and type the reading: the app checks the two shots against each other.', [{ label: 'Go Back' }, { label: 'Lock Without It', onClick: () => { window._pbAiNo2nd = true; pbLock(Object.assign({}, opts || {}, { ai2nd: true })); } }, { label: 'Add a Rod Shot', primary: true, onClick: () => { try { pbGoto('input'); } catch (e) {} setTimeout(() => { try { window.pbGoToField(tgt + 'StakeReading'); } catch (e) {} }, 250); } }], 'One More Rod Shot'); return; }
      }
    } }
    if (!(opts && opts.aiChecked)) { const ai = pbAiReadsNow(); if (ai.length) {""")
rep("""    try { const ai = pbAiReadsNow(); if (ai.length) { entry.aiReads = ai; entry.aiCheckedAt = window._pbAiCheckedAt || null; } } catch (e) { console.warn('AI reads not kept.'); } /* r16.77 */""",
"""    try { const ai = pbAiReadsNow(); if (ai.length) { entry.aiReads = ai; entry.aiCheckedAt = window._pbAiCheckedAt || null; if (window._pbAiNo2nd) entry.aiNo2nd = true; } } catch (e) { console.warn('AI reads not kept.'); } /* r16.77; r16.90: locked without a second rod shot */
    window._pbAiNo2nd = false;""")
rep("""'No check was confirmed at lock.') + (ch ?""",
    """'No check was confirmed at lock.') + (e.aiNo2nd ? ' It was locked without a rod shot on a second stake, so the HI cross-check could not test these values.' : '') + (ch ?""")
open(out, 'w', encoding='utf-8').write(s)
