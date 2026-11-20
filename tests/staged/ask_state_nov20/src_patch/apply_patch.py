#!/usr/bin/env python3
# ask_state_nov20: makes the patched Ask source from the live source (build b4ad91749f6f).
#   python3 apply_patch.py /home/claude/ask_v24/src <out dir>
# Exact-once replacements (assert count == 1). Adds state.ts; changes ask.ts, tools.ts, _shared/retrieval.ts, index.ts (one line), guard.ts (quote pairing). Nothing else.
import sys, os, shutil
SRC, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(OUT, "_shared"), exist_ok=True)
def patch(rel, reps):
    s = open(os.path.join(SRC, rel), encoding="utf-8").read()
    for a, b in reps:
        assert s.count(a) == 1, (rel, s.count(a), a[:80])
        s = s.replace(a, b)
    open(os.path.join(OUT, rel), "w", encoding="utf-8").write(s)

# 1. retrieval.ts: the index keeps a chunk's explicit `state` (11th column; older saved indexes simply lack it) and hits carry it
patch("_shared/retrieval.ts", [
 ('''        verbatim: lib === "osha",
      });
  }
  if (hits.sort(''', '''        verbatim: lib === "osha",
        state: row[10] || "",
      });
  }
  if (hits.sort('''),
 ('''        [...new Set(tokenize(c.title))].join(" "),
      ]);''', '''        [...new Set(tokenize(c.title))].join(" "),
        typeof c.state == "string" ? c.state.trim().toUpperCase().slice(0, 40) : "",
      ]);'''),
])

# 2. tools.ts: the model's own second search follows the same state rule
patch("tools.ts", [
 ('''import ''', '''import { keepForState, questionStates, tenStatesOnly } from "./state.ts";
import ''') if False else ('''    if (name === "search_knowledge") {
      const q = String(input?.query || "").slice(0, 300),
        lib = String(input?.library || "any"),
        out = [];
      if (lib !== "documents" && cx.kb) {
        for (
          const h of search(cx.kb, q, {
            k: 5,
            level: cx.level,
            lib: lib === "any" ? "" : lib,
            maxChars: 7e3,
          })
        ) {''', '''    if (name === "search_knowledge") {
      const q = String(input?.query || "").slice(0, 300),
        lib = String(input?.library || "any"),
        out = [];
      if (lib !== "documents" && cx.kb) {
        // ask_state: the same state rule as the first search (a state's chunk only on that state's job, or when the
        // search or the question names the state); general and federal chunks always
        const stCode = cx.state?.code || null, stNamed = [...(cx.state?.named || []), ...questionStates(q)];
        let kbChars = 0, kbN = 0;
        for (
          const h of search(cx.kb, q, {
            k: 20,
            level: cx.level,
            lib: lib === "any" ? "" : lib,
            maxChars: 28e3,
          })
        ) {
          if (!keepForState(h, stCode, stNamed) || tenStatesOnly(h, stCode, q)) continue;
          if (kbN >= 5 || (kbChars + h.text.length > 7e3 && kbN)) break;
          kbN++, kbChars += h.text.length;'''),
])
s = open(os.path.join(OUT, "tools.ts"), encoding="utf-8").read()
first_import = s.index("import ")
s = s[:first_import] + 'import { keepForState, questionStates, tenStatesOnly } from "./state.ts";\n' + s[first_import:]
open(os.path.join(OUT, "tools.ts"), "w", encoding="utf-8").write(s)

# 3. ask.ts
patch("ask.ts", [
 # imports
 ('''import { gapStep, later, namesOwnJob, REFUSAL_RX } from "./gaps.ts";''',
  '''import { gapStep, later, namesOwnJob, REFUSAL_RX } from "./gaps.ts";
import { addressState, okState, resolveState, stateLines, stateSearch } from "./state.ts";
globalThis.__PLAIN_MIN = Number(Deno.env.get("AI_ASK_PLAIN_MIN") || 0); // optional: plain-language chunks beside OSHA text (0 = off)'''),
 # the job's state: app-sent, job address, the company's own state, earlier turns, most jobs
 ('''  let cityState = "", jobState = null;''',
  '''  let cityState = "", jobState = null;
  // ask_state (Nov 20): one answer to "which state is this for", worked out once and used by the first search, the
  // model's own search, the document search and the prompt. See state.ts resolveState for the order.
  let st = resolveState({ question: q });
  const appState = cleanUntrusted(body.ctx?.state, 2).toUpperCase(), appHow = cleanUntrusted(body.ctx?.state_how, 12),
    stateRulesP = Promise.resolve(userRpc("pb_state_rules_get", {})).catch(() => null); // the company's own state and the states picked for its jobs (r17.06)'''),
 ('''      cityState = String(row?.[2] || "");
      jobState = (cityState.match(/\\b([A-Z]{2})\\s*$/) || [])[1] || null;
      if (!jobState) { // v28: no job picked (or no address): use the state most of the company's jobs are in
        const n = {};
        for (const j of (Array.isArray(sr.data.jobs) ? sr.data.jobs : [])) { const st = (String(j[2] || "").match(/\\b([A-Z]{2})\\s*$/) || [])[1]; if (st && US_STATES[st]) n[st] = (n[st] || 0) + 1; }
        jobState = Object.keys(n).sort((x, y) => n[y] - n[x])[0] || null;
      }
      return docsSearch(q);
    }).catch(() => []);''',
  '''      cityState = String(row?.[2] || "");
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
        return docsSearch(q);
      });
    }).catch(() => []);'''),
 # first search: wait for the state, then search with it
 ('''    const kst = { best: {}, cover: 0, nTyped: 0 },
      hits = index
        ? search(index, intent?.search ? q + " " + intent.search : q, {
          k: 6,
          level,
          topicBoost: ctxLabel ? ctxLabel.toLowerCase().split(/\\W+/) : [],
          maxChars: 9e3,
          stats: kst,
        })
        : [],
      docs = await docsP;
    mark("docs");
    // v25: a job in one state doesn't get another state's rules unless the question names that state
    if (jobState) {
      const keep = hits.filter((h) => !otherStateOnly(`${h.title || ""} ${h.source || ""} ${String(h.text || "").slice(0, 300)}`, jobState, q));
      usage.stateDropped = hits.length - keep.length;
      hits.length = 0; hits.push(...keep);
    }''',
  '''    const kst = { best: {}, cover: 0, nTyped: 0 },
      docs = await docsP; // also settles the job's state (st)
    mark("docs");
    // ask_state: a chunk's own jurisdiction decides (state.ts). General and federal chunks show in every state; a
    // state's chunks only on that state's job or when the question names the state; the job state's own chunks for
    // this question are added beside the general ones.
    const ss = index
        ? stateSearch(search, index, intent?.search ? q + " " + intent.search : q, {
          k: 6,
          level,
          topicBoost: ctxLabel ? ctxLabel.toLowerCase().split(/\\W+/) : [],
          maxChars: 9e3,
          stats: kst,
        }, st, q)
        : { hits: [], dropped: 0, own: 0, dependent: !1 },
      hits = ss.hits;
    usage.stateDropped = ss.dropped, usage.stateOwn = ss.own, usage.stateDep = ss.dependent;'''),
 # the prompt
 ('''          : curJob
          ? "CURRENT JOB: " + curJob
          : "",''',
  '''          : curJob
          ? "CURRENT JOB: " + curJob
          : "",
        analysis || plan ? "" : stateLines(st, ss.dependent, ss.own),'''),
 ('''(quote the OSHA VERBATIM clause or table; give the federal and, for California jobs, the Cal/OSHA rule)''',
  '''(quote the OSHA VERBATIM clause or table; give the federal rule and, where an excerpt has it, the job state's own rule)'''),
 # the model's own search gets the state too
 ('''            kb: index,
            userRpc,
            docsSearch,''', '''            kb: index,
            state: st,
            userRpc,
            docsSearch,'''),
 # the log line and the reply
 ('''        state_dropped: usage.stateDropped || 0,''',
  '''        state_dropped: usage.stateDropped || 0,
        state: st.code || null,
        state_how: st.how,
        state_own: usage.stateOwn || 0,
        state_asked: !st.code && !!usage.stateDep,'''),
 ('''      truncated: stop === "max_tokens" || partial,
      partial,
      used,
      limit: LIMIT,''', '''      truncated: stop === "max_tokens" || partial,
      partial,
      used,
      limit: LIMIT,
      state: st.code ? { code: st.code, how: st.how } : { code: null, how: st.how, asked: !!usage.stateDep },'''),
])
# 4. index.ts: a quality-run case can be set with NO job state (where = "none"), to test the one short question
patch("index.ts", [
 ('''where = String(c?.where || "Wildomar, CA").slice(0, 60);''', '''where = c?.where === "none" ? "" : String(c?.where || "Wildomar, CA").slice(0, 60);'''),
])
# 5. guard.ts (Nov 20, eval tr14): the OSHA quote checker pairs straight quotes at any length, so a short quoted phrase
#    can no longer shift the pairing and get the text between two quotes removed
patch("guard.ts", [
 ('    new RegExp(`"(${NB(\'"\')})"`, "g"),', '    // straight quotes are paired at ANY length (an opening quote follows a space or "(", a closing one follows a\n    // non-space), and only spans of 20+ characters are checked: with a 20-character minimum in the pattern itself a\n    // short quoted phrase ("20 feet or less") was skipped and the text BETWEEN two quotes was then judged as a quote.\n    /(?<=^|[\\s(\\[:*_>\\u2014\\u2013-])"(?=\\S)([^"]{1,1200}?)(?<=\\S)"(?=$|[\\s.,;:!?)\\]\\[*_\\u2014\\u2013-])/gm,'),
 ('        (whole, q, offset, src) =>\n          check(q, whole, offset, src) !== "bad"', '        (whole, q, offset, src) =>\n          q.length < 20 || check(q, whole, offset, src) !== "bad"'),
])
shutil.copy(os.path.join(HERE, "state.ts"), os.path.join(OUT, "state.ts"))
print("patched: ask.ts tools.ts index.ts _shared/retrieval.ts + state.ts ->", OUT)
