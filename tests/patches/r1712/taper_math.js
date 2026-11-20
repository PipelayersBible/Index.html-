/* taper_calc_nov20: Taper & Cone Spacing math. Pure: no page, no storage. Inlined into the app by p_taper.py and
   required by tests/unit_math.js. Numbers: MUTCD 11th Edition (FHWA, Dec 2023, Rev. 1 Dec 2025), Part 6 -
   Tables 6B-1 (sign spacing), 6B-2 (stopping sight distance), 6B-3 / 6B-4 (tapers), Section 6K.01 (device spacing),
   Section 6B.08 (20 ft in one-lane two-way and downstream tapers). California: CA MUTCD 2026 Table 6B-1 (city streets
   by speed). Alaska: 2026 Alaska Traffic Manual Supplement Table 6B-1 (city low speed = 40 mph or less).
   Checked Nov 20 2026. */
(function (root) {
  var SSD = { 20: 115, 25: 155, 30: 200, 35: 250, 40: 305, 45: 360, 50: 425, 55: 495, 60: 570, 65: 645, 70: 730, 75: 820 };
  var SIGNS = { urbanLow: [100, 100, 100], urbanHigh: [350, 350, 350], rural: [500, 500, 500], freeway: [1000, 1500, 2640] };
  var CA_CITY = [[25, 100], [30, 150], [35, 200], [40, 250], [45, 300], [Infinity, 350]];
  var TYPES = { merge: 1, shift: 1 / 2, shoulder: 1 / 3, flagger: 0, down: 0 };
  var up = function (x) { return Math.ceil(x - 1e-9); };
  // L: 40 mph or less W*S*S/60, 45 mph or more W*S. A speed between 40 and 45 takes W*S (the longer one).
  function baseL(W, S) { return S <= 40 ? W * S * S / 60 : W * S; }
  function signs(road, S, state) {
    if (!SIGNS[road]) return null;
    if (state === 'CA' && (road === 'urbanLow' || road === 'urbanHigh')) {
      var v = 350; for (var i = 0; i < CA_CITY.length; i++) if (S <= CA_CITY[i][0]) { v = CA_CITY[i][1]; break; }
      return { abc: [v, v, v], rule: 'CA' };
    }
    // Alaska: 2026 ATMS Table 6B-1 (replaces the national table): same distances, low speed = 40 mph or less
    if (state === 'AK' && (road === 'urbanLow' || road === 'urbanHigh')) return { abc: S <= 40 ? [100, 100, 100] : [350, 350, 350], rule: 'AK' };
    return { abc: SIGNS[road].slice(), rule: 'US' };
  }
  function calc(o) {
    var S = Number(o.speed), W = Number(o.width), type = o.type || 'merge';
    if (!(type in TYPES)) return { err: 'Pick a taper type.' };
    if (!isFinite(S) || S < 20 || S > 75) return { err: 'Enter a posted speed from 20 to 75 mph.' };
    var range = TYPES[type] === 0;
    if (!range && (!isFinite(W) || W <= 0 || W > 30)) return { err: 'Enter a lane or shoulder width from 1 to 30 ft.' };
    var r = { type: type, speed: S, width: range ? null : W, range: range };
    if (range) {
      r.L = null; r.Lmin = 50; r.Lmax = 100; r.taperSpacing = 20;
      r.conesMin = up(50 / 20) + 1; r.conesMax = up(100 / 20) + 1;
    } else {
      var L0 = baseL(W, S);
      r.formula = S <= 40 ? 'WS2/60' : 'WS';
      r.Lfull = up(L0);
      r.L = up(L0 * TYPES[type]);
      r.taperSpacing = Math.floor(S);
      r.cones = up(r.L / r.taperSpacing) + 1;
      r.coneGap = Math.floor(r.L / (r.cones - 1));
    }
    r.tangentSpacing = Math.floor(2 * S);
    r.ssdSpeed = Math.min(75, up(S / 5) * 5);
    r.buffer = SSD[r.ssdSpeed];
    r.signs = signs(o.road, S, o.state);
    if (r.signs) r.firstSign = r.signs.abc[0] + r.signs.abc[1] + r.signs.abc[2];
    return r;
  }
  var api = { calc: calc, baseL: baseL, SSD: SSD, SIGNS: SIGNS, CA_CITY: CA_CITY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.pbTaperMath = api;
})(typeof window !== 'undefined' ? window : null);
