// consolidate (Nov 21): trench / 811 questions carry the job state's exception card and the by-state table card.
import { buildIndex, search } from "../src/_shared/retrieval.ts";
import { stateSearch, resolveState, topicCards, TRENCH_TOPIC, DIG_TOPIC } from "../src/state.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
const card = (id, state, title, text) => ({ id, state, title, topic: "t", text: text + " " + "x ".repeat(120), source: "s", url: "https://x.y", confidence: "high" });
const kb = { app: [], osha: [], field: [
  card("osha-pl-exc-protect-5ft-1", "US", "The 5 ft rule: when a trench needs a protective system", "Protective system at 5 ft (29 CFR 1926.652(a)(1)). trench box shoring depth"),
  card("osha-pl-trench-states-1", "US", "Does my state follow the federal trench rule?", "Federal rule, no state OSHA plan: Texas, West Virginia, Ohio. trench depth"),
  card("osha-pl-trench-states-2", "US", "State OSHA plans and the trench rule", "Plan adopts federal: Virginia, Utah. Differ: Washington. trench depth"),
  card("sp-wa-trench-1", "WA", "Washington trench protection starts at 4 feet", "Washington requires protection at 4 ft. trench box"),
  card("fed-811-wait-1", "US", "811 wait before digging, by state", "48 hours: Texas. 2 working days: Ohio. wait 811"),
  card("fed-811-ticketlife-1", "US", "811 ticket life by state", "14 days: Texas. ticket good for"),
  card("fed-811-zone-1", "US", "811 tolerance zone by state", "18 inches: Texas, Ohio. hand dig"),
  card("dig-tx-overview-1", "TX", "Texas 811 rules in short", "Texas ticket 14 working days. 811 locate ticket"),
  card("dig-tx-locatable-1", "TX", "Texas locatable pipe", "Texas tracer wire 811 locate ticket"),
] };
const { index } = buildIndex(kb, "t");
const run = (q, st) => stateSearch(search, index, q, { k: 6, maxChars: 9e3 }, resolveState({ question: q, addressState: st }), q);
Deno.test("consol: Texas trench depth -> federal table card, no exception card", () => {
  const r = run("At what depth does a trench need a trench box?", "TX");
  ok(r.forced.includes("osha-pl-trench-states-1") && !r.forced.includes("osha-pl-trench-states-2"), JSON.stringify(r.forced));
  ok(r.hits.some((h) => h.id === "osha-pl-trench-states-1"));
  ok(r.dependent !== "plan");
});
Deno.test("consol: Washington -> its exception card + the plan table; Virginia does not match West Virginia", () => {
  const w = run("At what depth does a trench need a trench box?", "WA");
  ok(w.hits.some((h) => h.id === "sp-wa-trench-1") && w.forced.includes("osha-pl-trench-states-2"), JSON.stringify(w));
  ok(run("Does a trench need shoring?", "VA").forced.includes("osha-pl-trench-states-2"));
  ok(run("Does a trench need shoring?", "WV").forced.includes("osha-pl-trench-states-1"));
});
Deno.test("consol: 811 picks the table by what is asked, and the state's dig card (never the locatable card)", () => {
  const a = run("How long is my locate ticket good for?", "TX");
  ok(a.forced.includes("fed-811-ticketlife-1") && !a.forced.includes("dig-tx-locatable-1"), JSON.stringify(a.forced));
  ok(run("How close can I dig to the locate marks with a machine?", "TX").forced.includes("fed-811-zone-1"));
  ok(run("Does Texas have its own 811 rule?", "TX").forced.includes("fed-811-wait-1"));
});
Deno.test("consol: topics: excavator is not a trench question; emergencies and unknown state force nothing", () => {
  ok(!TRENCH_TOPIC.test("How far from power lines with the excavator?") && TRENCH_TOPIC.test("excavation depth"));
  ok(DIG_TOPIC.test("When can I dig after I call 811?"));
  ok(run("The trench caved in on a guy", "TX").forced.length === 0);
  ok(run("At what depth does a trench need a box?", "").forced.length === 0);
  ok(topicCards(search, index, "pipe slope", {}, "TX", "What slope for 8 inch sewer?", [], 1).length === 0);
});
