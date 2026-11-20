import { createClient } from "jsr:@supabase/supabase-js@2";
import { CUTSHEET_SYSTEM, STAKE_SYSTEM, TEACHER_SYSTEM, TICKET_SYSTEM } from "./prompts_v1.ts";
import { localAnswer, v1Question } from "./safety.ts";
import { runGonogoEval } from "./gonogo_eval.ts";
import { runHazardEval } from "./hazard_eval.ts";
import { EvalNotLoaded, runAnswerEval, summarizeAnswers } from "./answer_eval.ts";
import {
  anthropic,
  askV2,
  promptInfo,
  DAILY_LIMIT,
  GATEWAY_SAFE_MS,
  isAnalysisQuestion,
  MODEL,
  routeAnalysis,
} from "./ask.ts";
import { kb, kbLoaded } from "./kb.ts";
import { Out } from "./stream.ts";
import { parseAnswer } from "./answer_parse.ts";
import { feedback, gapsSummary, kbKnown } from "./gaps.ts";
const svcClient = () =>
    createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: !1 },
    }),
  MAX_BODY_BYTES = 15 * 1024 * 1024,
  STAKE_MODEL = Deno.env.get("AI_STAKE_MODEL") || "claude-opus-5-5",
  TICKET_LIMIT = Number(Deno.env.get("AI_TICKET_LIMIT") || "60"),
  FEATURES = {
    cutsheet: {
      maxTokens: 16e3,
      system: CUTSHEET_SYSTEM,
      maxText: 2e3,
      needs: (b) =>
        b?.pdf?.data || b?.image?.data ? null : "Send a cutsheet PDF or a photo of the sheet.",
    },
    stake: {
      maxTokens: 1500,
      system: STAKE_SYSTEM,
      maxText: 2e3,
      needs: (b) => b?.image?.data ? null : "Send a photo of the stake.",
    },
    teacher: {
      maxTokens: 2e3,
      system: TEACHER_SYSTEM,
      maxText: 2e4,
      needs: (b) =>
        String(b?.v === 2 && b?.question || b?.text || "").trim() ? null : "Type a question first.",
    },
    ticket: {
      maxTokens: 2e3,
      system: TICKET_SYSTEM,
      maxText: 500,
      needs: (b) => b?.image?.data ? null : "Take a photo of the ticket first.",
    },
  },
  APP_ORIGIN = "https://app.pipelayersbible.com";
function corsFor(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": o === APP_ORIGIN || o === "https://pipelayersbible.github.io" ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(o)
      ? o
      : APP_ORIGIN,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}
const replyWith = (cors) => (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
Deno.serve(async (req) => {
  try { globalThis.PB_ASK_SLOT = /\/ai-next(\/|$)/.test(new URL(req.url).pathname) ? "next" : "live"; } catch {}
  const t0 = Date.now(), cors = corsFor(req), reply = replyWith(cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "method", message: "Use POST." });
  const key =
    ((Deno.env.get("ANTHROPIC_API_KEY") || "").match(/sk-ant-[A-Za-z0-9_\-]+/) || [""])[0];
  if (!key.startsWith("sk-ant-")) {
    return reply(503, { error: "not_configured", message: "The AI isn’t set up yet." });
  }
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""),
    admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: !1 },
    }),
    svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    apiKeyHdr = req.headers.get("apikey") || "";
  { // v28: quality runs, only with the eval token (an edge secret), only the eval_live action
    const evHdr = req.headers.get("x-pb-eval") || "";
    let evOk = !1;
    if (evHdr.length >= 32 && evHdr.length <= 128) {
      const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(evHdr)))).map((x) => x.toString(16).padStart(2, "0")).join("");
      try {
        const { data } = await admin.rpc("pb_ai_eval_token_ok", { p_hash: h });
        evOk = data === !0;
      } catch { evOk = !1; }
    }
    if (evOk) {
      let b = null;
      try { b = JSON.parse(await req.text()); } catch {}
      return b?.action === "eval_live" ? reply(200, await evalLive(b, key)) : reply(400, { error: "bad_request" });
    }
  }
  if (svcKey && (sameText(token, svcKey) || sameText(apiKeyHdr, svcKey))) {
    let b = null;
    try {
      b = JSON.parse(await req.text());
    } catch {}
    const ev = await adminAction(b, key);
    return ev ? reply(ev.status || 200, ev) : reply(400, {
      error: "bad_request",
      message: "Only the eval actions take the service key.",
    });
  }
  const whoP = Promise.resolve(admin.auth.getUser(token)).then(
      ({ data, error }) => error || !data?.user ? "" : String(data.user.id),
      () => "",
    ),
    raw = await req.text();
  let body = null, bad = null;
  if (raw.length > MAX_BODY_BYTES) {
    bad = [413, {
      error: "too_big",
      message: "That file is too large. Try a smaller photo or fewer pages.",
    }];
  } else {try {
      body = JSON.parse(raw);
    } catch {
      bad = [400, { error: "bad_request", message: "Bad request." }];
    }}
  const v2 = (Deno.env.get("AI_V2_ENABLED") || "off").toLowerCase(),
    runV2 = async (uid2, auth) => {
      if (body.stream !== !0) {
        return await askV2(body, { key, admin, uid: uid2, token, t0, reply, auth });
      }
      const out = new Out(cors);
      return askV2(body, { key, admin, uid: uid2, token, t0, reply: out.reply, out, auth }).catch(
        (e) => {
          console.log(JSON.stringify({ ai: "ask2", crash: String(e).slice(0, 160) })),
            out.reply(500, {
              error: "ai_failed",
              message: "The AI couldn’t answer that. Try again.",
            });
        },
      ),
        await out.promise;
    },
    sub = jwtSub(token);
  if (
    !bad && sub && body?.feature === "teacher" && body?.v === 2 && kb(admin).catch(() => null),
      !bad && sub && v2 === "on" && body?.feature === "teacher" && body?.v === 2 &&
      !FEATURES.teacher.needs(body)
  ) return await runV2(sub, whoP.then((id) => !!id && id === sub));
  const uid = await whoP;
  if (!uid) return reply(401, { error: "signed_out", message: "Log in to use the AI features." });
  if (bad) return reply(bad[0], bad[1]);
  if (body?.action === "feedback") {
    const [st, b] = await feedback(body, uid, admin, kbKnown(kbLoaded()));
    return reply(st, b);
  }
  if (
    ["eval_gonogo", "eval_hazard", "eval_answers", "eval_answers_summary", "gaps_summary"].includes(
      body?.action,
    )
  ) {
    if (!await isSupportAdmin(token)) {
      return reply(403, { error: "forbidden", message: "Admins only." });
    }
    const ev = await adminAction(body, key);
    return reply(ev.status || 200, ev);
  }
  const feat = FEATURES[body?.feature];
  if (!feat) return reply(400, { error: "bad_feature", message: "Unknown AI feature." });
  const missing = feat.needs(body);
  if (missing) return reply(400, { error: "empty", message: missing });
  if (
    body.image?.data &&
    !/^image\/(jpeg|png|webp|gif)$/.test(String(body.image.mediaType || "image/jpeg"))
  ) return reply(400, { error: "bad_image", message: "Use a JPG or PNG photo." });
  if (body.feature === "teacher" && body.v === 2) {
    return v2 !== "on" && !(v2 === "admins" && await isSupportAdmin(token))
      ? reply(503, {
        error: "ask_v2_off",
        message: "The new Ask isn’t switched on yet. Update the app or try again later.",
      })
      : await runV2(uid);
  }
  if (body.feature === "teacher") {
    const local = localAnswer(v1Question(body.text));
    if (local) {
      return reply(200, {
        ok: !0,
        text: `TYPE: safety
` + local.text + `
SOURCES: none`,
        stopReason: "local",
        truncated: !1,
      });
    }
  }
  const { data: paid, error: planErr } = await admin.rpc("ai_has_paid_plan", { p_user: uid });
  if (planErr) {
    return reply(503, {
      error: "plan_check_failed",
      message: "Couldn’t check your plan. Try again.",
    });
  }
  if (!paid) {
    return reply(403, { error: "plan", message: "AI features are part of the paid plans." });
  }
  let LIMIT = TICKET_LIMIT;
  if (body.feature !== "ticket") {
    const { data: planLimit, error: plErr } = await admin.rpc("ai_daily_limit", { p_user: uid });
    if (plErr) {
      return reply(503, {
        error: "limit_check_failed",
        message: "Couldn’t check your daily AI limit. Try again.",
      });
    }
    LIMIT = Math.min(Number(planLimit) || 0, DAILY_LIMIT);
  }
  { // Nov 16: beta accounts have their own limit per feature
    const { data: fl } = await admin.rpc("ai_feature_limit", { p_user: uid, p_feature: body.feature });
    if (fl !== null && fl !== void 0) LIMIT = Number(fl) || 0;
  }
  if (LIMIT <= 0) {
    return reply(403, { error: "plan", message: "AI features are part of the paid plans." });
  }
  const { data: used, error: limErr } = await admin.rpc("ai_try_consume", {
    p_user: uid,
    p_feature: body.feature,
    p_limit: LIMIT,
  });
  if (limErr) {
    return reply(503, {
      error: "limit_check_failed",
      message: "Couldn’t check your daily AI limit. Try again.",
    });
  }
  if (used === -1) {
    return reply(429, {
      error: "daily_limit",
      message: body.feature === "ticket"
        ? "You’ve used today’s " + LIMIT +
          " ticket readings. Type the ticket in, or try again tomorrow."
        : "You’ve used today’s " + LIMIT + " AI requests. It resets tomorrow.",
      limit: LIMIT,
    });
  }
  let refund = !0;
  try {
    const content = [];
    body.pdf?.data &&
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: String(body.pdf.data) },
    }),
      body.image?.data &&
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: String(body.image.mediaType || "image/jpeg"),
          data: String(body.image.data),
        },
      });
    // v28: a stake photo can come with full-detail quarters and an upside-down copy, so small and upside-down writing reads right
    if (body.feature === "stake" && Array.isArray(body.images)) {
      const Z = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right" };
      for (const x of body.images.slice(0, 11)) {
        if (!x || typeof x.data != "string" || x.data.length < 100 || x.data.length > 2e6 || !/^image\/(jpeg|png|webp)$/.test(String(x.mediaType || "image/jpeg"))) continue;
        const which = x.side === "back" ? "back" : "front";
        content.push({ type: "text", text: x.side === "back" && !x.zoom ? "PHOTO OF THE BACK of the same stake (the stake number and hub elevation are often written here):" : x.zoom === "rot" ? `The ${which} photo turned upside down (writing painted on the ground or a stake can face the other way; read it here too and use whichever way reads right):` : Z[x.zoom] ? `The ${which} photo zoomed in, its ${Z[x.zoom]} part at full detail (read small handwriting and digits here):` : "Another view of the same stake:" });
        content.push({ type: "image", source: { type: "base64", media_type: String(x.mediaType || "image/jpeg"), data: x.data } });
      }
    }
    const text = String(body.text || "").slice(0, feat.maxText);
    if (
      text ? content.push({ type: "text", text }) : body.feature === "cutsheet"
        ? content.push({
          type: "text",
          text: "Read every row of this cutsheet in the required format.",
        })
        : body.feature === "stake"
        ? content.push({ type: "text", text: "Read this stake. Reply with the JSON object only." })
        : body.feature === "ticket" &&
          content.push({
            type: "text",
            text: "Read this ticket. Reply with the JSON object only.",
          }), !content.length
    ) return reply(400, { error: "empty", message: "Nothing to send." });
    let r, j;
    try {
      ({ r, j } = await anthropic(
        key,
        {
          model: body.feature === "stake" ? STAKE_MODEL : MODEL,
          max_tokens: feat.maxTokens,
          system: feat.system,
          messages: [{ role: "user", content }],
        },
        t0 + GATEWAY_SAFE_MS,
        11e4,
      ));
    } catch {
      return reply(504, {
        error: "ai_timeout",
        message: "The AI took too long. Check your signal and try again.",
      });
    }
    if (!r.ok || !j) {
      const busy = r.status === 429 || r.status === 529 || r.status >= 500;
      return reply(502, {
        error: busy ? "ai_busy" : "ai_failed",
        message: busy
          ? "The AI is busy. Try again in a minute."
          : "The AI couldn’t read that. Try again.",
        detail: j?.error?.type || r.status,
      });
    }
    const answer = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join(`
`);
    { // Nov 16: real cost per person and feature (stake reads use Opus; the rest MODEL)
      const pr = { "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [.1, .5] }[body.feature === "stake" ? STAKE_MODEL : MODEL] || [4, 20];
      const usd = ((j.usage?.input_tokens || 0) * pr[0] + (j.usage?.output_tokens || 0) * pr[1]) / 1e6;
      await admin.rpc("ai_cost_add", { p_user: uid, p_feature: body.feature, p_usd: Math.round(usd * 1e6) / 1e6 }).catch?.(() => null);
    }
    return console.log(
      JSON.stringify({
        ai: body.feature,
        stop: j.stop_reason,
        blocks: (j.content || []).map((c) => c.type),
        chars: answer.length,
        in_tok: j.usage?.input_tokens,
        out_tok: j.usage?.output_tokens,
      }),
    ),
      answer.trim()
        ? (refund = !1,
          reply(200, {
            ok: !0,
            text: answer,
            stopReason: j.stop_reason,
            truncated: j.stop_reason === "max_tokens",
            used,
            limit: LIMIT,
          }))
        : reply(502, {
          error: "ai_empty",
          message: j.stop_reason === "refusal"
            ? "The AI wouldn’t read this file."
            : "The AI sent nothing back. Try again.",
          detail: j.stop_reason,
        });
  } finally {
    refund &&
      await admin.rpc("ai_refund", { p_user: uid, p_feature: body.feature }).catch?.(() => null);
  }
});
function jwtSub(t) {
  try {
    const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof p.sub == "string" && /^[0-9a-f-]{36}$/i.test(p.sub) && p.role === "authenticated"
      ? p.sub
      : "";
  } catch {
    return "";
  }
}
function sameText(a, b) {
  if (a.length !== b.length) return !1;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function isSupportAdmin(token) {
  try {
    const c = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
        auth: { persistSession: !1 },
        global: { headers: { Authorization: "Bearer " + token } },
      }),
      { data, error } = await c.rpc("pb_support_is_admin", {});
    return !error && data === !0;
  } catch {
    return !1;
  }
}
const evalFetch = () => globalThis.__pbGuardFetch || fetch;
// v25 plans: one answer-key question through the real Ask, as the company's office, on the real uploaded plan sets
async function evalPlanQuestion(b, key) {
  const admin = svcClient(), company = String(b.company_id || ""), job = String(b.job || "").slice(0, 60), question = String(b.question || "").slice(0, 1500);
  if (!/^[0-9a-f-]{36}$/.test(company) || !job || !question) return { ok: !1, status: 400, error: "bad_case" };
  const index = await kb(admin).catch(() => null), calls = [];
  const replay = {
    index,
    intent: !0,
    admin,
    rpc: async (fn, args) => {
      calls.push(fn);
      if (fn === "pb_ai_scope") return { data: { ok: !0, level: "office", company: "Eval", today: new Date().toISOString().slice(0, 10), cols: ["job", "name", "city_state", "start", "end", "last_activity", "closed"], jobs: [[job, "Plan accuracy run", "Wildomar, CA", null, null, null, !1]] }, error: null };
      if (fn === "pb_docs_search") return { data: { ok: !0, rows: [] }, error: null };
      if (/^pb_ai_plan_/.test(fn)) { const r = await admin.rpc("pb_plans_svc_ai", { p_fn: fn, p_company: company, p_args: args }); return { data: r.data, error: r.error }; }
      return { data: { ok: !1, code: "pb:not_available", message: "Not available in the accuracy run." }, error: null };
    },
  };
  const t0 = Date.now();
  let out = { status: 0, json: null };
  const capture = (status, j) => (out = { status, json: j }, new Response(null, { status: 204 }));
  await askV2({ feature: "teacher", v: 2, question, ctx: { job } }, { key, admin, uid: "eval", token: "", t0, reply: capture, replay });
  return { ok: !0, status: out.status, text: String(out.json?.text || out.json?.message || ""), usd: Number(out.json?._diag?.usd || 0), ms: Date.now() - t0, calls };
}
// v28 quality runs: real questions through the real Ask (live library, real models), as an office user on a job in the
// given city and state; no company data, no documents. Up to 12 cases a call, 4 at a time.
async function evalLive(b, key) {
  const admin = svcClient(), index = await kb(admin).catch(() => null);
  const cases = (Array.isArray(b?.cases) ? b.cases : []).slice(0, 12);
  const one = async (c) => {
    const question = String(c?.q || "").slice(0, 1500), job = "EVAL-1", where = c?.where === "none" ? "" : String(c?.where || "Wildomar, CA").slice(0, 60);
    if (!question && c?.feature !== "stake") return { id: c?.id, status: 400, text: "" };
    const replay = {
      index, intent: !0, admin,
      rpc: async (fn) => {
        if (fn === "pb_ai_scope") return { data: { ok: !0, level: c?.level === "pipelayer" ? "pipelayer" : "office", company: "Eval", today: new Date().toISOString().slice(0, 10), cols: ["job", "name", "city_state", "start", "end", "last_activity", "closed"], jobs: [[job, "Quality run", where, null, null, null, !1]] }, error: null };
        if (fn === "pb_docs_search") return { data: { ok: !0, rows: [] }, error: null };
        return { data: { ok: !1, code: "pb:not_available", message: "Not available in the quality run." }, error: null };
      },
    };
    // photos for quality runs are stored sealed in pb_ai.eval_images; they're opened here, never sent anywhere but the model
    let images = Array.isArray(c?.images) ? c.images.slice(0, 2) : undefined;
    if (Array.isArray(c?.image_ids) && c.image_ids.length) {
      try {
        const { data } = await admin.rpc("pb_ai_eval_images", { p_ids: c.image_ids.slice(0, 6).map((x) => String(x).split("@")[0]) });
        const b64d = (x) => Uint8Array.from(atob(x), (ch) => ch.charCodeAt(0));
        images = [];
        const want = c.image_ids.slice(0, 6).map(String);
        for (const r of Array.isArray(data) ? data : []) {
          const raw = b64d(r.blob), k = await crypto.subtle.importKey("raw", b64d(r.key), "AES-GCM", !1, ["decrypt"]);
          const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, k, raw.slice(12)));
          let bin = "";
          for (let i = 0; i < pt.length; i += 32768) bin += String.fromCharCode(...pt.subarray(i, i + 32768));
          const z = (want.find((w) => w.split("@")[0] === r.id) || "").split("@")[1];
          images.push(z === "back" ? { media_type: r.media_type || "image/jpeg", data: btoa(bin), side: "back" } : z === "backrot" ? { media_type: r.media_type || "image/jpeg", data: btoa(bin), side: "back", zoom: "rot" } : z ? { media_type: r.media_type || "image/jpeg", data: btoa(bin), zoom: z, of: 0, detail: !0 } : { media_type: r.media_type || "image/jpeg", data: btoa(bin) });
        }
      } catch (e) { return { id: c?.id, status: 500, text: "photo load failed: " + String(e).slice(0, 160) }; }
    }
    if (c?.feature === "stake") {
      // the stake-photo reader (fills a run point), exactly as the app calls it, with an optional model for comparing
      const Z = { tl: "top-left", tr: "top-right", bl: "bottom-left", br: "bottom-right" }, t1 = Date.now(), content = [];
      (images || []).slice(0, 6).forEach((im, i) => {
        const which = im.side === "back" ? "back" : "front";
        i && content.push({ type: "text", text: im.side === "back" && !im.zoom ? "PHOTO OF THE BACK of the same stake (the stake number and hub elevation are often written here):" : im.zoom === "rot" ? `The ${which} photo turned upside down (writing painted on the ground or a stake can face the other way; read it here too and use whichever way reads right):` : Z[im.zoom] ? `The ${which} photo zoomed in, its ${Z[im.zoom]} part at full detail (read small handwriting and digits here):` : "Another view of the same stake:" });
        content.push({ type: "image", source: { type: "base64", media_type: im.media_type, data: im.data } });
      });
      if (!content.length) return { id: c?.id, status: 400, text: "no photo" };
      content.push({ type: "text", text: String(c?.q || "").trim() || "Read this stake. Reply with the JSON object only." });
      try {
        const { r, j } = await anthropic(key, { model: /^claude-[a-z0-9-]+$/.test(String(c?.model || "")) ? c.model : STAKE_MODEL, max_tokens: 1500, system: STAKE_SYSTEM, messages: [{ role: "user", content }] }, Date.now() + 9e4, 9e4);
        const text = (j?.content || []).filter((x) => x.type === "text").map((x) => x.text).join("\n");
        return { id: c?.id, status: r?.status || 0, text, local: !1, mode: "stake", ms: Date.now() - t1, usd: 0 };
      } catch (e) { return { id: c?.id, status: 504, text: String(e).slice(0, 160) }; }
    }
    const t0 = Date.now();
    let out = { status: 0, json: null };
    const capture = (status, j) => (out = { status, json: j }, new Response(null, { status: 204 }));
    try {
      await askV2({ feature: "teacher", v: 2, question, ctx: { job }, images, history: Array.isArray(c?.history) ? c.history.slice(0, 4) : undefined }, { key, admin, uid: "eval", token: "", t0, reply: capture, replay });
    } catch (e) { return { id: c?.id, status: 500, text: "crash: " + String(e).slice(0, 200) }; }
    const j = out.json || {};
    return { id: c?.id, status: out.status, text: String(j.text || j.message || ""), local: !!j.local, mode: j.mode, guard: j._diag?.guard, usd: Number(j._diag?.usd || 0), ms: Date.now() - t0, diag: { rounds: j._diag?.rounds, calc: j._diag?.calc, calc_err: j._diag?.calc_err, nudged: j._diag?.nudged, web: j._diag?.web, stop: j._diag?.stop, regen: j._diag?.regen } };
  };
  const res = [];
  for (let i = 0; i < cases.length; i += 3) res.push(...await Promise.all(cases.slice(i, i + 3).map(one)));
  return { ok: !0, prompt: promptInfo(), results: res };
}
async function adminAction(b, key) {
  if (b?.action === "eval_plans") return await evalPlanQuestion(b, key);
  if (b?.action === "eval_gonogo") {
    return { ok: !0, ...await runGonogoEval(key, evalFetch(), Number(b.limit) || 0) };
  }
  if (b?.action === "eval_hazard") {
    return { ok: !0, ...await runHazardEval(key, evalFetch(), Number(b.limit) || 0) };
  }
  if (b?.action === "eval_answers") {
    try {
      return {
        ok: !0,
        ...await runAnswerEval(key, askReplay(key), evalFetch(), {
          from: Number(b.from) || 0,
          n: Number(b.n) || 10,
          split: String(b.split || "all"),
          grade: b.grade !== !1,
          admin: svcClient(),
        }),
      };
    } catch (e) {
      return e instanceof EvalNotLoaded
        ? {
          ok: !1,
          status: 503,
          error: "eval_cases_not_loaded",
          message:
            "The answer-check cases are not loaded. Apply sql/95_eval_cases_table.sql and the sql/95_eval_load_*.sql files (DEPLOY.md), then run it again.",
          detail: e.message,
        }
        : {
          ok: !1,
          status: 503,
          error: "eval_cases_unavailable",
          message: "Couldn’t read the answer-check cases. Try again.",
          detail: String(e.message || e).slice(0, 160),
        };
    }
  }
  return b?.action === "gaps_summary"
    ? { ...await gapsSummary(svcClient(), Number(b.days) || 30) }
    : b?.action === "eval_answers_summary"
    ? { ok: !0, ...summarizeAnswers(Array.isArray(b.results) ? b.results.slice(0, 500) : []) }
    : null;
}
const askReplay = (key) => async (body, replay) => {
  let out = { status: 0, json: null };
  const capture = (status, b) => (out = { status, json: b }, new Response(null, { status: 204 }));
  return await askV2(body, {
    key,
    admin: null,
    uid: "replay",
    token: "",
    t0: Date.now(),
    reply: capture,
    replay,
  }),
    out;
};
export { askV2, isAnalysisQuestion, parseAnswer, routeAnalysis };
