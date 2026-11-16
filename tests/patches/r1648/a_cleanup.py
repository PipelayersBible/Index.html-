import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)

# B. AI status: the quota only when it's running low
rep("""    const q = pbAiQuotaText();
    el.innerHTML = '<strong>'""", """    const q = pbAiQuota && pbAiQuota.left <= 10 ? pbAiQuotaText() : ''; // r16.48: only when running low
    el.innerHTML = '<strong>'""")
# B. stake fill message: short
rep("""pbAiShow(document.getElementById(prefix + 'AiStakeStatus'), p.flags && Object.keys(p.flags).filter(k => k !== 'stakeNum' && k !== 'line').length ? 'warn' : 'ok', 'Filled from the stake photo.', 'Filled: ' + filled + '.' + fitNote + ' Check the outlined boxes against the stake.' + pbStakeAiUnsure(p));""",
    """pbAiShow(document.getElementById(prefix + 'AiStakeStatus'), p.flags && Object.keys(p.flags).filter(k => k !== 'stakeNum' && k !== 'line').length ? 'warn' : 'ok', 'Read from the photo.', 'Check the outlined boxes against the stake.' + pbStakeAiUnsure(p)); void filled; void fitNote; // r16.48: short""")

# D. Cut / Fill options: short words (the label already says Cut / Fill; hubs are narrow)
rep("""<select id="${prefix}CutFill"><option value="cut">Cut to invert</option><option value="fill">Fill to invert</option></select>""",
    """<select id="${prefix}CutFill"><option value="cut">Cut</option><option value="fill">Fill</option></select>""")

# F. the strip over a Start/End row: "Start point" / "End point" is the role itself
rep("""    return !name || /^(Run \\d+ )?(Start|End)$/i.test(name) ? role : role + ' \\u2014 ' + name;""",
    """    return !name || /^(Run \\d+ )?(Start|End)( point)?$/i.test(name) ? role : role + ' \\u2014 ' + name; // r16.48: "Start point" too""")

# G. Check Before Locking: a run with stations shows the station
rep("""      html += `<div class="pb-review-item"><span class="k">${roleLabel}${p.label && p.label !== roleLabel ? ' — ' + escapeHtml(p.label) : ''}</span><br>Station ${fmt(p.station,1)} · """,
    """      const staTxt = (() => { try { if (segM || /^seg/.test(p.id)) return null; const s = pbStStart(1); return s ? 'Sta ' + pbStFmt(s.v + pbStDirOf(1) * p.station) + ' (' + fmt(p.station, 1) + ' ft)' : null; } catch (e) { return null; } })(); // r16.48
      html += `<div class="pb-review-item"><span class="k">${roleLabel}${p.label && p.label !== roleLabel && !/^(Start|End)( point)?$/i.test(p.label) ? ' — ' + escapeHtml(p.label) : ''}</span><br>${staTxt || 'Station ' + fmt(p.station,1)} · """)

# H. Run notes: stations as the run's own (2+12), not distances
rep("""    const opts = '<option value="">Not given</option>' + rows.filter(r => isFinite(pbSlRowFt(r))).map(r => '<option value="' + pbSlRowFt(r) + '"' + (match === r ? ' selected' : '') + '>Sta ' + escapeHtml(r.station) + (r.label ? ' (' + escapeHtml(r.label) + ')' : '') + '</option>').join('')""",
    """    const staOf = (() => { try { return pbStRowStaFn(e); } catch (x) { return () => ''; } })(); // r16.48: the run's stations
    const opts = '<option value="">Not given</option>' + rows.filter(r => isFinite(pbSlRowFt(r))).map(r => { const st = staOf(r); return '<option value="' + pbSlRowFt(r) + '"' + (match === r ? ' selected' : '') + '>' + (st ? 'Sta ' + escapeHtml(st) + ' \\u00b7 ' + escapeHtml(r.station) + ' ft' : 'Sta ' + escapeHtml(r.station)) + (r.label ? ' (' + escapeHtml(pbRowStripName(e, r) || r.label) + ')' : '') + '</option>'; }).join('')""")
rep("""  function pbSlStaText(ft, pdf) { return typeof ft === 'number' && isFinite(ft) ? 'Sta ' + (pdf ? pbRptSta(ft) : fmt(ft, 1)) : ''; }""",
    """  function pbSlStaText(ft, pdf, e) {
    if (!(typeof ft === 'number' && isFinite(ft))) return '';
    try { const st = e ? pbStRowStaFn(e)({ stationFt: ft, pointId: '' }) : ''; if (st) return 'Sta ' + st + ' (' + fmt(ft, 1) + ' ft)'; } catch (x) {} // r16.48: the run's own station
    return 'Sta ' + (pdf ? pbRptSta(ft) : fmt(ft, 1));
  }""")
rep("""  function pbSlWhere(x, pdf) {
    const d = x.d;
    if (x.type === 'utility') return typeof d.sta === 'number' ? pbSlStaText(d.sta, pdf) : '';
    if (x.type === 'rework') { const a = typeof d.from === 'number' ? pbSlStaText(d.from, pdf) : '',""",
    """  function pbSlWhere(x, pdf, e) {
    const d = x.d;
    if (x.type === 'utility') return typeof d.sta === 'number' ? pbSlStaText(d.sta, pdf, e) : '';
    if (x.type === 'rework') { const a = typeof d.from === 'number' ? pbSlStaText(d.from, pdf, e) : '',""")
rep("""      p.push(pbSlOpt(PB_SL_WHAT, d.what)[1]); const w = pbSlWhere(x, pdf); if (w) p.push(w);""",
    """      p.push(pbSlOpt(PB_SL_WHAT, d.what)[1]); const w = pbSlWhere(x, pdf, e); if (w) p.push(w);""")

# I. no "by Name not set" on the run-note cards (the records text keeps it)
rep("""        + '<div class="pb-sl-meta">Saved ' + escapeHtml(pbSlDt(x.at, x.tz)) + ' by ' + escapeHtml(pbSlWhoText(x.by, x.byEmail))
        + (x.editedAt ? ' · edited ' + escapeHtml(pbSlDt(x.editedAt, x.editedTz)) + ' by ' + escapeHtml(pbSlWhoText(x.editedBy, x.editedByEmail)) : '') + '</div>'""",
    """        + '<div class="pb-sl-meta">Saved ' + escapeHtml(pbSlDt(x.at, x.tz)) + pbSlByTxt(x.by, x.byEmail)
        + (x.editedAt ? ' · edited ' + escapeHtml(pbSlDt(x.editedAt, x.editedTz)) + pbSlByTxt(x.editedBy, x.editedByEmail) : '') + '</div>'""")
rep("""  function pbSlWhoText(by, email) {""", """  function pbSlByTxt(by, email) { const w = pbSlWhoText(by, email); return w && w !== 'Name not set' ? ' by ' + escapeHtml(w) : ''; } // r16.48
  function pbSlWhoText(by, email) {""")

# CSS: empty slope pill, run-note textarea width, pipe ID | type widths, job grid
rep("""#pbApp#pbApp #screen-input .pb-pipepair.pb-pipe-auto { grid-template-columns: 1fr 1fr; }""",
    """#pbApp#pbApp #screen-input .pb-pipepair.pb-pipe-auto { grid-template-columns: 1fr 1fr; }
#pbApp#pbApp #screen-input .pb-pipepair:not(.pb-pipe-auto) { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); } /* r16.48: room for the pipe type */
#pbApp#pbApp #screen-input .pb-rs-slope:empty { display: none; }
#pbApp#pbApp #screen-results #pbSlForm textarea { width: 100%; box-sizing: border-box; }
#pbApp#pbApp #screen-input .pb-jobpair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 12px; align-items: end; }
#pbApp#pbApp #screen-input .pb-jobpair > .pb-field { margin-left: 0; margin-right: 0; min-width: 0; }
#pbApp#pbApp #screen-input #runStatsSection > .pb-tag { display: none; }
#pbApp#pbApp #screen-input .pb-job-reset { display: block; margin: 4px 0 0 auto; background: none; border: 0; color: var(--pb-text-2); text-decoration: underline; font: inherit; font-size: 14px; padding: 8px 0; min-height: 40px; cursor: pointer; }
#pbApp#pbApp #screen-input #statsType { } """)
rep("<option value=\"\">\\u2014 Select \\u2014</option>' + PIPE_SIZES", "<option value=\"\">Select</option>' + PIPE_SIZES", 3)
open(out, 'w', encoding='utf-8').write(s)
