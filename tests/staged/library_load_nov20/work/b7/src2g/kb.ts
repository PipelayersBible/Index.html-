import { buildIndex, search } from "./_shared/retrieval.ts";
import { decodeIndex, encodeIndex } from "./_shared/kb_codec.ts";
import { OVERLAY } from "./kb_overlay.ts";
// library_load: on the TEST function only, the staged library is laid over the live rows in memory. Nothing is written to the
// server's library and the live function never takes this path. replace = by the id of the live chunk; add = new chunks.
function withOverlay(byLib) {
  const where = new Map();
  for (const lib of Object.keys(byLib)) byLib[lib].forEach((c, i) => where.set(c?.id, [lib, i]));
  let replaced = 0, missing = 0, added = 0;
  for (const [oldId, e] of Object.entries(OVERLAY.replace || {})) {
    const at = where.get(oldId);
    if (!at) { missing++; continue; }
    if (at[0] === e.lib) byLib[at[0]][at[1]] = e.chunk;
    else byLib[at[0]][at[1]] = null, (byLib[e.lib] ||= []).push(e.chunk);
    replaced++;
  }
  const have = new Set();
  for (const lib of Object.keys(byLib)) { byLib[lib] = byLib[lib].filter(Boolean); for (const c of byLib[lib]) have.add(c.id); }
  for (const e of OVERLAY.add || []) if (!have.has(e.chunk.id)) (byLib[e.lib] ||= []).push(e.chunk), have.add(e.chunk.id), added++;
  console.log(JSON.stringify({ ai: "kb_overlay", rev: OVERLAY.rev, replaced, missing, added }));
  return added;
}
const overlayOn = () => globalThis.PB_ASK_SLOT === "next" && OVERLAY && OVERLAY.rev;
let KB = null, KB_VERSION = "", KB_RETRY_AT = 0, KB_LOADING = null, KB_SAVING = null;
globalThis.__pbKbReset = () => {
  KB = null, KB_VERSION = "", KB_RETRY_AT = 0, KB_LOADING = null, KB_SAVING = null;
}, globalThis.__pbKbSaving = () => KB_SAVING;
const kbVersion = () => KB_VERSION, kbLoaded = () => KB, PAGE = 500, PART_CHARS = 1e6;
async function legacyRows(admin, act) {
  const froms = [];
  for (let f = 0; f < act.n; f += PAGE) froms.push(f);
  const pages = await Promise.all(
      froms.map((from) =>
        admin.rpc("pb_ai_kb_page", { p_version: act.version, p_from: from, p_n: PAGE })
      ),
    ),
    byLib = { app: [], field: [], osha: [] };
  return pages.forEach(({ data: page, error: pe }, i) => {
    if (pe || !Array.isArray(page) || !page.length) {
      throw new Error(pe?.message || "short page at " + froms[i]);
    }
    for (const r of page) (byLib[r.lib] ||= []).push(r.chunk);
  }),
    byLib;
}
function kb(admin) {
  return KB
    ? Promise.resolve(KB)
    : Date.now() < KB_RETRY_AT
    ? Promise.resolve(null)
    : KB_LOADING ??= (async () => {
      const t = Date.now();
      let how = "built", canSave = !1;
      try {
        let act = null, blob = null;
        const lay = overlayOn(), boot = lay ? { error: "overlay: build from rows" } : await admin.rpc("pb_ai_kb_boot", {}),
          bd = !boot.error && boot.data && typeof boot.data == "object" ? boot.data : null;
        if (bd && bd.ok === !1) throw new Error("no active KB version");
        if (
          bd && bd.ok === !0 && typeof bd.version == "string" && Number.isInteger(bd.n) && bd.n > 0
        ) act = bd, blob = bd.index || null, canSave = !0;
        else {
          const { data, error } = await admin.rpc("pb_ai_kb_active", {});
          if (error || !data?.ok) throw new Error(error?.message || "no active KB version");
          act = data;
        }
        let index = null;
        if (blob) {
          try {
            index = await decodeIndex(blob, Number(act.n)),
              search(index, "trench box depth", { k: 3 }),
              search(index, "confined space attendant", { k: 3, level: "office" }),
              how = "blob";
          } catch (e) {
            index = null,
              console.log(JSON.stringify({ ai: "kb_blob_bad", err: String(e).slice(0, 120) }));
          }
        }
        if (!index) {
          const rows = await legacyRows(admin, act), nLive = Object.values(rows).reduce((s, v) => s + v.length, 0);
          if (nLive !== act.n) throw new Error(`got ${nLive} of ${act.n} rows`);
          const extra = lay ? withOverlay(rows) : 0, built = buildIndex(rows, String(act.built || "")).index;
          if (built.N !== act.n + extra) throw new Error(`got ${built.N} of ${act.n + extra} rows`);
          lay && (how = "overlay " + OVERLAY.rev);
          if (index = built, canSave) {
            const version = String(act.version);
            KB_SAVING = encodeIndex(built).then(async (b) => {
              const parts = [];
              for (let i = 0; i < b.data.length; i += PART_CHARS) {
                parts.push(b.data.slice(i, i + PART_CHARS));
              }
              if (parts.length > 32) return { error: { message: "too many parts" } };
              let r = null;
              for (
                let i = 0;
                i < parts.length &&
                (r = await admin.rpc("pb_ai_kb_index_put", {
                  p_version: version,
                  p_n: b.n,
                  p_fmt: b.fmt,
                  p_sha: b.sha,
                  p_part: i,
                  p_parts: parts.length,
                  p_data: parts[i],
                }),
                  !(r?.error || r?.data?.ok !== !0));
                i++
              );
              return r;
            }).then((r) =>
              console.log(
                JSON.stringify({
                  ai: "kb_blob_saved",
                  ok: !r?.error && r?.data?.ok === !0,
                  err: r?.error?.message?.slice?.(0, 120) || r?.data?.error,
                }),
              )
            ).catch((e) =>
              console.log(
                JSON.stringify({ ai: "kb_blob_save_failed", err: String(e).slice(0, 120) }),
              )
            );
            try {
              globalThis.EdgeRuntime?.waitUntil?.(KB_SAVING);
            } catch {}
          }
        }
        KB = index,
          KB_VERSION = String(act.version) + (lay ? "+" + OVERLAY.rev : ""),
          console.log(
            JSON.stringify({
              ai: "kb_loaded",
              version: KB_VERSION,
              docs: index.N,
              how,
              ms: Date.now() - t,
            }),
          );
      } catch (e) {
        KB_RETRY_AT = Date.now() + 6e4,
          console.log(
            JSON.stringify({
              ai: "kb_load_failed",
              err: String(e).slice(0, 160),
              ms: Date.now() - t,
            }),
          );
      }
      return KB_LOADING = null, KB;
    })();
}
export { kb, kbLoaded, kbVersion };
