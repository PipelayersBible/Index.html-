// Free retrieval check for the shelf, on the local Postgres (tools/pg_up.sh). No model calls, no server.
// For every library eval case it does what the staged Ask build does on the first search: the core search for the job's
// state (live library + the helpers' core-tier chunks), the shelf search (the staged SQL function, asked with the
// build's own word groups and weights), then shelf.ts picks what goes to the model. It reports, for the cases with a
// known answer chunk: is that chunk in the excerpts, before and after the shelf; and how often the shelf adds anything.
//   PGDB=real deno run -A --no-check tools/shelf_check.ts <patched src dir> <chunk .jsonl ...> -- <case files ...>
const [src, ...rest] = Deno.args, cut = rest.indexOf("--"), chunkFiles = rest.slice(0, cut), caseFiles = rest.slice(cut + 1);
const SH = await import(src + "/shelf.ts"), { queryGroups, buildIndex, search, mergeExcerpts } = await import(src + "/_shared/retrieval.ts"), S = await import(src + "/state.ts");
const read = async (f: string) => { const t = await Deno.readTextFile(f); return f.endsWith(".json") ? JSON.parse(t) : t.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)); };
const KB = JSON.parse(await Deno.readTextFile(Deno.env.get("ASK_KB") || "/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json"));
const have = new Set<string>(); for (const l of Object.keys(KB)) for (const c of KB[l]) { delete c._ord; have.add(c.id); }
const shelfIds = new Set<string>(); let coreNew = 0;
for (const f of chunkFiles) for (const c of await read(f)) {
  if (c.tier === "shelf") shelfIds.add(c.id);
  else if (c.tier === "core" && !have.has(c.id)) { (KB.field ||= []).push({ id: c.id, title: c.title, topic: c.topic, text: c.text, source: c.source, url: c.url, state: c.state, confidence: c.confidence }); have.add(c.id); coreNew++; }
}
const { index } = buildIndex(KB, "2026-11-20");
const D = Deno.env.get("PGTEST_DIR") || "/var/lib/postgresql/askshelf_pg", lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";
async function shelfRows(q: string, st: string | null, o: any) {
  const terms = queryGroups(q), w = SH.groupWeights(index, terms);
  const sql = `select public.pb_ai_kb_shelf_search(${lit(q)}, ${st ? lit(st) : "null"}, ${o.k + 2}, array[${terms.map(lit).join(",")}]::text[], null, ${o.chars}, array[${w.join(",")}]::real[])`;
  const p = await new Deno.Command("psql", { args: ["-q", "-At", "-h", D, "-p", "54395", "-U", "postgres", Deno.env.get("PGDB") || "postgres", "-c", sql], stdout: "piped", stderr: "piped" }).output();
  const out = new TextDecoder().decode(p.stdout).trim(); if (!out) throw new Error(new TextDecoder().decode(p.stderr));
  return JSON.parse(out);
}
const T = { n: 0, only: 0, before: 0, after: 0, onlyAfter: 0, tool: 0, toolN: 0, worse: 0, added: 0, noRoom: 0, wrong: 0, dropped: 0 }; const miss: string[] = [], adds: string[] = [];
for (const f of caseFiles) for (const c of await read(f)) {
  const chunks: string[] = c.chunks || []; if (!c.q || !chunks.length || !queryGroups(c.q).length) continue;
  const st = S.resolveState({ question: c.q, addressState: S.addressState(c.where) });
  const core = S.stateSearch(search, index, c.q, { k: 6, level: "pipelayer", topicBoost: [], maxChars: 9e3, stats: { best: {}, cover: 0, nTyped: 0 } }, st, c.q).hits;
  const exCore = mergeExcerpts([], core, 9e3), raw = await shelfRows(c.q, st.code, SH.SHELF_FIRST), hits = SH.shelfHits(raw, SH.SHELF_FIRST, st.code);
  const shelf = SH.shelfPick(hits, core, exCore, c.q, index), ex = SH.withShelf(exCore, shelf);
  const idsB = new Set(exCore.map((x: any) => x.id)), idsA = new Set(ex.map((x: any) => x.id)), want = chunks.filter((id) => shelfIds.has(id)), only = want.length === chunks.length;
  const b = chunks.some((id) => idsB.has(id)), a = chunks.some((id) => idsA.has(id));
  T.n++; T.before += +b; T.after += +a; T.only += +only; T.onlyAfter += +(only && a); T.worse += +(b && !a); T.added += +(shelf.length > 0);
  T.dropped += +exCore.some((x: any) => !idsA.has(x.id)); T.wrong += shelf.filter((h: any) => h.state !== "US" && h.state !== st.code).length;
  if (ex.reduce((t: number, x: any) => t + x.text.length, 0) > Math.max(9000, exCore.reduce((t: number, x: any) => t + x.text.length, 0))) throw new Error("over 9,000: " + c.id);
  if (hits.length && !shelf.length && 9e3 - exCore.reduce((t: number, x: any) => t + x.text.length, 0) < 700) T.noRoom++;
  if (want.length) { T.toolN++; const th = SH.shelfHits(await shelfRows(c.q, st.code, SH.SHELF_TOOL), SH.SHELF_TOOL, st.code).slice(0, SH.SHELF_TOOL.k); T.tool += +th.some((h: any) => want.includes(h.id)); }
  if (only && !a) { const r = raw.rows.find((x: any) => want.includes(x.id)); miss.push(`${c.id} [${st.code}] "${c.q}" wants ${want.join(",")}: ${r ? `shelf place ${raw.rows.indexOf(r) + 1}, covers ${r.cover} of the question; best core hit covers ${Math.max(0, ...core.map((h: any) => SH.coverOf(h, queryGroups(c.q), SH.groupWeights(index, queryGroups(c.q))))).toFixed(2)}` : "not among the shelf's first " + raw.rows.length}`); }
  if (shelf.length && !want.length && adds.length < 400) adds.push(`${c.id} [${st.code}] "${c.q.slice(0, 60)}" + ${shelf.map((h: any) => `${h.id} (${h.cover})`).join(", ")}`);
}
console.log(`core library in this check: live ${have.size - coreNew} chunks + ${coreNew} new core-tier chunks from the helpers; shelf chunks: ${shelfIds.size}`);
console.log(`cases with a known answer chunk: ${T.n} (${T.only} have the answer ONLY in a shelf chunk)`);
console.log(`answer chunk is in the first search's excerpts: ${T.before} of ${T.n} without the shelf -> ${T.after} of ${T.n} with it`);
console.log(`  shelf-only cases: 0 of ${T.only} -> ${T.onlyAfter} of ${T.only};  cases that got worse: ${T.worse};  core excerpts pushed out: ${T.dropped}`);
console.log(`  the model's own search (search_knowledge) finds the shelf chunk: ${T.tool} of ${T.toolN} cases that have one`);
for (const m of miss) console.log("  still missing: " + m);
console.log(`shelf excerpts added on ${T.added} of ${T.n} questions (${Math.round(100 * T.added / T.n)}%); left out for lack of room: ${T.noRoom}; another state's chunk handed over: ${T.wrong}`);
if (Deno.env.get("DUMP")) for (const l of adds) console.log("  added: " + l);
