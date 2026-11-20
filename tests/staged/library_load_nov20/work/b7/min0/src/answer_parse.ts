import { PB_AI_SAFETY_RX } from "./safety.ts";
import { isRegulatory } from "./_shared/retrieval.ts";
import { checkOshaQuotes } from "./guard.ts";
function parseAnswer(text, q, level, analysis, sources) {
  const lines = String(text).replace(/\r/g, "").split(`
`);
  let type = "general", table = null, chart = null, cited = [];
  const keep = [],
    PLAIN = /^\s*(TYPE|TABLE|CHART|SOURCES):\s*(.*)$/i,
    WRAPPED = /^\s*[*_#>\s]*(TYPE|TABLE|CHART|SOURCES)\s*[*_]*\s*:\s*(.*?)\s*(?:[*_]+\s*)?$/i,
    isHead = (ln) => PLAIN.test(ln) || WRAPPED.test(ln);
  let lead = 0;
  for (; lead < lines.length && (!lines[lead].trim() || isHead(lines[lead]));) lead++;
  let tail = lines.length;
  for (; tail > lead && (!lines[tail - 1].trim() || isHead(lines[tail - 1]));) tail--;
  lines.forEach((ln, i) => {
    let m = ln.match(PLAIN);
    if (!m) {
      const w = ln.match(WRAPPED);
      w && (i < lead || i >= tail && w[1].toUpperCase() !== "TYPE") && (m = w);
    }
    if (!m) {
      keep.push(ln);
      return;
    }
    const k = m[1].toUpperCase(), v = m[2].trim();
    k === "TYPE"
      ? type = (v.match(/safety|data|general|refusal/i) || ["general"])[0].toLowerCase()
      : k === "SOURCES"
      ? cited = (v.match(/D?\d+/gi) || []).map((x) => x.toUpperCase())
      : k === "TABLE"
      ? table = safeTable(v)
      : k === "CHART" && (chart = safeChart(v));
  });
  let bodyText = keep.join(`
`).replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
  const known = new Set(sources.map((x) => String(x.n).toUpperCase())), same = {}, firstBy = {};
  for (const x of sources) {
    if (x.kind === "data") {
      const k = String(x.title || x.tool || "").toLowerCase(), n = String(x.n).toUpperCase();
      k in firstBy ? same[n] = firstBy[k] : firstBy[k] = n;
    }
  }
  bodyText = bodyText.replace(
    /\[\s*(D?\d{1,3}(?:\s*[,;]\s*D?\d{1,3})*)\s*\]/gi,
    (_m, g) =>
      "[" + [
        ...new Set(
          g.split(/\s*[,;]\s*/).map((r) => {
            const u = r.toUpperCase();
            return same[u] || u;
          }),
        ),
      ].join(", ") + "]",
  ),
    cited = cited.map((r) => same[r] || r),
    bodyText = bodyText.replace(
      /\[\s*(D?\d{1,3}(?:\s*[,;]\s*D?\d{1,3})*)\s*\]/gi,
      (_m, g) =>
        g.split(/\s*[,;]\s*/).map((r) => r.toUpperCase()).filter((r) => known.has(r)).map((r) =>
          `[${r}]`
        ).join(""),
    ).replace(/[ \t]+([.,;:])/g, "$1").replace(/(\[D\d+\])(?:\s*\1)+/g, "$1");
  for (const m of bodyText.matchAll(/\[(D?\d+)\]/gi)) cited.push(m[1].toUpperCase());
  const verbatim = sources.filter((x) =>
      (x.verbatim || x.kind === "app_page") && x._text && cited.includes(String(x.n).toUpperCase())
    ).map((x) => x._text),
    cites = {};
  for (const x of sources) {
    cites[String(x.n).toUpperCase()] = x.kind === "data"
      ? { kind: "data" }
      : x.verbatim || x.kind === "app_page"
      ? { kind: "osha", text: x._text }
      : { kind: "other", text: x._text };
  }
  const qc = checkOshaQuotes(bodyText, verbatim, { question: q, cites });
  bodyText = qc.text;
  const field = level !== "office";
  field && table && (bodyText += `
` + table.rows.map((r) =>
    "- " + r.map((c, i) => (i ? table.columns[i] + " " : "") + c).join(", ")
  ).join(`
`),
    table = null), (field || !analysis) && (chart = null);
  const used = sources.filter((x) =>
      cited.includes(String(x.n).toUpperCase()) && !same[String(x.n).toUpperCase()]
    ).map(({ _text, ...rest }) => rest),
    safety = type === "safety" || PB_AI_SAFETY_RX.test(q);
  return {
    type: safety ? "safety" : type,
    safety,
    text: bodyText,
    table,
    chart,
    sources: used,
    regulatory: isRegulatory(q),
    quotes_removed: qc.removed,
  };
}
function safeTable(v) {
  try {
    const t = JSON.parse(v);
    return !Array.isArray(t.columns) || !Array.isArray(t.rows) || t.columns.length > 8 ||
        t.rows.length > 25 || !t.rows.every((r) =>
          Array.isArray(r) && r.length === t.columns.length && r.every((c) =>
            ["string", "number"].includes(typeof c) || c === null
          )
        )
      ? null
      : {
        columns: t.columns.map((c) => String(c).slice(0, 40)),
        rows: t.rows.map((r) => r.map((c) => typeof c == "string" ? c.slice(0, 60) : c)),
      };
  } catch {
    return null;
  }
}
function safeChart(v) {
  try {
    const c = JSON.parse(v);
    return !["bar", "line"].includes(c.type) || !Array.isArray(c.x) || c.x.length > 24 ||
        !Array.isArray(c.series) || !c.series.length || c.series.length > 4 ||
        !c.series.every((s) =>
          Array.isArray(s.values) && s.values.length === c.x.length &&
          s.values.every((n) => typeof n == "number" || n === null)
        )
      ? null
      : {
        type: c.type,
        title: String(c.title || "").slice(0, 80),
        unit: String(c.unit || "").slice(0, 12),
        x: c.x.map((x) => String(x).slice(0, 20)),
        series: c.series.map((s) => ({
          name: String(s.name || "").slice(0, 30),
          values: s.values,
        })),
      };
  } catch {
    return null;
  }
}
export { parseAnswer };
