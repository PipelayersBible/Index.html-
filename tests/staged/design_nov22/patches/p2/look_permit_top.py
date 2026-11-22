# PHASE 2, A-9 (help text): the Entry Permit opened with 3 lines of explanation before the first box. Now: the
# "Draft — not active" badge and the "x of 15 required boxes filled" count; "Nothing here allows entry or starts a
# timer until you tap Lock & Activate Permit." moves behind a small (i) "What a draft does" (same words). The save line
# shows as soon as it has something to say (saved / NOT saved / resumed / retry / other drafts); before anything is
# typed it is hidden (it only said "Not saved yet").
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from _rep import P
p = P()
p.rep("""<div class="cp-draft-band" id="cpDraftBand" role="note"><strong>Draft &mdash; not active</strong>Nothing here allows entry or starts a timer until you tap <b>Lock &amp; Activate Permit</b>. <span class="cp-draft-save" id="cpDraftSaveLine">""",
"""<div class="cp-draft-band" id="cpDraftBand" role="note"><strong>Draft &mdash; not active</strong><details class="pb-more cp-draft-more"><summary><svg class="pb-ic sm" aria-hidden="true" focusable="false"><use href="#pb-i-info"/></svg><span>What a draft does</span></summary><p class="pb-help">Nothing here allows entry or starts a timer until you tap <b>Lock &amp; Activate Permit</b>.</p></details><span class="cp-draft-save" id="cpDraftSaveLine">""")
p.rep("""    let html = pbDraftEsc(live || full ? pbPmdSavedWords() : 'Not saved yet: a draft is saved on this phone once you start typing.') + ' ' + PB_DRAFT_PHOTO_NOTE;""",
"""    let html = pbDraftEsc(live || full ? pbPmdSavedWords() : 'Not saved yet: a draft is saved on this phone once you start typing.') + ' ' + PB_DRAFT_PHOTO_NOTE;
    line.classList.toggle('cp-draft-idle', !(live || full) && !(a && !confinedPermit && pbPmd.others(a).length)); /* design A-9 */""")
p.rep("""</style>
<!-- PB2:tabbar -->""", """/* A-9: the permit's top: badge + count; the explanation behind (i) */
#pbApp#pbApp #screen-confinedPermit .cp-draft-band .cp-draft-save.cp-draft-idle { display: none; }
#pbApp#pbApp #screen-confinedPermit .cp-draft-band .cp-draft-more { margin: 0 0 4px 0; }
#pbApp#pbApp #screen-confinedPermit .cp-draft-band .cp-draft-more > p { margin: 4px 0 0 0; }
</style>
<!-- PB2:tabbar -->""")
p.save()
