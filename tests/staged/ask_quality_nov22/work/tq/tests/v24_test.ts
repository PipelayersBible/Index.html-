// Tests for the Ask v24 changes. Run: deno test --allow-env tests/
import { DEFS, runTool, toolsFor } from "../src/tools.ts";
import { TEACHER_V2_SYSTEM } from "../src/prompts_v2.ts";
import { buildIndex, search } from "../src/_shared/retrieval.ts";
import { REFUSAL_LINE, SAFETY_LINE } from "../src/gonogo.ts";
import { isAnalysisQuestion } from "../src/route.ts";

const eq = (a: unknown, b: unknown, msg = "") => {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`${msg}\n  got:  ${x}\n  want: ${y}`);
};
const ok = (c: unknown, msg: string) => {
  if (!c) throw new Error(msg);
};
const def = () => DEFS.find((d) => d.name === "run_notes")!;

Deno.test("run_notes is defined for company levels only, with the pb_ai_run_notes rpc", () => {
  const d = def();
  ok(!!d, "run_notes missing from DEFS");
  eq(d.rpc, "pb_ai_run_notes");
  eq(d.levels, ["pipelayer", "foreman", "office"]);
  ok(!toolsFor("individual", false).some((t) => t.name === "run_notes"), "individual got run_notes");
  for (const lvl of ["pipelayer", "foreman", "office"]) {
    ok(toolsFor(lvl, false).some((t) => t.name === "run_notes"), lvl + " lacks run_notes");
  }
});

Deno.test("run_notes args: defaults match the SQL function's defaults", () => {
  eq(def().args({}), {
    p_job: null,
    p_from: null,
    p_to: null,
    p_kind: "all",
    p_group: "kind",
    p_group2: null,
  });
});

Deno.test("run_notes args: passes valid values through, in the SQL argument names", () => {
  eq(
    def().args({
      job: "24-201",
      from: "2026-10-01",
      to: "2026-10-31",
      kind: "delay",
      group_by: "author",
      then_by: "reason",
    }),
    {
      p_job: "24-201",
      p_from: "2026-10-01",
      p_to: "2026-10-31",
      p_kind: "delay",
      p_group: "author",
      p_group2: "reason",
    },
  );
});

Deno.test("run_notes args: unknown kind / group fall back; then_by equal to group_by is dropped", () => {
  const a = def().args({ kind: "weather", group_by: "pipelayer", then_by: "pipelayer" });
  eq(a.p_kind, "all");
  eq(a.p_group, "kind");
  eq(a.p_group2, null);
  const b = def().args({ group_by: "author", then_by: "author" });
  eq(b.p_group2, null, "same group twice must not reach SQL");
  const c = def().args({ then_by: "kind" });
  eq(c.p_group2, null, "then_by equal to the default group must be dropped");
  const d = def().args({ kind: 7, group_by: null, then_by: { x: 1 } });
  eq([d.p_kind, d.p_group, d.p_group2], ["all", "kind", null]);
});

Deno.test("run_notes label is short and safe", () => {
  const l = def().label({ kind: "delay", group_by: "author", then_by: "job", job: "24-201" });
  eq(l, "run notes (delay) by author and job, job 24-201");
  eq(def().label({}), "run notes by kind");
});

Deno.test("run_notes via runTool: scoped to the caller's rpc, result labelled [Dn], capped", async () => {
  const calls: unknown[] = [];
  const bigRows = Array.from({ length: 60 }, (_, i) => ["r" + i, "", i, 1.5, 50, 40, 0]);
  const cx = {
    level: "office",
    kb: null,
    userRpc: async (fn: string, args: unknown) => {
      calls.push([fn, args]);
      return { data: { ok: true, rows: bigRows, examples: [] }, error: null };
    },
    docsSearch: async () => [],
    nextRef: () => 1,
    nextExcerpt: () => 1,
    resultChars: 1500,
    sources: [] as unknown[],
    calcValues: [],
  };
  const r = await runTool("run_notes", { kind: "delay", group_by: "author" }, cx);
  eq(r.isError, false);
  eq(calls.length, 1);
  eq((calls[0] as unknown[])[0], "pb_ai_run_notes");
  eq(((calls[0] as unknown[])[1] as Record<string, unknown>).p_group, "author");
  ok(r.text.startsWith('<data ref="D1">'), "result is not wrapped as data");
  ok(r.text.includes("rows_left_out"), "oversize rows were not shrunk");
  ok(r.text.length < 1500 + 400, "result not capped: " + r.text.length);
  eq(cx.sources.length, 1);
  eq((cx.sources[0] as Record<string, unknown>).tool, "run_notes");
});

Deno.test("run_notes via runTool: not available below its levels; rpc errors never leak numbers", async () => {
  const base = {
    kb: null,
    docsSearch: async () => [],
    nextRef: () => 1,
    nextExcerpt: () => 1,
    resultChars: 6000,
    sources: [],
    calcValues: [],
  };
  const r1 = await runTool("run_notes", {}, { ...base, level: "individual", userRpc: async () => ({ data: null, error: null }) });
  eq(r1.isError, true);
  const r2 = await runTool("run_notes", {}, {
    ...base,
    level: "foreman",
    userRpc: async () => ({ data: null, error: { message: "pb:no_company boom" } }),
  });
  eq(r2.isError, true);
  ok(r2.text.includes("pb:no_company") && r2.text.includes("Do not guess"), r2.text);
  const r3 = await runTool("run_notes", {}, {
    ...base,
    level: "pipelayer",
    userRpc: async () => ({ data: { ok: false, message: "Run notes are for company accounts." }, error: null }),
  });
  eq(r3.isError, false);
  ok(r3.text.startsWith("Not available:"), r3.text);
});

Deno.test("system prompt carries the v24 rules", () => {
  const P = TEACHER_V2_SYSTEM;
  const must = [
    "Most answers are 30 to 80 words",
    "AT MOST ONE closing line",
    "Quote ONLY the words that carry the rule",
    "Give them BY JURISDICTION",
    "Cal/OSHA (Title 8)",
    "Never present one number as \"the\" limit",
    "Say where you read it",
    "Never invent a value that is not on the plan",
    "CALIFORNIA WATER / SEWER SEPARATION",
    "64572",
    "Horizontal separation",
    "vertical separation",
    "COMPARING CREWS OR PEOPLE",
    "CANNOT be compared fairly",
    "Never rank blindly",
    "LEADERSHIP AND PROMOTION EVIDENCE",
    "never a verdict",
    "delays_timed_pct",
    "run_notes",
  ];
  for (const m of must) ok(P.includes(m), "prompt is missing: " + m);
  ok(!P.includes("About 120 words"), "old 120-word rule still present");
});

Deno.test("guard fail-safe lines are unchanged", () => {
  eq(
    SAFETY_LINE,
    "Safety check: the app’s AI does not make go/no-go calls. Your competent person / entry supervisor decides on site.",
  );
  eq(
    REFUSAL_LINE,
    "The app’s AI never decides whether a space or trench is safe to enter, whether readings are acceptable, or whether protection is adequate: stop and ask your entry supervisor / competent person.",
  );
});

Deno.test("retrieval: separation vocabulary finds the Title 22 entry", () => {
  const { index } = buildIndex({
    field: [
      {
        id: "sep1",
        title: "Water and sewer separation (California Waterworks Standards)",
        topic: "pipe",
        text:
          "Title 22 CCR section 64572: a new water main must be at least 10 feet horizontally from a parallel sewer, measured edge to edge, and at a crossing the water main is at least one foot above the sewer. Where that cannot be met the water supplier may approve encasement or a sleeve.",
        source: "field",
      },
      {
        id: "bed1",
        title: "Pipe bedding and haunching",
        topic: "pipe",
        text: "Bedding under the pipe barrel and haunch compaction keep the pipe from sagging.",
        source: "field",
      },
      {
        id: "tb1",
        title: "Trench box depth",
        topic: "trench",
        text: "A trench box is required at 5 feet in type C soil; the competent person decides.",
        source: "field",
      },
    ],
  });
  for (
    const q of [
      "how far does the water line have to be from the sewer in California",
      "what is the horizontal separation between water and sewer",
      "can we sleeve the sewer where it crosses under the water main, 1 ft rule?",
      "title 22 crossing clearance water over sewer",
    ]
  ) {
    const hits = search(index, q, { k: 2 });
    ok(hits.length > 0 && hits[0].id === "sep1", `"${q}" -> ${hits.map((h) => h.id).join(",")}`);
  }
});

Deno.test("routing: promotion / documentation questions from the office are analysis", () => {
  ok(isAnalysisQuestion("Which of our pipelayers documents delays most consistently?"), "documents");
  ok(isAnalysisQuestion("Who on my crews is ready to run a crew? compare the pipelayers"), "ready");
  ok(!isAnalysisQuestion("how do I add a run note"), "how-to must not be analysis");
  ok(!isAnalysisQuestion("what does the note on the stake mean"), "meaning question must not be analysis");
});
