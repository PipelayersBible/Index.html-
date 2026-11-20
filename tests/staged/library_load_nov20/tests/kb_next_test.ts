// library_load_nov20: the test function (ai-next) lays the staged library over the live rows in memory; the live function never does.
//   run from a copy of the patched source tree: deno test -A --no-check --config check.deno.json tests/kb_next_test.ts
import { kb, kbVersion } from "../src/kb.ts";
import { OVERLAY } from "../src/kb_overlay.ts";
import { search } from "../src/_shared/retrieval.ts";
const S = "/home/claude/index.html-/tests/staged/";
const eq = (a: unknown, b: unknown, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const live = JSON.parse(Deno.readTextFileSync(S + "ask_state_nov20/work/kb_after.json")), rows: { lib: string; chunk: Record<string, unknown> }[] = [];
for (const lib of Object.keys(live)) for (const c of live[lib]) { const o = c._ord; const d = { ...c }; delete d._ord; rows[o] = { lib, chunk: d }; }
function fakeAdmin(calls: string[]) {
  return { rpc: (name: string, args: Record<string, number>) => {
    calls.push(name);
    if (name === "pb_ai_kb_boot") return Promise.resolve({ data: { ok: true, version: "b3e91f6c47d2", n: rows.length, built: "b", index: null }, error: null });
    if (name === "pb_ai_kb_active") return Promise.resolve({ data: { ok: true, version: "b3e91f6c47d2", n: rows.length, built: "b" }, error: null });
    if (name === "pb_ai_kb_page") return Promise.resolve({ data: rows.slice(args.p_from, args.p_from + args.p_n), error: null });
    if (name === "pb_ai_kb_index_put") return Promise.resolve({ data: { ok: true }, error: null });
    return Promise.resolve({ data: null, error: { message: "unexpected " + name } });
  } };
}
const ids = (ix: { docs: unknown[][] }) => ix.docs.map((r) => String(r[0])).sort();
Deno.test("live slot: the live library, untouched by the overlay", async () => {
  (globalThis as any).__pbKbReset(); (globalThis as any).PB_ASK_SLOT = "live";
  const calls: string[] = [], ix = await kb(fakeAdmin(calls));
  eq(ix.N, rows.length, "docs"); eq(kbVersion(), "b3e91f6c47d2", "version"); eq(calls.includes("pb_ai_kb_boot"), true, "boot");
  eq(ids(ix), rows.map((r) => String(r.chunk.id)).sort(), "ids");
  eq(search(ix, "Texas trench protection depth", { k: 400 }).some((h: { id: string }) => h.id === "sp-tx-trench-1"), false, "no staged chunk on live");
  await (globalThis as any).__pbKbSaving?.();
});
Deno.test("next slot: the merged library exactly (same ids as out/kb_next.json), no write to the saved index", async () => {
  (globalThis as any).__pbKbReset(); (globalThis as any).PB_ASK_SLOT = "next";
  const calls: string[] = [], ix = await kb(fakeAdmin(calls));
  const want = JSON.parse(Deno.readTextFileSync(S + "library_load_nov20/out/kb_next.json"));
  const wantIds = Object.values(want).flat().map((c: any) => String(c.id)).sort();
  eq(ix.N, wantIds.length, "docs"); eq(ids(ix), wantIds, "ids"); eq(kbVersion(), "b3e91f6c47d2+" + OVERLAY.rev, "version");
  eq(calls.includes("pb_ai_kb_boot"), false, "next builds from rows"); eq(calls.includes("pb_ai_kb_index_put"), false, "next never saves an index");
  const h = search(ix, "Texas trench protection depth", { k: 400 }).find((x: { id: string }) => x.id === "sp-tx-trench-1");
  eq(h?.state, "TX", "staged chunk carries its state");
  for (const gone of ["dig-tx", "ten-1", "traffic-control-4", "plan-mi-trench-1"]) eq(ids(ix).includes(gone), false, gone + " replaced");
});
