// t_emergency_app.js <patched.html>: app side test for p_emergency_app.py (node, no browser). Extracts the emergency block and
// pbAiAskLocal from the patched page, runs them in a VM with stubs, checks scripts and the "Emergency? Call 911." lines; then
// syntax-checks every inline <script> of the page.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const a = html.indexOf("  // ask_quality_nov22 (safety review 1-2)"), b = html.indexOf("  // ---- ask_v2: one conversation", a);
if (a < 0 || b < 0) throw new Error("block not found");
const code = html.slice(a, b) + "\n;globalThis.out = { pbAiAskLocal, PB_AI_EMERGENCY_RX };";
const ctx = { PB_EDU_ARTICLES: {}, pbEduArticleEl: () => null, pbEduArticleTitle: () => "", String, RegExp, Object, Array };
vm.createContext(ctx); vm.runInContext(code.replace(/\bconst /g, "var "), ctx);
const L = ctx.out.pbAiAskLocal; let bad = 0;
const want = { "we hit a gas line": /upwind/, "excavator touched the overhead line": /stay in the cab/, "guy passed out in the sun": /CPR[\s\S]*cooling/, "my pipelayer passed out in the manhole": /Stay out/, "tengo un hombre atrapado en la zanja": /Llame al 911/, "mi compañero se desmayó": /RCP/, "4 gas went off": /Stay out/, "flagger got hit": /911/ };
for (const [q, re] of Object.entries(want)) { const r = L(q); const okk = r && r.kind === "emergency" && re.test(r.body); if (!okk) bad++; console.log(okk ? "ok  " : "FAIL", q, r && r.script); }
for (const q of ["What should the H2S alarm be set at?", "How far do I stay from an overhead power line?", "What are the signs of heat stroke?", "can we go in"]) { const r = L(q); if (r) bad++; console.log(r ? "FAIL" : "ok  ", "not emergency:", q); }
const msg = html.slice(html.indexOf("const PB_AI_MSG = {"), html.indexOf("};", html.indexOf("const PB_AI_MSG = {")));
for (const k of ["plan", "offline", "daily", "timeout", "network", "busy", "unavailable", "betaEnded"]) { const line = msg.split("\n").find((l) => l.trim().startsWith(k + ":")); const okk = /Emergency\? Call 911\./.test(line || ""); if (!okk) bad++; console.log(okk ? "ok  " : "FAIL", "msg", k); }
// syntax check of each inline script
let n = 0; for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) { if (/application\/(ld\+)?json|text\/template/.test(m[1])) continue; try { new vm.Script(m[2]); n++; } catch (e) { bad++; console.log("FAIL syntax", e.message); } }
console.log("inline scripts parsed:", n, bad ? "FAILED " + bad : "ALL OK"); process.exit(bad ? 1 : 0);
