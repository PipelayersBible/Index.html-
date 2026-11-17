import sys
s=open(sys.argv[1]).read()
def rep(a,b,n=1):
    global s; assert s.count(a)==n,(a[:90],s.count(a)); s=s.replace(a,b)

# 1) kv: optional collapse of empty fields into one "Not recorded:" line (nothing dropped)
rep("""    R.kv = (pairs, op) => {
      op = op || {};
      const cols = op.cols || 2, rows = [];
      const list = pairs.filter(Boolean);""",
"""    R.kv = (pairs, op) => {
      op = op || {};
      const cols = op.cols || 2, rows = [];
      let list = pairs.filter(Boolean), emptyLabels = [];
      if (op.collapse) { emptyLabels = list.filter(p => p[1] === null || p[1] === undefined || p[1] === '').map(p => p[0]); list = list.filter(p => !(p[1] === null || p[1] === undefined || p[1] === '')); } /* r16.74: empty fields said once, in one line */""")
rep("""      R.table({ body: rows, columns, fontSize: op.fontSize || 9, keep: op.keep || 14, after: op.after });
    };""",
"""      if (rows.length) R.table({ body: rows, columns, fontSize: op.fontSize || 9, keep: op.keep || 14, after: op.after });
      if (emptyLabels.length) R.para('Not recorded: ' + emptyLabels.join(', ') + '.', { size: 8.5, color: PB_RPT.MUTED });
    };""")

# 2) page 1: an at-a-glance strip, empty key facts collapsed, the ended/sent lines kept on page 1, timeline moved later
rep("""    R.kv([
      ['Run', (e.startLabel || 'Start') + ' to ' + (e.endLabel || 'End')], ['Distance',""",
"""    { /* r16.74: at a glance: the numbers someone skimming needs, in one strip */
      const Lg = pbRptLaid(e), rl = Lg ? rows.filter(r => typeof Lg.marks[pbRptLaidKey(r)] === 'number') : [], farL = rl.length ? rl[rl.length - 1] : null;
      const fq = e.foreman && e.foreman.feetPipeInstalled !== undefined && e.foreman.feetPipeInstalled !== null && e.foreman.feetPipeInstalled !== '' ? e.foreman.feetPipeInstalled : null;
      const glance = [['Distance', pbDistanceText(e)], ['Laid', Lg ? (farL ? 'to Sta ' + pbRptSta(pbRptRowStaFt(farL)) : 'none marked') : '—'],
        ['Slope', s && pbRptNum(s.overallSlopePct, 2) !== '—' ? (s.overallSlopePct >= 0 ? '+' : '') + pbRptNum(s.overallSlopePct, 2) + '%' : '—'],
        ['Inverts (start / end)', s ? (s.startInv !== undefined ? s.startInv : '—') + ' / ' + (s.endInv !== undefined ? s.endInv : '—') : '—'],
        ['Pipe installed', fq !== null ? fq + ' ft' : '—'], ['Photos', String(R.rec.photos.length)]];
      R.table({ head: glance.map(g => g[0]), body: [glance.map(g => ({ content: g[1], _bold: true }))], fontSize: 10.5, keep: 18 });
    }
    R.kv([
      ['Run', (e.startLabel || 'Start') + ' to ' + (e.endLabel || 'End')], ['Distance',""")
rep("""(pbRunTimeText(e)) : null]
    ], { cols: 2 });
    const alerts = [];""","""(pbRunTimeText(e)) : null]
    ], { cols: 2, collapse: true });
    /*@@ENDED@@*/
    const alerts = [];""")

# 3) move the record timeline after the corrections (before the photos); keep its Ended / sent lines on page 1
i0 = s.index("    // --- timeline\n    R.section('timeline', 'Record timeline'")
i1 = s.index("    // --- job and crew\n    R.section('job'", i0)
blk = s[i0:i1]
k = blk.index("    if (e.runEndTime) R.para('Ended: '")
tl, ended = blk[:k], blk[k:]
s = s[:i0] + s[i1:]
assert s.count("    /*@@ENDED@@*/\n")==1
s = s.replace("    /*@@ENDED@@*/\n", "    /* r16.74: when it ended and whether it was sent stay on page 1 */\n" + ended)
anchor = "    // --- photos, signature, integrity\n    const want = Number(e.photoCount) || 0, have = R.rec.photos.length;"
assert s.count(anchor)==1
s = s.replace(anchor, "    /* r16.74: the full timeline, after the work it records */\n" + tl + anchor)

# 4) timeline: who did it (the account on the phone the run was recorded on; the typed name on foreman production)
rep("""    const ev = [];
    if (e.runStartTime) ev.push([e.runStartTime, 'Run form opened on this phone (the app\\u2019s "Run started" time; not when pipe laying began)', 'not recorded']);
    ev.push([e.lockTime, 'Run locked on this phone: this record was created', 'not recorded']);""",
"""    const ev = [];
    const phoneBy = (() => { const O = e.pbOffice && typeof e.pbOffice === 'object' ? e.pbOffice : null; if (O && O.who) return O.who + ' (phone account)'; let u = null; try { u = typeof sbUser !== 'undefined' && sbUser ? sbUser.id : null; } catch (x) {} const n = u ? pbRptBy(u) : ''; return n && !/^(not recorded|Name not set)$/.test(n) ? n + ' (phone account)' : 'the phone\\u2019s account'; })(); /* r16.74 */
    if (e.runStartTime) ev.push([e.runStartTime, 'Run form opened on this phone (the app\\u2019s "Run started" time; not when pipe laying began)', phoneBy]);
    ev.push([e.lockTime, 'Run locked on this phone: this record was created', phoneBy]);""")
rep("""    rows.forEach(r => { if (r.addedTime) ev.push([r.addedTime, 'Point added after lock at Sta ' + pbRptSta(pbRptRowStaFt(r)), 'not recorded']); });
    notes.forEach(n => { if (n.time) ev.push([n.time, 'Field note last saved at ' + pbRptNoteSta(e, n) + ((n.photos || []).length ? ' (it holds ' + pbRptPlural(n.photos.length, 'photo') + ')' : ''), 'not recorded']); });
    hist.forEach(c => ev.push([c.time, 'Correction: ' + pbRptCorrWords(c).what + (c.sessionLabel ? ' (earlier session ' + c.sessionLabel + ')' : ''), 'not recorded']));
    if (e.foreman && e.foreman.enteredAt) ev.push([e.foreman.enteredAt, 'Foreman production saved' + (e.foreman.enteredBy ? ' (name typed on it: ' + e.foreman.enteredBy + ')' : ''), 'not recorded']);""",
"""    rows.forEach(r => { if (r.addedTime) ev.push([r.addedTime, 'Point added after lock at Sta ' + pbRptSta(pbRptRowStaFt(r)), phoneBy]); });
    notes.forEach(n => { if (n.time) ev.push([n.time, 'Field note last saved at ' + pbRptNoteSta(e, n) + ((n.photos || []).length ? ' (it holds ' + pbRptPlural(n.photos.length, 'photo') + ')' : ''), phoneBy]); });
    hist.forEach(c => ev.push([c.time, 'Correction: ' + pbRptCorrWords(c).what + (c.sessionLabel ? ' (earlier session ' + c.sessionLabel + ')' : ''), phoneBy]));
    if (e.foreman && e.foreman.enteredAt) ev.push([e.foreman.enteredAt, 'Foreman production saved', e.foreman.enteredBy ? e.foreman.enteredBy + ' (typed)' : phoneBy]);""")
rep("""    (e.crewLog || []).forEach(p => (p.log || []).forEach(l => { if (l && l.time) ev.push([l.time, 'Crew log: ' + p.name + ' (' + p.type + ') ' + String(l.action || '').toLowerCase() + (l.enteredAfter ? ' (entered after the fact)' : ''), 'not recorded']); }));""",
"""    (e.crewLog || []).forEach(p => (p.log || []).forEach(l => { if (l && l.time) ev.push([l.time, 'Crew log: ' + p.name + ' (' + p.type + ') ' + String(l.action || '').toLowerCase() + (l.enteredAfter ? ' (entered after the fact)' : ''), phoneBy]); }));""")
rep("""    if (e.runEndTime) ev.push([e.runEndTime, 'Run ended' + (pbEndEntryOf(e) ? ' (time typed on this phone ' + pbEaRptWhenWord(pbEndEntryOf(e)) + ')' : e.endTimeEntered ? ' (end time entered after the fact)' : ''), 'not recorded']);
    (Array.isArray(e.endTimeChanges) ? e.endTimeChanges : []).forEach(c => { if (c && typeof c.at === 'number') ev.push([c.at, 'End time adjusted (' + pbRptDt(c.from, { time: true }) + ' to ' + pbRptDt(c.to, { time: true }) + ')', 'not recorded']); });""",
"""    if (e.runEndTime) ev.push([e.runEndTime, 'Run ended' + (pbEndEntryOf(e) ? ' (time typed on this phone ' + pbEaRptWhenWord(pbEndEntryOf(e)) + ')' : e.endTimeEntered ? ' (end time entered after the fact)' : ''), phoneBy]);
    (Array.isArray(e.endTimeChanges) ? e.endTimeChanges : []).forEach(c => { if (c && typeof c.at === 'number') ev.push([c.at, 'End time adjusted (' + pbRptDt(c.from, { time: true }) + ' to ' + pbRptDt(c.to, { time: true }) + ')', phoneBy]); });""")
rep("""R.table({ head: ['Device time', 'Event', 'By (as recorded)', 'Server received'], body: ev.map(x => [pbRptDt(x[0], { sec: true }), x[1], x[2], x[3] ? x[3] : { content: 'not known', _muted: true }])""",
"""R.table({ head: ['Device time', 'Event', 'By', 'Server received'], body: ev.map(x => [pbRptDt(x[0], { sec: true }), x[1], x[2], x[3] ? x[3] : { content: '\\u2014', _muted: true }])""")

# 5) grade sheet: say what each number is
rep(""".concat(['BOP']).concat(showSg ? ['Subgrade'] : []).concat(['INV', 'TOP']).concat(showElev ? ['Elev.'] : [])""",
""".concat(['BOP rod']).concat(showSg ? ['Subgrade rod'] : []).concat(['INV rod', 'TOP rod']).concat(showElev ? ['Invert elev.'] : []) /* r16.74 */""")
# job section: empty fields collapsed too
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
# 6) page 1: distance, slope and inverts live in the strip (with their notes); the photo count says "of N" when some aren't on this phone
rep("""      ['Run', (e.startLabel || 'Start') + ' to ' + (e.endLabel || 'End')], ['Distance', pbDistanceText(e) + (hist.some(c => c.type !== 'hub' && c.type !== 'layout') ? ' (corrected; see history)' : '')],
      ['Overall slope', s ? (pbRptNum(s.overallSlopePct, 2) !== '\\u2014' && s.overallSlopePct >= 0 ? '+' : '') + pbRptNum(s.overallSlopePct, 2) + '% (+ = rising toward end)' : null], ['Start / end invert', s ? (s.startInv !== undefined ? s.startInv : '\\u2014') + ' / ' + (s.endInv !== undefined ? s.endInv : '\\u2014') + ' ft' : null],""",
"""      ['Run', (e.startLabel || 'Start') + ' to ' + (e.endLabel || 'End')],""")
rep("""      const glance = [['Distance', pbDistanceText(e)],""","""      const glance = [['Distance', pbDistanceText(e) + (hist.some(c => c.type !== 'hub' && c.type !== 'layout') ? ' (corrected)' : '')],""")
rep("""        ['Slope', s && pbRptNum""","""        ['Slope (+ = rising)', s && pbRptNum""")
rep("""        ['Inverts (start / end)', s ? (s.startInv !== undefined ? s.startInv : '\u2014') + ' / ' + (s.endInv !== undefined ? s.endInv : '\u2014') : '\u2014'],""",
"""        ['Inverts, start / end (ft)', s ? (s.startInv !== undefined ? s.startInv : '\u2014') + ' / ' + (s.endInv !== undefined ? s.endInv : '\u2014') : '\u2014'],""")
rep("""['Photos', String(R.rec.photos.length)]];""","""['Photos', String(R.rec.photos.length) + ((Number(e.photoCount) || 0) > R.rec.photos.length ? ' of ' + Number(e.photoCount) : '')]];""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
# 7) photos not on this phone: one table (every detail kept), not a box each
rep("""      const boxW = 96, boxH = 74, infoX = G.ML + boxW + 5, infoW = G.CW - boxW - 5;
      rec.photos.forEach(ph => {""",
"""      const boxW = 96, boxH = 74, infoX = G.ML + boxW + 5, infoW = G.CW - boxW - 5;
      const gone = rec.photos.filter(ph => ph.missing && !ph.url); /* r16.74: photos with no file here are listed together */
      rec.photos.filter(ph => !(ph.missing && !ph.url)).forEach(ph => {""")
rep("""        R.y = top + blockH;
      });
    };
    // Signature / attestation block""",
"""        R.y = top + blockH;
      });
      if (gone.length) {
        R.sub('Photos not included (' + gone.length + ')');
        const why = Array.from(new Set(gone.map(ph => String(ph.missing || '').trim()).filter(Boolean)));
        why.forEach(w => R.para(w, { size: 9 }));
        gone.forEach(ph => R.anchor(ph.key));
        const nv = (v) => v === null || v === undefined || v === '' ? { content: 'not recorded', _muted: true } : String(v);
        R.table({ head: ['Photo', 'Shows', 'Belongs to', ph0(gone).takenLabel || 'Taken', ph0(gone).attachedLabel || 'Attached', 'Attached by', 'Backup'],
          body: gone.map(ph => ['Photo ' + ph.n, nv(ph.info.shows), nv(ph.info.belongs), nv(ph.info.taken), nv(ph.info.attached), nv(ph.info.by), nv(ph.info.backup)]), fontSize: 8.5, keep: 20 });
      }
      function ph0(list) { return (list[0] && list[0].info) || {}; }
    };
    // Signature / attestation block""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
# 8) photos grouped by where they were taken (op.groups): a heading per point, photos two across, every detail under each
rep("""      R.section('photos', 'Photos (' + rec.photos.length + ')', { keep: 92, intro: (op.intro || 'Each photo""",
"""      if (op.howto) { (R.howto = R.howto || []).push('Photos: ' + (op.intro || 'Each photo has the number used in the body of this report.') + ' Checking a photo: where no "Printed as" line appears, the image in this PDF is the original photo file; extract it (for example with pdfimages -all) and its SHA-256 matches the one printed. Where a "Printed as" line appears, the PDF holds a shrunk copy: its printed SHA-256 belongs to the original, which is kept on the phone that took it (and in the record\\u2019s cloud backup, where one was made).'); }
      R.section('photos', 'Photos (' + rec.photos.length + ')', op.howto ? { keep: 40, intro: op.short || 'Grouped by where each was taken. How to check a photo is in How to read this record.' } : { keep: 92, intro: (op.intro || 'Each photo""")
rep("""      const gone = rec.photos.filter(ph => ph.missing && !ph.url); /* r16.74: photos with no file here are listed together */
      rec.photos.filter(ph => !(ph.missing && !ph.url)).forEach(ph => {""",
"""      const gone = rec.photos.filter(ph => ph.missing && !ph.url); /* r16.74: photos with no file here are listed together */
      const done = new Set();
      if (Array.isArray(op.groups)) { /* r16.74: per point: heading, then its photos two across with their details under each */
        const gw = (G.CW - 6) / 2, gh = 66, LS = 7.6, lh = pbRptLh(LS);
        const lines = (ph) => { const out = []; const add = (k, v) => { if (v === null || v === undefined || v === '') v = 'not recorded'; R.font(LS, 'normal'); R.split(k + ': ' + v, gw).forEach(l => out.push(l)); };
          add('Shows', ph.info.shows); add(ph.info.takenLabel || 'Taken', ph.info.taken); add(ph.info.attachedLabel || 'Attached', ph.info.attached); add('Attached by', ph.info.by); add('Backup', ph.info.backup);
          if (ph.info.belongs && /; also /.test(ph.info.belongs)) add('Also used for', ph.info.belongs.split('; also ').slice(1).join('; '));
          if (ph.url) add('SHA-256', pbPhotoSha(ph.url));
          if (ph.url && !ph.missing && R.o.unreadable && R.o.unreadable.small && R.o.unreadable.small.has(ph.url)) add('Printed as', 'a smaller copy (the original stays on the phone)');
          return out; };
        op.groups.forEach(g => {
          const list = (g.photos || []).filter(ph => ph && !done.has(ph.key) && !(ph.missing && !ph.url)); if (!list.length) return;
          list.forEach(ph => done.add(ph.key));
          for (let i = 0; i < list.length; i += 2) {
            const pair = list.slice(i, i + 2), L = pair.map(lines), blockH = (i === 0 ? 8 : 2) + 5 + gh + 2 + Math.max(...L.map(x => x.length)) * lh + 4;
            R.ensure(blockH);
            if (i === 0) { R.font(10.5, 'bold'); doc.text(g.title, G.ML, R.y + 4); if (g.sub) { R.font(8.5, 'normal', G.MUTED); doc.text(g.sub, G.ML + G.CW, R.y + 4, { align: 'right' }); } R.y += 7; }
            const top = R.y;
            pair.forEach((ph, k) => {
              const x = G.ML + k * (gw + 6);
              R.anchor(ph.key);
              R.font(9, 'bold'); doc.text('Photo ' + ph.n, x, top + 3.6);
              const back = R.map && R.map.refs[ph.key] ? R.map.refs[ph.key] : null;
              if (back) { R.font(8, 'normal', G.ACCENT); doc.text('ref. p. ' + back, x + gw, top + 3.6, { align: 'right' }); }
              const iy = top + 5;
              if (ph.missing) { doc.setFillColor(244, 244, 244); doc.setDrawColor(120, 120, 120); doc.rect(x, iy, gw, 24, 'FD'); R.font(8.5, 'bold', G.ACCENT); doc.text('NOT INCLUDED', x + 2, iy + 5); R.font(8, 'normal'); R.split(ph.missing, gw - 4).slice(0, 4).forEach((l, j) => doc.text(l, x + 2, iy + 9 + j * pbRptLh(8))); }
              else {
                const src = (R.o.unreadable && R.o.unreadable.small && R.o.unreadable.small.get(ph.url)) || ph.url;
                const dm = R.imgDims(src) || { w: 4, h: 3 }, sc = Math.min(gw / dm.w, gh / dm.h), w = dm.w * sc, h = dm.h * sc;
                if (R.final) { try { doc.addImage(src, /^data:image\\/png/i.test(src) ? 'PNG' : 'JPEG', x, iy, w, h, 'pb' + pbPhotoSha(ph.url).slice(0, 20)); } catch (e) { doc.setDrawColor(150, 150, 150); doc.rect(x, iy, w, h); } }
                doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2); doc.rect(x, iy, w, h);
              }
              R.font(LS, 'normal', G.INK); L[k].forEach((l, j) => doc.text(l, x, iy + gh + 3 + j * lh));
            });
            R.y = top + 5 + gh + 2 + Math.max(...L.map(x => x.length)) * lh + 4;
          }
        });
      }
      rec.photos.filter(ph => !(ph.missing && !ph.url) && !done.has(ph.key)).forEach(ph => {""")
# 9) run report: photos grouped by point; long explanations collected for "How to read this record" at the end
rep("""    R.photosSection();
    R.signatures('Attestation', [
      { role: 'Foreman', recorded: (fmA""",
"""    { /* r16.74: each point's stake photos together, under its name and station */
      const groups = [];
      rows.forEach(r => { const ps = rowPhotos.get(r) || []; if (!ps.length) return; const name = pbRptRowName(e, r); groups.push({ title: (name || 'Point') + ' \\u00b7 Sta ' + pbRptSta(pbRptRowStaFt(r)), sub: pbRowIsStake(e, r) ? 'Stake' : '', photos: ps }); });
      notes.forEach(n => { const ps = notePhotos.get(n) || []; if (ps.length) groups.push({ title: 'Field note \\u00b7 ' + pbRptNoteSta(e, n), photos: ps }); });
      R.photosSection({ groups, howto: true });
    }
    R.signatures('Attestation', [
      { role: 'Foreman', recorded: (fmA""")
rep("""    R.para(PB_RPT_SRC_LEGEND + (showVer ?""","""    (R.howto = R.howto || []).unshift('Grade sheet: ' + PB_RPT_SRC_LEGEND + (showVer ?""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
rep("""), { size: 9, color: G.MUTED, keep: true, lead: 'Grade sheet legend (the table is on the previous page)' });""",
""")); R.para('Stake = from a stake (bold rows); Calculated = worked out by the app. Every column is explained in How to read this record, at the end.', { size: 8.5, color: G.MUTED });""")
rep("""    pbRptIntegrity(R, e, fp, [['Photos in this record', R.rec.photos.length + ' (' + R.rec.photos.filter(p => p.missing).length + ' not included)'],""",
"""    R.afterIntegrity = () => { if (!(R.howto && R.howto.length)) return; R.section('howto', 'How to read this record', { keep: 30 }); R.howto.forEach(t => { const k = t.indexOf(': '); R.para(t.slice(k + 2), { size: 8.5, lead: t.slice(0, k) }); }); }; /* r16.74 */
    pbRptIntegrity(R, e, fp, [['Photos in this record', R.rec.photos.length + ' (' + R.rec.photos.filter(p => p.missing).length + ' not included)'],""")
rep("""    else R.para('The fingerprint shows whether two copies are the same record; it is computed on the phone and does not by itself prove when the record was made.""",
"""    else R.para('The fingerprint shows whether two copies are the same record; it is computed on the phone and does not by itself prove when the record was made.""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
rep("""  }
  // ---------- Pipe run record ----------""","""    if (typeof R.afterIntegrity === 'function') R.afterIntegrity(); /* r16.74 */
  }
  // ---------- Pipe run record ----------""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
rep("""op.howto ? { keep: 40, intro:""","""op.howto ? { keep: 120, intro:""")
rep("""  const PB_RPT_NOT_TIME = 'not recorded (the app does not keep a photo\\u2019s own capture time)';""",
"""  const PB_RPT_NOT_TIME = 'not recorded separately; the date, time and location stamp printed on the photo (where it has one) is from the phone that took it'; /* r16.74: photos are stamped since r16.56 */""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
rep("""        const gw = (G.CW - 6) / 2, gh = 66, LS = 7.6, lh = pbRptLh(LS);
        const lines = (ph) => { const out = []; const add = (k, v) => { if (v === null || v === undefined || v === '') v = 'not recorded'; R.font(LS, 'normal'); R.split(k + ': ' + v, gw).forEach(l => out.push(l)); };
          add('Shows', ph.info.shows); add(ph.info.takenLabel || 'Taken', ph.info.taken); add(ph.info.attachedLabel || 'Attached', ph.info.attached); add('Attached by', ph.info.by); add('Backup', ph.info.backup);""",
"""        const gw = (G.CW - 6) / 2, gh = 56, LS = 7.6, lh = pbRptLh(LS);
        const all = op.groups.reduce((a, g) => a.concat((g.photos || []).filter(ph => ph && !(ph.missing && !ph.url))), []);
        const nv = (v) => v === null || v === undefined || v === '' ? 'not recorded' : String(v);
        const F = [['taken', (p) => p.info.takenLabel || 'Taken'], ['attached', (p) => p.info.attachedLabel || 'Attached'], ['by', () => 'Attached by'], ['backup', () => 'Backup']];
        const same = {}; F.forEach(([k, lab]) => { const v = all.length ? nv(all[0].info[k]) : null, l = all.length ? lab(all[0]) : null; if (all.length > 1 && all.every(p => nv(p.info[k]) === v && lab(p) === l)) same[k] = [l, v]; });
        const sk = Object.keys(same);
        if (sk.length) R.para('For every photo below: ' + sk.map(k => same[k][0] + ': ' + same[k][1]).join('. ') + '.', { size: 8, color: G.MUTED }); /* r16.74: said once, not under each photo */
        const lines = (ph) => { const out = []; const add = (k, v) => { R.font(LS, 'normal'); R.split(k + ': ' + nv(v), gw).forEach(l => out.push(l)); };
          add('Shows', ph.info.shows); F.forEach(([k, lab]) => { if (!same[k]) add(lab(ph), ph.info[k]); });""")
open(sys.argv[2],'w').write(s)
s=open(sys.argv[2]).read()
rep("""    if (typeof R.afterIntegrity === 'function') R.afterIntegrity(); /* r16.74 */""",
"""    if (typeof R.afterIntegrity === 'function') R.afterIntegrity(); /* r16.74 */
    R.afterIntegrity = null; R.howto = []; // never carried into the next record of a multi-record PDF""")
open(sys.argv[2],'w').write(s)
