// emergency_nov22: server checks (Deno). Copy next to the build source's tests/ (src at ../src) and run:
//   deno test --no-check -A --config check.deno.json tests/emergency_nov22_test.ts
import { localAnswer } from "../src/safety.ts";
import { pbEmergencyAnswer } from "../src/emergency.ts";
import { DIG_TOPIC, TRENCH_TOPIC, esSearchWords } from "../src/state.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
Deno.test("emergency_nov22: one emergency check on the server (the old generic list no longer re-fires)", () => {
  for (const q of ["4 gas meter keeps beeping low battery", "Trench caved in overnight, no one was in it, do we need to report it?", "he's unresponsive to texts, how do I get him to send his daily?", "Pipelayer is down in the trench shooting grade, how do I check the laser?", "What should the H2S alarm be set at?"]) {
    const a = localAnswer(q); ok(!a || a.kind !== "emergency", q);
  }
  ok(localAnswer("my pipelayer passed out in the manhole").kind === "emergency", "still fires");
});
Deno.test("emergency_nov22: 'Not an emergency? Send to Ask' (not_emergency) skips the script, keeps the go/no-go check", () => {
  ok(localAnswer("we hit a gas line").kind === "emergency");
  ok(localAnswer("we hit a gas line", { notEmergency: true }) === null);
  ok(localAnswer("can we go in", { notEmergency: true }).kind === "gonogo");
});
Deno.test("emergency_nov22: scripts and Spanish text", () => {
  ok(pbEmergencyAnswer("the boom touched the line").script === "power");
  const l = pbEmergencyAnswer("the bucket hit the line"); ok(l.script === "line" && /stay in the cab/.test(l.text) && /upwind/.test(l.text), "line = power + gas");
  ok(pbEmergencyAnswer("smells like rotten eggs in the wet well").script === "space");
  const es = pbEmergencyAnswer("huele a gas"); ok(es.lang === "es" && /hacia donde viene el viento/.test(es.text) && /dueño de la línea/.test(es.text), "gas es");
  const op = pbEmergencyAnswer("lo atropelló la troca"); ok(op.lang === "es" && /^- Caída/.test(op.text.split("\n")[2]), "fall line moved up with the accent");
  ok(/2 a 3 pulgadas/.test(pbEmergencyAnswer("está sangrando mucho").text) && /intérprete/.test(pbEmergencyAnswer("se desmayó").text));
});
Deno.test("emergency_nov22: search topics (ticket, trench) and Spanish search words", () => {
  ok(!DIG_TOPIC.test("What goes on a time and materials ticket?") && !DIG_TOPIC.test("What does the concrete ticket need to show?"));
  ok(DIG_TOPIC.test("How long is my ticket good for?") && DIG_TOPIC.test("When can I dig after I call 811?") && DIG_TOPIC.test("Do I need to renew the ticket?"));
  ok(!TRENCH_TOPIC.test("How deep do we dig the trench for an 8 inch water main?") && !TRENCH_TOPIC.test("How wide does the trench need to be for 12 inch PVC?"));
  ok(TRENCH_TOPIC.test("At what depth does a trench need a box?") && TRENCH_TOPIC.test("Do we have to slope a 6 ft trench?") && TRENCH_TOPIC.test("excavation depth"));
  ok(/slope/.test(esSearchWords("¿Cuánta pendiente lleva un drenaje de 8 pulgadas?")) && esSearchWords("How deep is the trench?") === "");
});
