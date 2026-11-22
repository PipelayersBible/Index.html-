// run_cases.mjs <emergency.ts> <app.html> [cases.txt] : runs every phrase in cases.txt through BOTH copies of the instant
// emergency check: the server's emergency.ts (esbuild -> ES module) and the block pasted in the app (extracted from the page,
// run in a VM). Checks: must-fire phrases fire with the expected script and language, must-not phrases do not fire, and the
// two copies give the same answer (script, language and the full text) for every phrase. Exit 1 on any failure.
import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import path from "node:path";
const [tsFile, htmlFile, casesFile = new URL("./cases.txt", import.meta.url).pathname] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "emg-"));
execFileSync("esbuild", [tsFile, "--format=esm", "--log-level=warning", "--outfile=" + tmp + "/emergency.mjs"]);
const S = await import(tmp + "/emergency.mjs");
const html = fs.readFileSync(htmlFile, "utf8");
const a = html.indexOf("  // emergency.ts ("), b = html.indexOf("  const PB_AI_EMERGENCY_RX = PB_EMG_STRONG;", a);
if (a < 0 || b < 0) throw new Error("app emergency block not found");
const ctx = { String, RegExp, Object, Array };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b).replace(/^ {2}const /gm, "var ") + "\n;globalThis.A = { pbEmergencyKind, pbEmergencyAnswer };", ctx);
const A = ctx.A;
const lines = fs.readFileSync(casesFile, "utf8").split("\n").filter((l) => l.trim() && (!l.startsWith("#") || l.startsWith("##")));
let bad = 0, n = { fire: 0, no: 0, either: 0 }, section = "";
const fails = [];
for (const l of lines) {
  if (l.startsWith("##")) { section = l.slice(3); continue; }
  const [exp, lang, ...rest] = l.split("|"), q = rest.join("|");
  const s = S.pbEmergencyAnswer(q), p = A.pbEmergencyAnswer(q);
  const same = JSON.stringify(s) === JSON.stringify(p);
  const got = s ? s.script + "/" + s.lang : "-";
  let ok = same;
  if (exp === "-") { n.no++; ok = ok && !s; }
  else if (exp === "?") { n.either++; }
  else { n.fire++; ok = ok && !!s && s.script === exp && s.lang === lang; }
  if (!ok) { bad++; fails.push(`FAIL [${section}] want ${exp}${lang ? "/" + lang : ""} got server ${got} app ${p ? p.script + "/" + p.lang : "-"}${same ? "" : " (COPIES DIFFER)"} | ${q}`); }
  if (process.env.V || exp === "?") console.log((ok ? "ok  " : "FAIL") + " " + (exp + (lang ? "/" + lang : "")).padEnd(9) + " got " + got.padEnd(9) + " | " + q);
}
fails.forEach((f) => console.log(f));
console.log(`must fire ${n.fire}, must not fire ${n.no}, either ${n.either}: ${bad ? bad + " FAILED" : "ALL OK"} (server and app copies compared on every phrase)`);
process.exit(bad ? 1 : 0);
