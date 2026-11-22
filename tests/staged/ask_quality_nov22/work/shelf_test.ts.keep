// ask_shelf_nov20: Deno tests for the shelf search in Ask. Run from a folder that has the patched source in ../src:
//   deno test -A --no-check --config /home/claude/ask_v24/check.deno.json tests/shelf_test.ts
// Part 1: shelf.ts by itself. Part 2: the model's own search. Part 3: the whole Ask request with the model and the
// database faked (what the model is handed). Set ASK_BASE=<folder of the un-patched source> to also prove that an
// empty shelf leaves the request byte for byte what the state-aware build sends.
Deno.env.set("SUPABASE_URL", "http://db.test"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc"); Deno.env.set("SUPABASE_ANON_KEY", "anon");
import * as SH from "../src/shelf.ts";
import { buildIndex, queryGroups } from "../src/_shared/retrieval.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("assert: " + m); };
const eq = (a: unknown, b: unknown, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
const KB = JSON.parse(await Deno.readTextFile(Deno.env.get("ASK_KB") || "/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json"));
for (const l of Object.keys(KB)) for (const c of KB[l]) delete c._ord;
const { index } = buildIndex(KB, "2026-11-20");

// what pb_ai_kb_shelf_search returns
const TXT = "Texas requires a flagger to be trained before flagging traffic at a work zone. The flagger uses a STOP/SLOW paddle at least 24 inches wide. ".repeat(3).trim();
const row = (o: any = {}) => ({ id: "tc-tx-flagger-9", state: "TX", coll: "tc", title: "Texas flagger rules: training and the paddle", topic: "Traffic control: flaggers", text: TXT, cut: false,
  source: "Texas MUTCD 2011 Revision 2, Section 6E.01", url: "https://www.txdot.gov/x.pdf", conf: "high", kind: "summary", cover: 0.9, title_cover: 0.5, score: 0.9, ...o });
const fakeAdmin = (reply: (args: any) => any, calls: any[] = []) => ({ rpc: async (fn: string, args: any) => { calls.push({ fn, args }); return await reply(args); } });

Deno.test("shelfHits: rows that touch the question, shaped like core hits", () => {
  const good = SH.shelfHits({ ok: true, rows: [row()] }, SH.SHELF_FIRST, "TX");
  eq(good.length, 1); eq([good[0].id, good[0].lib, good[0].verbatim, good[0].state, good[0].shelf, good[0].cover], ["tc-tx-flagger-9", "field", false, "TX", true, 0.9]);
  eq(SH.shelfHits({ ok: true, rows: [row({ cover: 0.2 })] }, SH.SHELF_FIRST, "TX"), [], "barely touches the question: dropped");
  eq(SH.shelfHits({ ok: true, rows: [row({ cover: 0.4 })] }, SH.SHELF_FIRST, "TX").length, 1);
  eq(SH.shelfHits({ ok: true, rows: [row({ cover: 0.4 })] }, SH.SHELF_TOOL, "TX"), [], "the model's own search wants at least half the question");
  for (const bad of [null, undefined, {}, { ok: false, rows: [row()] }, { ok: true, rows: "x" }, { ok: true, rows: [null, { id: 5 }, row({ text: "  " }), row({ title: null })] }]) eq(SH.shelfHits(bad, SH.SHELF_FIRST, "TX"), []);
  eq(SH.shelfHits({ ok: true, rows: [row({ url: "javascript:alert(1)" })] }, SH.SHELF_FIRST, "TX")[0].url, "", "only https links");
  eq(SH.shelfHits({ ok: true, rows: [row(), row()] }, SH.SHELF_FIRST, "TX").length, 1, "same id once");
});
Deno.test("shelfPick: as good as the best core hit, only in the free room, never more than 2", () => {
  const q = "How wide does the flagger paddle have to be?", S = (o: any = {}) => SH.shelfHits({ ok: true, rows: [row(o)] }, SH.SHELF_FIRST, "TX")[0];
  const weak = { id: "c-1", title: "Trench boxes", topic: "", text: "A trench box protects the crew in the trench." }, strong = { id: "c-2", title: "Flagger paddle", topic: "", text: "Flaggers have to use a STOP/SLOW paddle 24 inches wide." };
  const ex = (chars: number) => [{ n: 1, kind: "kb", title: "x", text: "y".repeat(chars) }];
  eq(SH.shelfPick([S()], [weak], ex(1000), q, index).map((h: any) => h.id), ["tc-tx-flagger-9"], "core is weak on this question: the shelf excerpt goes in");
  ok(SH.coverOf(strong, queryGroups(q), SH.groupWeights(index, queryGroups(q))) > 0.9, "the yardstick sees the strong core hit");
  eq(SH.shelfPick([S({ cover: 0.6 })], [weak, strong], ex(1000), q, index), [], "core already covers the question better: left out");
  eq(SH.shelfPick([S({ cover: 1 })], [weak, strong], ex(1000), q, index).length, 1, "as good as the best core hit: in");
  eq(SH.shelfPick([S()], [{ ...weak, id: "tc-tx-flagger-9" }], ex(1000), q, index), [], "already among the core hits");
  eq(SH.shelfPick([S(), S({ id: "a-2" }), S({ id: "a-3" })], [weak], ex(1000), q, index).length, 2, "at most 2");
  // room: the excerpts already chosen keep their place; the shelf gets what is left of 9,000
  eq(SH.shelfPick([S()], [weak], ex(9000), q, index), [], "no room: nothing added");
  eq(SH.shelfPick([S()], [weak], ex(8900), q, index), [], "a scrap of room: nothing added");
  const part = SH.shelfPick([S()], [weak], ex(9000 - 300), q, index);
  eq(part.length, 1); ok(part[0].text.length <= 300 && part[0].text.length >= 250 && /[.;?!]$/.test(part[0].text) && TXT.startsWith(part[0].text) && part[0].cut === true, "cut back to whole sentences: " + part[0].text.length);
  const two = SH.shelfPick([S(), S({ id: "a-2" })], [weak], ex(9000 - TXT.length - 100), q, index);
  eq(two.map((h: any) => h.id), ["tc-tx-flagger-9"], "the second one does not fit");
  eq(SH.shelfPick([], [weak], ex(0), q, index), []); eq(SH.shelfPick(null, [weak], ex(0), q, index), []);
});
Deno.test("shelfHits: another state's chunk is never handed over, federal always", () => {
  eq(SH.shelfHits({ ok: true, rows: [row()] }, SH.SHELF_FIRST, "OK"), [], "Texas chunk on an Oklahoma job");
  eq(SH.shelfHits({ ok: true, rows: [row()] }, SH.SHELF_FIRST, null), [], "Texas chunk with no state known");
  eq(SH.shelfHits({ ok: true, rows: [row({ id: "spec-kc-apwa-1", state: "KS,MO" })] }, SH.SHELF_FIRST, "MO").length, 1, "a two-state chunk on a Missouri job");
  eq(SH.shelfHits({ ok: true, rows: [row({ id: "spec-kc-apwa-1", state: "KS,MO" })] }, SH.SHELF_FIRST, "TX"), []);
  for (const st of ["TX", "WV", null]) eq(SH.shelfHits({ ok: true, rows: [row({ id: "mutcd-6c-taper-1", state: "US", coll: "mutcd" })] }, SH.SHELF_FIRST, st).length, 1, "federal on " + st);
});
Deno.test("shelfHits: only exact 29 CFR text is marked as quotable OSHA text", () => {
  const v = (o: any) => SH.shelfHits({ ok: true, rows: [row({ state: "US", ...o })] }, SH.SHELF_FIRST, "TX")[0];
  eq([v({ id: "osha-1926.651(j)(2)-a", coll: "osha", kind: "verbatim" }).verbatim, v({ id: "osha-1926.651(j)(2)-a", coll: "osha", kind: "verbatim" }).lib], [true, "osha"]);
  eq(v({ id: "osha-pl-spoil-1", coll: "osha", kind: "summary" }).verbatim, false, "plain-language OSHA card");
  eq(v({ id: "osha-loi-spoil-1", coll: "osha", kind: "verbatim" }).verbatim, false, "an interpretation letter is not the rule text");
  eq(v({ id: "mutcd-6c-taper-1", coll: "mutcd", kind: "verbatim" }).verbatim, false, "MUTCD text is not OSHA text");
});
Deno.test("shelfSearch: one call, with the job's state and Ask's own word groups; any failure means no excerpts", async () => {
  SH._shelfReset();
  const calls: any[] = [];
  const hits = await SH.shelfSearch(fakeAdmin(() => ({ data: { ok: true, rows: [row()] }, error: null }), calls), "How wide does the flagger paddle have to be?", "TX", SH.SHELF_FIRST);
  eq(hits.length, 1); eq(calls.length, 1); eq(calls[0].fn, "pb_ai_kb_shelf_search");
  eq(calls[0].args.p_state, "TX"); eq(calls[0].args.p_terms, queryGroups("How wide does the flagger paddle have to be?")); eq(calls[0].args.p_chars, 700); eq(calls[0].args.p_coll, null);
  eq(calls[0].args.p_weights, null, "no core index handed in: the database weighs the words itself");
  const wc: any[] = [];
  await SH.shelfSearch(fakeAdmin(() => ({ data: { ok: true, rows: [] }, error: null }), wc), "trench mandrel", "TX", { ...SH.SHELF_FIRST, index: Promise.resolve(index) });
  eq(wc[0].args.p_weights.length, wc[0].args.p_terms.length); ok(wc[0].args.p_weights[1] > wc[0].args.p_weights[0] * 1.5, "a rare word (mandrel) weighs more than a common one (trench): " + wc[0].args.p_weights);
  await SH.shelfSearch(fakeAdmin(() => ({ data: { ok: true, rows: [] }, error: null }), wc), "trench mandrel", "TX", { ...SH.SHELF_FIRST, index: Promise.reject(new Error("kb down")) });
  eq(wc[1].args.p_weights, null, "core library failed to load: still asks");
  ok(calls[0].args.p_k >= 2 && calls[0].args.p_k <= 8);
  const none: any[] = [];
  await SH.shelfSearch(fakeAdmin(() => ({ data: { ok: true, rows: [] }, error: null }), none), "What is SDR 35?", null, SH.SHELF_FIRST);
  eq(none[0].args.p_state, null, "no state known: null, so federal chunks only");
  eq(await SH.shelfSearch(fakeAdmin(() => ({ data: null, error: { message: "boom" } })), "flagger paddle", "TX"), []);
  eq(await SH.shelfSearch(fakeAdmin(() => { throw new Error("net"); }), "flagger paddle", "TX"), []);
  eq(await SH.shelfSearch(null, "flagger paddle", "TX"), []);
  eq(await SH.shelfSearch(fakeAdmin(() => ({ data: { ok: true, rows: [row()] }, error: null })), "the and of", "TX"), [], "nothing to search for: no call");
  const t0 = Date.now();
  eq(await SH.shelfSearch(fakeAdmin(() => new Promise((r) => setTimeout(() => r({ data: { ok: true, rows: [row()] }, error: null }), 400))), "flagger paddle", "TX", { ...SH.SHELF_FIRST, ms: 60 }), [], "slow call: given up on");
  ok(Date.now() - t0 < 300, "did not wait for the slow call");
  await new Promise((r) => setTimeout(r, 400));
});
Deno.test("shelfSearch: function not on the server yet: asks once, then leaves it alone", async () => {
  SH._shelfReset();
  const calls: any[] = [];
  const admin = fakeAdmin(() => ({ data: null, error: { code: "PGRST202", message: "Could not find the function public.pb_ai_kb_shelf_search in the schema cache" } }), calls);
  eq(await SH.shelfSearch(admin, "flagger paddle width", "TX"), []); eq(await SH.shelfSearch(admin, "flagger paddle width", "TX"), []);
  eq(calls.length, 1);
  SH._shelfReset();
});
Deno.test("withShelf: shelf excerpts are numbered on after the core ones", () => {
  const ex = SH.withShelf([{ n: 1, kind: "app_page", title: "a", text: "x" }, { n: 2, kind: "kb", title: "b", text: "y" }], SH.shelfHits({ ok: true, rows: [row()] }, SH.SHELF_FIRST, "TX"));
  eq(SH.withShelf([{ n: 1 }], []), [{ n: 1 }]);
  eq(ex.map((x: any) => x.n), [1, 2, 3]); eq([ex[2].kind, ex[2].id, ex[2].lib], ["kb", "tc-tx-flagger-9", "field"]);
});

// ---- Part 2: the model's own search
Deno.test("search_knowledge: shelf excerpts share the same 5 places and 7,000 characters; the app library never asks the shelf", async () => {
  const { runTool } = await import("../src/tools.ts");
  const go = async (library: string, shelf: any[] | null) => {
    const sources: any[] = [], asked: any[] = []; let n = 0;
    const cx: any = { level: "pipelayer", kb: index, state: { code: "TX", named: [] }, nextExcerpt: () => ++n, sources, docsSearch: async () => [] };
    if (shelf) cx.shelfSearch = async (text: string, o: any) => (asked.push({ text, o }), shelf);
    const r = await runTool("search_knowledge", { query: "flagger paddle stop slow work zone", library }, cx);
    return { r, sources, asked };
  };
  const hit = SH.shelfHits({ ok: true, rows: [row(), row({ id: "tc-tx-flagger-10", title: "Texas flagger rules: where the flagger stands" }), row({ id: "tc-tx-flagger-11", title: "Third" })] }, SH.SHELF_TOOL, "TX");
  eq(hit.length, 3);
  const a = await go("any", hit);
  eq(a.asked.length, 1); eq(a.asked[0].o.coll, null); eq(a.asked[0].o.chars, 1200);
  const kb = a.sources.filter((x: any) => x.kind === "kb");
  ok(kb.length <= 5, "at most 5 library excerpts: " + kb.length); eq(kb.filter((x: any) => /^tc-tx-flagger/.test(x.id)).length, 2, "at most 2 of them from the shelf");
  ok(kb.reduce((t: number, x: any) => t + x._text.length, 0) <= 7000 + 1800, "inside the tool's size limit");
  eq(kb.slice(-2).map((x: any) => x.id), ["tc-tx-flagger-9", "tc-tx-flagger-10"], "listed after the core ones");
  ok(/\[\d\] \(field library: Texas MUTCD 2011 Revision 2, Section 6E\.01\) Texas flagger rules: training and the paddle: Texas requires/.test(a.r.text), a.r.text.slice(-600));
  eq(kb.map((x: any) => x.n), kb.map((_: any, i: number) => i + 1), "numbered in order");
  const b = await go("any", null), c = await go("any", []);
  eq(b.r.text, c.r.text, "an empty shelf changes nothing"); ok(b.sources.filter((x: any) => x.kind === "kb").length === 5);
  eq((await go("app", hit)).asked.length, 0, "app how-to search does not ask the shelf");
  eq((await go("documents", hit)).asked.length, 0);
  eq((await go("osha", hit)).asked[0].o.coll, ["osha"], "an OSHA-only search asks for the OSHA collection only");
});

// ---- Part 3: the whole request
const { askV2 } = await import("../src/ask.ts");
const BASE = Deno.env.get("ASK_BASE") ? (await import(Deno.env.get("ASK_BASE") + "/ask.ts")).askV2 : null;
async function ask(question: string, o: { where?: string; shelf?: any; excerpts?: any[]; fn?: any } = {}) {
  const sent: any[] = [], shelfCalls: any[] = [], real = globalThis.fetch; let out: any = null;
  (globalThis as any).fetch = async (url: any, init?: any) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.includes("api.anthropic.com")) {
      const body = JSON.parse(init.body);
      if (body.tool_choice?.type === "tool") { const name = body.tool_choice.name; return new Response(JSON.stringify({ content: [{ type: "tool_use", id: "g", name, input: name === "verdict" ? { hazard_context: false, asks_decision: false } : {} }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } })); }
      sent.push(body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Answer." }], stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 30 } }));
    }
    if (u.startsWith("http://db.test/rest/v1/rpc/pb_ai_kb_shelf_search")) {
      const args = JSON.parse(init?.body ?? (url instanceof Request ? await url.clone().text() : "{}")); shelfCalls.push(args);
      if (o.shelf === "error") return new Response(JSON.stringify({ code: "XX000", message: "boom" }), { status: 500, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify(typeof o.shelf == "function" ? o.shelf(args) : o.shelf ?? { ok: true, rows: [] }), { headers: { "content-type": "application/json" } });
    }
    if (u.startsWith("http://db.test/")) return new Response("null", { headers: { "content-type": "application/json" } });
    return real(url, init);
  };
  try {
    const replay = { index, intent: false, rpc: async (fn: string) => {
      if (fn === "pb_ai_scope") return { data: { ok: true, level: "pipelayer", company: "Eval", today: "2026-11-20", cols: [], jobs: o.where === undefined ? [] : [["J-1", "Job", o.where, null, null, null, false]] }, error: null };
      if (fn === "pb_docs_search") return { data: { ok: true, rows: [] }, error: null };
      return { data: null, error: { message: "Could not find the function" } };
    } };
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const admin = createClient("http://db.test", "svc", { auth: { persistSession: false } });
    await (o.fn || askV2)({ feature: "teacher", v: 2, question, history: [], excerpts: o.excerpts, ctx: { job: o.where === undefined ? "" : "J-1" } }, { key: "sk-ant-x", admin, uid: "eval", token: "", t0: Date.now(), reply: (s: number, j: any) => (out = { s, j }, new Response(null)), replay });
  } finally { (globalThis as any).fetch = real; }
  ok(out && out.s === 200, JSON.stringify(out).slice(0, 300));
  const m = sent[0].messages[0].content; const text = (Array.isArray(m) ? m : [m]).map((c: any) => c.text || "").join("\n");
  const exc = (text.split("EXCERPTS:")[1] || "").split("\nEARLIER IN THIS CONVERSATION")[0];
  return { text, exc, shelfCalls, sources: out.j.sources || [], system: JSON.stringify(sent[0].system), tools: JSON.stringify(sent[0].tools || []), max: sent[0].max_tokens, model: sent[0].model };
}
const Q = "How wide does the flagger paddle have to be?";
Deno.test("request: the shelf is asked once, for the job's state, and its excerpt sits after the core ones", async () => {
  SH._shelfReset();
  const r = await ask(Q, { where: "Houston, TX", shelf: { ok: true, rows: [row({ cover: 1 })] } });
  eq(r.shelfCalls.length, 1); eq(r.shelfCalls[0].p_state, "TX"); eq(r.shelfCalls[0].p_terms, queryGroups(Q)); eq(r.shelfCalls[0].p_weights.length, queryGroups(Q).length);
  const lines = r.exc.trim().split("\n").filter((l) => /^\[\d+\] \(/.test(l));
  ok(lines.length >= 2, "core excerpts are still there: " + lines.length);
  ok(/^\[\d+\] \(field library: Texas MUTCD 2011 Revision 2, Section 6E\.01\) Texas flagger rules: training and the paddle: Texas requires a flagger/.test(lines[lines.length - 1]), "shelf excerpt is the last library excerpt: " + lines[lines.length - 1].slice(0, 160));
  eq(lines.map((l) => Number(l.match(/^\[(\d+)\]/)![1])), lines.map((_, i) => i + 1), "numbered in order");
});
Deno.test("request: no state known: the shelf is asked for federal chunks only", async () => {
  SH._shelfReset();
  const r = await ask(Q, { shelf: (a: any) => ({ ok: true, rows: a.p_state ? [row({ cover: 1 })] : [row({ id: "mutcd-6e-paddle-1", state: "US", coll: "mutcd", title: "Flagger STOP/SLOW paddle size", source: "MUTCD 11th Edition, Section 6D.02", cover: 1 })] }) });
  eq(r.shelfCalls[0].p_state, null); ok(/Flagger STOP\/SLOW paddle size/.test(r.exc) && !/Texas flagger rules/.test(r.exc));
});
Deno.test("request: a wrong-state row from the database would still not reach the model", async () => {
  SH._shelfReset();
  const r = await ask(Q, { where: "Tulsa, OK", shelf: { ok: true, rows: [row({ cover: 1 })] } });
  eq(r.shelfCalls[0].p_state, "OK"); ok(!/Texas flagger rules/.test(r.exc), "Texas chunk on an Oklahoma job");
});
Deno.test("request: nothing is pushed out and the 9,000 characters stand, with or without app pages", async () => {
  SH._shelfReset();
  const big = "The flagger stands on the shoulder next to the lane being controlled and is seen by drivers from far enough away to stop. ".repeat(6).slice(0, 700);
  const phone = [1, 2, 3, 4, 5].map((i) => ({ title: "Page " + i, page: "Education " + i, text: ("Education page text about flaggers and work zones number " + i + ". ").repeat(20) }));
  const lines = (t: string) => t.trim().split("\n").filter((l) => /^\[\d+\] \(/.test(l));
  let added = 0, full = 0;
  for (const where of ["Houston, TX", "Wildomar, CA"]) for (const excerpts of [undefined, phone]) for (const q of [Q, "At what depth is a trench box or shoring required?", "How long is my 811 ticket good for?", "What is SDR 35?"]) {
    const rows = [row({ text: big, state: "US", id: "x-1", cover: 1 }), row({ text: big, state: "US", id: "x-2", title: "Second shelf chunk", cover: 1 })];
    const a = await ask(q, { where, excerpts, shelf: { ok: true, rows: [] } }), b = await ask(q, { where, excerpts, shelf: { ok: true, rows } });
    const la = lines(a.exc), lb = lines(b.exc), tag = `${where} / ${excerpts ? "app pages" : "no app pages"} / ${q.slice(0, 20)}`;
    eq(lb.slice(0, la.length), la, tag + ": every excerpt the state-aware build sends is still there, in the same place");
    const textOf = (srcs: any[]) => srcs.filter((x) => x.kind === "kb" || x.kind === "app_page").length;
    const extra = lb.slice(la.length); added += extra.length; if (!extra.length) full++;
    ok(extra.length <= 2 && extra.every((l) => /Texas flagger rules: training and the paddle|Second shelf chunk/.test(l)), tag + ": only shelf excerpts are added");
    const chars = (ls: string[]) => ls.map((l) => l.replace(/^\[\d+\] \((?:[^()]|\([^()]*\))*\) /, "")).join("").length;
    ok(chars(lb) <= Math.max(chars(la), 9000 + 60 * lb.length + 300), tag + `: ${chars(la)} -> ${chars(lb)} characters`);
    eq([b.system, b.tools, b.max, b.model], [a.system, a.tools, a.max, a.model], "system prompt, tools, answer length and model are untouched");
    void textOf;
  }
  ok(added > 0, "shelf excerpts were added where there was room"); console.log(`shelf excerpts added: ${added}; requests with no room for any: ${full} of 16`);
});
Deno.test("request: empty shelf, shelf error, or function missing: the request is exactly the state-aware build's", async () => {
  for (const where of ["Houston, TX", "Seattle, WA", undefined]) for (const q of [Q, "How long is my 811 ticket good for?", "What is SDR 35?"]) {
    SH._shelfReset();
    const empty = await ask(q, { where, shelf: { ok: true, rows: [] } }), err = await ask(q, { where, shelf: "error" }), weak = await ask(q, { where, shelf: { ok: true, rows: [row({ state: "US", cover: 0.2 })] } });
    eq(err.text, empty.text, "error"); eq(weak.text, empty.text, "weak hit");
    if (BASE) { const base = await ask(q, { where, fn: BASE }); eq(empty.text, base.text, "same as the un-patched build: " + q); eq([empty.system, empty.tools, empty.max], [base.system, base.tools, base.max]); eq(base.shelfCalls.length, 0); }
  }
});
Deno.test("request: a shelf excerpt of the job state's own rule counts as the library having that state's rule", async () => {
  SH._shelfReset();
  const q = "At what depth is a trench box or shoring required?";
  const without = await ask(q, { where: "Louisville, KY" });
  ok(/no excerpt gives Kentucky's own rule for this question/.test(without.text), "today: Kentucky plan state, nothing of its own");
  const withOwn = await ask(q, { where: "Louisville, KY", shelf: { ok: true, rows: [row({ id: "sp-ky-trench-1", state: "KY", coll: "sp", title: "Kentucky trench protection: depth where a protective system is required", source: "803 KAR 2:415", cover: 1, text: "Kentucky adopts the federal excavation standard through 803 KAR 2:415. ".repeat(4) })] } });
  ok(!/no excerpt gives Kentucky's own rule for this question/.test(withOwn.text) && /STRICTEST RULE: where Kentucky's own rule and a federal rule/.test(withOwn.text), "with the shelf's Kentucky chunk the model is told to lead with it");
  const fed = await ask(q, { where: "Louisville, KY", shelf: { ok: true, rows: [row({ id: "osha-pl-x-1", state: "US", coll: "osha", cover: 1 })] } });
  ok(/no excerpt gives Kentucky's own rule for this question/.test(fed.text), "a federal shelf excerpt does not count as Kentucky's rule");
});
