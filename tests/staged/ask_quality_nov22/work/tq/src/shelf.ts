// ask_shelf (Nov 20 2026): the deep library ("shelf") is not loaded into the worker. It lives in Postgres
// (pb_ai.kb_shelf) and is searched there with full-text search, the way company documents are. This file is the only
// place Ask talks to it: one database call, through the service-role client (the same one that loads the core library),
// to public.pb_ai_kb_shelf_search. The job's state goes with the call: the answer is that state's chunks plus federal
// ("US") ones, never another state's. Any failure, a slow call or a missing function means "no shelf excerpts": Ask
// answers from the core library exactly as before.
import { queryGroups, stem, tokenize } from "./_shared/retrieval.ts";
import { keepForState } from "./state.ts";

const ON = (Deno.env.get("AI_ASK_SHELF") || "on").toLowerCase() !== "off"; // edge secret AI_ASK_SHELF=off turns it off
// First search: at most 2 short excerpts, only when they cover the question about as well as the best core hit does
// (margin), and only in the room the core excerpts leave free inside the usual 9,000 characters: a shelf excerpt never
// pushes a core excerpt out. The model's own search (search_knowledge): at most 2, a little longer.
export const SHELF_FIRST = { k: 2, chars: 700, minCover: 0.3, margin: 0.05, maxChars: 9e3, minPiece: 250, ms: 1200 },
  SHELF_TOOL = { k: 2, chars: 1200, minCover: 0.5, ms: 1500 };
let offUntil = 0; // the function is not on the server (yet): stop asking for 10 minutes

// How much each word group matters: how rare its words are in the core library, the same yardstick the core search
// uses ("mandrel" counts for far more than "pipe" or "trench"). No core index: null, and the database works it out.
export function groupWeights(index, terms) {
  if (!index || !index.t || !(index.N > 0)) return null;
  return terms.map((g) => {
    let df = 0;
    for (const w of String(g).split(" ")) df = Math.max(df, (index.t[w] || index.t[stem(w)] || [0])[0] || 0);
    return Math.round(Math.log(1 + (index.N - df + 0.5) / (df + 0.5)) * 100) / 100;
  });
}
// "cover" = how much of the question (by weight) a chunk has. The database gives it for a shelf row; this gives the
// same number for a core hit, so the two can be compared.
export function coverOf(h, terms, weights) {
  const all = new Set(tokenize(`${h.title || ""} ${h.topic || ""} ${h.text || ""}`));
  let sum = 0, c = 0;
  terms.forEach((g, i) => {
    const w = weights ? weights[i] : 1, ws = String(g).split(" ");
    sum += w, (ws.some((x) => all.has(x) || all.has(stem(x))) || (ws.length > 1 && all.has(ws.join("")))) && (c += w);
  });
  return sum ? c / sum : 0;
}

// rows from pb_ai_kb_shelf_search -> hits shaped like the core search's (id, lib, title, text, source, url, verbatim)
export function shelfHits(data, o = {}, state = null) {
  const rows = data && data.ok === !0 && Array.isArray(data.rows) ? data.rows : [], out = [];
  for (const r of rows) {
    if (!r || typeof r.id != "string" || typeof r.text != "string" || !r.text.trim() || typeof r.title != "string") continue;
    const cover = Number(r.cover) || 0;
    if (cover < (o.minCover ?? 0.3)) continue; // barely touches the question
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
    if (out.length >= (o.k || 2) + 2) break;
  }
  return out;
}

// One call. admin = the service-role client; state = the job's state code or null (then federal chunks only).
// o.index = the core library's index (or a promise of it), for the word weights.
export async function shelfSearch(admin, text, state, o = {}) {
  if (!ON || !admin?.rpc || Date.now() < offUntil) return [];
  const q = String(text || "").slice(0, 300), terms = queryGroups(q);
  if (!terms.length) return [];
  let timer;
  try {
    const weights = groupWeights(await Promise.resolve(o.index).catch(() => null), terms);
    const r = await Promise.race([
      admin.rpc("pb_ai_kb_shelf_search", { p_q: q, p_state: state || null, p_k: (o.k || 2) + 2, p_terms: terms, p_coll: o.coll || null, p_chars: o.chars || 700, p_weights: weights }),
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

// First search: which shelf excerpts go to the model beside the core ones. shelf = shelfSearch's hits, core = the core
// search's hits, ex = the excerpts already chosen (mergeExcerpts: app pages + core hits, inside 9,000 characters).
//  - a shelf excerpt must cover the question about as well as the best core hit does (within o.margin);
//  - it only uses the room ex leaves free: nothing already chosen is dropped, and the 9,000 limit stands. A longer
//    excerpt is cut back to whole sentences; under o.minPiece characters it is left out.
export function shelfPick(shelf, core, ex, text, index, o = SHELF_FIRST) {
  if (!shelf || !shelf.length) return [];
  const terms = queryGroups(String(text || "").slice(0, 300)), w = groupWeights(index, terms), out = [];
  let best = 0, room = (o.maxChars ?? 9e3) - ex.reduce((a, x) => a + String(x.text || "").length, 0);
  for (const h of core) best = Math.max(best, coverOf(h, terms, w));
  for (const h of shelf) {
    if (out.length >= (o.k || 2)) break;
    if (h.cover < best - (o.margin ?? 0.05) || core.some((x) => x.id === h.id || x.title === h.title)) continue;
    let t = h.text;
    if (t.length > room) {
      const end = t.slice(0, Math.max(0, room)).search(/[.;?!][^.;?!]*$/);
      t = end + 1 >= (o.minPiece ?? 250) ? t.slice(0, end + 1) : "";
    }
    if (!t) continue;
    out.push(t === h.text ? h : { ...h, text: t, cut: !0 }), room -= t.length;
  }
  return out;
}

// Shelf excerpts go after the core ones, numbered on. ex = mergeExcerpts(...) output.
export function withShelf(ex, shelf) {
  return ex.concat(shelf.map((h, i) => ({ n: ex.length + i + 1, kind: "kb", title: h.title, text: h.text, lib: h.lib, source: h.source, url: h.url, verbatim: h.verbatim, id: h.id })));
}
export const _shelfReset = () => { offUntil = 0; }; // tests
