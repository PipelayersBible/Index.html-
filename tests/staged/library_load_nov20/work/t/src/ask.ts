import { STAKE_GLOSSARY as STAKE_GLOSSARY_BUILTIN } from "./glossary.ts";
// v28: pb_ai.prompt_overrides (service role) can replace the system prompt or the reading glossary; cached 60 s
let TEACHER_V2_SYSTEM = TEACHER_V2_BUILTIN, STAKE_GLOSSARY = STAKE_GLOSSARY_BUILTIN, PROMPT_AT = 0;
async function loadPromptOverrides(admin) {
  if (!admin || Date.now() - PROMPT_AT < 6e4) return;
  PROMPT_AT = Date.now();
  try {
    const { data, error } = await Promise.race([admin.rpc("pb_ai_prompt_overrides", {}), new Promise((r) => setTimeout(() => r({ data: null, error: "timeout" }), 1500))]);
    if (error || !Array.isArray(data)) return;
    const m = Object.fromEntries(data.filter((x) => x && typeof x.text == "string" && x.text.length > 20).map((x) => [x.name, x.text]));
    // the test function (ai-next) uses "name@next" rows first, so prompt changes can be tried before they go live
    const pick = (n) => (globalThis.PB_ASK_SLOT === "next" && m[n + "@next"]) || m[n];
    TEACHER_V2_SYSTEM = applyOverride(TEACHER_V2_BUILTIN, pick("teacher_v2"));
    STAKE_GLOSSARY = applyOverride(STAKE_GLOSSARY_BUILTIN, pick("stake_glossary"));
    // library_load: the prompt row's EDITS list may also carry {"reply_rule": "<text>"} and {"knobs": {"exChars": 9000, "verbatimMax": 1800}}
    // (the table only allows the two prompt names, so these ride in the same row; applyOverride ignores them)
    globalThis.__pbReply = null, globalThis.__pbKnobs = {};
    try {
      const row = pick("teacher_v2");
      if (typeof row == "string" && row.startsWith("EDITS")) for (const e of JSON.parse(row.slice(5))) {
        if (e && typeof e.reply_rule == "string" && e.reply_rule.length > 20) globalThis.__pbReply = e.reply_rule;
        if (e && e.knobs && typeof e.knobs == "object") globalThis.__pbKnobs = e.knobs;
      }
    } catch {}
  } catch (_e) {}
}
// an override is either the whole text (over 200 characters) or "EDITS" + a JSON list of {old, new} replacements on the built-in text
export function applyOverride(base, o) {
  if (typeof o != "string") return base;
  if (o.startsWith("EDITS")) {
    let t = base;
    try {
      for (const e of JSON.parse(o.slice(5))) {
        if (e && typeof e.old == "string" && typeof e.new == "string" && e.old && t.split(e.old).length === 2) t = t.replace(e.old, () => e.new);
        else if (e && typeof e.append == "string") t += "\n" + e.append;
      }
    } catch { return base; }
    return t;
  }
  return o.length > 200 ? o : base;
}
export { loadPromptOverrides };
export const promptInfo = () => ({ build: typeof PB_BUILD === "string" ? PB_BUILD : "", slot: globalThis.PB_ASK_SLOT || "", teacher: TEACHER_V2_SYSTEM.length, glossary: STAKE_GLOSSARY.length });
import { createClient } from "jsr:@supabase/supabase-js@2";
import { localAnswer } from "./safety.ts";
import {
  contextVerdict,
  earlierBlock,
  guardAnswer,
  hazardContext,
  preFilter,
  QUESTION_CHECKS_PER_DAY,
  questionVerdict,
} from "./gonogo.ts";
import {
  areaWords,
  excerptBlock,
  mergeExcerpts,
  queryGroups,
  search,
} from "./_shared/retrieval.ts";
import { gapStep, later, namesOwnJob, REFUSAL_RX } from "./gaps.ts";
import { addressState, okState, resolveState, stateLines, stateSearch } from "./state.ts";
import { SHELF_FIRST, shelfPick, shelfSearch, withShelf } from "./shelf.ts";
const REPLY_RULE = "REPLY FOR THIS ONE (firm; count before you send): Line 1 is ONE sentence and IS the answer: the number with its unit, the yes or no, or the first step; for their state when an excerpt gives that state's rule (lead with the job state's own rule when an excerpt gives it). On trench protection, trench boxes and shields, sloping, shoring and confined space, line 1 says what the rule requires (\"OSHA requires ...\"), never that their box, slope, shoring, space or readings are fine, enough, adequate or not needed. Then at most 2 \"- \" lines, each one sentence of 15 words or fewer, only what they must know to act (the main condition or exception). Then stop: 45 words at most before the closing lines (the safety line and an offer). No quotes, no background, no second topic, no line about what the library lacks unless that IS the answer. Give the rule's section number once, in parentheses. If the number or rule you are giving is itself marked not confirmed in the excerpt, say \"not confirmed\" and who to ask; that line is required. Do not add a line about some other thing that is not confirmed (such as which manual edition their state is on) unless they asked about it. A how-to, an emergency, or a \"what does X have to do\" list question: up to 6 numbered steps, one short sentence each, 110 words at most.\nSAFETY LINE: on ANY safety-related answer (trenching, sloping, shoring, confined space, air testing, traffic control and flaggers, digging near utilities and locate marks, lifting and rigging, fall protection, silica and respirators, PPE, power lines and electrical, lockout, heat, equipment and struck-by hazards), the last \"- \" line is exactly \"- Your competent person decides on site.\" Not on an emergency (there the steps end with calling 911), and not on 811 ticket timing, reporting deadlines, paperwork, specs, pipe math or the app.\nOFFER: a COMPLICATED topic cannot be covered in a brief answer: multi-step procedures, choosing a slope, bench, shoring or shield, permit steps, traffic setups (tapers, sign spacing, lane or sidewalk closures), or anything whose full answer is a table, several cases or a list of 6 or more items. There, answer their case or the most common case (say which), then end with exactly one offer line of 12 words or fewer, after the safety line: \"Want the rest: <the specific part left out>?\" Never leave a life-safety limit or a required step for the offer. No offer on a question about one number, one distance, one time limit or one yes or no, even if more could be said. Never add any other question, except \"Which state is the job in?\" when the JOB STATE line calls for it.\nFOLLOW-UP: when this message only says yes, more, go on, sure, keep going or the like, and EARLIER IN THIS CONVERSATION ends with your offer, give the part you offered now: pick up where the last answer stopped, do not repeat what it already said, do not start over. Here the 55-word limit does not apply: up to 200 words or 10 numbered steps, continuing the numbering if the last answer had steps. End with the safety line if it is a safety topic, and offer once more only if a part is still left.";
const pbTrimHits = (hits) => { const v = Number((globalThis.__pbKnobs || {}).verbatimMax) || 0; return v ? hits.map((h) => (h.verbatim && h.text.length > v ? { ...h, text: h.text.slice(0, v) + " \u2026" } : h)) : hits; };
globalThis.__PLAIN_MIN = Number(Deno.env.get("AI_ASK_PLAIN_MIN") || 2); // optional: plain-language chunks beside OSHA text (0 = off)
import { docHeader, docSource, docTitle, runTool, toolsFor } from "./tools.ts";
import { cleanUntrusted, docBlock } from "./guard.ts";
import { routeAnalysis } from "./route.ts";
import { isPlanQuestion, PHOTO_TOKENS, photoBlocks, readPhotos } from "./photos.ts";
import { flagLine, verifyNote, verifyNumbers } from "./verify.ts";
import { TEACHER_V2_SYSTEM as TEACHER_V2_BUILTIN } from "./prompts_v2.ts";
import { parseAnswer } from "./answer_parse.ts";
import { kb, kbLoaded, kbVersion } from "./kb.ts";
import { keptShown, readAnthropic, Releaser, STREAM_NOTE } from "./stream.ts";
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT") || "20"),
  MODEL = Deno.env.get("AI_MODEL") || "claude-sonnet-5-5",
  ASK_MODEL = Deno.env.get("AI_ASK_MODEL") || MODEL,
  PLAN_MODEL = Deno.env.get("AI_PLAN_MODEL") || "claude-opus-5-5",
  PHOTO_STRONG = (Deno.env.get("AI_PHOTO_STRONG") || "on") !== "off",
  PLAN_STRONG_PER_DAY = Number(Deno.env.get("AI_PLAN_STRONG_PER_DAY") || "3"),
  PLAN_EFFORT = Deno.env.get("AI_PLAN_EFFORT") || "high",
  ANALYSIS_LIMIT = Number(Deno.env.get("AI_ANALYSIS_LIMIT") || "15"),
  CODE_EXEC = (Deno.env.get("AI_CODE_EXEC") || "off") === "on",
  WEB_SEARCH = (Deno.env.get("AI_WEB_SEARCH") || "on") !== "off",
  GATEWAY_SAFE_MS = 14e4,
  FINAL_RESERVE_MS = 3e4,
  TOOL_BATCH_MS = 1e4,
  LIMITS = {
    ask_field: {
      rounds: 5,
      toolCalls: 6,
      maxOut: 1500,
      usdCap: .25, // v28: was .08, which cut the tools off before the first call on a cold cache
      deadlineMs: 8e4,
      resultChars: 6e3,
    },
    ask_office: {
      rounds: 6,
      toolCalls: 8,
      maxOut: 2e3,
      usdCap: .3, // v28: was .12
      deadlineMs: 9e4,
      resultChars: 9e3,
    },
    analysis: {
      rounds: 10,
      toolCalls: 20,
      maxOut: 3e3,
      usdCap: .35,
      deadlineMs: 125e3,
      resultChars: 14e3,
    },
    plans: {
      rounds: 4,
      toolCalls: 4,
      maxOut: 16e3,
      usdCap: .6,
      deadlineMs: 125e3,
      resultChars: 6e3,
    },
    plan_lookup: {
      rounds: 7,
      toolCalls: 10,
      maxOut: 2e3,
      usdCap: .35,
      deadlineMs: 11e4,
      resultChars: 9e3,
    },
    plans_strong: {
      rounds: 4,
      toolCalls: 4,
      maxOut: 16e3,
      usdCap: 1,
      deadlineMs: 125e3,
      resultChars: 6e3,
    },
  },
  CALC_MAX = 12,
  REGEN_CAP_FACTOR = 1.25,
  FINISH_CAP_FACTOR = 1.25,
  ESCALATE_AFTER_CALLS = 3,
  INCOMPLETE = { error: "ai_incomplete", message: "Couldn’t finish looking that up. Try again." },
  PRICE = {
    "claude-sonnet-5-5": { in: 2, out: 10, cw: 2.5, cw1h: 4, cr: .1 },
    "claude-haiku-5-5": { in: .1, out: .5, cw: .125, cw1h: .2, cr: .01 },
    "claude-opus-5-5": { in: 4, out: 20, cw: 5, cw1h: 8, cr: .2 },
  },
  CACHE_1H = (Deno.env.get("AI_CACHE_TTL") || "1h") !== "5m",
  CC = CACHE_1H ? { type: "ephemeral", ttl: "1h" } : { type: "ephemeral" },
  GONOGO_TEXT = localAnswer("can we go in").text,
  go = (p) =>
    Promise.resolve(p).catch((e) => ({ data: null, error: { message: String(e?.message || e) } }));
async function anthropic(key, payload, deadline, capMs = 6e4, onText, stop) {
  const budget = () => Math.min(capMs, deadline - Date.now() - 5e3),
    call = async (noThink) => {
      const ms = budget();
      if (ms < 5e3) throw new Error("deadline");
      const t = AbortSignal.timeout(ms),
        res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify(
            Object.assign(
              {},
              payload,
              onText ? { stream: !0 } : {},
              noThink && !payload.thinking ? { thinking: { type: "between_tools" } } : {},
              !noThink && payload.thinking ? { thinking: void 0, output_config: void 0 } : {},
            ),
          ),
          signal: stop ? AbortSignal.any([t, stop]) : t,
        });
      return onText
        ? await readAnthropic(res, onText)
        : { r: res, j: await res.json().catch(() => null) };
    };
  let { r, j } = await call(!0);
  // v28: the model service is busy (429/529/503): wait a moment and try again, twice, while there's time
  for (let k = 0; k < 2 && r && (r.status === 429 || r.status === 529 || r.status === 503); k++) {
    const ra = Number(r.headers?.get?.("retry-after")) || 0, wait = Math.min(6e3, Math.max(ra * 1e3, k ? 4e3 : 1500));
    if (budget() - wait < 15e3 || stop?.aborted) break;
    await new Promise((ok) => setTimeout(ok, wait));
    ({ r, j } = await call(!0));
  }
  return r.status === 400 &&
    (payload.thinking || /thinking/i.test(JSON.stringify(j?.error || ""))) &&
    ({ r, j } = await call(!1)),
    { r, j };
}
const US_STATES = { AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming" };
const STATE_CUES = { VA: /\b\d+VAC\d/, TX: /\bTCEQ\b|\bTAC\b/, NY: /\bNYCRR\b/, FL: /\bF\.?A\.?C\.?\b/, WA: /\bWAC\b/, OR: /\bOAR\b/ };
// true when the text is about another state's rules only (not the job's state, not one the question names)
export function otherStateOnly(text, jobState, question) {
  const t = String(text || ""), qq = String(question || "");
  const named = (code) => new RegExp(`\\b${US_STATES[code]}\\b`, "i").test(qq) || new RegExp(`\\b${code}\\b`).test(qq);
  if (US_STATES[jobState] && new RegExp(`\\b${US_STATES[jobState]}\\b`, "i").test(t)) return !1;
  if (jobState !== "CA" ? !1 : /\bTen States\b/i.test(t) && !/ten states/i.test(qq)) return !0;
  for (const code of Object.keys(US_STATES)) {
    if (code === jobState) continue;
    const hit = new RegExp(`\\b${US_STATES[code]}\\b`).test(t) || (STATE_CUES[code] && STATE_CUES[code].test(t));
    if (hit && !named(code)) return !0;
  }
  return !1;
}
export const isStall = (t) => {
  t = String(t || "").trim();
  return t.length < 500 && (STALL_RE.test(t) || t.length < 220 && !t.includes("\n") && (/^(next|now|first|then|ok(ay)?|alright|sure)\b/i.test(t) || /:$/.test(t)));
};
export const STALL_RE = /\b(I['\u2019]ll|I will|let me|I am going to|I['\u2019]m going to|going to)\s+(now\s+)?(run|work|calculate|compute|check|figure|do|put|use|plug|pull|look)\b|\bso I['\u2019]ll use\b/i;
import { intentOf } from "./intent.ts";
import { isAnalysisQuestion, routeAnalysis as routeAnalysis2 } from "./route.ts";
async function askV2(body, s) {
  const { reply, t0 } = s,
    R = s.replay,
    out = s.out,
    q = String(body.question || body.text || "").trim().slice(0, 2e3).replace(
      /\bOSHA[\s_\-:]*VERBATIM\b/gi,
      "OSHA",
    ),
    local0 = localAnswer(q),
    local = local0 && local0.kind === "emergency" ? local0 : null, // v28 freedom: only emergencies skip the AI
    localGo = !!local0 && local0.kind === "gonogo",
    signedOut = () =>
      reply(401, { error: "signed_out", message: "Log in to use the AI features." });
  if (local && s.auth && !await s.auth) return signedOut();
  if (local) {
    return reply(200, {
      ok: !0,
      v: 2,
      local: !0,
      kind: local.kind,
      type: "safety",
      safety: !0,
      text: local.text,
      sources: [],
    });
  }
  await loadPromptOverrides(s.admin);
  const ph = readPhotos(body.images);
  if (!ph.ok) return reply(400, ph.error);
  const photos = ph.photos,
    wantsGlossary = photos.length > 0 || /\b(stake|stakes|lath|hub|hubs|survey|surveyor|abbrev\w*|symbol|crowfoot|crow ?foot|offset|o\/s|cut ?sheets?|paint ?marks?|ribbons?|flagging|flags?|whiskers?|control ?points?|benchmark|tbm|centerline|locates?|locator|811|usa ?marks?|dig ?alert|markings?|lids?|manhole ?covers?|pipe ?(?:print|stamp|marking)|sdr ?\d+|dr ?\d+|c900|c905|c151|hydrants?|bonnet|valve ?(?:box|can|lid)|tickets?|batch ?ticket|slump|gauge|chart ?recorder|compaction ?(?:test|report)s?|relative ?compaction)\b/i.test(String(q || "")), // v27: every stake abbreviation and symbol
    pre = preFilter(q),
    streamAsked = !!out && !R && body.stream === !0 &&
      (Deno.env.get("AI_STREAM") || "off").toLowerCase() === "on";
  let stream = !1;
  const hist = (Array.isArray(body.history) ? body.history : []).slice(0, 4).map((h) => ({
      q: cleanUntrusted(h?.q, 500),
      a: cleanUntrusted(h?.a || h?.body, 500),
    })
    ),
    screen = [cleanUntrusted(body.ctx?.label, 60), cleanUntrusted(body.ctx?.screen, 60)].filter(
      Boolean,
    ).join(" / "),
    ctx = hazardContext(q, hist, screen) || photos.length > 0,
    earlier = earlierBlock(hist),
    cls = pre || ctx,
    ctxCheck = streamAsked && !ctx,
    ms = {},
    mark = (k) => {
      ms[k] = Date.now() - t0;
    },
    user = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_ANON_KEY"), {
      auth: { persistSession: !1 },
      global: { headers: { Authorization: "Bearer " + s.token } },
    }),
    userRpc = async (fn, args) => {
      if (R) return R.rpc(fn, args);
      let timer;
      try {
        return await Promise.race([
          user.rpc(fn, args),
          new Promise((res) => {
            timer = setTimeout(() => res({ data: null, error: { message: "timeout" } }), 1e4);
          }),
        ]);
      } catch {
        return { data: null, error: { message: "failed" } };
      } finally {
        clearTimeout(timer);
      }
    },
    gUsage = { usd: 0, calls: 0, failed: 0 },
    guardFetch = globalThis.__pbGuardFetch || fetch,
    planP = R
      ? Promise.resolve({ data: !0, error: null })
      : go(s.admin.rpc("ai_has_paid_plan", { p_user: s.uid })),
    scopeP = userRpc("pb_ai_scope", {}),
    limitP = R ? null : go(s.admin.rpc("ai_daily_limit", { p_user: s.uid })),
    trialP = R ? null : go(s.admin.rpc("ai_feature_limit", { p_user: s.uid, p_feature: "teacher" })), // Nov 16: beta accounts' own Ask limit
    kbP = R ? Promise.resolve(R.index) : kb(s.admin),
    ctxLabel = cleanUntrusted(body.ctx?.label, 60),
    curJob = cleanUntrusted(body.ctx?.job, 60);
  let cityState = "", jobState = null, shelfP = Promise.resolve([]); // ask_shelf: the deep library's excerpts (shelf.ts)
  // ask_state (Nov 20): one answer to "which state is this for", worked out once and used by the first search, the
  // model's own search, the document search and the prompt. See state.ts resolveState for the order.
  let st = resolveState({ question: q });
  const appState = cleanUntrusted(body.ctx?.state, 2).toUpperCase(), appHow = cleanUntrusted(body.ctx?.state_how, 12),
    stateRulesP = Promise.resolve(userRpc("pb_state_rules_get", {})).catch(() => null); // the company's own state and the states picked for its jobs (r17.06)
  const docsSearch = async (text) => {
      const r = await userRpc("pb_docs_search", {
        p_terms: queryGroups(text),
        p_area: [...areaWords(text), ...areaWords(cityState)],
        p_state: jobState,
        p_job: curJob || null,
        p_k: 4,
      });
      return r.error || !r.data?.ok ? [] : r.data.rows || [];
    },
    docsP = scopeP.then((sr) => {
      if (sr?.error || !sr?.data?.ok) return shelfP = shelfSearch(s.admin, q, st.code, { ...SHELF_FIRST, index: kbP }), [];
      const row = (Array.isArray(sr.data.jobs) ? sr.data.jobs : []).find((j) =>
        String(j[0]).toLowerCase() === curJob.toLowerCase()
      );
      cityState = String(row?.[2] || "");
      const n = {};
      for (const j of (Array.isArray(sr.data.jobs) ? sr.data.jobs : [])) { const s2 = addressState(j[2]); if (s2) n[s2] = (n[s2] || 0) + 1; }
      return stateRulesP.then((rr) => {
        const srd = rr && !rr.error && rr.data?.ok === !0 ? rr.data : null,
          picked = srd && curJob && srd.jobs && typeof srd.jobs == "object" ? srd.jobs[curJob.trim().toLowerCase().slice(0, 60)] : null;
        st = resolveState({
          question: q,
          appState,
          appHow,
          addressState: okState(picked) ? picked : addressState(cityState), // the state picked for this job, else its address
          companyState: srd?.company_state,
          earlier: (Array.isArray(body.history) ? body.history : []).slice(0, 8).map((h) => cleanUntrusted(h?.q, 300)),
          majorityState: Object.keys(n).sort((x, y) => n[y] - n[x])[0] || null, // v28: where most of the company's jobs are
        });
        jobState = st.code;
        shelfP = shelfSearch(s.admin, q, st.code, { ...SHELF_FIRST, index: kbP }); // same moment as the document search
        return docsSearch(q);
      });
    }).catch(() => []);
  if (s.auth && !await s.auth) return signedOut();
  const iUsage = { calls: 0, failed: 0, usd: 0 },
    intentP = R && !R.intent ? Promise.resolve(null) : intentOf(s.key, q, earlier, screen, guardFetch, iUsage, t0 + 6e3).catch(() => null);
  const verdictP =
      (cls || ctxCheck
        ? R
          ? Promise.resolve(!0)
          : planP.then(({ data: paidOk, error: pErr }) =>
            pErr || !paidOk ? { data: null, error: { message: "no plan" } } : go(
              s.admin.rpc("ai_try_consume", {
                p_user: s.uid,
                p_feature: "gonogo_q",
                p_limit: QUESTION_CHECKS_PER_DAY,
              }),
            )
          ).then(({ data: n, error: nErr }) => {
            const ok = !nErr && typeof n == "number" && n > 0;
            return ok ||
              console.log(
                JSON.stringify({
                  ai: "ask2",
                  gonogo_q: nErr ? "counter_failed" : "over_daily_cap",
                }),
              ),
              ok;
          })
        : Promise.resolve(!1)).then(async (ok) =>
          ok
            ? ctxCheck
              ? await contextVerdict(
                s.key,
                q,
                guardFetch,
                gUsage,
                t0 + GATEWAY_SAFE_MS,
                earlier,
                screen,
              )
              : {
                asks: await questionVerdict(
                  s.key,
                  q,
                  guardFetch,
                  gUsage,
                  t0 + GATEWAY_SAFE_MS,
                  !pre,
                  earlier,
                ),
                hazard: !0,
              }
            : { asks: null, hazard: ctx ? !0 : null }
        ).catch(() => ({ asks: null, hazard: null })),
    { data: paid, error: planErr } = await planP;
  if (planErr) {
    return reply(503, {
      error: "plan_check_failed",
      message: "Couldn’t check your plan. Try again.",
    });
  }
  if (!paid) {
    return reply(403, { error: "plan", message: "AI features are part of the paid plans." });
  }
  const cv = await verdictP, verdict = cv.asks;
  // v28 (Tommy, Nov 14: a sloping question got only "not an AI question"): a go/no-go question now gets the RULE,
  // explained and quoted, with the site call left to the competent person; the answer guard below still removes
  // any sentence that makes the call.
  const ruleOnly = verdict === !0 || localGo;
  if (stream = ctxCheck && cv.hazard === !1 && cv.asks === !1, ruleOnly) {
    console.log(JSON.stringify({ ai: "ask2", gonogo: "rule_only", usd: Math.round(gUsage.usd * 1e6) / 1e6, ms: Date.now() - t0 }));
  }
  cls && mark("qcheck");
  const scopeRes = await scopeP;
  if (scopeRes.error || !scopeRes.data?.ok) {
    return reply(503, {
      error: "scope_unavailable",
      message: "Ask is unavailable right now. Try again in a minute.",
    });
  }
  const scope = scopeRes.data, level = scope.level || "individual";
  let analysis = level === "office" && routeAnalysis(q, hist.map((h) => h.q));
  const plan = !analysis && isPlanQuestion(photos, [q, ...hist.map((h) => h.q)]);
  let L = analysis
      ? LIMITS.analysis
      : plan
      ? LIMITS.plans
      : level === "office"
      ? LIMITS.ask_office
      : LIMITS.ask_field,
    quotaFeature = analysis ? "analysis" : "teacher";
  const LIMIT_MSG = "You’ve hit today’s limit. It resets tomorrow.";
  let generalLimit = null;
  const generalLimitNow = async () => {
    if (generalLimit !== null) return generalLimit;
    const { data: planLimit, error: plErr } = await limitP;
    if (plErr) return null;
    const { data: trialLimit } = await trialP;
    return generalLimit = trialLimit !== null && trialLimit !== void 0 ? Number(trialLimit) || 0 : Math.min(Number(planLimit) || 0, DAILY_LIMIT);
  };
  let LIMIT = 0, used = 0;
  if (R) LIMIT = 1, used = 0;
  else {
    if (analysis) {
      const { data: u, error: e } = await go(
        s.admin.rpc("ai_try_consume", {
          p_user: s.uid,
          p_feature: "analysis",
          p_limit: ANALYSIS_LIMIT,
        }),
      );
      if (e) {
        return reply(503, {
          error: "limit_check_failed",
          message: "Couldn’t check your daily AI limit. Try again.",
        });
      }
      u === -1
        ? (analysis = !1, L = LIMITS.ask_office, quotaFeature = "teacher")
        : (LIMIT = ANALYSIS_LIMIT, used = u);
    }
    if (!analysis) {
      const gl = await generalLimitNow();
      if (gl === null) {
        return reply(503, {
          error: "limit_check_failed",
          message: "Couldn’t check your daily AI limit. Try again.",
        });
      }
      if (LIMIT = gl, LIMIT <= 0) {
        return reply(403, { error: "plan", message: "AI features are part of the paid plans." });
      }
      const { data: u, error: e } = await go(
        s.admin.rpc("ai_try_consume", { p_user: s.uid, p_feature: "teacher", p_limit: LIMIT }),
      );
      if (e) {
        return reply(503, {
          error: "limit_check_failed",
          message: "Couldn’t check your daily AI limit. Try again.",
        });
      }
      if (u === -1) {
        return reply(429, {
          error: "daily_limit",
          message: LIMIT_MSG,
          limit: LIMIT,
          mode: "teacher",
        });
      }
      used = u;
    }
  }
  let planStrong = !1;
  if (plan && PLAN_STRONG_PER_DAY > 0) {
    if (R) planStrong = !0;
    else {
      const { data: u, error: e } = await go(
        s.admin.rpc("ai_try_consume", {
          p_user: s.uid,
          p_feature: "plans_strong",
          p_limit: PLAN_STRONG_PER_DAY,
        }),
      );
      planStrong = !e && typeof u == "number" && u > 0;
    }
    planStrong && (L = LIMITS.plans_strong);
  }
  const jobs = Array.isArray(scope?.jobs) ? scope.jobs : [];
  mark("quota");
  let escalated = !1;
  const escalate = async () => {
      if (R) return quotaFeature = "analysis", escalated = !0, !0;
      const { data: u, error: e } = await go(
        s.admin.rpc("ai_try_consume", {
          p_user: s.uid,
          p_feature: "analysis",
          p_limit: ANALYSIS_LIMIT,
        }),
      );
      return e || typeof u != "number" || u === -1
        ? !1
        : (await go(s.admin.rpc("ai_refund", { p_user: s.uid, p_feature: "teacher" })),
          quotaFeature = "analysis",
          LIMIT = ANALYSIS_LIMIT,
          used = u,
          escalated = !0,
          !0);
    },
    usage = { in: 0, out: 0, cw: 0, cw1h: 0, cr: 0, calls: 0, rounds: 0, code: 0, web: 0 };
  let delivered = !1, refundAnyway = !1, logged = !1, outcome = "crash", shownChars = 0;
  // v28: a photo question (a stake, a mark, a ticket) uses the stronger model: it reads small handwritten digits better
  const photoStrong = PHOTO_STRONG && photos.length > 0 && !plan && !analysis, strongModel = planStrong || photoStrong;
  const pr = PRICE[strongModel ? PLAN_MODEL : ASK_MODEL] || PRICE["claude-sonnet-5-5"],
    spent = () =>
      (usage.in * pr.in + usage.out * pr.out + (usage.cw - usage.cw1h) * pr.cw +
        usage.cw1h * pr.cw1h + usage.cr * pr.cr) / 1e6 + usage.web * .01,
    fail = (status, b) => (outcome = b.error, reply(status, b)),
    stopCtl = new AbortController();
  let nudgedLog = !1, calcErrLog = 0, calcNLog = 0, intentLog = null, planImagesSeen = !1, planLookup = !1;
  out && (out.onGone = () => stopCtl.abort());
  try {
    let deadline = Math.min(t0 + L.deadlineMs, t0 + GATEWAY_SAFE_MS);
    const index = await kbP;
    mark("kb");
    const intent = await Promise.race([intentP, new Promise((r) => setTimeout(() => r(null), Math.max(0, t0 + 6e3 - Date.now())))]);
    intentLog = intent ? { unclear: intent.unclear, n: intent.readings.length } : null;
    mark("intent");
    const kst = { best: {}, cover: 0, nTyped: 0 },
      docs = await docsP; // also settles the job's state (st)
    mark("docs");
    // ask_state: a chunk's own jurisdiction decides (state.ts). General and federal chunks show in every state; a
    // state's chunks only on that state's job or when the question names the state; the job state's own chunks for
    // this question are added beside the general ones.
    const ss = index
        ? stateSearch(search, index, intent?.search ? q + " " + intent.search : q, {
          k: 6,
          level,
          topicBoost: ctxLabel ? ctxLabel.toLowerCase().split(/\W+/) : [],
          maxChars: 9e3,
          stats: kst,
        }, st, q)
        : { hits: [], dropped: 0, own: 0, dependent: !1 },
      hits = ss.hits;
    usage.stateDropped = ss.dropped, usage.stateOwn = ss.own, usage.stateDep = ss.dependent;
    const phone = (Array.isArray(body.excerpts) ? body.excerpts : []).slice(0, 5).map((x, i) => ({
        n: i + 1,
        article: cleanUntrusted(x?.article, 60),
        anchor: cleanUntrusted(x?.anchor, 80),
        title: cleanUntrusted(x?.title, 160),
        page: cleanUntrusted(x?.page, 80),
        caution: cleanUntrusted(x?.caution, 200),
        text: cleanUntrusted(x?.text, 900),
      })
      ),
      // ask_shelf: the deep library's best excerpts for this job's state (and federal) go after the core ones. They only
      // use the room the core excerpts leave free inside the same 9,000 characters: nothing is pushed out (shelf.ts).
      exCore = mergeExcerpts(phone, pbTrimHits(hits), Number((globalThis.__pbKnobs || {}).exChars) || 1e4),
      shelf = analysis || plan ? [] : shelfPick(await shelfP, hits, exCore, q, index),
      shelfOwn = (usage.shelf = shelf.length, shelf.filter((h) => h.state !== "US").length),
      ex = withShelf(exCore, shelf),
      hitText = new Map([...hits, ...shelf].map((h) => [h.id, h.text])),
      sources = ex.map((x) => ({
        n: x.n,
        kind: x.kind,
        title: x.title,
        article: x.article,
        anchor: x.anchor,
        lib: x.lib,
        source: x.source,
        url: x.url,
        verbatim: x.verbatim,
        id: x.id,
        _text: x.id ? hitText.get(x.id) : x.kind === "app_page" ? x.text : void 0,
      })),
      docBlocks = [];
    for (const d of docs.slice(0, 3)) {
      const n = sources.length + 1;
      sources.push({ ...docSource(n, d), _text: cleanUntrusted(d.text, 1600) }),
        docBlocks.push(docBlock(n, docHeader(d), docTitle(d), d.text));
    }
    let excerptN = sources.length, dataN = 0, toolOk = !1, dataTool = !1;
    const today = scope?.today || new Date().toISOString().slice(0, 10),
      access = level === "individual"
        ? "Individual plan: no company job data (only your own saved runs via my_runs)."
        : `${
          level === "office"
            ? "Office (company / PM / superintendent): the whole company"
            : level === "foreman"
            ? "Foreman: your own production, crew runs, dailies, assigned inspections on your jobs"
            : "Pipelayer: your own runs, production and tickets"
        }${scope?.company ? " at " + cleanUntrusted(scope.company, 120) : ""}.
Jobs you can see (job | name | city/state | start | end | last activity | closed): ` +
          (jobs.slice(0, 25).map((j) => j.map((v) => cleanUntrusted(v ?? "", 80)).join(" | ")).join(
            "; ",
          ) || "none yet"),
      prev = (Array.isArray(body.history) ? body.history : []).slice(0, 8).map((h, k) => ({
        q: h?.q,
        a: h?.a || h?.body,
        max: k < 2 ? 3e3 : 1500,
      })).reverse(),
      run = body.ctx?.run
        ? JSON.stringify(body.ctx.run, (_k, v) => typeof v == "string" ? cleanUntrusted(v, 200) : v)
          .slice(0, 1500)
        : "",
      userText = [
        "QUESTION: " + q,
        ruleOnly ? "THIS ASKS FOR A GO/NO-GO CALL ON THEIR SITE: answer with the RULE, not a verdict. In 2 to 5 short lines: what the standard says for the situation described (quote the OSHA VERBATIM clause or table; give the federal rule and, where an excerpt has it, the job state's own rule), what that rule allows and does not allow for what they described (for example the soil type, depth, vertical lower part and slope), and what is needed to meet it. Never say their trench, space or readings are safe, OK or adequate. End with one line: the competent person checks the soil and decides on site." : "",
        intent?.meaning ? "LIKELY MEANING (a quick read; the question itself wins if they differ): " + cleanUntrusted(intent.meaning, 400) : "",
        intent?.unclear && intent.readings.length ? "OTHER POSSIBLE READINGS: " + intent.readings.map((x) => cleanUntrusted(x, 200)).join(" | ") : "",
        ctxLabel
          ? `ASKED FROM: the app's ${ctxLabel} screens${
            curJob ? ", current job " + curJob : ""
          } (answer the question as asked).`
          : curJob
          ? "CURRENT JOB: " + curJob
          : "",
        analysis || plan ? "" : stateLines(st, ss.dependent === "plan" && shelfOwn ? !0 : ss.dependent, ss.own + shelfOwn),
        "TODAY: " + today + (analysis ? "   MODE: business analysis" : ""),
        `<data ref="access">
YOUR ACCESS: ` + access + `
</data>`,
        run
          ? `<data ref="run">
CURRENT RUN ON THIS PHONE: ` + run + `
</data>`
          : "",
        "",
        "EXCERPTS:",
        excerptBlock(ex),
        ...docBlocks,
        ...prev.length
          ? [
            "",
            "EARLIER IN THIS CONVERSATION (context only):",
            ...prev.flatMap(
              (h) => ["Q: " + cleanUntrusted(h.q, 300), "A: " + cleanUntrusted(h.a, h.max)],
            ),
          ]
          : [],
        // v28: the length rule again, last, where the model follows it best
        !analysis && !plan
          ? "\n" + (globalThis.__pbReply || REPLY_RULE)
          : "",
      ].filter((x) => x !== "").join(`
`),
      tools = toolsFor(level, analysis && CODE_EXEC);
    // v28 (Tommy, Nov 14): the libraries come first; web search is the backup when they don't cover it. Logged (web:n) so gaps get added to the library.
    WEB_SEARCH && !plan && !analysis && tools.push({ type: "web_search_20250305", name: "web_search", max_uses: 2 });
    tools.length && (tools[tools.length - 1] = { ...tools[tools.length - 1], cache_control: CC });
    const messages = [{
        role: "user",
        content: [...photoBlocks(photos), ...(wantsGlossary ? [{ type: "text", text: STAKE_GLOSSARY }] : []), { type: "text", text: userText }],
      }],
      PREFIX_CHARS = JSON.stringify(tools).length + TEACHER_V2_SYSTEM.length + (wantsGlossary ? STAKE_GLOSSARY.length : 0) +
        photos.length * PHOTO_TOKENS * 3.2,
      jlen = (m) =>
        JSON.stringify(m, (k, v) => k === "data" && typeof v == "string" && v.length > 2e3 ? "" : v)
          .length;
    let lastInput = 0, lastCached = !1, lastMsgChars = 0;
    const tok = (chars) => chars / 3.2,
      projectNext = (msgs, maxOut) => {
        const msgChars = jlen(msgs), est = tok(PREFIX_CHARS + msgChars);
        if (!lastInput) return (est * pr.in + maxOut * pr.out) / 1e6;
        const inTok = Math.max(est, lastInput + tok(Math.max(0, msgChars - lastMsgChars))),
          hit = lastCached ? lastInput : 0;
        return (hit * pr.cr + (inTok - hit) * (lastCached ? pr.cw : pr.in) + maxOut * pr.out) / 1e6;
      },
      projectFollow = (msgs, maxOut) => {
        const inTok = Math.max(lastInput, tok(PREFIX_CHARS + jlen(msgs))) + maxOut,
          added = tok(2 * L.resultChars);
        return (!lastInput || lastCached
          ? inTok * pr.cr + added * pr.cw + maxOut * pr.out
          : (inTok + added) * pr.in + maxOut * pr.out) / 1e6;
      },
      askedData = () => {
        const a = messages[messages.length - 2];
        return !!a && a.role === "assistant" && Array.isArray(a.content) &&
          a.content.some((c) =>
            c.type === "tool_use" && c.name !== "search_knowledge" &&
            c.name !== "propose_materials" && c.name !== "calc"
          );
      };
    let container, final = null, stop = "", forceAnswer = !1, capBreak = !1, finishing = !1, nudged = !1;
    const evidence = [userText], calcValues = [];
    let calcCalls = 0,
      proposal = null,
      draft1 = "",
      verify1 = null,
      vres = null,
      regen = !1,
      regenFailed = !1;
    const rel = stream
      ? new Releaser(evidence, calcValues, () => sources, (t) => {
        ms.first_text || mark("first_text"), shownChars += t.length, out.send("delta", { t });
      })
      : null;
    stream && (out.open(), mark("stream_open"));
    for (let pass = 0; pass < 2; pass++) {
      nudged = !1;
      pass === 1 &&
        (draft1 = (final?.content || []).filter((c) => c.type === "text").map((c) => c.text).join(`
`),
          messages.push({ role: "user", content: [{ type: "text", text: verifyNote(verify1) }] }),
          final = null,
          stop = "",
          forceAnswer = !1,
          regen = !0,
          stream && out.send("status", { s: "checking" }));
      let capNow = L.usdCap * (pass ? REGEN_CAP_FACTOR : 1);
      for (let round = 0; round < (pass ? 3 : L.rounds + 2); round++) {
        let left = deadline - Date.now();
        if (left < 1e4 || out?.gone) break;
        let projected = projectNext(messages, L.maxOut);
        !pass && round > 0 && level === "office" && !analysis && !plan && !escalated &&
          askedData() &&
          (round >= L.rounds || usage.calls >= L.toolCalls || spent() + projected > capNow ||
            usage.calls >= ESCALATE_AFTER_CALLS &&
              spent() + projected + projectFollow(messages, L.maxOut) > capNow) &&
          await escalate() &&
          (analysis = !0,
            L = LIMITS.analysis,
            capNow = L.usdCap,
            deadline = Math.min(t0 + L.deadlineMs, t0 + GATEWAY_SAFE_MS),
            left = deadline - Date.now(),
            projected = projectNext(messages, L.maxOut),
            mark("escalated"));
        let last = forceAnswer || round >= (pass ? 2 : L.rounds) || usage.calls >= L.toolCalls ||
          spent() + projected + projectFollow(messages, L.maxOut) > capNow ||
          left < FINAL_RESERVE_MS + TOOL_BATCH_MS + 1e4;
        if ((round > 0 || pass) && spent() + projected > capNow) {
          if (!pass && spent() + projected <= L.usdCap * FINISH_CAP_FACTOR) {
            capBreak = !0, finishing = !0, last = !0;
          } else {
            capBreak = !pass, pass && (regenFailed = !0);
            break;
          }
        }
        const payload = {
          model: strongModel ? PLAN_MODEL : ASK_MODEL,
          max_tokens: L.maxOut,
          cache_control: { type: "ephemeral" },
          system: [{ type: "text", text: TEACHER_V2_SYSTEM, cache_control: CC }],
          tools,
          messages,
        };
        plan &&
        (payload.thinking = { type: "adaptive" }, payload.output_config = { effort: PLAN_EFFORT }),
          last && (payload.tool_choice = { type: "none" }),
          // v28: when tools are off for this turn, say so, or the model announces a calc it can't run and stops
          last && messages.length && messages[messages.length - 1].role === "user" &&
          (payload.messages = [...messages.slice(0, -1), {
            ...messages[messages.length - 1],
            content: [...(Array.isArray(messages[messages.length - 1].content) ? messages[messages.length - 1].content : [{ type: "text", text: String(messages[messages.length - 1].content) }]),
              { type: "text", text: "No more tool calls now: write the finished answer in this reply (do simple arithmetic yourself)." }],
          }]),
          container && (payload.container = container);
        let r, j;
        const onText = rel && pass === 0 ? (t) => rel.feed(t) : void 0;
        try {
          ({ r, j } = await anthropic(
            s.key,
            payload,
            deadline,
            last ? 6e4 : Math.min(6e4, Math.max(5e3, left - FINAL_RESERVE_MS - TOOL_BATCH_MS)),
            onText,
            stopCtl.signal,
          ));
        } catch {
          if (pass) {
            regenFailed = !0;
            break;
          }
          return fail(504, {
            error: "ai_timeout",
            message: "The AI took too long. Check your signal and try again.",
          });
        }
        if (ms.model1 || mark("model1"), (!r.ok || !j) && pass) {
          regenFailed = !0;
          break;
        }
        if (!r.ok || !j) {
          const busy = r.status === 429 || r.status === 529 || r.status >= 500;
          return fail(502, {
            error: busy ? "ai_busy" : "ai_failed",
            message: busy
              ? "The AI is busy. Try again in a minute."
              : "The AI couldn’t answer that. Try again.",
          });
        }
        usage.rounds++,
          usage.in += j.usage?.input_tokens || 0,
          usage.out += j.usage?.output_tokens || 0,
          usage.cw += j.usage?.cache_creation_input_tokens || 0,
          usage.cr += j.usage?.cache_read_input_tokens || 0;
        const cc = j.usage?.cache_creation;
        if (
          usage.cw1h += cc && typeof cc.ephemeral_1h_input_tokens == "number"
            ? cc.ephemeral_1h_input_tokens
            : CACHE_1H && j.usage?.cache_creation_input_tokens || 0,
            usage.code += j.usage?.server_tool_use?.code_execution_requests || 0,
            usage.web += j.usage?.server_tool_use?.web_search_requests || 0,
            lastInput = (j.usage?.input_tokens || 0) + (j.usage?.cache_read_input_tokens || 0) +
              (j.usage?.cache_creation_input_tokens || 0),
            lastCached = (j.usage?.cache_read_input_tokens || 0) +
                (j.usage?.cache_creation_input_tokens || 0) > 0,
            lastMsgChars = jlen(messages),
            j.container?.id && (container = j.container.id),
            stop = j.stop_reason,
            stop === "max_tokens" && (j.content || []).some((c) => c.type === "tool_use")
        ) {
          rel && (rel.shown && out.send("reset", {}), rel.reset(), shownChars = 0),
            forceAnswer = !0;
          continue;
        }
        if (
          messages.push({ role: "assistant", content: j.content }),
            stop !== "tool_use" && stop !== "pause_turn"
        ) {
          // v25: an answer that only announces a step ("I'll run it through calc") and stops is not an answer: go on once
          const said = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();
          if (!nudged && !last && stop === "end_turn" && isStall(said)) {
            nudged = !0, nudgedLog = !0;
            rel && (rel.shown && out.send("reset", {}), rel.reset(), shownChars = 0);
            messages.push({ role: "user", content: [{ type: "text", text: "Do it now: make the tool calls and give the finished answer in this reply. Do not announce steps." }] });
            continue;
          }
          final = j;
          break;
        }
        if (
          rel && (rel.shown && out.send("reset", {}), rel.reset(), shownChars = 0),
            stop === "pause_turn"
        ) continue;
        const calls = (j.content || []).filter((c) => c.type === "tool_use"), results = [];
        // v25: looking things up in the job's plan set needs more lookups and room for the sheet images
        !pass && !planLookup && !plan && !analysis && calls.some((c) => /^plan_(find|read|sheets)$/.test(c.name)) &&
          (planLookup = !0, L = { ...LIMITS.plan_lookup, maxOut: Math.max(L.maxOut, LIMITS.plan_lookup.maxOut) }, capNow = L.usdCap,
            deadline = Math.min(t0 + L.deadlineMs, t0 + GATEWAY_SAFE_MS), mark("plan_lookup"));
        if (deadline - Date.now() < FINAL_RESERVE_MS + TOOL_BATCH_MS) {
          for (const c of calls) {
            results.push({
              type: "tool_result",
              tool_use_id: c.id,
              content: "No time left for more lookups. Answer now with what you have.",
              is_error: !0,
            });
          }
          forceAnswer = !0;
        } else {
          const cx = {
            level,
            kb: index,
            state: st,
            userRpc,
            docsSearch,
            shelfSearch: (text, o) => shelfSearch(s.admin, text, st.code, { ...o, index }),
            nextRef: () => ++dataN,
            nextExcerpt: () => ++excerptN,
            resultChars: L.resultChars,
            sources,
            calcValues,
            admin: s.admin,
            set planImages(v) {
              planImagesSeen = !!v;
            },
            proposal: (p) => {
              proposal = p;
            },
          };
          for (let i = 0; i < calls.length; i += 4) {
            const batch = calls.slice(i, i + 4),
              late = deadline - Date.now() < FINAL_RESERVE_MS + TOOL_BATCH_MS,
              done = await Promise.all(
                batch.map((c) =>
                  c.name === "calc"
                    ? Promise.resolve(
                      ++calcCalls > CALC_MAX
                        ? {
                          text:
                            "calc limit reached for this question. Answer with the figures you have.",
                          isError: !0,
                        }
                        : null,
                    ).then((x) => x || runTool(c.name, c.input, cx))
                    : late || usage.calls++ >= L.toolCalls + 4
                    ? Promise.resolve({
                      text:
                        "Tool call limit or time reached for this question. Answer with what you have.",
                      isError: !0,
                    })
                    : runTool(c.name, c.input, cx)
                ),
              );
            done.forEach((d, k) => {
              batch[k].name === "calc" && (calcNLog++, d.isError && calcErrLog++);
              d.isError ||
                (evidence.push(d.text), batch[k].name !== "search_knowledge" && (toolOk = !0), batch[k].name !== "search_knowledge" && batch[k].name !== "calc" && (dataTool = !0));
            }),
              batch.forEach((c, k) =>
                results.push({
                  type: "tool_result",
                  tool_use_id: c.id,
                  content: done[k].content || done[k].text,
                  ...done[k].isError ? { is_error: !0 } : {},
                })
              ),
              late && (forceAnswer = !0);
          }
        }
        messages.push({ role: "user", content: results });
      }
      const draft = final
        ? (final.content || []).filter((c) => c.type === "text").map((c) => c.text).join(`
`)
        : "";
      if (
        !draft.trim() ||
        (vres = verifyNumbers(draft, evidence, calcValues),
          // v28: number checks guard job data; a teaching answer from the libraries is not rewritten (the rewrite made it worse)
          (photos.length || planImagesSeen || !dataTool) && !vres.ok && !vres.mismatches?.length &&
          (vres = { ...vres, ok: !0, untraced: [] }),
          pass === 0 && (verify1 = vres),
          vres.ok || pass === 1 || deadline - Date.now() < FINAL_RESERVE_MS + 5e3)
      ) break;
    }
    regen && (regenFailed || !final || isStall((final.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n"))) &&
    (final = { content: [{ type: "text", text: draft1 }] }, vres = verify1),
      stream && !regen && out.send("status", { s: "checking" });
    const usd = Math.round(spent() * 1e4) / 1e4;
    const finalText = final ? (final.content || []).filter((c) => c.type === "text") : [];
    // web search answers come split into many text blocks at each citation; those join with nothing between
    let answer = finalText.map((c) => c.text).join(finalText.some((c) => Array.isArray(c.citations) && c.citations.length) ? "" : `
`);
    const webSources = [];
    for (const c of finalText) {
      for (const ci of Array.isArray(c.citations) ? c.citations : []) {
        const url = String(ci?.url || "");
        if (ci?.type === "web_search_result_location" && /^https:\/\/[^\s"'<>]+$/.test(url) && !webSources.some((w) => w.url === url) && webSources.length < 4) {
          let host = "";
          try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
          webSources.push({ n: "W" + (webSources.length + 1), kind: "kb", title: "Web: " + cleanUntrusted(String(ci.title || host), 110), source: host, url });
        }
      }
    }
    const partial = !1;
    if (
      !answer.trim() && usage.rounds &&
      (stop === "tool_use" || stop === "pause_turn" || stop === "max_tokens")
    ) return fail(502, INCOMPLETE);
    if (!answer.trim()) {
      return fail(usage.rounds ? 502 : 504, {
        error: usage.rounds ? "ai_empty" : "ai_timeout",
        message: usage.rounds
          ? "The AI sent nothing back. Try again."
          : "The AI took too long. Try again.",
      });
    }
    const parsed = parseAnswer(answer, q, level, analysis, sources);
    webSources.length && (parsed.sources = [...(parsed.sources || []), ...webSources]);
    { // v28: drop "I'll ..." step announcements at the start or end when a real answer is there
      const paras = String(parsed.text || "").trim().split(/\n\s*\n/);
      while (paras.length > 1 && isStall(paras[0]) && paras.slice(1).join(" ").length > 40) paras.shift();
      while (paras.length > 1 && isStall(paras[paras.length - 1]) && /\b(I['\u2019]ll|I will|let me)\b/i.test(paras[paras.length - 1])) paras.pop();
      paras.length && (parsed.text = paras.join("\n\n"));
    }
    parsed.type === "general" && !parsed.sources.length && REFUSAL_RX.test(parsed.text) &&
    (parsed.type = "refusal"),
      vres && !vres.ok && !partial && (parsed.text = parsed.text.trimEnd() + `

` + flagLine(vres));
    const vlog = {
      numbers: vres?.numbers ?? 0,
      untraced: vres?.untraced?.length ?? 0,
      mismatches: vres?.mismatches?.length ?? 0,
      first_untraced: verify1?.untraced?.length ?? 0,
      first_mismatches: verify1?.mismatches?.length ?? 0,
      regen,
      flagged: !!(vres && !vres.ok),
      calc: calcCalls,
    };
    mark("draft_done");
    const g = await guardAnswer(
      s.key,
      q,
      parsed.text,
      parsed.table,
      guardFetch,
      gUsage,
      !0,
      t0 + GATEWAY_SAFE_MS,
      earlier,
    );
    mark("guard"),
      (g.replaced !== "none" || g.appended) &&
      (parsed.text = g.text,
        parsed.table = g.table,
        parsed.type = "safety",
        parsed.safety = !0,
        parsed.gonogo = g.replaced,
        g.replaced === "all" && (parsed.chart = null, parsed.sources = []));
    const dataAsk = analysis || dataN > 0 || parsed.type === "data" || namesOwnJob(q, jobs) ||
        messages.some((m) =>
          m.role === "assistant" && Array.isArray(m.content) &&
          m.content.some((c) =>
            c.type === "tool_use" && c.name !== "search_knowledge" &&
            c.name !== "propose_materials" && c.name !== "calc"
          )
        ),
      gx = R ? null : await gapStep({
        q,
        level,
        stats: index && !photos.length ? kst : null,
        hits,
        text: parsed.text,
        sources: parsed.sources || [],
        data: dataAsk,
        replacedAll: g.replaced === "all",
        toolOk,
        history: hist,
        docsInPrompt: docBlocks.length > 0,
        index,
        company: String(scope?.company || ""),
        jobs,
        curJob,
        kbv: kbVersion() || "",
        uid: s.uid,
        admin: s.admin,
      }).catch(() => null),
      gapWait = gx?.pending ? later(gx.pending) : null,
      streamNote = rel && rel.shown.trim() && !keptShown(rel.shown, parsed.text)
        ? STREAM_NOTE
        : void 0;
    logged = !0,
      console.log(JSON.stringify({
        ai: "ask2",
        mode: quotaFeature,
        level,
        stop,
        rounds: usage.rounds,
        calls: usage.calls,
        code: usage.code,
        web: usage.web,
        in_tok: usage.in,
        cr: usage.cr,
        cw: usage.cw,
        cw1h: usage.cw1h,
        out_tok: usage.out,
        usd: Math.round((usd + gUsage.usd + iUsage.usd) * 1e4) / 1e4,
        guard_calls: gUsage.calls,
        guard_failed: gUsage.failed,
        guard: g.replaced,
        cap_break: capBreak,
        finish: finishing,
        nudged: nudgedLog,
        calc_errors: calcErrLog,
        calc_n: calcNLog,
        state_dropped: usage.stateDropped || 0,
        state: st.code || null,
        state_how: st.how,
        state_own: usage.stateOwn || 0,
        shelf: usage.shelf || 0,
        state_asked: !st.code && !!usage.stateDep,
        intent: intentLog,
        plan_images: planImagesSeen,
        plan_lookup: planLookup,
        escalated,
        photos: photos.length,
        partial,
        ms: Date.now() - t0,
        kb: kbLoaded()?.N ?? 0,
        kb_version: kbVersion(),
        docs: docs.length,
        verify: vlog,
        replay: !!R,
        gap: gx?.reason || null,
        stream: stream
          ? { shown: rel.shown.length, held: rel.reason || null, note: !!streamNote }
          : !1,
        steps: ms,
      }));
    const resp = reply(200, {
      ok: !0,
      v: 2,
      mode: quotaFeature,
      level,
      ...parsed,
      ...proposal ? { proposal } : {},
      data: dataAsk,
      truncated: stop === "max_tokens" || partial,
      partial,
      used,
      limit: LIMIT,
      state: st.code ? { code: st.code, how: st.how } : { code: null, how: st.how, asked: !!usage.stateDep },
      ...streamNote ? { stream_note: streamNote } : {},
      ...gx?.token ? { answer_id: gx.token } : {},
      ...R
        ? {
          _diag: {
            usd: Math.round((usd + gUsage.usd + iUsage.usd) * 1e4) / 1e4,
            rounds: usage.rounds,
            verify: vlog,
            untraced: vres?.untraced || [],
            mismatches: vres?.mismatches || [],
            draft1: regen ? draft1 : void 0,
            calc: calcNLog, calc_err: calcErrLog, nudged: nudgedLog, web: usage.web, stop, regen,
          },
        }
        : {},
    });
    return delivered = out?.streaming ? out.alive : !0,
      delivered || (outcome = "gone"),
      gapWait && await gapWait,
      resp;
  } finally {
    const refund = !R && (!delivered || refundAnyway) && shownChars === 0;
    out?.gone && (outcome = "gone"),
      logged || console.log(JSON.stringify({
        ai: "ask2",
        outcome,
        mode: quotaFeature,
        level,
        rounds: usage.rounds,
        in_tok: usage.in,
        cr: usage.cr,
        cw: usage.cw,
        cw1h: usage.cw1h,
        out_tok: usage.out,
        usd: Math.round((spent() + gUsage.usd + iUsage.usd) * 1e4) / 1e4,
        guard_calls: gUsage.calls,
        ms: Date.now() - t0,
        stream: stream ? { shown: shownChars } : !1,
        refunded: refund,
        steps: ms,
      })),
      !R && await go(s.admin.rpc("ai_cost_add", { p_user: s.uid, p_feature: quotaFeature, p_usd: Math.round((spent() + gUsage.usd + iUsage.usd) * 1e6) / 1e6 })), // Nov 16: real cost per person
      refund && !R && await go(s.admin.rpc("ai_refund", { p_user: s.uid, p_feature: quotaFeature })),
      refund && planStrong && !R &&
      await go(s.admin.rpc("ai_refund", { p_user: s.uid, p_feature: "plans_strong" }));
  }
}
export {
  anthropic,
  askV2,
  DAILY_LIMIT,
  GATEWAY_SAFE_MS,
  isAnalysisQuestion,
  MODEL,
  routeAnalysis2 as routeAnalysis,
};
