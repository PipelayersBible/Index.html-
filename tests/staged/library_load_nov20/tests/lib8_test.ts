// lib8 (fifth helper): web-search answer text, quotes from state cards, own-plan states.
import { joinAnswerBlocks } from "../src/ask.ts";
import { checkOshaQuotes } from "../src/guard.ts";
import { stateLines } from "../src/state.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
const cit = [{ type: "web_search_result_location", url: "https://www.emwd.org/x", title: "EMWD" }];
Deno.test("lib8: web answer: the stall lead-in and the glued TYPE line go, the headline stays", () => {
  const c = [
    { type: "text", text: "The libraries don't give a sewer main minimum, so I'll check the web for the agency standard." },
    { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "EMWD sewer slope" } },
    { type: "web_search_tool_result", tool_use_id: "s1", content: [] },
    { type: "text", text: "TYPE: general\nAn 8-inch sewer main goes at 0.40% minimum (0.0040 ft/ft)" },
    { type: "text", text: " in Eastern Municipal Water District's standards", citations: cit },
    { type: "text", text: ".\n\n- Your agency's spec governs." },
  ];
  const a = joinAnswerBlocks(c);
  ok(/^TYPE: general\nAn 8-inch sewer main goes at 0\.40%/.test(a), a);
  ok(!/check the web/.test(a) && !/standard\.TYPE/.test(a), a);
  ok(/0\.0040 ft\/ft\) in Eastern Municipal Water District's standards\./.test(a), "citation pieces still glue: " + a);
});
Deno.test("lib8: web answer with no lead-in is joined as before", () => {
  const c = [{ type: "text", text: "TYPE: general\nSix states" }, { type: "text", text: " cover public workers only", citations: cit }, { type: "text", text: "." }];
  ok(joinAnswerBlocks(c) === "TYPE: general\nSix states cover public workers only.", joinAnswerBlocks(c));
  const d = [{ type: "text", text: "TYPE: safety\nOSHA requires 5 ft." }, { type: "text", text: "- Your competent person decides on site." }];
  ok(joinAnswerBlocks(d) === "TYPE: safety\nOSHA requires 5 ft.\n- Your competent person decides on site.", joinAnswerBlocks(d));
});
Deno.test("lib8: a real first line before TYPE is not dropped", () => {
  const c = [{ type: "text", text: "8-inch sewer: 0.40% minimum." }, { type: "server_tool_use", id: "s" }, { type: "text", text: "TYPE: general\n- EMWD standard." }];
  ok(/^8-inch sewer: 0\.40% minimum\./.test(joinAnswerBlocks(c)), joinAnswerBlocks(c));
});
Deno.test("lib8: a quote word for word from a state card is not removed (lib-sc-sp-1)", () => {
  const card = 'the competent person "must have specific training in, and be knowledgeable about, soils analysis, the use of protective systems" and the requirements of the excavation rule.';
  const a = 'South Carolina requires the competent person to have "specific training in, and be knowledgeable about, soils analysis, the use of protective systems" and the excavation rule (1926.650(b)) [2].';
  const r = checkOshaQuotes(a, [], { cites: { "2": { kind: "other", text: card } } });
  ok(r.removed === 0 && !/quote removed/.test(r.text), JSON.stringify(r));
  const b = checkOshaQuotes('29 CFR 1926.652 says "Employees may work under a trench box at any depth without a ladder."', [], { cites: { "2": { kind: "other", text: card } } });
  ok(b.removed === 1, "made-up quote still removed: " + JSON.stringify(b));
});
Deno.test("lib8: own-plan state line asks for the plan named in line 1", () => {
  const t = stateLines({ code: "KY", how: "job" }, true, 1);
  ok(/name Kentucky's plan as the source in line 1/.test(t), t);
  const u = stateLines({ code: "TX", how: "job" }, true, 1); ok(!/plan as the source/.test(u), u);
});
