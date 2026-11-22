const MONTHS =
    "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)",
  DATE_RXS = [
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g,
    /\b(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])\b(?![-\d])/g,
    new RegExp(`\\b${MONTHS}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?\\b`, "gi"),
    new RegExp(`\\b\\d{1,2}\\s+(?:de\\s+)?${MONTHS}(?:\\s+(?:de\\s+)?\\d{4})?\\b`, "gi"),
    /\b\d{1,2}:\d{2}(?:\s*[ap]\.?m\.?)?\b/gi,
    /\b\d{1,2}\s*[ap]\.?m\.?\b/gi,
    /\b(?:19|20)\d{2}\b/g,
  ],
  STRIP_RXS = [/\[\s*D?\d{1,3}\s*\]/gi, /^\s*(TYPE|SOURCES)\s*:.*$/gim],
  QTY_AFTER =
    /^\s*(?:%|lf\b|ea\b|ft\b|feet\b|foot\b|in\b|inch(?:es)?\b|"|yd3?\b|cy\b|yards?\b|tons?\b|h\b|hrs?\b|hours?\b|man[- ]?hours?\b|(?:work(?:ing)?\s+|production\s+)?days?\b|weeks?\b|psi\b|ppm\b|sticks?\b|joints?\b|structures?\b|manholes?\b|runs?\b|crews?\b|tickets?\b|loads?\b|pies\b|días?\b|dias?\b)/i,
  NUM_RX = /(?<![\w.+\-\/])[-\u2212]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w+]|\.\d)/g,
  toNum = (raw) => Number(raw.replace(/[\u2212]/g, "-").replace(/,/g, "")),
  decimals = (raw) => (raw.split(".")[1] || "").length;
function sourceNumbers(texts) {
  const out = [];
  for (const t of texts) {
    for (
      const m of String(t ?? "").replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, " ").replace(
        /\[\s*D?\d{1,3}\s*\]|ref="D\d+"/gi,
        " ",
      ).matchAll(/-?\d[\d,]*(?:\.\d+)?/g)
    ) {
      const v = toNum(m[0]);
      Number.isFinite(v) && out.push(v);
    }
  }
  return out;
}
const traced = (raw, pool) => {
    const a = Math.abs(toNum(raw)), d = decimals(raw), f = 10 ** d;
    return pool.some((s) => {
      const x = Math.abs(s);
      return Math.abs(x - a) < 1e-9 || Math.abs(Math.round(x * f) / f - a) < 1e-9;
    });
  },
  LABELS = {
    best: {
      field: /"best_day_qty"\s*:\s*(-?\d+(?:\.\d+)?)/g,
      date: /"best_day_date"\s*:\s*"([\d-]+)"/g,
      name: "best day",
      cue:
        /\b(best|highest|biggest|peak|record|top|mejor|m[aá]ximo)\b(?:\s+\w+){0,2}\s+(day|days|d[ií]a)\b|\bbest\b/i,
    },
    last: {
      field: /"last_day_qty"\s*:\s*(-?\d+(?:\.\d+)?)/g,
      date: /"last_day_date"\s*:\s*"([\d-]+)"/g,
      name: "most recent day",
      cue:
        /\b(last|latest|most recent|yesterday|[uú]ltimo)\b(?:\s+\w+){0,2}\s+(day|d[ií]a)\b|\byesterday\b|\bmost recent\b/i,
    },
    avg: {
      field: /"avg_per_prod_day"\s*:\s*(-?\d+(?:\.\d+)?)/g,
      name: "average per production day",
      cue: /\b(average|avg|promedio)\b/i,
    },
    need: {
      field: /"qty_per_day_needed"\s*:\s*(-?\d+(?:\.\d+)?)/g,
      name: "needed per work day",
      cue: /\b(need|needed|required|have to|to finish|necesitan?|hace falta)\b/i,
    },
  };
function labelled(texts) {
  const all = texts.join(`
`),
    out = {};
  for (const [k, L] of Object.entries(LABELS)) {
    const vs = [...all.matchAll(L.field)].map((m) => Number(m[1])),
      ds = L.date ? [...all.matchAll(L.date)].map((m) => m[1]) : [];
    out[k] = vs.map((v, i) => ({ v, date: ds[i] }));
  }
  return out;
}
function verifyNumbers(answer, sources, calcValues = []) {
  let text = String(answer ?? "");
  for (const rx of STRIP_RXS) text = text.replace(rx, " ");
  const pool = [...sourceNumbers(sources), ...calcValues],
    srcText = sources.join(`
`),
    untraced = [];
  text = text.replace(
    /\b(19\d{2}\.\d+)(?:\([a-z0-9]+\))*/gi,
    (m, sec) => (srcText.includes(sec) || untraced.push(m), " "),
  ),
    text = text.replace(
      /\b\d+\+\d{2}(?:\.\d+)?\b/g,
      (m) => (srcText.includes(m) || untraced.push(m), " "),
    ),
    text = text.replace(/\b29\s*CFR\b/gi, " ");
  for (const rx of DATE_RXS) text = text.replace(rx, " ");
  const labels = labelled(sources), mismatches = [];
  let count = 0;
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const cues = Object.entries(LABELS).filter(([, L]) => L.cue.test(sentence)).map(([k]) => k);
    for (const m of sentence.matchAll(NUM_RX)) {
      const raw = m[0],
        v = Math.abs(toNum(raw)),
        after = sentence.slice((m.index || 0) + raw.length);
      if (/^(st|nd|rd|th)\b/i.test(after)) continue;
      count++;
      const small = Number.isInteger(v) && v <= 10 && !raw.includes(".") && !QTY_AFTER.test(after);
      if (!small && !traced(raw, pool)) {
        untraced.push(raw);
        continue;
      }
      if (cues.length === 1 && !small) {
        const cue = cues[0],
          own = labels[cue] || [],
          asOther = Object.entries(labels).filter(([k]) => k !== cue).some(([, fs]) =>
            fs.some((f) => traced(raw, [f.v]))
          );
        if (own.length && asOther && !own.some((f) => traced(raw, [f.v]))) {
          const e = own[0];
          mismatches.push({
            n: raw,
            label: LABELS[cue].name,
            expected: `${e.v}${e.date ? " (" + e.date + ")" : ""}`,
          });
        }
      }
    }
  }
  return {
    ok: untraced.length === 0 && mismatches.length === 0,
    numbers: count,
    untraced: [...new Set(untraced)],
    mismatches,
  };
}
function verifyNote(r) {
  return `VERIFY: these numbers in your draft do not trace to the data: ${
    [
      ...r.untraced.map((n) => `${n} (not in any tool result, calc result or excerpt)`),
      ...r.mismatches.map((m) =>
        `${m.n} is called the ${m.label}, but the tools give the ${m.label} as ${m.expected}`
      ),
    ].join("; ")
  }. Rewrite the whole answer in the same output format. Use tool figures exactly as given, compute anything else with the calc tool, and label each figure by its field (best day vs most recent day). If a figure is not available, say so in one line instead of estimating.`;
}
function flagLine(r) {
  return `Check: ${
    [...new Set([...r.untraced, ...r.mismatches.map((m) => m.n)])].join(", ")
  } couldn't be verified.`;
}
export { flagLine, sourceNumbers, verifyNote, verifyNumbers };
