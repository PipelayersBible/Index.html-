// ask_shelf (Nov 20 2026): the deep library ("shelf") is not loaded into the worker. It lives in Postgres
// (pb_ai.kb_shelf) and is searched there with full-text search, the way company documents are. This file is the only
// place Ask talks to it: one database call, through the service-role client (the same one that loads the core library),
// to public.pb_ai_kb_shelf_search. The job's state goes with the call: the answer is that state's chunks plus federal
// ("US") ones, never another state's. Any failure, a slow call or a missing function means "no shelf excerpts": Ask
// answers from the core library exactly as before.
import { queryGroups } from "./_shared/retrieval.ts";
import { keepForState } from "./state.ts";

const ON = (Deno.env.get("AI_ASK_SHELF") || "on").toLowerCase() !== "off"; // edge secret AI_ASK_SHELF=off turns it off
// First search: at most 2 short excerpts, and only ones that cover most of the question. The model's own search
// (search_knowledge): at most 2, a little longer, a little looser (the model chose the words).
export const SHELF_FIRST = { k: 2, chars: 700, minCover: 0.6, ms: 1200 },
  SHELF_TOOL = { k: 2, chars: 1200, minCover: 0.5, ms: 1500 };
let offUntil = 0; // the function is not on the server (yet): stop asking for 10 minutes

// rows from pb_ai_kb_shelf_search -> hits shaped like the core search's (id, lib, title, text, source, url, verbatim)
export function shelfHits(data, o = {}, state = null) {
  const rows = data && data.ok === !0 && Array.isArray(data.rows) ? data.rows : [], out = [];
  for (const r of rows) {
    if (!r || typeof r.id != "string" || typeof r.text != "string" || !r.text.trim() || typeof r.title != "string") continue;
    const cover = Number(r.cover) || 0, inTitle = Number(r.title_hits) || 0;
    // good enough to hand over: covers most of the question's words, or a bit fewer when the title itself is about it
    if (!(cover >= (o.minCover ?? 0.6) || (inTitle >= 2 && cover >= (o.minCover ?? 0.6) - 0.15))) continue;
    const st = String(r.state || "US").toUpperCase(), h = {
      id: r.id, title: r.title.slice(0, 160), topic: String(r.topic || ""), text: r.text.slice(0, 1800), source: String(r.source || "").slice(0, 300),
      url: typeof r.url == "string" && /^https:\/\//.test(r.url) ? r.url : "", conf: String(r.conf || ""), state: st, shelf: !0, cut: r.cut === !0, cover, score: Number(r.score) || 0,
      // exact 29 CFR text (osha-1926.651(j)(2)-a, kind verbatim) is the only thing the model may quote as OSHA text
      verbatim: r.coll === "osha" && r.kind === "verbatim" && /^osha-\d/.test(r.id),
    };
    h.lib = h.verbatim ? "osha" : "field";
    if (st !== "US" && !keepForState(h, state, [])) continue; // belt and braces: the database already filtered by state
    if (out.some((x) => x.id === h.id)) continue;
    out.push(h);
    if (out.length >= (o.k || 2)) break;
  }
  return out;
}

// One call. admin = the service-role client; state = the job's state code or null (then federal chunks only).
export async function shelfSearch(admin, text, state, o = {}) {
  if (!ON || !admin?.rpc || Date.now() < offUntil) return [];
  const q = String(text || "").slice(0, 300), terms = queryGroups(q);
  if (!terms.length) return [];
  let timer;
  try {
    const r = await Promise.race([
      admin.rpc("pb_ai_kb_shelf_search", { p_q: q, p_state: state || null, p_k: (o.k || 2) + 2, p_terms: terms, p_coll: o.coll || null, p_chars: o.chars || 700 }),
      new Promise((res) => { timer = setTimeout(() => res({ data: null, error: { message: "timeout" } }), o.ms || 1200); }),
    ]);
    if (r?.error) {
      if (/PGRST202|42883|could not find the function|does not exist/i.test(`${r.error.code || ""} ${r.error.message || ""}`)) offUntil = Date.now() + 6e5;
      return [];
    }
    return shelfHits(r?.data, o, state);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Shelf excerpts go after the core ones, numbered on. ex = mergeExcerpts(...) output.
export function withShelf(ex, shelf) {
  return ex.concat(shelf.map((h, i) => ({ n: ex.length + i + 1, kind: "kb", title: h.title, text: h.text, lib: h.lib, source: h.source, url: h.url, verbatim: h.verbatim, id: h.id })));
}
export const _shelfReset = () => { offUntil = 0; }; // tests
