// v25: what is this person actually asking? A quick read of fast, misspelled or slangy field questions, so search
// finds the right material and the main model starts from the likely meaning. Never blocks: null on any failure.
import { haiku } from "./gonogo.ts";

const INTENT_SYSTEM =
  `People on pipeline and underground construction crews type questions fast on a phone: misspellings, voice-to-text mistakes, slang, half sentences, missing words, the wrong word for the right idea. Work out what they most likely mean. Use the earlier turns (<earlier>) and the app screen (<screen>) when given: a short follow-up continues the earlier topic.
Field words you will see: IE / flowline / FL / invert = pipe bottom inside elevation; rim / lid / TC (top of curb) / FG (finish grade) / EG (existing ground); shot / rod reading / HI (height of instrument) / BM (benchmark) / TBM; hub, lath, grade stake, offset stake, cut / fill (C / F) on a stake; station 12+50; tenths = decimal feet; fall / drop / grade / slope / percent; MH (manhole), CB (catch basin), cleanout, lateral, wye, tee, saddle, hot tap, corp stop, curb stop, thrust block, restrained joint, gasket, bell / spigot, SDR, C900, DIP, RCP, HDPE, PVC; bedding, shading, haunching, initial / final backfill, compaction / relative compaction / 90% / 95%, sand cone, nuke (nuclear gauge); shoring, trench box, shield, slide rail, benching, sloping, 1.5:1, competent person; pothole / daylight a utility, 811 / USA ticket, tolerance zone; confined space, permit, gas monitor / 4-gas / bump test, LEL, O2, H2S, CO; laser / pipe laser / grade rod; mandrel, air test, lamp test, CCTV; form, batter / lean of a curb face, miter, bevel.
Return by calling the tool:
- meaning: ONE plain sentence of what they are asking, in correct field terms, keeping every number, size, unit and name they gave. Do not answer it.
- search: 6 to 15 search keywords: the field terms, their technical synonyms and the likely regulation or topic names.
- unclear: true ONLY when two readings would lead to different answers.
- readings: when unclear, up to 3 short alternative readings (most likely first). Otherwise an empty list.`;

const INTENT_TOOL = {
  name: "intent",
  description: "Record what the person most likely means.",
  input_schema: {
    type: "object",
    properties: {
      meaning: { type: "string" },
      search: { type: "string" },
      unclear: { type: "boolean" },
      readings: { type: "array", items: { type: "string" }, maxItems: 3 },
    },
    required: ["meaning", "search", "unclear", "readings"],
  },
};

const esc = (s: string) => String(s).replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

export type Intent = { meaning: string; search: string; unclear: boolean; readings: string[] };

export async function intentOf(
  key: string,
  q: string,
  earlier: string,
  screen: string,
  fetcher: typeof fetch,
  usage: { calls: number; failed: number; usd: number },
  until: number,
): Promise<Intent | null> {
  try {
    const v = await haiku(
      key,
      INTENT_SYSTEM,
      (earlier || "") + (screen ? `<screen>${esc(screen)}</screen>\n` : "") + `<question>\n${esc(String(q).slice(0, 1500))}\n</question>`,
      INTENT_TOOL,
      300,
      fetcher,
      usage,
      until,
    );
    if (!v || typeof v.meaning !== "string") return null;
    return {
      meaning: clip(v.meaning, 400),
      search: clip(v.search, 300),
      unclear: v.unclear === true,
      readings: Array.isArray(v.readings) ? v.readings.map((r: unknown) => clip(r, 200)).filter(Boolean).slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}
export { INTENT_SYSTEM, INTENT_TOOL };
