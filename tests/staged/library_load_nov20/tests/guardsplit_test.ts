// lib7 / minimal build: the answer checker must not cut a sentence at "App. B" or "Subpart A." (eval tr12, lib-ny-sp-1)
import { guardAnswer } from "../src/gonogo.ts";
const fake = (sentences: string[]) => async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "verdict", input: { decides: true, sentences } }], usage: { input_tokens: 10, output_tokens: 10 } }), { status: 200 });
const U = () => ({ calls: 0, failed: 0, usd: 0 });
Deno.test("guard split: App. B is not a sentence end; no fragment left", async () => {
  const t = "Your Type C trench is fine at 1 1/2:1 (29 CFR 1926 Subpart P App. B). Keep spoil 2 ft back.\n- Your competent person decides on site.";
  const g = await guardAnswer("k", "is my trench ok", t, null, fake(["Your Type C trench is fine at 1 1/2:1 (29 CFR 1926 Subpart P App."]), U(), true);
  if (/\bB\)\./.test(g.text)) throw new Error("fragment left: " + g.text);
  if (!g.text.includes("Keep spoil 2 ft back.")) throw new Error("next sentence lost: " + g.text);
  if (!g.text.includes("makes that call on site")) throw new Error("no inline line: " + g.text);
});
Deno.test("guard split: Subpart A. + short tail glued", async () => {
  const t = "Confined spaces fall under Subpart AA. A.\n- Report a death within 8 hours.";
  const g = await guardAnswer("k", "q", t, null, fake(["Confined spaces fall under Subpart AA."]), U(), true);
  if (/^\s*A\.\s*$/m.test(g.text)) throw new Error("fragment left: " + JSON.stringify(g.text));
  if (!g.text.includes("Report a death within 8 hours.")) throw new Error("lost: " + g.text);
});
Deno.test("guard split: real sentence ends still split", async () => {
  const t = "OSHA requires a protective system at 5 ft. Your box is fine here. Keep the ladder within 25 ft.";
  const g = await guardAnswer("k", "q", t, null, fake(["Your box is fine here."]), U(), true);
  if (!g.text.includes("OSHA requires a protective system at 5 ft.") || !g.text.includes("Keep the ladder within 25 ft.") || g.text.includes("box is fine")) throw new Error(g.text);
});
