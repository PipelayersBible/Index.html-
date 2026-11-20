// Unit checks of the taper math against MUTCD worked numbers. node tests/unit_math.js
const M = require('../taper_math.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const c = (o) => M.calc(Object.assign({ width: 12, type: 'merge' }, o));
// Worked examples: 12 ft lane at 45 mph -> 540 ft (L = WS); 35 mph -> 245 ft (WS^2/60); 55 mph -> 660 ft (mutcd-6b-taper-1)
ok(c({ speed: 45 }).L === 540, '45 mph, 12 ft, merging = 540 ft (L = W x S)');
ok(c({ speed: 35 }).L === 245, '35 mph, 12 ft, merging = 245 ft (12 x 35 x 35 / 60)');
ok(c({ speed: 55 }).L === 660, '55 mph, 12 ft, merging = 660 ft');
ok(c({ speed: 45 }).formula === 'WS' && c({ speed: 40 }).formula === 'WS2/60', 'formula switches between 40 and 45 mph');
// 12 ft column = CA MUTCD 2026 Table 6B-3(CA): merge, shift, shoulder
const CA = { 20: [80, 40, 27], 25: [125, 63, 42], 30: [180, 90, 60], 35: [245, 123, 82], 40: [320, 160, 107], 45: [540, 270, 180], 50: [600, 300, 200], 55: [660, 330, 220], 60: [720, 360, 240], 65: [780, 390, 260], 70: [840, 420, 280], 75: [900, 450, 300] };
for (const s of Object.keys(CA)) {
  const got = ['merge', 'shift', 'shoulder'].map(t => c({ speed: +s, type: t }).L);
  ok(JSON.stringify(got) === JSON.stringify(CA[s]), s + ' mph 12 ft merge/shift/shoulder ' + got + ' = CA Table 6B-3(CA) ' + CA[s]);
}
// other widths: 10 ft 45 mph 450; 11 ft 55 mph 605; 8 ft shoulder at 45 mph = 120 (mutcd-6b-taper-2)
ok(c({ speed: 45, width: 10 }).L === 450, '10 ft at 45 mph = 450 ft');
ok(c({ speed: 55, width: 11 }).L === 605, '11 ft at 55 mph = 605 ft');
ok(c({ speed: 45, width: 8, type: 'shoulder' }).L === 120, '8 ft shoulder at 45 mph = 120 ft');
ok(c({ speed: 30, width: 10 }).L === 150, '10 ft at 30 mph = 150 ft');
// a speed between 40 and 45 takes the longer W x S
ok(c({ speed: 42 }).L === 504, '42 mph takes W x S = 504 ft (longer than WS^2/60 = 353)');
// cones: 245 ft at 35 mph -> 8; 540 ft at 45 -> 13 (mutcd-6k-spacing-1; Oregon OTTCH Table 2-3 same counts)
let r = c({ speed: 35 }); ok(r.cones === 8 && r.coneGap === 35 && r.taperSpacing === 35, '35 mph merging: 8 cones 35 ft apart');
r = c({ speed: 45 }); ok(r.cones === 13 && r.coneGap === 45, '45 mph merging: 13 cones 45 ft apart');
r = c({ speed: 25 }); ok(r.cones === 6, '25 mph merging 125 ft: 6 cones (OTTCH Table 2-3: 6)');
r = c({ speed: 30 }); ok(r.cones === 7 && r.coneGap <= 30, '30 mph merging 180 ft: 7 cones (OTTCH: 7), gap ' + r.coneGap);
r = c({ speed: 40 }); ok(r.cones === 9 && r.coneGap <= 40, '40 mph merging 320 ft: 9 cones (OTTCH: 9), gap ' + r.coneGap);
for (const s of [50, 55, 60, 65]) ok(c({ speed: s }).cones === 13, s + ' mph merging: 13 cones (OTTCH: 13)');
for (let s = 20; s <= 75; s += 5) for (const t of ['merge', 'shift', 'shoulder']) for (const w of [8, 10, 11, 12]) { const x = c({ speed: s, type: t, width: w }); if (!(x.L / (x.cones - 1) <= s + 1e-9)) ok(false, 'gap over speed ' + s + t + w); }
ok(true, 'every taper 20-75 mph, 8-12 ft: cone gap never over 1 x speed');
// tangent 2 x speed
ok(c({ speed: 35 }).tangentSpacing === 70 && c({ speed: 55 }).tangentSpacing === 110, 'tangent spacing 2 x speed (70 ft at 35, 110 at 55)');
// one-lane two-way and downstream: 50-100 ft, 20 ft apart, 4 to 6 cones
for (const t of ['flagger', 'down']) { r = c({ speed: 45, type: t }); ok(r.range && r.Lmin === 50 && r.Lmax === 100 && r.taperSpacing === 20 && r.conesMin === 4 && r.conesMax === 6, t + ': 50-100 ft, 20 ft apart, 4-6 cones'); }
ok(!c({ speed: 45, type: 'flagger', width: '' }).err, 'flagger taper needs no width');
// buffer: Table 6B-2
const T2 = { 20: 115, 25: 155, 30: 200, 35: 250, 40: 305, 45: 360, 50: 425, 55: 495, 60: 570, 65: 645, 70: 730, 75: 820 };
ok(Object.keys(T2).every(s => c({ speed: +s }).buffer === T2[s]), 'buffer = Table 6B-2 at every 5 mph from 20 to 75');
ok(c({ speed: 32 }).buffer === 250 && c({ speed: 32 }).ssdSpeed === 35, 'a speed between rows takes the next row up (32 -> 35 mph, 250 ft)');
// signs: Table 6B-1 federal
ok(JSON.stringify(c({ speed: 25, road: 'urbanLow' }).signs.abc) === '[100,100,100]', 'urban low 100/100/100');
ok(JSON.stringify(c({ speed: 45, road: 'urbanHigh' }).signs.abc) === '[350,350,350]', 'urban high 350/350/350');
ok(JSON.stringify(c({ speed: 55, road: 'rural' }).signs.abc) === '[500,500,500]' && c({ speed: 55, road: 'rural' }).firstSign === 1500, 'rural 500/500/500, first sign 1,500 ft');
ok(JSON.stringify(c({ speed: 65, road: 'freeway' }).signs.abc) === '[1000,1500,2640]', 'freeway 1000/1500/2640');
ok(c({ speed: 45 }).signs === null, 'no road type picked: no sign spacing');
// California city streets by speed (CA MUTCD 2026 Table 6B-1)
const CAS = { 25: 100, 30: 150, 35: 200, 40: 250, 45: 300, 50: 350, 65: 350 };
for (const s of Object.keys(CAS)) { const x = c({ speed: +s, road: 'urbanLow', state: 'CA' }); ok(x.signs.rule === 'CA' && x.signs.abc[0] === CAS[s], 'CA city ' + s + ' mph: ' + CAS[s] + ' ft'); }
ok(c({ speed: 30, road: 'urbanLow', state: 'CA' }).signs.abc[0] === 150 && c({ speed: 30, road: 'urbanLow', state: 'US' }).signs.abc[0] === 100, '30 mph city: CA 150 ft vs federal 100 ft');
ok(c({ speed: 55, road: 'rural', state: 'CA' }).signs.rule === 'US', 'CA rural = national 500 ft row');
// bad entries
ok(!!c({ speed: 15 }).err && !!c({ speed: 80 }).err && !!c({ speed: '' }).err, 'speed outside 20-75 is refused');
ok(!!c({ speed: 45, width: 0 }).err && !!c({ speed: 45, width: 40 }).err, 'width 0 or over 30 ft is refused');
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
