// The other side of the retrieval check: questions whose answer is NOT on the shelf (the existing eval questions and the
// library cases answered by core chunks). How often would the first search hand over a shelf excerpt anyway, and which?
//   PGDB=real deno run -A --no-check tools/shelf_extra.ts <patched src dir> <shelf chunks .jsonl ...> -- <cases .json/.jsonl ...>
const [src, ...rest] = Deno.args, cut = rest.indexOf("--"), chunkFiles = rest.slice(0, cut), caseFiles = rest.slice(cut + 1);
const SH = await import(src + "/shelf.ts"), { queryGroups } = await import(src + "/_shared/retrieval.ts"), { addressState } = await import(src + "/state.ts");
const read = async (f: string) => { const t = await Deno.readTextFile(f); return f.endsWith(".json") ? JSON.parse(t) : t.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)); };
const shelf = new Set<string>(); for (const f of chunkFiles) for (const c of await read(f)) if (c.tier === "shelf") shelf.add(c.id);
const D = Deno.env.get("PGTEST_DIR") || "/var/lib/postgresql/askshelf_pg", lit = (s: string) => "'" + s.replace(/'/g, "''") + "'";
let n = 0, got = 0; const lines: string[] = [];
for (const f of caseFiles) for (const c of await read(f)) {
  if (!c.q || (c.chunks || []).some((id: string) => shelf.has(id))) continue;
  const st = addressState(c.where), terms = queryGroups(c.q); if (!terms.length) continue;
  const sql = `select public.pb_ai_kb_shelf_search(${lit(c.q)}, ${st ? lit(st) : "null"}, 4, array[${terms.map(lit).join(",")}]::text[], null, 700)`;
  const p = await new Deno.Command("psql", { args: ["-q", "-At", "-h", D, "-p", "54395", "-U", "postgres", Deno.env.get("PGDB") || "postgres", "-c", sql], stdout: "piped" }).output();
  const raw = JSON.parse(new TextDecoder().decode(p.stdout).trim()), hits = SH.shelfHits(raw, SH.SHELF_FIRST, st);
  n++; if (hits.length) { got++; lines.push(`  ${c.id} [${st}] "${c.q.slice(0, 70)}" -> ${hits.map((h: any) => `${h.id} (${h.cover})`).join(", ")}`); }
}
console.log(`questions answered by the core library: ${n}; a shelf excerpt is added for ${got}`);
for (const l of lines) console.log(l);
