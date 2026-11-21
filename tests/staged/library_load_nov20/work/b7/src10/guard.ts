import { foldText } from "./_shared/fold.ts";
const SPACED = (w) =>
    new RegExp(w.split("").map((c) => c === "i" ? "[il1|!]" : c).join("[\\s._\\-*'\"`]*"), "gi"),
  LABEL_RXS = [
    SPACED("verbatim"),
    /\bexact[\s._\-]*(text|wording|words|language|quote)\b/gi,
    /\bword[\s\-]*for[\s\-]*word\b/gi,
    /\bofficial[\s._\-]*text\b/gi,
  ];
function cleanUntrusted(s, max = 1800) {
  let t = foldText(s).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, " ").replace(
    /[<>]/g,
    " ",
  );
  for (const rx of LABEL_RXS) t = t.replace(rx, " ");
  return t.replace(/\[\s*D?\s*\d{1,3}\s*\]\s*\(?/gi, " ").replace(
    /\b(TYPE|TABLE|CHART|SOURCES)\s*:/gi,
    "$1 -",
  ).replace(/\s{2,}/g, " ").trim().slice(0, max);
}
function docBlock(n, header, title, text) {
  return `<document_excerpt n="${n}">
[${n}] (${cleanUntrusted(header, 300)}) ${cleanUntrusted(title, 200)}
${cleanUntrusted(text, 1600)}
</document_excerpt>`;
}
const METRIC =
    /\(\s*[\d.,]+\s*(m|mm|cm|km|kg|kpa|m3|m2|meters?|metres?|millimeters?|millimetres?|centimeters?|centimetres?|kilograms?)\s*\)/gi,
  norm = (s) =>
    foldText(s).replace(/\[\s*D?\d{1,3}\s*\]/gi, " ").replace(/\[([a-z])\]/gi, "$1").replace(
      METRIC,
      " ",
    ).toLowerCase().replace(/[\u2018\u2019\u201c\u201d\u201e\u00ab\u00bb"'`]/g, "").replace(
      /[\u2010-\u2015]/g,
      "-",
    ).replace(/(?<!\d)\.|\.(?!\d)/g, " ").replace(/[^a-z0-9.%()\-]+/g, " ").replace(/\s+/g, " ")
      .trim(),
  OSHA_REF = /\b(osha|cfr|19(10|26)(\.\d+)?|subpart [a-z]{1,2})\b/i,
  NB = (cls) => `[^${cls}]{20,1200}`,
  QUOTE_RXS = [
    // straight quotes are paired at ANY length (an opening quote follows a space or "(", a closing one follows a
    // non-space), and only spans of 20+ characters are checked: with a 20-character minimum in the pattern itself a
    // short quoted phrase ("20 feet or less") was skipped and the text BETWEEN two quotes was then judged as a quote.
    /(?<=^|[\s(\[:*_>\u2014\u2013-])"(?=\S)([^"]{1,1200}?)(?<=\S)"(?=$|[\s.,;:!?)\]\[*_\u2014\u2013-])/gm,
    new RegExp(`\u201E(${NB("\u201C\u201D\u201E")})[\u201C\u201D]`, "g"),
    new RegExp(`\u201C(${NB("\u201C\u201D")})\u201D`, "g"),
    new RegExp(`\xAB\\s?(${NB("\xAB\xBB")})\\s?\xBB`, "g"),
    new RegExp("`(" + NB("`") + ")`", "g"),
    new RegExp(`\uFF02(${NB("\uFF02")})\uFF02`, "g"),
    new RegExp(`\u300C(${NB("\u300C\u300D")})\u300D`, "g"),
    new RegExp(`\u300E(${NB("\u300E\u300F")})\u300F`, "g"),
    new RegExp(`\u2033(${NB("\u2033")})\u2033`, "g"),
    /(?<=^|[\s(:\[])['\u2018]((?:[^'\u2019\n]|(?<=\p{L})['\u2019](?=\p{L})){20,1200})['\u2019](?=$|[\s.,;:!?)\]])/gmu,
  ],
  VERBS =
    "(reads as follows|is as follows|provides as follows|states as follows|reads|says|states|provides|requires|is worded)",
  SAYS_RX = new RegExp(
    `\\b(?:${VERBS}\\s*:|(reads) that)[ \\t]*(?:\\n[ \\t]*)?(?=[^\\s"\u201C\u201D\u201E\xAB'\u2018\u2019\`>*\u2022-])([^\\n]{18,600}?)(?=(?<=[.!?])\\s|\\n|$)`,
    "gi",
  ),
  SAYS_LIST_RX = new RegExp(
    `\\b${VERBS}\\s*:[ \\t]*((?:\\n[ \\t]*(?:[-*\u2022]|\\d{1,2}[.)])[ \\t]+[^\\n]+)+)`,
    "gi",
  ),
  BLOCKQUOTE_RX = /(?:^|\n)((?:[ \t]*>[ \t]?[^\n]*(?:\n|$))+)/g,
  REF_WINDOW = 80,
  OTHER_SUBJECT =
    /\b(app|page|education|spec|specs|specification|plans?|drawings?|permit|document|manual|manufacturer|engineer|letter|city|county|contract|submittal|tab data|foreman|daily)\b/i;
function checkOshaQuotes(answer, verbatimTexts, opts = {}) {
  const text = String(answer).replace(/&quot;|&#0*34;|&#x0*22;/gi, '"');
  if (!OSHA_REF.test(foldText(text))) return { text: String(answer), removed: 0 };
  const after = (src, end) => {
      const t = src.slice(end, end + REF_WINDOW), m = t.match(/[.!?;](?=\s|$)|\n|\bbut\b/i);
      return m ? t.slice(0, m.index || 0) : t;
    },
    citeKind = (c) => c && opts.cites ? opts.cites[c]?.kind : void 0,
    tied = (whole, offset, src) =>
      OSHA_REF.test(
        foldText(src.slice(Math.max(0, offset - REF_WINDOW), offset + Math.min(whole.length, 40)))
          .slice(0, REF_WINDOW + 40),
      ) || OSHA_REF.test(foldText(after(src, offset + whole.length))) ||
      citeKind(citeOf(whole, offset, src)) === "osha",
    hay = [
      ...verbatimTexts,
      ...Object.values(opts.cites || {}).filter((c) => c.kind === "osha" && c.text).map((c) =>
        c.text
      ),
    ].map(norm),
    qn = opts.question ? norm(opts.question) : "",
    anyText = Object.values(opts.cites || {}).filter((c) => c && c.text).map((c) => norm(c.text)),
    inAll = (q, hs) => {
      const pieces = q.split(/\s*\[?(?:\.\.\.|\u2026)\]?\s*/).map(norm).filter(Boolean);
      return pieces.length > 0 && pieces.join(" ").length >= 8 &&
        pieces.every((p) => hs.some((h) => h.includes(p)));
    },
    citeOf = (whole, offset, src) => {
      const pick = (t, last) => {
        const all = [...t.matchAll(/\[\s*(D?\d{1,3})\s*\]/gi)],
          m = last ? all[all.length - 1] : all[0];
        return m ? m[1].toUpperCase() : null;
      };
      return pick(whole, !1) || pick(after(src, offset + whole.length), !1) ||
        pick(src.slice(Math.max(0, offset - REF_WINDOW), offset), !0);
    },
    oshaAttributed = (whole, offset, src) => {
      const aft = foldText(after(src, offset + whole.length)).split(";")[0],
        ao = aft.search(OSHA_REF),
        ax = aft.search(OTHER_SUBJECT);
      if (ao >= 0 && (ax < 0 || ao < ax)) return !0;
      const clause = foldText(
          src.slice(Math.max(0, offset - REF_WINDOW), offset).split(/[.;!?\n](?=\s|$)|\n/).pop() ||
            "",
        ),
        lastOf = (rx) => {
          let at = -1;
          for (const m of clause.matchAll(new RegExp(rx.source, "gi"))) at = m.index ?? at;
          return at;
        };
      let cited = -1;
      for (const m of clause.matchAll(/\[\s*(D?\d{1,3})\s*\]/gi)) {
        const k = citeKind(m[1].toUpperCase());
        (k === "other" || k === "data") && (cited = m.index ?? cited);
      }
      const o = lastOf(OSHA_REF), other = Math.max(lastOf(OTHER_SUBJECT), cited);
      return o >= 0 && o > other;
    },
    judge = (q, whole, offset, src) => {
      if (qn && norm(q).length >= 8 && qn.includes(norm(q))) return "keep";
      if (inAll(q, hay)) return "ok";
      // lib8: word for word in an excerpt the model was given (a state card quoting its own rule): not a made-up quote
      if (anyText.length && inAll(q, anyText)) return "ok";
      if (oshaAttributed(whole, offset, src)) return "bad";
      const c = citeOf(whole, offset, src), info = c && opts.cites ? opts.cites[c] : void 0;
      return info?.kind === "data" || !info && c && c.startsWith("D")
        ? "keep"
        : info?.kind === "other" && info.text && inAll(q, [norm(info.text)])
        ? "ok"
        : "bad";
    };
  let removed = 0, out = text, tiedEnd = -1;
  const near = (offset, src) =>
      tiedEnd >= 0 && offset - tiedEnd <= REF_WINDOW && offset >= tiedEnd &&
      !/\n\s*\n/.test(src.slice(tiedEnd, offset)),
    check = (q, whole, offset, src) =>
      !tied(whole, offset, src) && !near(offset, src)
        ? "skip"
        : (tiedEnd = offset + whole.length, judge(q, whole, offset, src));
  for (const rx of QUOTE_RXS) {
    tiedEnd = -1,
      out = out.replace(
        rx,
        (whole, q, offset, src) =>
          q.length < 20 || check(q, whole, offset, src) !== "bad"
            ? whole
            : (removed++, "[quote removed: not found in the OSHA text the app has]"),
      );
  }
  tiedEnd = -1,
    out = out.replace(BLOCKQUOTE_RX, (whole, block, offset, src) => {
      const q = block.replace(/^[ \t]*>[ \t]?/gm, " ").trim();
      if (q.length < 12) return whole;
      const at = offset + whole.indexOf(block);
      return check(q, block, at, src) !== "bad"
        ? whole
        : (removed++,
          whole.slice(0, whole.indexOf(block)) +
          "> [quote removed: not found in the OSHA text the app has]" + (block.endsWith(`
`)
            ? `
`
            : ""));
    });
  const subjectOther = (offset, src) => {
    const subj = src.slice(Math.max(0, offset - 60), offset).split(/[.;!?\n]/).pop() || "";
    return !OSHA_REF.test(foldText(subj)) && OTHER_SUBJECT.test(subj);
  };
  return tiedEnd = -1,
    out = out.replace(SAYS_LIST_RX, (whole, verb, list, offset, src) => {
      if (
        subjectOther(offset, src) ||
        !tied(whole.slice(0, verb.length + 1), offset, src) && !near(offset, src)
      ) return whole;
      let bad = 0;
      const items = list.replace(
        /(\n[ \t]*(?:[-*\u2022]|\d{1,2}[.)])[ \t]+)([^\n]+)/g,
        (_m, lead, item) =>
          judge(item.replace(/[.;]\s*$/, ""), item, offset, src) !== "bad"
            ? lead + item
            : (bad++, lead + "[wording removed: not found in the OSHA text the app has]"),
      );
      return removed += bad,
        tiedEnd = offset + whole.length,
        whole.slice(0, whole.length - list.length) + items;
    }),
    tiedEnd = -1,
    out = out.replace(
      SAYS_RX,
      (whole, verb, verb2, q, offset, src) =>
        subjectOther(offset, src) || check(q.replace(/[.!?]\s*$/, ""), whole, offset, src) !== "bad"
          ? whole
          : (removed++,
            (verb || verb2) + ": [wording removed: not found in the OSHA text the app has]"),
    ),
    { text: removed ? out : String(answer), removed };
}
export { checkOshaQuotes, cleanUntrusted, docBlock, foldText };
