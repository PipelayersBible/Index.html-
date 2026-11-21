  function pbCsSideNorm(t) {
    return String(t).replace(/^(-?\d+\+\d{2}(?:\.\d+)?|-?\d+\.\d+)\s+(?:O\/?S\.?\s*)?(?:(LEFT|RIGHT|LT|RT|L|R)\.?\s*(\d+(?:\.\d+)?)'?|(\d+(?:\.\d+)?)'?\s*(LEFT|RIGHT|LT|RT|L|R)\.?)(?=\s|$)/i,
      (m0, sta, s1, d1, d2, s2) => sta + ' ' + String(s1 || s2).charAt(0).toUpperCase() + ' ' + (d1 || d2));
  }
  function parseCutsheetLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    // A stake added later is often numbered with a letter ("2A", between stakes 2 and 3), and some
    // sheets print coordinates (or elevations) with thousands commas ("2,145,332.18"). Commas are
    // read only in those number columns, never in the station/description part.
    const N = '(-?(?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d+)';
    const cfNorm = trimmed.replace(new RegExp('\\s(CUT|FILL|C|F)\\.?\\s*([+-]?\\d+\\.\\d+)((?:\\s+' + N + '){3}\\s*)$', 'i'), (m0, w, v, rest) => ' ' + w.charAt(0).toUpperCase() + v + rest); // survey s2: "C 4.60" / "CUT 4.60" -> "C4.60"
    const m = cfNorm.match(new RegExp('^((?:\\d{1,3}(?:,\\d{3})+|\\d+)[A-Za-z]?)\\s+(.+?)\\s+' + N + '\\s+([CF][+-]?\\d+\\.\\d+)\\s+' + N + '\\s+' + N + '\\s+' + N + '\\s*$'));
    if (!m) return null;
    const noCommas = (x) => x.replace(/,/g, '');
    const [stakeNum, planElevStr, stakeElevStr] = [m[1], m[3], m[5]].map(noCommas);
    const [, , midPart, , cfStr] = m;
    if (/(^|\s)(?:CUT|FILL|C|F)\.?\s*[+-]?\d+\.\d+(?=\s|$)/i.test(midPart)) return null; // two rows run together: listed as unreadable (survey s2: "C 4.60" / "CUT 4.60" too)
    let station = null, offsetSide = null, offsetDist = null, designPt = null, description = midPart.trim();
    // Some sheets print "STA 1+00" — the prefix is only a label, so drop it before reading the station.
    // Some sheets also print the station with spaces around the '+' ("1 + 00.00"): it is still a station.
    const staPart = pbCsSideNorm(midPart.replace(/^STA\.?\s*(?=-?\d+\s*\+\s*\d)/i, '').replace(/^(-?\d+)\s*\+\s*(?=\d)/, '$1+'));
    // The part after '+' may be whole feet (1+00) or decimal (1+00.00) — the '+' alone marks it as a station.
    // The description is optional in every form below: a grade stake between structures
    // is often printed with a blank Description cell, and its station must still be read.
    if (/^-?\d+\+\d/.test(staPart) && !/^-?\d+\+\d{2}(?:\.\d+)?(?:\s|$)/.test(staPart)) return null; /* feat_runsetup (14): 4+150 / 4+5: listed as unreadable, never read as 550 / 405 */
    let sm = staPart.match(/^(-?\d+)\+(\d{2}(?:\.\d+)?)\s+([LR])\s+(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/); // the offset may be whole feet too ("L 5")
    if (sm) {
      const wholeSta = parseInt(sm[1], 10);
      const partSta = parseFloat(sm[2]);
      const isNegativeStation = sm[1].trim().charAt(0) === '-'; // parseInt("-0") produces -0, and -0 < 0 is false in JS — checking the original string is the only reliable way to catch a negative-zero-anchored station like "-0+50.00"
      station = (isNegativeStation ? -1 : 1) * (Math.abs(wholeSta) * 100 + partSta);
      offsetSide = sm[3]; offsetDist = parseFloat(sm[4]); description = (sm[5] || '').trim();
    } else {
      sm = pbCsSideNorm(midPart).match(/^(-?\d+\.\d+)\s+([LR])\s+(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/);
      if (sm) {
        station = parseFloat(sm[1]); offsetSide = sm[2]; offsetDist = parseFloat(sm[3]); description = (sm[4] || '').trim();
      } else if ((sm = staPart.match(/^(-?\d+)\+(\d{2}(?:\.\d+)?)(?:\s+(.*))?$/))) {
        // Station in survey notation (e.g. 0+00.00) with NO offset — a
        // centerline stake. The '+' makes this unambiguous. Previously this
        // fell through, the station was lost into the description, and the
        // row could never be imported with no indication why.
        const wholeSta = parseInt(sm[1], 10);
        const partSta = parseFloat(sm[2]);
        const isNegativeStation = sm[1].trim().charAt(0) === '-';
        station = (isNegativeStation ? -1 : 1) * (Math.abs(wholeSta) * 100 + partSta);
        description = (sm[3] || '').trim();
      } else if ((sm = midPart.match(/^(-?\d+\.\d+)(?:\s+(.*))?$/))) {
        // Decimal station with NO offset (e.g. 123.45 INV STM). Requires a
        // decimal point so a bare integer stays a design-point number below.
        station = parseFloat(sm[1]); description = (sm[2] || '').trim();
      } else {
        sm = midPart.match(/^(\d+)(?:\s+(.*))?$/);
        if (sm) { designPt = sm[1]; description = (sm[2] || '').trim(); }
      }
    }
    const cfm = cfStr.match(/^([CF])([+-]?)(\d+\.\d+)$/);
    const cfType = cfm ? (cfm[1] === 'C' ? 'cut' : 'fill') : null;
    const cfVal = cfm ? parseFloat(cfm[3]) : null;
    const lm = description.match(/^(\d+)\/([A-Za-z]+)\b/);
    const lineTag = lm ? (lm[1] + '/' + lm[2].toUpperCase()) : 'Other / Reference';
    return {
      stakeNum, station, offsetSide, offsetDist, designPt, description,
      planElev: parseFloat(planElevStr), cfType, cfVal, stakeElev: parseFloat(stakeElevStr),
      lineTag, raw: trimmed
    };
  }

module.exports=parseCutsheetLine;
