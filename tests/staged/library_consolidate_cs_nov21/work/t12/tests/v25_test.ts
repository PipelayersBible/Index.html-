const assert = (c: unknown, m = "") => { if (!c) throw new Error("assert " + m); };
const assertEquals = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`got ${a} want ${b}`); };
import { calc } from "../src/calc.ts";
import { STALL_RE } from "../src/ask.ts";
import { TEACHER_V2_SYSTEM } from "../src/prompts_v2.ts";
Deno.test("calc: trig in degrees and powers", () => {
  assertEquals(calc("round(atan(1.5 / 5.5), 2)").value, 15.26);
  assertEquals(calc("round(atan(tan(45) * cos(15.26)), 2)").value, 43.97);
  assertEquals(calc("round(asin(sin(45) * sin(15.26)), 2)").value, 10.73);
  assertEquals(calc("2^10").value, 1024);
  assertEquals(calc("round(atan2(1, 1), 1)").value, 45);
  assert(!calc("tan(90)").ok);
});
Deno.test("stall: announcing a step is caught, answers are not", () => {
  for (const t of ["I'll run the half-angle through calc so the figures trace.", "Exponents aren't supported either, so I'll use plain multiplication.", "Let me work that out."]) assert(STALL_RE.test(t), t);
  for (const t of ["Each form is cut at 45° (90 ÷ 2).", "The miter is 43.97° on the face and the saw bevel is 10.73°."]) assert(!STALL_RE.test(t), t);
});
Deno.test("prompt: follow-through and follow-up rules", () => {
  assert(/Never announce a step and stop/.test(TEACHER_V2_SYSTEM));
  assert(/did you run it/.test(TEACHER_V2_SYSTEM));
  assert(/calc handles any math/.test(TEACHER_V2_SYSTEM));
});

Deno.test("calc: units, algebra, geometry, lockdown", () => {
  assertEquals(calc("12 ft * 3 ft * 0.5 ft to yd^3").value, 0.666666666667);
  assertEquals((calc('solve("x^2 + 3x = 10", "x")') as any).values, [-5, 2]);
  assertEquals(calc('solve("x^2 + 3x = 10", "x", 0, 100)').value, 2);
  assertEquals(calc("round(segment_area(1, 0.5), 4)").value, 0.3927);
  assertEquals(calc("round(sin((pi/6) rad), 3)").value, 0.5);
  assertEquals(calc("round(sin(30), 3)").value, 0.5);
  for (const e of ['import({})', 'evaluate("1+1")', "ones(100000000)", "[1,2]", "a = 5", "10/0"]) assert(!calc(e).ok, e);
});

import { otherStateOnly } from "../src/ask.ts";
import { intentOf } from "../src/intent.ts";
Deno.test("state filter: drops other states' cards on a California job", () => {
  assert(otherStateOnly("Quick reference: water and sewer separation · Virginia 12VAC5-590-1150", "CA", "separation water sewer"));
  assert(otherStateOnly("Ten States Standards 18 in. vertical separation", "CA", "separation"));
  assert(!otherStateOnly("Ten States Standards 18 in.", "CA", "what does ten states say"));
  assert(!otherStateOnly("California water main separation 22 CCR 64572", "CA", "separation"));
  assert(!otherStateOnly("Trench shoring basics", "CA", "shoring"));
  assert(!otherStateOnly("Virginia rule", "CA", "what's the virginia rule"));
  assert(!otherStateOnly("Virginia rule", "VA", "separation"));
});
Deno.test("intent: parsed from the model's tool call; failure is null", async () => {
  const usage = { calls: 0, failed: 0, usd: 0 };
  const ok = (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "intent", input: { meaning: "What is the invert elevation at MH-3?", search: "invert elevation manhole IE flowline", unclear: false, readings: [] } }], usage: { input_tokens: 10, output_tokens: 10 } }), { status: 200 })) as unknown as typeof fetch;
  const r = await intentOf("k", "whats the ie at mh3", "", "", ok, usage, Date.now() + 5000);
  assertEquals(r?.meaning, "What is the invert elevation at MH-3?");
  const bad = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
  assertEquals(await intentOf("k", "q", "", "", bad, usage, Date.now() + 2000), null);
});
Deno.test("calc: field helpers", () => {
  assertEquals(calc("round(ftin(5, 3.5), 4)").value, 5.2917);
  assert(calc("to_ftin(5.2917)").text.endsWith(`= 5' 3-1/2"`));
  assertEquals(calc('sta("12+50.25") - sta("10+00")').value, 250.25);
  assert(calc("to_sta(1250.25)").text.endsWith("= 12+50.25"));
  assertEquals(calc("round(elev_at(100, -0.5, 250), 3)").value, 98.75);
  assertEquals(calc("round(bedding_cy(3, 6, 9.05, 12, 100), 2)").value, 23.39);
});

import { DEFS as DEFS2, runTool as runTool2, toolsFor as toolsFor2 } from "../src/tools.ts";
Deno.test("plans: tools offered to every level; plan_read checks tiles and returns images", async () => {
  for (const lv of ["pipelayer", "foreman", "office"]) {
    const names = toolsFor2(lv, false).map((t: any) => t.name);
    assert(names.includes("plan_find") && names.includes("plan_read") && names.includes("plan_sheets") && names.includes("plan_issues"), lv);
  }
  assert(!toolsFor2("individual", false).some((t: any) => /^plan_/.test(t.name)), "no plans for individuals");
  const sources: any[] = []; let n = 0; const flags: any = {};
  const cx: any = {
    level: "pipelayer", sources, nextRef: () => ++n, resultChars: 6000,
    userRpc: async (fn: string, a: any) => fn === "pb_ai_plan_sheet" && a.p_page === 5 ? { data: { ok: true, set_id: "S", set: "Water & Sewer", page: 5, sheet: "5", sheet_title: "SEWER STREET A", grid: { tiles: ["r0c0", "r1c1"] }, read: { items: [{ label: "SSMH #3", values: "INV OUT (W) 1336.95", tiles: ["r1c1"] }] } } } : { data: { ok: false, message: "No such sheet" } },
    admin: { storage: { from: (b: string) => ({ download: async (p: string) => b === "plan-sets" && p === "S/p5/r1c1.jpg" ? { data: new Blob([new Uint8Array([255, 216, 255])]) } : { error: "nf" } }) } },
    set planImages(v: boolean) { flags.seen = v; },
  };
  const r: any = await runTool2("plan_read", { job: "26014", page: 5, tiles: ["r1c1", "r9c9", "R0C0"] }, cx);
  assert(!r.isError && /1336\.95/.test(r.text), r.text);
  assertEquals(r.content.filter((c: any) => c.type === "image").length, 1);
  assert(flags.seen === true, "plan images flagged");
  const none: any = await runTool2("plan_read", { job: "26014", page: 9 }, cx);
  assert(/Not available/.test(none.text), none.text);
  assert(/plan_read/.test(TEACHER_V2_SYSTEM) && /isn't on this job's plans/.test(TEACHER_V2_SYSTEM), "prompt");
});

Deno.test("v27: a stake photo question carries the full stake glossary", async () => {
  const { STAKE_GLOSSARY } = await import("../src/glossary.ts");
  if (!/CATCH \/ CP catch point/.test(STAKE_GLOSSARY) || !/crowfoot/.test(STAKE_GLOSSARY) || !/TW \/ TOW top of wall/.test(STAKE_GLOSSARY)) throw new Error("glossary");
});
Deno.test("v28: stake decimals after a separator dot, short stake answers", async () => {
  const { STAKE_GLOSSARY } = await import("../src/glossary.ts");
  assert(/"F\. 8 11" = fill 8\.11/.test(STAKE_GLOSSARY), "8.11 rule");
  assert(!/\.8 = 0\.80 ft/.test(STAKE_GLOSSARY), "old 0.8 example gone");
  assert(/Top of wall: fill 8\.11 ft/.test(TEACHER_V2_SYSTEM), "short format");
  assert(/no closing question or "if you meant" line/.test(TEACHER_V2_SYSTEM));
});
Deno.test("v28: glossary covers cut sheets, pipe print, lids, ribbons, control, USA marks; text questions trigger it", async () => {
  const { STAKE_GLOSSARY: G } = await import("../src/glossary.ts");
  for (const re of [/CUT SHEETS/, /C900 DR18 PC235/, /DRAINS TO OCEAN/, /yellow\+red 6/, /teepee\/tripod/, /NO \+ owner/, /often does NOT mark sewer or storm drain/, /℄/, /NFPA 291/, /ASTM C94/, /field dry density/]) assert(re.test(G), String(re));
  const src = await Deno.readTextFile(new URL("../src/ask.ts", import.meta.url));
  const m = src.match(/wantsGlossary = photos\.length > 0 \|\| (\/.*?\/i)\.test/);
  assert(m, "trigger regex");
  const re = eval(m![1]) as RegExp;
  for (const q of ["what do the ribbons mean", "read this cut sheet", "what are these USA marks", "what is SDR 35", "what does C900 mean", "whats under this lid", "dig alert didn't mark the sewer", "is this a control point", "what does a green hydrant top mean", "read this concrete ticket", "did these compaction tests pass", "read this gauge"]) assert(re.test(q), q);
  assert(!re.test("how deep should I bed 8 inch pipe"), "plain question stays light");
});
Deno.test("v28: state library chunks follow the job's state", async () => {
  const { otherStateOnly } = await import("../src/ask.ts");
  const L = (await Deno.readTextFile("/home/claude/kb_add/states.jsonl")).trim().split("\n").map((l) => JSON.parse(l));
  const g = (await Deno.readTextFile("/home/claude/kb_add/batch3.jsonl")).trim().split("\n").map((l) => JSON.parse(l));
  const t = (c) => `${c.title} ${c.source} ${c.text.slice(0, 300)}`;
  const ca = L.find((c) => c.id === "st-ca"), tx = L.find((c) => c.id === "st-tx"), guide = L.find((c) => c.id === "st-guide"), gb = g.find((c) => c.id === "gb-4");
  assert(!otherStateOnly(t(ca), "CA", "what spec applies"), "CA keeps CA");
  assert(otherStateOnly(t(tx), "CA", "what spec applies"), "CA drops TX");
  assert(!otherStateOnly(t(tx), "CA", "what spec does Texas use"), "named state kept");
  assert(!otherStateOnly(t(guide), "TX", "which spec"), "guide kept everywhere");
  assert(otherStateOnly(t(gb), "TX", "compaction in trench"), "Greenbook dropped on a Texas job");
  assert(!otherStateOnly(t(gb), "CA", "compaction in trench"), "Greenbook kept on a California job");
});
