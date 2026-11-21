// lib7: continuation turns search with the thread's original question + the offered part; strictest-rule state lines.
import { continuationOf } from "../src/ask.ts";
import { stateLines } from "../src/state.ts";
const ok = (c: unknown, m: string) => { if (!c) throw new Error(m); };
const H = [{ q: "Can we bench a trench in Type C soil, and what are the benching rules?", a: "OSHA does not allow benching in Type C.\n- Your competent person decides on site.\n\nWant the rest: bench dimensions for Type A and B?" }];
Deno.test("lib7: 'yes' after an offer is a continuation of the original question + the offered part", () => {
  for (const y of ["yes", "Yes please", "ok go ahead", "sure", "go on", "keep going", "more", "yeah the table", "y"]) {
    const c = continuationOf(y, H); ok(c, y);
    ok(c!.q.includes("bench dimensions for Type A and B") && c!.q.includes("Type C soil"), y + ": " + c!.q);
  }
});
Deno.test("lib7: a new question is not a continuation", () => {
  ok(!continuationOf("How deep before I need a trench box?", H), "new q");
  ok(!continuationOf("yes", []), "no history");
  ok(!continuationOf("What about Type B?", H), "question");
});
Deno.test("lib7: a second 'yes' still goes back to the original question", () => {
  const h2 = [{ q: "yes", a: "Type A: first bench 4 ft...\n\nWant the rest: the vertical-sided lower portion?" }, ...H];
  const c = continuationOf("go on", h2); ok(c && c.orig.startsWith("Can we bench") && c.q.includes("vertical-sided lower portion"), JSON.stringify(c));
});
Deno.test("lib7: state lines say STRICTEST, never weaker, never another state", () => {
  const t = stateLines({ code: "WA", how: "job" }, true, 1);
  ok(/STRICTEST RULE/.test(t) && /stricter/.test(t) && /Never give a weaker rule/.test(t) && /not even as an example/.test(t), t);
  const u = stateLines({ code: "TX", how: "job" }, false, 0); ok(/STRICTEST rule/.test(u), u);
  const p = stateLines({ code: "MI", how: "job" }, "plan", 0); ok(/at least as protective/.test(p), p);
});
