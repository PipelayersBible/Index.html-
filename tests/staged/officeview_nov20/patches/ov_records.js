  // ================= officeview 02 (Nov 20): Records as a full-width table, for the office on a computer =================
  // Company accounts at 1024 px and wider: the same rows Records already lists (the same filters above them, the same
  // open-on-click), drawn as one table with When / Type / Record / Job / By / Status, sortable by a click on a heading,
  // with a box that narrows the rows on screen. A phone, and every field account, keep the list exactly as it was.
  const PB_OVR_COLS = [['at', 'When'], ['type', 'Type'], ['title', 'Record'], ['job', 'Job'], ['who', 'By'], ['st', 'Status']];
  let pbOvr = { sort: { k: 'at', d: -1 }, q: '' };
  const pbOvrOn = () => { try { return pbOvWide() && (pbCurrentScreen === 'archive' || pbCurrentScreen === 'reportsAll'); } catch (e) { return false; } };
  const PB_OVR_TYPE = { run: 'Run report', daily: 'Daily report', permit: 'Permit', insp: 'Inspection / test', event: 'Delay / extra work', ticket: 'Field ticket', mgmt: 'Management report', stats: 'Stats snapshot' };
  const pbOvrTypeWord = (x) => x.kindWord || PB_OVR_TYPE[x.type] || 'Record';
  function pbOvrWhen(ms) {
    const t = new Date(ms); if (isNaN(t)) return '';
    return pbRpfGroupHead(ms) + ' · ' + t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function pbOvrBar() {
    const list = pbRpfEl('rpfList'); if (!list || !list.parentNode) return null;
    let bar = pbRpfEl('ovRecBar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'ovRecBar'; bar.className = 'ov-recbar'; bar.hidden = true;
      bar.innerHTML = '<label class="ov-recq"><span class="pb-sr">Find in these rows</span><input type="search" id="ovRecQ" placeholder="Find in these rows" autocomplete="off" enterkeyhint="search" oninput="pbOvrFind(this.value)"></label><span class="ov-reccount" id="ovRecCount" role="status"></span>';
      list.parentNode.insertBefore(bar, list);
    }
    return bar;
  }
  function pbOvrTable() {
    const bar = pbOvrBar(), list = pbRpfEl('rpfList'); if (!list) return;
    const uid = pbRpfUid(), on = !!uid && pbOvrOn(), R = on ? pbRpfFor(uid) : null, shown = R ? (R.shown || []) : [];
    if (!on || !shown.length) { if (bar && !bar.hidden) bar.hidden = true; return; } // the list (or its empty line) stays as drawn
    if (bar && bar.hidden) bar.hidden = false;
    const q = pbOvKey(pbOvr.q), S = pbOvr.sort;
    let rows = shown.map((x, i) => ({ x, i, type: pbOvrTypeWord(x), job: x.job_number ? pbProdJobLabel(x.job_number) : '', who: x.who || (x.mine ? 'You' : ''), st: x.em ? 'EMERGENCY' : (x.stText || ''), when: pbOvrWhen(x.at) }));
    if (q) rows = rows.filter(r => pbOvKey([r.when, r.type, r.x.title, r.job, r.who, r.st].join(' ')).includes(q));
    const val = (r) => S.k === 'at' ? (r.x.at || 0) : pbOvKey(S.k === 'title' ? r.x.title : r[S.k]);
    rows.sort((a, b) => { const p = val(a), v = val(b); return (p < v ? -1 : p > v ? 1 : 0) * S.d || (b.x.at - a.x.at) || (a.i - b.i); });
    const th = PB_OVR_COLS.map(([k, label]) => '<th scope="col" class="ov-r-' + k + '"' + (S.k === k ? ' aria-sort="' + (S.d > 0 ? 'ascending' : 'descending') + '"' : '') + '><button type="button" class="ov-sort" id="ovRecSort_' + k + '" data-k="' + k + '" onclick="pbOvrSort(this.dataset.k)">' + label + '<span class="ov-arrow" aria-hidden="true">' + (S.k === k ? (S.d > 0 ? '▲' : '▼') : '') + '</span></button></th>').join('');
    const tr = ({ x, i, type, job, who, st, when }) => '<tr class="ov-row" data-key="' + escapeHtml(x.key) + '" onclick="pbOvrOpen(' + i + ', event)">'
      + '<td class="ov-r-at">' + escapeHtml(when) + '</td>'
      + '<td class="ov-r-type"><span class="rpf-ic rpf-ic-' + x.type + '" aria-hidden="true"><svg class="pb-ic" aria-hidden="true" focusable="false"><use href="#pb-i-' + (PB_RPF_IC[x.type] || 'reports') + '"/></svg></span>' + escapeHtml(type) + '</td>'
      + '<td class="ov-r-title"><button type="button" class="ov-open rpf-row" id="rpfRow' + i + '" data-key="' + escapeHtml(x.key) + '">' + escapeHtml(x.title || 'Record') + '</button></td>'
      + '<td class="ov-r-job">' + escapeHtml(job) + '</td><td class="ov-r-who">' + escapeHtml(who) + '</td>'
      + '<td class="ov-r-st">' + (x.em ? '<span class="pb-chip overdue rpf-st">EMERGENCY</span>' : st ? '<span class="pb-chip ' + pbRpfChipCls(x) + ' rpf-st">' + escapeHtml(st) + '</span>' : '')
      + (x.retryId != null ? ' <span class="rpf-sync" id="rpfSync' + i + '"><span class="pb-chip notsent">No cloud copy</span><button type="button" class="pb-btn ghost small" id="rpfRetry' + i + '" onclick="event.stopPropagation(); pbRpfRetry(' + i + ')">Retry Sync</button></span>' : '') + '</td></tr>';
    list.innerHTML = rows.length ? '<div class="ov-scroll"><table class="ov-table ov-rectable" id="ovRecTable"><thead><tr>' + th + '</tr></thead><tbody>' + rows.map(tr).join('') + '</tbody></table></div>'
      : '<div class="rpf-empty" id="ovRecNone"><p>None of the rows on screen match “' + escapeHtml(pbOvr.q) + '”.</p></div>';
    const c = pbRpfEl('ovRecCount'); if (c) { const t = q ? rows.length + ' of ' + shown.length + ' shown' : shown.length + (shown.length === 1 ? ' record' : ' records'); if (c.textContent !== t) c.textContent = t; }
  }
  window.pbOvrSort = function(k) { pbOvr.sort = pbOvr.sort.k === k ? { k, d: -pbOvr.sort.d } : { k, d: k === 'at' ? -1 : 1 }; pbOvrTable(); const b = pbRpfEl('ovRecSort_' + k); if (b) b.focus({ preventScroll: true }); };
  window.pbOvrFind = function(v) { pbOvr.q = String(v || '').slice(0, 80); pbOvrTable(); };
  window.pbOvrOpen = function(i, ev) { if (ev && ev.target && ev.target.closest && ev.target.closest('.rpf-sync')) return; window.pbRpfOpen(i); };
  { const o = window.pbRpfRender; window.pbRpfRender = function() { const r = o.apply(this, arguments); try { pbOvrTable(); } catch (e) { console.error(e); } return r; }; }
  { let was = null; window.addEventListener('resize', () => { try { const w = pbOvWide(); if (w !== was) { was = w; if (pbCurrentScreen === 'archive' || pbCurrentScreen === 'reportsAll') window.pbRpfRender(); } } catch (e) {} }); }
  // ================= end officeview 02 =================

