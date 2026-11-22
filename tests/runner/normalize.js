// Output normalizer for golden comparison: turns the parts of a test's output that change from run to run or from build
// to build (clock times, ids, hashes, build stamps, timings) into fixed tokens, and drops lines from the environment
// (proxy notices, font fetches). App behavior (numbers the app computes, wording, counts) is left alone.
'use strict';
const RULES = [
  [/\x1b\[[0-9;]*m/g, ''],
  // build stamps: 'r17.01 · 2026-11-18', PB_APP_BUILD, sw build
  [/\br\d{2}\.\d{2}[a-z]?\s*·\s*\d{4}-\d\d-\d\d/g, 'BUILD'],
  [/\br\d{2}\.\d{2}[a-z]?\b/g, 'rNN.NN'],
  // dates and times
  [/\d{4}-\d\d-\d\dT[\d:.]+(Z|[+-]\d\d:?\d\d)?/g, 'TS'],
  [/\b\d{8}T\d{6}\b/g, 'TS'],
  [/\b\d{1,2}:\d\d(:\d\d)?(\.\d+)?\s?(AM|PM|am|pm)?\b/g, 'T'],
  [/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(, \d{4})?/g, 'DATE'],
  [/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}\b/g, 'DATE'],
  [/\b\d{4}-\d\d-\d\d\b/g, 'DAY'],
  [/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, 'DAY'],
  // epoch ms ids, uuids, hashes, random ids
  [/(?<![\d.])1[67]\d{11}(?!\d)/g, 'ID'],
  // embedded photos (the photo stamp carries the time, so the JPEG bytes differ every run)
  [/data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+/g, 'data:image/$1;base64,IMG'],
  // responder links: a fresh random code per permit
  [/(e\.pipelayersbible\.com\/\?)[A-Za-z0-9-]{10,20}/g, '$1CODE'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, 'UUID'],
  // hex ids need at least one letter, so long decimals (0.6666666666666666) stay as they are
  [/\b(?=[0-9a-f]{0,63}[a-f])[0-9a-f]{64}\b/g, 'SHA256'],
  [/\b(?=[0-9a-f]{0,39}[a-f])[0-9a-f]{40}\b/g, 'SHA1'],
  [/\b(?=[0-9a-f]{0,31}[a-f])[0-9a-f]{32}\b/g, 'MD5'],
  [/\b(?=[0-9a-f]{0,15}[a-f])[0-9a-f]{16}\b/g, 'HEX16'],
  [/\b[0-9a-z]{8}-[0-9a-z]{8}\b/g, 'CID'],
  // client-made ids: Date.now().toString(36) + random (e.g. mmwlzmrjp532upbk9), at least one digit and one letter
  [/\b(?=[a-z0-9]*\d)(?=[a-z0-9]*[a-z])[a-z0-9]{13,20}\b/g, 'RID'],
  [/\bm[mw][a-z0-9]{11,18}\b/g, 'RID'], // the same kind of id with no digit in it
  // a sealed PDF / export: its size changes with the stamped photos; what matters is that the stored size equals the real one
  [/"bytes":(\d+),"real":(\d+)/g, (m, a, b) => (a === b ? '"bytes":N,"real":N' : m)],
  [/\bzip bytes \d+/g, 'zip bytes N'],
  [/(Manifest fingerprint:? )[0-9a-f]+/g, '$1HASH'],
  [/[Rr]ef PB-[A-Z]-\w+/g, 'REF'],
  [/\bblob:http:\/\/127\.0\.0\.1:\d+\/[\w-]+/g, 'BLOB'],
  // the test server's address and the per-test scratch folder
  [/http:\/\/127\.0\.0\.1:\d+\//g, 'http://HOST/'],
  [/\/tmp\/pbtest-[^/\s'"]+\/out\/[^/\s'"]+/g, 'OUT'],
  [/\/tmp\/pbtest-[^/\s'"]+/g, 'TMP'],
  // measured durations
  [/\b\d+(\.\d+)?\s?ms\b/g, 'Nms'],
  [/\b\d+(\.\d+)?\s?(s|sec|secs|second|seconds)\b(?!\w)/g, 'Ns'],
  // pdftotext -layout pads columns by text width, which moves with times and dates in the text
  [/ {2,}/g, ' '],
  [/\d+ × waiting/g, 'N × waiting'],
];
// network-level load failures of outside resources (map tiles, fonts) depend on the machine's network/proxy, not the app
const DROP = [/Failed to load resource: net::ERR_/, /agent-proxy/, /__agentproxy/, /fonts\.google/, /Allowed domains/, /For details/, /^\s*at .*\(node:internal/, /^Node\.js v\d+/];
function normalize(text, extra) {
  let t = String(text).replace(/\r\n/g, '\n');
  for (const [re, to] of RULES) t = t.replace(re, to);
  if (extra && extra.replace) for (const [re, to] of extra.replace) t = t.replace(re, to);
  let lines = t.split('\n').map((l) => l.replace(/\s+$/, ''));
  lines = lines.filter((l) => !DROP.some((re) => re.test(l)));
  if (extra && extra.drop) lines = lines.filter((l) => !extra.drop.some((re) => re.test(l)));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n') + '\n';
}
module.exports = { normalize };
