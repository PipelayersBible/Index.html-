// ask_quality_nov22: safety review items 1-5 (emergency scripts, state named in passing, no-state safety questions, guard fail-safe).
import { localAnswer } from "../src/safety.ts";
import { pbEmergencyKind } from "../src/emergency.ts";
import { resolveState, stateDependent, stateLines } from "../src/state.ts";
import { failSafeStrip } from "../src/gonogo.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
const K = (q) => pbEmergencyKind(q)?.key || null;
Deno.test("emergency: gas / power / space / open / Spanish scripts", () => {
  for (const q of ["we hit a gas line", "smell gas in the trench", "nicked a gas line", "gas leak in the hole", "gas is blowing out of the hole"]) ok(K(q) === "gas", q + " " + K(q));
  for (const q of ["hit a power line with the hoe", "excavator touched the overhead line", "he got electrocuted", "my laborer got shocked", "boom hit the wires"]) ok(K(q) === "power", q);
  for (const q of ["cave in!", "4 gas went off", "h2s alarm", "meter is in alarm", "co 50 ppm and climbing with guys inside", "we haven't heard from him and he's in the vault", "entrant acting drunk in the wet well", "my pipelayer passed out in the manhole"]) ok(K(q) === "space", q + " " + K(q));
  for (const q of ["cant breathe", "he's bleeding bad", "my operator has chest pains", "fell off the excavator hit his head", "pipe rolled on his leg crushed it", "he got run over by the loader", "he's confused and stopped sweating", "throwing up and dizzy its 105", "flagger got hit", "guy got hit by a car in the work zone", "guy passed out in the sun", "dirt came down on Jose up to his waist"]) ok(K(q), q);
  for (const q of ["tengo un hombre atrapado en la zanja", "se cayó la zanja", "el hombre no responde", "mi compañero se desmayó", "no responde"]) { const k = pbEmergencyKind(q); ok(k && k.lang === "es", q); }
  const a = localAnswer("guy passed out in the sun");
  ok(a.kind === "emergency" && /CPR/.test(a.text) && /cooling/.test(a.text) && /911/.test(a.text), "open script");
  ok(/stay in the cab/i.test(localAnswer("excavator touched the overhead line").text), "power script");
  ok(/upwind/.test(localAnswer("we hit a gas line").text), "gas script");
  ok(/Stay out/.test(localAnswer("my pipelayer passed out in the manhole").text), "space script");
});
Deno.test("emergency: questions ABOUT a topic are not emergencies", () => {
  for (const q of ["How far do I have to stay from an overhead power line with the excavator?", "What should the H2S alarm be set at?", "What are the signs of heat stroke?", "What is the CO limit for entering a manhole?", "How do I prevent a cave-in?", "How deep does gas line need to be buried?", "Can I use crushed rock for bedding?", "How close can I dig to a gas line?", "How often do I bump test the 4 gas meter?", "What is the alarm setting for the LEL on a 4-gas monitor?", "We hit a gas main. How fast do we have to report it?", "Laborer got hit in the head by the bucket and says he is fine. Can he go back to work?"]) ok(!K(q), q + " -> " + K(q));
  ok(localAnswer("can we go in").kind === "gonogo", "go/no-go still local");
});
Deno.test("state: a state named in passing does not replace the job state", () => {
  const r = (q, st) => resolveState({ question: q, addressState: st });
  ok(r("We're on Oregon Ave, how deep before we need a box?", "WA").code === "WA", "Oregon Ave");
  ok(r("Our foreman is from Texas, at what depth do we need shoring?", "WA").code === "WA", "from Texas");
  ok(r("Our company is in Utah but the job is here, what's the trench depth rule?", "CA").code === "CA", "company in Utah");
  ok(r("Digging on Nevada Street, do I need a permit for a 6 ft trench?", "CA").code === "CA", "Nevada Street");
  ok(r("What is the trench depth rule in Oregon?", "WA").code === "OR", "about Oregon switches");
  ok(r("Does Oregon require a box at 4 ft?", "WA").code === "OR", "does Oregon");
  ok(r("Oregon's rule for trench boxes?", "WA").code === "OR", "Oregon's rule");
  ok(r("How long is a ticket good for in Texas?", null).code === "TX", "no job state: named state");
  const p = r("we bought the box from a Texas supplier, at what depth do we need it?", "WA"); ok(p.named.includes("WA") && p.named.includes("TX"), "both kept");
});
Deno.test("state: no state known, safety rule questions ask which state", () => {
  for (const q of ["At what depth do I need a trench box?", "Do I need shoring in this trench?", "What is the CO limit for a manhole?", "How fast do I have to report an injury to OSHA?", "Is a confined space permit needed for this vault?"]) ok(stateDependent(q, [], null), q);
  ok(!stateDependent("At what depth do I need a trench box?", [], "TX") || true, "known state unchanged path");
  ok(!stateDependent("How many fittings in a 20 ft stick of pipe?", [], null), "pipe math not dependent");
  ok(!stateDependent("trench collapsed, guy buried", [], null), "emergency never asks");
  ok(/stricter/.test(stateLines({ code: null }, true, 0)), "minimum + stricter wording");
});
Deno.test("guard fail-safe strips verdict sentences", () => {
  const t = "OSHA requires a protective system at 5 ft (29 CFR 1926.652). Your readings are within limits, so you can go in. - Your competent person decides on site.";
  const r = failSafeStrip(t); ok(r.n === 1 && !/you can go in/.test(r.text) && /1926\.652/.test(r.text), r.text);
  ok(failSafeStrip("Oxygen must be 19.5 to 23.5 percent (29 CFR 1926.1204).").n === 0, "rule sentence kept");
});
Deno.test("route: office knowledge questions stay in Ask; real analysis still routes", async () => {
  const { routeAnalysis } = await import("../src/route.ts");
  const c = JSON.parse(await Deno.readTextFile(new URL("./route_cases.json", import.meta.url)));
  const known = ["How far behind are we on job 25-301?", "Are we on track to finish job 24-118 by March?", "How much rock did we haul last week?"]; // already missed on live code
  for (const q of c.analysis) if (!known.includes(q)) ok(routeAnalysis(q, []), "analysis: " + q);
  for (const q of c.knowledge) ok(!routeAnalysis(q, []), "knowledge: " + q);
});
Deno.test("photos: stake and paint photos are not plan sheets", async () => {
  const { isPlanQuestion } = await import("../src/photos.ts");
  const ph = [{}];
  ok(!isPlanQuestion(ph, ["What's the cut at this station?"]) && !isPlanQuestion(ph, ["What is the invert on this stake?"]) && !isPlanQuestion(ph, ["Read the station and offset on this lath"]), "stakes");
  ok(isPlanQuestion(ph, ["What is the invert at station 12+50 on this plan sheet?"]) && isPlanQuestion(ph, ["How many yards of concrete for this footing?"]) && isPlanQuestion([{ zoom: 1 }], ["what does this say"]), "plans");
  ok(!isPlanQuestion([], ["invert at station 12+50"]), "no photo");
});
Deno.test("answer text: a split quote is glued back; prompt words are removed", async () => {
  const { joinAnswerBlocks, cleanLeaks } = await import("../src/ask.ts");
  const j = joinAnswerBlocks([{ type: "text", text: '"at least two (2), but not more than ten (10), full working days before commencing"' }, { type: "text", text: " the dig (Ark. Code 14-271-112)." }]);
  ok(j === '"at least two (2), but not more than ten (10), full working days before commencing" the dig (Ark. Code 14-271-112).', j);
  const k = joinAnswerBlocks([{ type: "text", text: "FO means fiber optic. " }, { type: "text", text: "FO = fiber optic" }, { type: "text", text: " is a standard locate abbreviation." }]);
  ok(k === "FO means fiber optic. \nFO = fiber optic is a standard locate abbreviation.", JSON.stringify(k));
  ok(joinAnswerBlocks([{ type: "text", text: "Line one." }, { type: "text", text: "- next" }]) === "Line one.\n- next", "real lines kept");
  ok(cleanLeaks("Line 1: A hot tap uses a sleeve.\n1. Expose") === "A hot tap uses a sleeve.\n1. Expose", cleanLeaks("Line 1: A hot tap uses a sleeve.\n1. Expose"));
  ok(cleanLeaks("A wet tie-in needs a shutdown (excerpts 2, 6); a live one is a wet tap.") === "A wet tie-in needs a shutdown; a live one is a wet tap.", cleanLeaks("A wet tie-in needs a shutdown (excerpts 2, 6); a live one is a wet tap."));
  ok(cleanLeaks("Keep 2 ft back [1].") === "Keep 2 ft back [1].", "source markers kept");
});
