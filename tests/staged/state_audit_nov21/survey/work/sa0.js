  const pbStakeAiNum = v => { const t = String(v == null ? '' : v).trim().replace(/,/g, ''); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };
  function pbStakeAiParseStation(v) {
    const m = String(v || '').trim().replace(/^STA\.?\s*/i, '').match(/^(-)?(\d+)\s*\+\s*(\d{2}(?:\.\d+)?)$/); /* feat_runsetup (14): exactly two digits after the + */
    return m ? (m[1] ? -1 : 1) * (parseInt(m[2], 10) * 100 + parseFloat(m[3])) : null;
  }
  // The number in what the AI copied from the stake, in decimal feet (ft-in-fractions converted here, so the
  // AI's own conversion is checked, never trusted).
  function pbStakeAiWrittenFeet(w) {
    const t = String(w || '').replace(/[’′]/g, "'").replace(/[”″]/g, '"');
    let m = t.match(/(\d+)\s*'\s*-?\s*(\d+)(?:\s+(\d+)\s*\/\s*(\d+))?\s*"?/);
    if (m) return parseInt(m[1], 10) + (parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / parseInt(m[4], 10) : 0)) / 12;
    m = t.match(/(\d+)\s+(\d{2})(?![\d\/.])/);
    if (m && !/\d\.\d/.test(t)) return parseInt(m[1], 10) + parseInt(m[2], 10) / 100;
    m = t.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function pbStakeAiSeg(prefix) {
    let m = /^seg(\d+)(start|end|hub\d+)$/.exec(prefix);
    if (m) return { seg: +m[1], start: 'seg' + m[1] + 'start', isStart: m[2] === 'start', isEnd: m[2] === 'end' };
    if (prefix === 'start' || prefix === 'end') return { seg: 1, start: 'start', isStart: prefix === 'start', isEnd: prefix === 'end' };
    const card = document.querySelector('[data-hub-id="' + prefix + '"]');
    const cont = card && card.closest('[id^="hubsContainer"]');
    const n = cont ? (cont.id.replace('hubsContainer', '') || '1') : '1';
    return { seg: +n, start: n === '1' ? 'start' : 'seg' + n + 'start', isStart: false, isEnd: false };
  }
  // Where "distance from start" goes for this point (a hub's Station, a run's total distance), or null.
  function pbStakeAiDistField(prefix, sg) {
    if (sg.isStart) return null;
    if (sg.isEnd) return sg.seg === 1 ? 'totalDist' : 'seg' + sg.seg + 'TotalDist';
    return document.getElementById(prefix + 'Station') ? prefix + 'Station' : null;
  }
  // The AI's JSON -> review values. A field counts only when the AI was sure ("high") AND what it copied from
  // the stake agrees with the number it gave; anything else starts empty, flagged, with what it thought.
  function pbStakeAiFromReply(text) {
    let o = null;
    try { const t = String(text || ''); const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) o = JSON.parse(t.slice(a, b + 1)); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return { bad: 'The AI’s answer couldn’t be read.' };
    if (o.is_stake === false) return { refused: String(o.reason || 'it doesn’t look like a survey stake') };
    const vals = {}, flags = {}, thought = {};
    const sure = f => f && typeof f === 'object' && String(f.conf || '').toLowerCase() === 'high';
    const txt = (k, f) => { const v = f && f.value != null ? String(f.value).trim().slice(0, 60) : ''; if (sure(f) && v) vals[k] = v; else { flags[k] = true; if (v) thought[k] = v; } };
    txt('stakeNum', o.stake_number); txt('station', o.station); txt('offset', o.offset); txt('line', o.line_label);
    if (vals.station && pbStakeAiParseStation(vals.station) === null) { flags.station = true; thought.station = vals.station; delete vals.station; }
    const cf = o.cut_fill || {}, cfFeet = Number(cf.feet), dir = String(cf.direction || '').toLowerCase();
    const cfWritten = pbStakeAiWrittenFeet(cf.as_written), cfLetter = /^\s*([CF])/i.exec(String(cf.as_written || ''));
    const cfOk = sure(cf) && (dir === 'cut' || dir === 'fill') && Number.isFinite(cfFeet) && cfFeet >= 0 && cfFeet < 100
      && (cfWritten === null || Math.abs(cfWritten - cfFeet) < 0.002) && (!cfLetter || (cfLetter[1].toUpperCase() === 'C') === (dir === 'cut'));
    if (cfOk) { vals.cfDir = dir; vals.cfVal = cfFeet; } else { flags.cf = true; if (cf.as_written || Number.isFinite(cfFeet)) thought.cf = String(cf.as_written || ((dir ? dir + ' ' : '') + cfFeet)); }
    const se = o.stake_elevation || {}, seFeet = Number(se.feet), seWritten = pbStakeAiWrittenFeet(se.as_written);
    if (!sure(se) && /^\s*\(\s*\d{1,5}(?:\.\d{1,3})?\s*\)\s*$/.test(String(se.as_written || '')) && se.feet != null && Number.isFinite(seFeet) && seWritten !== null && Math.abs(seWritten - Math.abs(seFeet)) < 0.002) se.conf = 'high'; /* r16.59: a number in parentheses on the hub lath is the hub elevation */
    if (sure(se) && se.feet != null && Number.isFinite(seFeet) && Math.abs(seFeet) < 30000 && (seWritten === null || Math.abs(seWritten - Math.abs(seFeet)) < 0.002)) vals.stakeElev = seFeet;
    else { flags.stakeElev = true; if (se.as_written || (se.feet != null && Number.isFinite(seFeet))) thought.stakeElev = String(se.as_written || seFeet);
      { const gs = se.feet != null && Number.isFinite(seFeet) ? seFeet : seWritten; if (gs !== null && Number.isFinite(gs) && Math.abs(gs) < 30000) vals.stakeElev = gs; } } /* r16.58: an unsure elevation (e.g. a short (88.10) on the hub lath) is filled and outlined, not left blank */
    const notes = (Array.isArray(o.uncertain) ? o.uncertain : []).map(x => String(x).slice(0, 200)).filter(Boolean).slice(0, 6);
    const other = o.other_text ? String(o.other_text).slice(0, 200) : '';
    return { vals, flags, thought, notes, other };
  }

module.exports=pbStakeAiFromReply;
