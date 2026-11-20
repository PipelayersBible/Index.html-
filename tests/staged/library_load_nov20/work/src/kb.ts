import { buildIndex, search } from "./_shared/retrieval.ts";
import { decodeIndex, encodeIndex } from "./_shared/kb_codec.ts";
let KB = null, KB_VERSION = "", KB_RETRY_AT = 0, KB_LOADING = null, KB_SAVING = null;
// library_load: the test function reads its own library version. Pointer row "kb@next" = {"version":"<12 hex>","n":<rows>,"rev":"<any>"}.
let NEXT_PTR = null, NEXT_RAW = "", NEXT_AT = 0, NEXT_LOADED = "";
async function nextPointer(admin) {
  if (globalThis.PB_ASK_SLOT !== "next") return null;
  if (Date.now() - NEXT_AT < 6e4) return NEXT_PTR;
  NEXT_AT = Date.now();
  try {
    const { data, error } = await Promise.race([admin.rpc("pb_ai_prompt_overrides", {}), new Promise((r) => setTimeout(() => r({ data: null, error: "timeout" }), 2500))]);
    if (error || !Array.isArray(data)) return NEXT_PTR;
    const raw = String(data.find((x) => x && x.name === "kb@next")?.text || "");
    if (raw === NEXT_RAW) return NEXT_PTR;
    let p = null;
    try { p = JSON.parse(raw); } catch {}
    NEXT_RAW = raw, NEXT_PTR = p && /^[0-9a-f]{12}$/.test(String(p.version)) && Number.isInteger(p.n) && p.n > 0 ? { version: String(p.version), n: p.n, rev: String(p.rev || "") } : null;
  } catch {}
  return NEXT_PTR;
}
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
  return globalThis.PB_ASK_SLOT === "next" ? kbNext(admin) : kbLive(admin);
}
async function kbNext(admin) {
  const p = await nextPointer(admin), key = p ? p.version + "/" + p.n + "/" + p.rev : "";
  if (key !== NEXT_LOADED && !KB_LOADING) KB = null, KB_VERSION = "", KB_RETRY_AT = 0, NEXT_LOADED = key; // the pointer moved: load that library
  return kbLive(admin, p);
}
function kbLive(admin, ptr) {
  return KB
    ? Promise.resolve(KB)
    : Date.now() < KB_RETRY_AT
    ? Promise.resolve(null)
    : KB_LOADING ??= (async () => {
      const t = Date.now();
      let how = "built", canSave = !1;
      try {
        let act = null, blob = null;
        const boot = ptr ? { error: "next pointer" } : await admin.rpc("pb_ai_kb_boot", {}),
          bd = !boot.error && boot.data && typeof boot.data == "object" ? boot.data : null;
        if (bd && bd.ok === !1) throw new Error("no active KB version");
        if (
          bd && bd.ok === !0 && typeof bd.version == "string" && Number.isInteger(bd.n) && bd.n > 0
        ) act = bd, blob = bd.index || null, canSave = !0;
        else if (ptr) act = { version: ptr.version, n: ptr.n, built: ptr.rev }, how = "next";
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
          const built = buildIndex(await legacyRows(admin, act), String(act.built || "")).index;
          if (built.N !== act.n) throw new Error(`got ${built.N} of ${act.n} rows`);
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
          KB_VERSION = String(act.version) + (ptr && ptr.rev ? "." + ptr.rev : ""),
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
