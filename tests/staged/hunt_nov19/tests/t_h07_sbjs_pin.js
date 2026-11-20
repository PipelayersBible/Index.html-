// hunt_nov19 (PROPOSAL, not patched): the login library must be an exact version with an integrity fingerprint.
// Static check of the page source: node t_h07_sbjs_pin.js <index.html>. Fails on r17.10 (floating "@2", no integrity).
const fs = require('fs'); const s = fs.readFileSync(process.argv[2] || require('path').resolve(__dirname, '../../../../_src/index.html'), 'utf8');
const m = /<script src="(https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[^"]+)"([^>]*)>/.exec(s);
let fails = 0; const ok = (c, t) => { console.log((c ? 'PASS ' : 'FAIL ') + t); if (!c) fails++; };
ok(!!m, 'the page loads supabase-js from one script tag');
ok(!!m && /@\d+\.\d+\.\d+(\/|$)/.test(m[1]), 'exact version (x.y.z), not a floating one: ' + (m && m[1]));
ok(!!m && /\sintegrity="sha(256|384|512)-[A-Za-z0-9+/=]+"/.test(m[2]), 'integrity fingerprint on the tag');
console.log(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); process.exit(fails ? 1 : 0);
