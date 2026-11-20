// Writes work/queries.json: the eval questions with the word groups and word weights the Ask build makes for them (queryGroups, groupWeights), so the
// local Postgres timing uses exactly what Ask would send.   deno run -A --no-check tools/gen_groups.ts <src dir>
const src = Deno.args[0];
const { queryGroups, buildIndex } = await import(src + "/_shared/retrieval.ts"), SH = await import(src + "/shelf.ts");
const KB = JSON.parse(await Deno.readTextFile("/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json"));
for (const l of Object.keys(KB)) for (const c of KB[l]) delete c._ord;
const { index } = buildIndex(KB, "2026-11-20");
const cases = JSON.parse(await Deno.readTextFile("/home/claude/index.html-/tests/staged/ask_state_nov20/tools/cases_all.json"));
const out = [];
for (const c of (Array.isArray(cases) ? cases : cases.cases || [])) {
  const q = String(c.q || ""); if (!q) continue;
  const m = String(c.where || "").match(/,\s*([A-Z]{2})\b/);
  out.push({ id: c.id, q, state: m ? m[1] : null, terms: queryGroups(q), weights: SH.groupWeights(index, queryGroups(q)) });
}
await Deno.writeTextFile(new URL("../work/queries.json", import.meta.url).pathname, JSON.stringify(out));
console.log(out.length, "queries;", JSON.stringify(out[0]));
