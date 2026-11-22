// The whole Ask loop on a plan question, with the model and the database faked at the network:
// plan_find -> plan_read (tile image goes to the model) -> answer citing the sheet.
Deno.env.set("SUPABASE_URL", "http://db.test"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "svc"); Deno.env.set("SUPABASE_ANON_KEY", "anon");
const { askV2 } = await import("../src/ask.ts");
const ok = (c: unknown, m: string) => { if (!c) throw new Error(m); };
Deno.test("plan question: find, read the tile, answer from it", async () => {
  const sent: any[] = []; const rpcs: string[] = [];
  let round = 0;
  const real = globalThis.fetch;
  (globalThis as any).fetch = async (url: string | URL | Request, init?: any) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.includes("api.anthropic.com")) {
      const body = JSON.parse(init.body);
      // the guard / intent calls (tool_choice forced) answer with their own tools
      if (body.tool_choice?.type === "tool") {
        const name = body.tool_choice.name;
        const input = name === "intent" ? { meaning: "What is the outlet invert of sewer manhole 5 on Street A?", search: "SSMH 5 invert out sewer street A", unclear: false, readings: [] } : name === "verdict" ? { hazard_context: false, asks_decision: false } : {};
        return new Response(JSON.stringify({ content: [{ type: "tool_use", id: "g", name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }));
      }
      sent.push(body);
      round++;
      const tu = (name: string, input: unknown) => new Response(JSON.stringify({ content: [{ type: "tool_use", id: "t" + round, name, input }], stop_reason: "tool_use", usage: { input_tokens: 1000, output_tokens: 50 } }));
      if (round === 1) return tu("plan_find", { job: "26014", query: "MH5 invert out" });
      if (round === 2) return tu("plan_read", { job: "26014", page: 5, tiles: ["r1c1"] });
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Sheet 5 (page 5), SSMH #5: INV OUT (W) 1343.64." }], stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 30 } }));
    }
    if (u.startsWith("http://db.test/storage/v1/object/plan-sets/S/p5/r1c1.jpg")) return new Response(new Uint8Array([255, 216, 255, 224]), { headers: { "content-type": "image/jpeg" } });
    if (u.startsWith("http://db.test/")) return new Response("null", { headers: { "content-type": "application/json" } });
    return real(url as any, init);
  };
  try {
    const replay = {
      index: null, intent: true,
      rpc: async (fn: string, args: any) => {
        rpcs.push(fn);
        if (fn === "pb_ai_scope") return { data: { ok: true, level: "office", company: "Eval", today: "2026-11-10", cols: ["job"], jobs: [["26014", "x", "Wildomar, CA", null, null, null, false]] }, error: null };
        if (fn === "pb_ai_plan_find") return { data: { ok: true, items: [{ page: 5, sheet: "5", kind: "structure", label: "SSMH #5", values: "1343.64 INV (OUT) (W)", tiles: ["r1c1"] }] }, error: null };
        if (fn === "pb_ai_plan_sheet") return { data: { ok: true, set_id: "S", set: "Water & Sewer", page: 5, sheet: "5", grid: { tiles: ["r1c1"] }, read: { items: [] } }, error: null };
        return { data: { ok: false, message: "n/a" }, error: null };
      },
    };
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const admin = createClient("http://db.test", "svc", { auth: { persistSession: false } });
    let out: any = null;
    await askV2({ feature: "teacher", v: 2, question: "whats the ie out of mh5 on a st", ctx: { job: "26014" } }, { key: "sk-ant-x", admin, uid: "eval", token: "", t0: Date.now(), reply: (s: number, j: any) => (out = { s, j }, new Response(null)), replay });
    ok(out && out.s === 200, JSON.stringify(out).slice(0, 400));
    ok(/1343\.64/.test(out.j.text), out.j.text);
    ok(rpcs.includes("pb_ai_plan_find") && rpcs.includes("pb_ai_plan_sheet"), rpcs.join());
    const last = sent[sent.length - 1];
    const tr = last.messages.flatMap((m: any) => Array.isArray(m.content) ? m.content : []).filter((c: any) => c.type === "tool_result");
    ok(tr.some((c: any) => Array.isArray(c.content) && c.content.some((x: any) => x.type === "image")), "tile image reached the model");
    const userMsg = JSON.stringify(sent[0].messages[0]);
    ok(/LIKELY MEANING/.test(userMsg), "intent used");
  } finally { (globalThis as any).fetch = real; }
});

Deno.test("v27: a stake question sends the full stake glossary", async () => {
  const sent: any[] = []; const rpcs: string[] = [];
  let round = 0;
  const real = globalThis.fetch;
  (globalThis as any).fetch = async (url: string | URL | Request, init?: any) => {
    const u = String(url instanceof Request ? url.url : url);
    if (u.includes("api.anthropic.com")) {
      const body = JSON.parse(init.body);
      // the guard / intent calls (tool_choice forced) answer with their own tools
      if (body.tool_choice?.type === "tool") {
        const name = body.tool_choice.name;
        const input = name === "intent" ? { meaning: "What is the outlet invert of sewer manhole 5 on Street A?", search: "SSMH 5 invert out sewer street A", unclear: false, readings: [] } : name === "verdict" ? { hazard_context: false, asks_decision: false } : {};
        return new Response(JSON.stringify({ content: [{ type: "tool_use", id: "g", name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }));
      }
      sent.push(body);
      round++;
      const tu = (name: string, input: unknown) => new Response(JSON.stringify({ content: [{ type: "tool_use", id: "t" + round, name, input }], stop_reason: "tool_use", usage: { input_tokens: 1000, output_tokens: 50 } }));
      if (round === 1) return tu("plan_find", { job: "26014", query: "MH5 invert out" });
      if (round === 2) return tu("plan_read", { job: "26014", page: 5, tiles: ["r1c1"] });
      return new Response(JSON.stringify({ content: [{ type: "text", text: "Sheet 5 (page 5), SSMH #5: INV OUT (W) 1343.64." }], stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 30 } }));
    }
    if (u.startsWith("http://db.test/storage/v1/object/plan-sets/S/p5/r1c1.jpg")) return new Response(new Uint8Array([255, 216, 255, 224]), { headers: { "content-type": "image/jpeg" } });
    if (u.startsWith("http://db.test/")) return new Response("null", { headers: { "content-type": "application/json" } });
    return real(url as any, init);
  };
  try {
    const replay = {
      index: null, intent: true,
      rpc: async (fn: string, args: any) => {
        rpcs.push(fn);
        if (fn === "pb_ai_scope") return { data: { ok: true, level: "office", company: "Eval", today: "2026-11-10", cols: ["job"], jobs: [["26014", "x", "Wildomar, CA", null, null, null, false]] }, error: null };
        if (fn === "pb_ai_plan_find") return { data: { ok: true, items: [{ page: 5, sheet: "5", kind: "structure", label: "SSMH #5", values: "1343.64 INV (OUT) (W)", tiles: ["r1c1"] }] }, error: null };
        if (fn === "pb_ai_plan_sheet") return { data: { ok: true, set_id: "S", set: "Water & Sewer", page: 5, sheet: "5", grid: { tiles: ["r1c1"] }, read: { items: [] } }, error: null };
        return { data: { ok: false, message: "n/a" }, error: null };
      },
    };
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const admin = createClient("http://db.test", "svc", { auth: { persistSession: false } });
    let out: any = null;
    await askV2({ feature: "teacher", v: 2, question: "what does TBC mean on a stake", ctx: { job: "26014" } }, { key: "sk-ant-x", admin, uid: "eval", token: "", t0: Date.now(), reply: (s: number, j: any) => (out = { s, j }, new Response(null)), replay });
    ok(out && out.s === 200, JSON.stringify(out).slice(0, 400));
    ok(/STAKE, LATH, HUB AND PAINT REFERENCE/.test(JSON.stringify(sent[0].messages[0])), "glossary sent");
  } finally { (globalThis as any).fetch = real; }
});
