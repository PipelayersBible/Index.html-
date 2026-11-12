import sys
s = open(sys.argv[1]).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:90]); s = s.replace(a, b)
# r16.23 (Tommy, Nov 12): "Redesign the filters section so it all fits on one line": the type chips become one
# dropdown chip at the start of the filter row, On this phone becomes a phone icon chip, the row never wraps.
rep("  #pbApp #screen-archive .rpf-chips:empty { display: none; }",
"""  #pbApp #screen-archive .rpf-chips:empty { display: none; }
  /* r16.23: one line of filters in Records */
  #pbApp #screen-archive #recChips { display: none; }
  #pbApp #screen-archive .rpf-chips { flex-wrap: nowrap; gap: 6px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  #pbApp #screen-archive .rpf-chips::-webkit-scrollbar { display: none; }
  #pbApp #screen-archive .rpf-chip { flex: 0 0 auto; }
  #pbApp #screen-archive .rpf-chip-b { gap: 4px; padding: 0 10px 0 12px; font-size: 14px; max-width: 170px; }
  #pbApp #screen-archive .rpf-chip-b .pb-ic { width: 14px; height: 14px; }
  #pbApp #screen-archive .rpf-chip.on .rpf-chip-b { padding-right: 4px; }
  #pbApp #screen-archive .rpf-chip-x { min-width: 36px; font-size: 20px; }
  #pbApp #screen-archive .rec-type .rpf-chip-b { font-weight: 700; }
  #pbApp #screen-archive .rec-phone .rpf-chip-b { padding: 0; justify-content: center; }
  #pbApp #screen-archive .rec-phone .rpf-chip-b .pb-ic { width: 20px; height: 20px; color: var(--pb-text); }
  #pbApp #screen-archive .rec-phone.on .rpf-chip-b { padding: 0 2px 0 10px; }
  #pbApp #screen-archive .rpf-clearall { flex: 0 0 auto; padding: 0 6px; font-size: 14px; }""")
# the filter row in Records starts with the type dropdown
rep("    if (inRec && typeof window.pbRecPhoneChip === 'function') h += window.pbRecPhoneChip(false); /* nav95: On this phone is a filter */\n    if (pbRpfActive(inRec && recT !== null ? Object.assign({}, R.f, { types: [] }) : R.f)) h += '<button type=\"button\" class=\"rpf-clearall\" id=\"rpfClearAll\" onclick=\"pbRpfClearAll()\">Clear filters</button>';",
    "    if (inRec && recT !== null && typeof window.pbRecTypeChip === 'function') h = window.pbRecTypeChip() + h; /* r16.23: the type, as one dropdown */\n    if (inRec && typeof window.pbRecPhoneChip === 'function') h += window.pbRecPhoneChip(false); /* nav95: On this phone is a filter */\n    if (pbRpfActive(inRec && recT !== null ? Object.assign({}, R.f, { types: [] }) : R.f)) h += '<button type=\"button\" class=\"rpf-clearall\" id=\"rpfClearAll\" onclick=\"pbRpfClearAll()\">' + (inRec ? 'Clear' : 'Clear filters') + '</button>';")
# phone chip: an icon
rep("""    return on ? '<span class="rpf-chip on" data-k="phone"><button type="button" class="rpf-chip-b" id="recChipOn_phone" aria-pressed="true" onclick="pbRecPhoneOff()">On this phone</button><button type="button" class="rpf-chip-x" id="recChipX_phone" aria-label="Clear on this phone" onclick="pbRecPhoneOff()">×</button></span>'
      : '<span class="rpf-chip" data-k="phone"><button type="button" class="rpf-chip-b" id="recChip_phone" aria-pressed="false" onclick="pbRecPick(\\'phone\\')">On this phone</button></span>';""",
"""    const ic = '<svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-device"/></svg>'; /* r16.23: a phone icon, named for screen readers */
    return on ? '<span class="rpf-chip rec-phone on" data-k="phone"><button type="button" class="rpf-chip-b" id="recChipOn_phone" aria-pressed="true" aria-label="On this phone" title="On this phone" onclick="pbRecPhoneOff()">' + ic + '</button><button type="button" class="rpf-chip-x" id="recChipX_phone" aria-label="Clear on this phone" onclick="pbRecPhoneOff()">×</button></span>'
      : '<span class="rpf-chip rec-phone" data-k="phone"><button type="button" class="rpf-chip-b" id="recChip_phone" aria-pressed="false" aria-label="On this phone" title="On this phone" onclick="pbRecPick(\\'phone\\')">' + ic + '</button></span>';
  };
  // r16.23: the type as one dropdown chip (All, Runs, Permits, Dailies, Tickets, Mgmt reports, Inbox) and its menu
  function pbRecTypeNow() {
    const uid = pbRecUid(), chips = pbRecChips(uid), mode = uid ? pbRec.mode : 'phone';
    let on = null;
    if (!uid || mode === 'phone') { const v = (pbRecEl('archiveFilterKind') || {}).value || 'all'; on = Object.keys(PB_REC_KIND).find(k => PB_REC_KIND[k] === v) || null; }
    else on = mode !== 'feed' ? mode : pbRecTypeOf(pbRpfFor(uid));
    return { chips, on };
  }
  window.pbRecTypeChip = function() {
    const { chips, on } = pbRecTypeNow(), lab = (chips.find(c => c[0] === on) || [])[1] || 'Type';
    return '<span class="rpf-chip rec-type' + (on && on !== 'all' ? ' on' : '') + '" data-k="rectype"><button type="button" class="rpf-chip-b" id="recTypeBtn" aria-haspopup="dialog" onclick="pbRecTypeMenu()">' + escapeHtml(lab) + '<svg class="pb-ic sm" aria-hidden="true" focusable="false"><use href="#pb-i-chevron-down"/></svg></button></span>';
  };
  window.pbRecTypeMenu = function() {
    const { chips, on } = pbRecTypeNow();
    pbShowModal('', chips.map(([k, l]) => ({ label: l, primary: k === on, onClick: () => window.pbRecPick(k) })).concat([{ label: 'Close' }]), 'Show');
    document.querySelectorAll('#pbModalButtons button').forEach((b, i) => { if (chips[i]) { b.id = 'recType_' + chips[i][0]; b.classList.add('pb-gs-act'); } else b.classList.add('pb-gs-act'); });
    const dlg = pbRecEl('pbModalDialog'); if (dlg) dlg.classList.add('pb-gs-sheet');""")
# the bar above this phone's list / inbox / signed out carries the type dropdown too
rep("""    { const pb = pbRecEl('recPhoneBar'), on2 = !!uid && mode === 'phone', w = on2 ? window.pbRecPhoneChip(true) : ''; /* nav95 */
      if (pb && pb.dataset.sig !== w) { pb.dataset.sig = w; pb.innerHTML = w; } pbRecSet(pb, on2); }""",
"""    { const pb = pbRecEl('recPhoneBar'), on2 = !uid || mode !== 'feed', w = on2 ? window.pbRecTypeChip() + (uid && mode === 'phone' ? window.pbRecPhoneChip(true) : '') : ''; /* nav95; r16.23: the type dropdown leads the row */
      if (pb && pb.dataset.sig !== w) { pb.dataset.sig = w; pb.innerHTML = w; } pbRecSet(pb, on2); }""")
open(sys.argv[2], 'w').write(s); print('ok')
