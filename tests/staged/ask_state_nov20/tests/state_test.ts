// ask_state_nov20: Deno tests for the staged Ask change. Run (from a copy of the patched source, see NOTES "How to run"):
//   deno test -A --no-check --config check.deno.json tests/state_test.ts
// Part 1: state.ts by itself. Part 2: the whole Ask request with the model and database faked (what the model is handed).
Deno.env.set("SUPABASE_URL", "http://db.test"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc"); Deno.env.set("SUPABASE_ANON_KEY", "anon");
import * as S from "../src/state.ts";
import { buildIndex, search } from "../src/_shared/retrieval.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("assert: " + m); };
const eq = (a: unknown, b: unknown, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
const KB = JSON.parse(await Deno.readTextFile(Deno.env.get("ASK_KB") || "/home/claude/index.html-/tests/staged/ask_state_nov20/work/kb_live2.json"));
for (const l of Object.keys(KB)) for (const c of KB[l]) delete c._ord;
const { index } = buildIndex(KB, "2026-11-20");
const byId = new Map<string, any>(); for (const l of Object.keys(KB)) for (const c of KB[l]) byId.set(c.id, c);
const C = (id: string) => { const c = byId.get(id); ok(c, "chunk " + id); return c; };

Deno.test("jurisdiction comes from the chunk itself, never from its source line or first words", () => {
  // general chunks whose SOURCE names a state: shown everywhere (they were hidden in 49 states)
  for (const id of ["first_aid-6", "first_aid-7", "utility-locates-6", "visual-soils-1", "quick-reference-4", "tools-power-support-20", "retrieval-vocabulary-chunks-2"]) {
    eq(S.chunkStates(C(id)), [], id);
    for (const st of ["TX", "OH", "FL", "WV", "CA"]) ok(S.keepForState(C(id), st, []), id + " kept in " + st);
  }
  // the old source lines, restored, change nothing
  eq(S.chunkStates({ ...C("first_aid-6"), source: "Stop the Bleed (American College of Surgeons), as summarized in Florida DOH Stop the Bleed card" }), []);
  eq(S.chunkStates({ ...C("visual-soils-1"), source: "OSHA 29 CFR 1926 Subpart P Appendix A, as adopted in WAC 296-155", text: "Washington requires... " + C("visual-soils-1").text }), []);
  // a state's chunks: only that state
  eq(S.chunkStates(C("dig-tx")), ["TX"]); eq(S.chunkStates(C("st-wa")), ["WA"]); eq(S.chunkStates(C("brk-mn")), ["MN"]);
  eq(S.chunkStates(C("plan-mi-trench-1")), ["MI"]); eq(S.chunkStates(C("emp-state-va-2")), ["VA"]); eq(S.chunkStates(C("emp-state-wv-2")), ["WV"]);
  eq(S.chunkStates(C("cal-1")), ["CA"]); eq(S.chunkStates(C("gb-4")), ["CA"]); eq(S.chunkStates(C("dig-dc")), ["DC"]);
  ok(S.keepForState(C("dig-tx"), "TX", []) && !S.keepForState(C("dig-tx"), "CA", []) && S.keepForState(C("dig-tx"), "CA", ["TX"]));
  // comparisons and examples are general
  eq(S.chunkStates(C("emp-states-summary-3")), [], "Alabama to Kentucky table"); eq(S.chunkStates(C("dig-basics-1")), []); eq(S.chunkStates(C("plan-trench-depth-1")), []);
  eq(S.chunkStates(C("aggregates-sizes-14")), [], "21A (Virginia VDOT) is an example"); eq(S.chunkStates(C("geology-rock-19")), []);
  eq(S.chunkStates({ id: "x", title: "Ten States Standards", topic: "Ten States Standards (Great Lakes-Upper Mississippi River Board)" }), [], "Mississippi River is not Mississippi");
  // the explicit field wins
  eq(S.chunkStates({ id: "rsf-1", title: "Trench backfill slurry and CLSM", topic: "Trench resurfacing and slurry", state: "CA" }), ["CA"]);
  eq(S.chunkStates({ id: "kc-9", title: "x", topic: "y", state: "KS,MO" }), ["KS", "MO"]);
  eq(S.chunkStates({ id: "st-tx", title: "Texas: which spec books", topic: "", state: "US" }), []);
});
Deno.test("West Virginia is never Virginia; DC is never Washington", () => {
  eq(S.statesNamed("West Virginia (WV) meal and rest breaks"), ["WV"]);
  eq(S.statesNamed("Virginia and West Virginia").sort(), ["VA", "WV"]);
  eq(S.statesNamed("Washington, D.C. 811"), ["DC"]); eq(S.statesNamed("Washington DC"), ["DC"]);
  for (const c of [C("emp-state-wv-1"), C("emp-state-wv-2"), C("dig-wv"), C("st-wv")]) { ok(!S.keepForState(c, "VA", []), c.id + " hidden on a Virginia job"); ok(S.keepForState(c, "WV", []), c.id + " shown in WV"); }
  for (const c of [C("emp-state-va-2"), C("dig-va")]) { ok(S.keepForState(c, "VA", []) && !S.keepForState(c, "WV", []), c.id); }
  ok(!S.keepForState(C("dig-wa"), "DC", []) && !S.keepForState(C("dig-dc"), "WA", []));
  eq(S.questionStates("what's the rule in west virginia"), ["WV"]);
});
Deno.test("which state: question, app, job address, company, conversation, most jobs, unknown", () => {
  eq(S.resolveState({ question: "How long is a ticket good for in Texas?", appState: "CA", appHow: "address" }).code, "TX");
  eq(S.resolveState({ question: "ticket life?", appState: "AZ", appHow: "picked", addressState: "CA", companyState: "NV" }), { code: "AZ", how: "job", named: [] });
  eq(S.resolveState({ question: "ticket life?", appState: "CA", appHow: "default", addressState: "OR" }).code, "OR", "the app's California fallback is not knowledge");
  eq(S.resolveState({ question: "ticket life?", appState: "CA", appHow: "default" }).code, null);
  eq(S.resolveState({ question: "ticket life?", companyState: "NV", majorityState: "CA" }), { code: "NV", how: "company", named: [] });
  eq(S.resolveState({ question: "and the tolerance zone?", earlier: ["Texas", "How long is my 811 ticket good for?"] }), { code: "TX", how: "conversation", named: [] });
  eq(S.resolveState({ question: "ticket life?", earlier: [], majorityState: "UT" }).how, "company_jobs");
  eq(S.resolveState({ question: "ticket life?", appState: "NV", appHow: "company", addressState: "OR" }).code, "OR", "the job beats the company");
  eq(S.resolveState({ question: "ticket life?", appState: "FL", appHow: "last_job", companyState: "GA" }), { code: "GA", how: "company", named: [] });
  eq(S.resolveState({ question: "ticket life?", appState: "FL", appHow: "last_job", majorityState: "GA" }), { code: "FL", how: "last_job", named: [] });
  eq(S.resolveState({ question: "ticket life?", appState: "TX", appHow: "told" }), { code: "TX", how: "told", named: [] });
  eq(S.resolveState({ question: "and the tolerance zone?", appState: "NV", appHow: "company", earlier: ["what about in Texas"] }).code, "TX", "a follow-up stays on the state just named");
  eq(S.resolveState({ question: "ticket life?", appState: "zz" }), { code: null, how: "unknown", named: [] });
  eq(S.resolveState({ question: "How long is a MISS DIG ticket good for?", appState: "OH", appHow: "address" }).code, "MI", "an 811 center's name is its state");
  eq(S.questionStates("is it OK to dig, or do I wait in the trench"), [], "OK / OR / IN are words");
  eq(S.questionStates("job in Reno, NV"), ["NV"]); eq(S.questionStates("rules in TX"), ["TX"]);
  eq(S.addressState("1200 W Main St, Phoenix, AZ 85004"), "AZ"); eq(S.addressState("Boise, Idaho"), "ID"); eq(S.addressState("Wildomar, CA"), "CA");
  eq(S.addressState("Charleston, West Virginia"), "WV"); eq(S.addressState("Main St"), null); eq(S.addressState(""), null);
});
Deno.test("first search on a job: general chunks stay, other states go, the job state's chunk is there", () => {
  const run = (q: string, st: string | null, level = "pipelayer") => S.stateSearch(search, index, q, { k: 6, level, topicBoost: [], maxChars: 9e3 }, S.resolveState({ question: q, addressState: st }), q);
  const ids = (r: any) => r.hits.map((h: any) => h.id);
  for (const [st, n] of [["TX", "14 working days"], ["FL", "30 calendar days"], ["WA", "45 calendar days"], ["CO", "30 calendar days"]]) {
    const r = run("How long is my 811 ticket good for?", st);
    ok(ids(r).includes("dig-" + st.toLowerCase()), st + " gets its own 811 chunk: " + ids(r));
    ok(r.hits.every((h: any) => { const cs = S.chunkStates(h); return !cs.length || cs.includes(st); }), st + ": no other state's chunk");
    ok(r.hits.some((h: any) => h.text.includes(n)), st + " number " + n);
  }
  ok(ids(run("how do I stop bad bleeding from a cut on the arm", "TX")).includes("first_aid-6"), "bleeding first aid in Texas");
  ok(ids(run("My crew is working 12 hours today. What breaks do they need?", "TX", "office")).some((i: string) => /^emp-state-tx/.test(i)), "Texas breaks chunk on a Texas job");
  ok(ids(run("Do I have to give the guys rest breaks?", "MN", "foreman")).includes("brk-mn"));
  ok(ids(run("At what depth do I need shoring or a trench box?", "WA")).some((i: string) => /^(st|dig)-wa$/.test(i)), "Washington 4 ft is in front of the model");
  // no state known: no single state's numbers
  const none = run("How long is my 811 ticket good for?", null);
  ok(none.dependent, "depends on the state"); ok(none.hits.every((h: any) => !S.chunkStates(h).length), "no state: " + ids(none));
  ok(!run("What is SDR 35?", null).dependent && !run("The trench just caved in on a guy what do we do", null).dependent, "plain and emergency questions never ask");
  // nothing general is pushed out: the general excerpts are the plain search minus other states' chunks
  const q = "How far apart do ladders have to be in a trench?", plain = search(index, q, { k: 6, level: "pipelayer", topicBoost: [], maxChars: 9e3 }).filter((h: any) => !S.chunkStates(h).length).map((h: any) => h.id);
  const got = ids(run(q, "TX")); ok(plain.every((i: string) => got.includes(i)), "general hits kept");
});
Deno.test("the lines the model reads", () => {
  ok(/JOB STATE: Texas \(TX\), from the job\./.test(S.stateLines({ code: "TX", how: "job" }, true, 1)));
  ok(/do not mention the state/.test(S.stateLines({ code: "TX", how: "job" }, false, 0)), "quiet line for questions that don't change by state");
  ok(/runs its own OSHA plan/.test(S.stateLines({ code: "WA", how: "job" }, true, 1)) && !/OSHA plan, which/.test(S.stateLines({ code: "TX", how: "job" }, true, 1)));
  ok(/Which state is the job in\?/.test(S.stateLines({ code: null, how: "unknown" }, true, 0)));
  ok(/just answer; do not ask/.test(S.stateLines({ code: null, how: "unknown" }, false, 0)));
  // a plan state the library has nothing on for a safety-rule question: federal rule, and say it is federal (eval sa10)
  const planLine = S.stateLines({ code: "KY", how: "job" }, "plan", 0);
  ok(/library has no Kentucky rule/.test(planLine) && /confirm with Kentucky's OSHA plan/.test(planLine) && !/search_knowledge/.test(planLine), planLine);
});

// ---- Part 2: the whole request
const { askV2 } = await import("../src/ask.ts");
async function ask(question: string, o: { where?: string; ctx?: any; history?: any[]; company_state?: string | null; jobs?: Record<string, string>; level?: string } = {}) {
  const sent: any[] = [], real = globalThis.fetch; let out: any = null;
  (globalThis as any).fetch = async (url: any, init?: any) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.includes("api.anthropic.com")) {
      const body = JSON.parse(init.body);
      if (body.tool_choice?.type === "tool") { const name = body.tool_choice.name; return new Response(JSON.stringify({ content: [{ type: "tool_use", id: "g", name, input: name === "verdict" ? { hazard_context: false, asks_decision: false } : {} }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } })); }
      sent.push(body);
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Answer." }], stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 30 } }));
    }
    if (u.startsWith("http://db.test/")) return new Response("null", { headers: { "content-type": "application/json" } });
    return real(url, init);
  };
  try {
    const replay = { index, intent: false, rpc: async (fn: string) => {
      if (fn === "pb_ai_scope") return { data: { ok: true, level: o.level || "pipelayer", company: "Eval", today: "2026-11-20", cols: [], jobs: o.where === undefined ? [] : [["J-1", "Job", o.where, null, null, null, false]] }, error: null };
      if (fn === "pb_state_rules_get") return o.company_state !== undefined || o.jobs ? { data: { ok: true, company_state: o.company_state ?? null, jobs: o.jobs || {} }, error: null } : { data: null, error: { message: "Could not find the function" } };
      if (fn === "pb_docs_search") return { data: { ok: true, rows: [] }, error: null };
      return { data: { ok: false }, error: null };
    } };
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const admin = createClient("http://db.test", "svc", { auth: { persistSession: false } });
    await askV2({ feature: "teacher", v: 2, question, history: o.history || [], ctx: { job: o.where === undefined ? "" : "J-1", ...(o.ctx || {}) } }, { key: "sk-ant-x", admin, uid: "eval", token: "", t0: Date.now(), reply: (s: number, j: any) => (out = { s, j }, new Response(null)), replay });
  } finally { (globalThis as any).fetch = real; }
  ok(out && out.s === 200, JSON.stringify(out).slice(0, 300));
  const m = sent[0].messages[0].content; const text = (Array.isArray(m) ? m : [m]).map((c: any) => c.text || "").join("\n");
  return { text, state: out.j.state };
}
Deno.test("request: job address state reaches the search and the prompt", async () => {
  const r = await ask("How long is my 811 ticket good for?", { where: "Houston, TX" });
  eq(r.state, { code: "TX", how: "job" }); ok(/JOB STATE: Texas \(TX\), from the job\./.test(r.text), "state line");
  ok(/Texas 811 dig rules/.test(r.text) && /14 working days/.test(r.text), "Texas chunk in the excerpts");
  ok(!/California 811 dig rules|Alabama 811 dig rules/.test(r.text), "no other state's 811 chunk");
});
Deno.test("request: the state the app sends is used (solo user, no company jobs), and the app's California fallback is not", async () => {
  const r = await ask("How long is my 811 ticket good for?", { ctx: { state: "FL", state_how: "address" } });
  eq(r.state, { code: "FL", how: "job" }); ok(/30 calendar days/.test(r.text) && /JOB STATE: Florida/.test(r.text));
  const d = await ask("How long is my 811 ticket good for?", { ctx: { state: "CA", state_how: "default" } });
  eq(d.state.code, null); ok(/Which state is the job in\?/.test(d.text), "asks once"); ok(!/28 days/.test(d.text.split("EXCERPTS:")[1] || ""), "no California number handed over");
});
Deno.test("request: old app (sends no state): the picked job state, then the company's state", async () => {
  const p = await ask("How many days before we dig do I have to call 811?", { where: "Main St", jobs: { "j-1": "AZ" }, company_state: "CA" });
  eq(p.state, { code: "AZ", how: "job" }); ok(/Arizona 811 dig rules/.test(p.text));
  const c = await ask("How many days before we dig do I have to call 811?", { company_state: "NV" });
  eq(c.state, { code: "NV", how: "company" }); ok(/Nevada 811 dig rules/.test(c.text));
});
Deno.test("request: no state anywhere: asks only when the answer changes by state; an answer of 'Texas' carries on", async () => {
  const a = await ask("Do I have to give the guys a lunch break?", {});
  eq(a.state, { code: null, how: "unknown", asked: true }); ok(/end with exactly one short question: "Which state is the job in\?"/.test(a.text));
  const b = await ask("What is SDR 35?", {}); eq(b.state.asked, false); ok(/Otherwise just answer; do not ask/.test(b.text));
  const e = await ask("We hit a gas line and it's blowing", {}); eq(e.state.asked, false);
  const t = await ask("Texas", { history: [{ q: "Do I have to give the guys a lunch break?", a: "Which state is the job in?" }] });
  eq(t.state, { code: "TX", how: "question" });
  const f = await ask("what about overtime", { history: [{ q: "Texas", a: "..." }, { q: "Do I have to give the guys a lunch break?", a: "Which state is the job in?" }] });
  eq(f.state, { code: "TX", how: "conversation" });
});
Deno.test("request: a general safety answer is the same in every state (bleeding first aid)", async () => {
  for (const where of ["Dallas, TX", "Columbus, OH", "Charleston, WV", "Wildomar, CA"]) { const r = await ask("how do I stop bad bleeding from a cut on the arm", { where }); ok(/Stop the Bleed|direct pressure|tourniquet/i.test(r.text.split("EXCERPTS:")[1] || ""), where); }
});
Deno.test("the model's own second search follows the same state rule", async () => {
  const { runTool } = await import("../src/tools.ts");
  const go = async (query: string, st: any) => { const sources: any[] = []; let n = 0; await runTool("search_knowledge", { query, library: "field" }, { level: "pipelayer", kb: index, state: st, nextExcerpt: () => ++n, sources, docsSearch: async () => [] }); return sources.map((x) => x.id); };
  const tx = await go("811 ticket life how long good for", { code: "TX", named: [] });
  ok(tx.length > 0 && tx.every((id) => { const cs = S.chunkStates(C(id)); return !cs.length || cs.includes("TX"); }), "Texas job: " + tx);
  const named = await go("Washington 811 ticket life", { code: "TX", named: [] });
  ok(named.includes("dig-wa"), "a state the search names is allowed: " + named);
  const none = await go("811 ticket life how long good for", { code: null, named: [] });
  ok(none.every((id) => !S.chunkStates(C(id)).length), "no state: general only: " + none);
});
