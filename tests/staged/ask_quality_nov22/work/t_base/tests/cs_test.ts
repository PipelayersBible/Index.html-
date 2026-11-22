// consolidate_cs (Nov 21): confined space questions carry the job state's confined space card and the state table card;
// 811 rule questions are not business analysis; analysis mode keeps a job-state line.
import { buildIndex, search } from "../src/_shared/retrieval.ts";
import { stateSearch, resolveState, csTopic, analysisStateLine } from "../src/state.ts";
import { routeAnalysis } from "../src/route.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
const card = (id, state, title, text) => ({ id, state, title, topic: "t", text: text + " " + "x ".repeat(120), source: "s", url: "https://x.y", confidence: "high" });
const kb = { app: [], osha: [], field: [
  card("osha-pl-cs-air-1", "US", "Confined space air limits for manhole and vault entry", "oxygen 19.5 LEL 10 percent H2S 10 ppm CO 50 ppm confined space"),
  card("osha-pl-cs-states-1", "US", "Does my state follow the federal confined space rule?", "Federal rule, no state OSHA plan: Texas, West Virginia, Ohio. confined space"),
  card("osha-pl-cs-states-2", "US", "State OSHA plans and confined space", "Uses the federal rule: Virginia, Utah. Own rule: California, Washington. confined space"),
  card("sp-ca-confined-1", "CA", "California confined space rule for construction", "California 8 CCR 1950 confined space permit manhole"),
  card("sp-ca-confined-air-1", "CA", "California confined space air limits CO 25 ppm", "California carbon monoxide 25 ppm manhole confined space"),
  card("osha-pl-trench-states-1", "US", "Does my state follow the federal trench rule?", "Federal rule: Texas. trench depth"),
] };
const { index } = buildIndex(kb, "t");
const run = (q, st) => stateSearch(search, index, q, { k: 6, maxChars: 9e3 }, resolveState({ question: q, addressState: st }), q);
Deno.test("cs: Texas confined space -> federal table, no exception card", () => {
  const r = run("Can I sign the confined space permit?", "TX");
  ok(r.forced.includes("osha-pl-cs-states-1") && !r.forced.includes("osha-pl-cs-states-2"), JSON.stringify(r.forced));
});
Deno.test("cs: California CO question -> a California confined space card + the plan table; Virginia vs West Virginia", () => {
  const r = run("What is the carbon monoxide limit for entering a manhole?", "CA");
  ok(r.hits.some((h) => /^sp-ca-confined/.test(h.id)) && r.forced.includes("osha-pl-cs-states-2"), JSON.stringify(r.forced));
  ok(run("Who can be the attendant on a confined space entry?", "VA").forced.includes("osha-pl-cs-states-2"));
  ok(run("Who can be the attendant on a confined space entry?", "WV").forced.includes("osha-pl-cs-states-1"));
});
Deno.test("cs: topic: pipe math with a manhole and a sewer air test are not confined space; gas readings before entry are", () => {
  ok(!csTopic("Invert at the upstream manhole is 1205.30, run is 180 feet at 1.2%. What's the downstream invert?"));
  ok(!csTopic("How do you do an air test on new 8 inch sewer?"));
  ok(csTopic("O2 is 20.1 and LEL 3%, is that ok to enter?") && csTopic("Can we just call 911 if something goes wrong in the manhole?"));
  ok(run("Worker down in the manhole, not breathing", "TX").forced.length === 0);
});
Deno.test("route: 811 rule questions are not business analysis; real analysis still is", () => {
  ok(!routeAnalysis("How long is my locate ticket good for?", []) && !routeAnalysis("How long is my 811 ticket good for?", []));
  ok(routeAnalysis("How many locate tickets did we call in last month?", []) && routeAnalysis("Compare our footage this month vs last month", []));
});
Deno.test("analysis mode: job-state line names only the job state", () => {
  const l = analysisStateLine({ code: "OH", how: "job" });
  ok(/Ohio \(OH\)/.test(l) && /never name another state/.test(l) && analysisStateLine(null) === "");
});
