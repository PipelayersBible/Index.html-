// Free retrieval check for the shelf, on the local Postgres (tools/pg_up.sh): for every library eval case whose answer is in
// a shelf chunk, ask the staged search function what Ask would ask (the build's own word groups, the case's state) and run
// the rows through the build's own shelf.ts. Reports whether the chunk that holds the answer would be handed to the model
// (first search: 2 excerpts) or found by the model's own search (search_knowledge).
//   deno run -A --no-check tools/shelf_cases.ts <patched src dir> <shelf chunks .jsonl ...> -- <cases .jsonl ...>
const [src, ...rest] = Deno.args, cut = rest.indexOf("--"), chunkFiles = rest.slice(0, cut), caseFiles = rest.slice(cut + 1);
const SH = await import(src + "/shelf.ts"), { queryGroups } = await import(src + "/_shared/retrieval.ts"), { addressState } = await import(src + "/state.ts");
const jsonl = async (f: string) => (await Deno.readTextFile(f)).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const shelf = new Set<string>(); for (const f of chunkFiles) for (const c of await jsonl(f)) if (c.tier === "shelf") shelf.add(c.id);
const D = Deno.env.get("PGTEST_DIR") || "/var/lib/postgresql/askshelf_pg";
const lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";
async function call(q: string, st: string | null, o: any) {
  const terms = queryGroups(q), sql = `select public.pb_ai_kb_shelf_search(${lit(q)}, ${st ? lit(st) : "null"}, ${o.k + 2}, array[${terms.map(lit).join(",")}]::text[], null, ${o.chars})`;
  const p = await new Deno.Command("psql", { args: ["-q", "-At", "-h", D, "-p", "54395", "-U", "postgres", Deno.env.get("PGDB") || "postgres", "-c", sql], stdout: "piped", stderr: "piped" }).output();
  const out = new TextDecoder().decode(p.stdout).trim(); if (!out) throw new Error(new TextDecoder().decode(p.stderr));
  return { raw: JSON.parse(out), hits: SH.shelfHits(JSON.parse(out), o, st) };
}
let n = 0, first = 0, tool = 0, only = 0, onlyFirst = 0; const miss: string[] = [], wrong: string[] = [];
for (const f of caseFiles) for (const c of await jsonl(f)) {
  const want = (c.chunks || []).filter((id: string) => shelf.has(id)); if (!want.length) continue;
  const st = addressState(c.where), a = await call(c.q, st, SH.SHELF_FIRST), b = await call(c.q, st, SH.SHELF_TOOL);
  const inFirst = a.hits.some((h: any) => want.includes(h.id)), inTool = b.hits.some((h: any) => want.includes(h.id)), shelfOnly = want.length === (c.chunks || []).length;
  n++; first += +inFirst; tool += +inTool; only += +shelfOnly; onlyFirst += +(shelfOnly && inFirst);
  for (const h of [...a.hits, ...b.hits]) if (h.state !== "US" && h.state !== st) wrong.push(`${c.id}: ${h.id}`);
  const r = a.raw.rows.find((x: any) => want.includes(x.id));
  if (!inFirst) miss.push(`${c.id} [${st}] "${c.q}" wants ${want.join(",")}: ${r ? `found at place ${a.raw.rows.indexOf(r) + 1}, covers ${r.cover} of the words, title words ${r.title_hits}` : "not in the first " + a.raw.rows.length}; handed over instead: ${a.hits.map((h: any) => h.id).join(", ") || "nothing"}`);
}
console.log(`cases whose answer is in a shelf chunk: ${n} (${only} have it ONLY on the shelf)`);
console.log(`first search hands the model the right shelf chunk: ${first} of ${n} (shelf-only cases: ${onlyFirst} of ${only})`);
console.log(`the model's own search finds it: ${tool} of ${n}`);
console.log(`another state's chunk handed over: ${wrong.length}${wrong.length ? " " + wrong.join("; ") : ""}`);
for (const m of miss) console.log("  not in first search: " + m);
