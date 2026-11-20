import { verifyNumbers } from "./verify.ts";
import { preFilter } from "./gonogo.ts";
const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}+/gu, "");
async function readAnthropic(res, onText) {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || !/event-stream/i.test(ct)) {
    const j = await res.json().catch(() => null);
    return { r: { ok: res.ok, status: res.status }, j };
  }
  const msg = { content: [], stop_reason: null, usage: {} }, partial = {};
  let failed = null;
  const handle = (ev, data) => {
      if (!data) return;
      const type = data.type || ev;
      if (type === "message_start") {
        Object.assign(msg, data.message || {}, { content: [] }),
          msg.usage = { ...data.message?.usage || {} };
      } else if (type === "content_block_start") {
        msg.content[data.index] = { ...data.content_block || {} },
          msg.content[data.index].type === "text" &&
          (msg.content[data.index].text = msg.content[data.index].text || "");
      } else if (type === "content_block_delta") {
        const b = msg.content[data.index] ||= {}, d = data.delta || {};
        d.type === "text_delta"
          ? (b.text = (b.text || "") + d.text, onText && d.text && onText(d.text))
          : d.type === "input_json_delta"
          ? partial[data.index] = (partial[data.index] || "") + (d.partial_json || "")
          : d.type === "thinking_delta"
          ? b.thinking = (b.thinking || "") + (d.thinking || "")
          : d.type === "signature_delta"
          ? b.signature = d.signature
          : d.type === "citations_delta" && (b.citations ||= []).push(d.citation);
      } else if (type === "content_block_stop") {
        if (partial[data.index] !== void 0) {
          const b = msg.content[data.index];
          try {
            b.input = partial[data.index] ? JSON.parse(partial[data.index]) : {};
          } catch {
            b.input = {};
          }
          delete partial[data.index];
        }
      } else {type === "message_delta"
          ? (data.delta?.stop_reason !== void 0 && (msg.stop_reason = data.delta.stop_reason),
            data.delta?.container && (msg.container = data.delta.container),
            Object.assign(msg.usage, data.usage || {}))
          : type === "error" && (failed = data.error || { type: "error" });}
    },
    reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    value && (buf += value);
    let k;
    for (; (k = buf.search(/\r?\n\r?\n/)) !== -1;) {
      const raw = buf.slice(0, k);
      buf = buf.slice(k).replace(/^\r?\n\r?\n/, "");
      let ev = "", data = "";
      for (const line of raw.split(/\r?\n/)) {
        line.startsWith("event:")
          ? ev = line.slice(6).trim()
          : line.startsWith("data:") && (data += line.slice(5).trim());
      }
      if (data) {
        let j = null;
        try {
          j = JSON.parse(data);
        } catch {}
        handle(ev, j);
      }
    }
    if (done) break;
  }
  return msg.content = msg.content.filter(Boolean),
    failed
      ? {
        r: { ok: !1, status: failed.type === "overloaded_error" ? 529 : 500 },
        j: { error: failed },
      }
      : msg.stop_reason
      ? { r: { ok: !0, status: 200 }, j: msg }
      : { r: { ok: !1, status: 502 }, j: null };
}
class Out {
  streaming = !1;
  alive = !0;
  gone = !1;
  promise;
  resolve;
  ctl = null;
  enc = new TextEncoder();
  ping;
  onGone = null;
  cors;
  constructor(cors) {
    this.cors = cors,
      this.promise = new Promise((r) => {
        this.resolve = r;
      });
  }
  json(status, body) {
    this.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { ...this.cors, "Content-Type": "application/json" },
      }),
    );
  }
  open() {
    if (this.streaming) return;
    this.streaming = !0;
    const stream = new ReadableStream({
      start: (c) => {
        this.ctl = c;
      },
      cancel: () => {
        this.gone = !0, this.alive = !1, clearInterval(this.ping);
        try {
          this.onGone?.();
        } catch {}
      },
    });
    this.resolve(
      new Response(stream, {
        status: 200,
        headers: {
          ...this.cors,
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      }),
    ),
      this.send("meta", { v: 2, stream: !0 }),
      this.ping = setInterval(() =>
        this.raw(`: ping

`), 15e3);
  }
  raw(s) {
    if (!(!this.alive || !this.ctl)) {
      try {
        this.ctl.enqueue(this.enc.encode(s));
      } catch {
        this.alive = !1;
      }
    }
  }
  send(event, data) {
    this.raw(`event: ${event}
data: ${JSON.stringify(data)}

`);
  }
  close() {
    if (clearInterval(this.ping), this.ctl) {
      try {
        this.ctl.close();
      } catch {}
    }
    this.ctl = null;
  }
  reply = (status, body) => {
    if (!this.streaming) return this.json(status, body), new Response(null, { status: 204 });
    status === 200
      ? this.send("final", body)
      : (this.send("reset", {}), this.send("error", { status, ...body }));
    const ok = this.alive;
    return this.close(), this.alive = ok && status === 200, new Response(null, { status: 204 });
  };
}
const HOLD_RX =
    /\b(confined|permits?|entry|entries|entrant\w*|enter(ing|s|ed)? (the |a |that |this )?(space|manhole|mh|vault|hole|trench|excavation|pit|tank|structure|well|box)|attendants?|hole ?watch|rescue\w*|manholes?|manhoel|mh|mhs|m\.h|m\/h|man-holes?|vaults?|vualt|wet ?wells?|lift stations?|the (lift|can|box|bottom|hole)|tanks?|holes?|pits?|structures?|catch ?basins?|inlets?|culverts?|sewers?|trench\w*|excavations?|excavating|ditch\w*|cave[- ]?ins?|shor(e|ed|es|ing)|trench ?box\w*|box(es)?|shields?|benching|slop(ed|ing) (back|walls?|sides?)|protective|protection|protected|ladders?|egress|atmospher\w*|air|gas(es)?|4[- ]?gas|o2|oxygen|lel|lfl|h2s|hydrogen sulfide|methane|carbon monoxide|ppm|sniffer|monitor\w*|bump|ventilat\w*|blower|fan|fumes?|toxic|explosive|flammable|harness|competent person|(go|going|get|gets|hop|hops|drop|drops|climb\w*|crawl\w*|head|heads|step|steps|send|sent|lower|go back) (\w+ )?(in|into|inside|down|under|below)|down (in|into|there|inside|below)|below grade|safe(ly|ty)?|unsafe|hazard\w*|danger\w*|good to go|go for it|go ahead|go on|all set|(you|he|she|they|it|jose|we)( a)?'?(re|s| is| are)? (all )?(good|fine|ok|okay|set|clear|cleared|covered|ready|free to)|(ok|okay|fine|clear|cleared|safe|alright|allowed|good|free|ready) (to|for)|(can|may|could|should|is free to|are free to|is cleared to|gets? to) (\w+ )?(start|go|work|begin|enter|proceed|head|get started|get going)|(let|have|send|get) (him|her|them|it|jose|\w+) (start|go|work|begin|in|down|at it|get)|let (him|her|them)|send (him|her|them|it)|green light|light'?s green|(it'?s|that'?s|that is|it is) a go|a-ok|have at it|carry on|knock yourself out|cleared|in range|within (range|limits)|normal|fine to|should be fine|that'?ll do|will do|no (problem|worries|issue|reason)|nothing (stops|wrong)|ready when|that works|check(s|ed)? out|looks? (good|fine|normal|ok|okay|great)|thumbs up|proceed\w*|allowed|approv\w*|adequate|acceptable|enough|plenty|skip\w*|leave (it|them|the \w+) (out|off)|without (a|an|the|any)|no need|not (needed|required|necessary)|(don'?t|doesn'?t|do not|does not) (need|have) (one|it|a|an|the|that|this|them|to (wear|use|test|vent\w*|have|run))|injur\w*|emergenc\w*|911|zanjas?|pozos?|espacio|seguro|entrar|bajar\w*|baje|entre|meta|metase|oxigeno|gas|adelante|orale|andale|simon|que (baje|entre|se meta|empiece|trabaje)|ya puede\w*|pued\w* (\w+ )?(empezar|comenzar|trabajar|entrar|bajar\w*|meterse|seguir|proceder|ir)|all good|keep (going|working|digging|laying|moving|at it)|get after it|get to work|nothing to worry|(don'?t|do not|doesn'?t) need anything|nothing (extra )?(is |would be )?(required|needed|called for)|nothing in them|wouldn'?t stop|overkill|non-issue|agreed|squared away|within spec|no concerns?|looks solid|begin work|tell \w+ to start|that checks|exactly right|right one|indeed|clean (air|numbers)|fresh air|textbook|what you want to see|is common|are normal|is normal|is expected|false reading|reset it|dale|todo bien|sin problema|no hay bronca|pueden seguir|sigan|a darle|le (pueden|puede) seguir|nom[aá]s|doesn'?t call for|calls? for nothing|smell\w*|odou?r|rotten|lid|sets? (those|them|it) off|alarm\w*|humidity|sump|cleanout|sloughing|caving|banks?|walls?|scba|pid|cajon|hoyo|huele|abajo|seguimos)\b/i,
  VERDICT_RX =
    /^[\s\-*\u2022>#\d.)¡¿_(\[\]\p{Extended_Pictographic}\ufe0f]*(yes|yeah|yea|yep|yup|ya|yessir|aye|mhm|uh-?huh|sure|absolutely|definitely|of course|certainly|correct|right|affirmative|copy|roger|10-4|you bet|for sure|no|nope|nah|negative|not yet|never|ok(ay)?|fine|good|go|si|claro|orale|andale|simon|va|adelante|proceed|well,? yes|in short|short answer|bottom line|verdict|agreed|indeed|exactly|dale|todo bien|it is|that checks)\b/iu,
  TAIL_VERDICT_RX = /[:,\-\u2014]\s*(yes|yep|yeah|sure|no|nope|go)\s*[.!]*\s*$/i,
  EMOJI_RX = /[\p{Extended_Pictographic}\u2705\u2714\u2611]/u,
  REG_VOICE_RX =
    /\b(feds|federal (rules?|standards?|regs?|law)|government (standard|rule|regulation)s?|labor department|exempt\w*|the book('?s)? (wording|cutoff|says|calls)|under the (rules|regs|book)|the regs? (are|is|say)|fed osha|shall|each employee|employers? (must|shall)|the (standard|regulation|regs?|rule|law|code) (is|says|states|requires|reads|puts|tells|goes)|per the (standard|regulation|regs?|rule|law|code)|federal (rule|law|regulation|standard)|department of labor|section [\w.-]+|paragraph|part [\w-]+|o\.?h\.?s\.?a\.?|o\.s\.h\.a|occupational safety|title [\w-]+|regulation'?s?|word[- ]for[- ]word|exact (text|words|wording)|goes like this|puts it|tells us)\b/i,
  OSHA_REF_RX = /\b(osha|cfr|19(10|26)(\.\d+)?|subpart\s+[a-z]{1,2}|niosh|ansi)\b|§/i,
  QUOTE_RX =
    /["\u201c\u201d\u201e\u201f\u00ab\u00bb`\uff02\u300c\u300d\u300e\u300f\u2033\u2018’\u201a\u201b]|&quot;|(?<!\p{L})'|'(?!\p{L})/iu,
  SAYS_RX =
    /\b(reads|says|said|states|stated|provides|requires|required|is worded|spells out|puts it)\s*:|\b(reads|says|states|stated|requires|provides|mandates|demands|calls for) that\b|\b(as follows|according to|in (its|their) (own )?words|word for word|verbatim)\b/i,
  EMPH_RX = /^\s*[*_]{1,2}\S/,
  GENERIC_RX =
    /\b(cut ?sheets?|cuts?|cutting|cutter|excavators?|enter(ing|s|ed)?(?! (the |a |that |this )?(space|manhole|mh|vault|hole|trench|excavation|pit|tank|structure|well|box)))\b/gi,
  NUM_WORDS = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20",
    thirty: "30",
    forty: "40",
    fifty: "50",
    sixty: "60",
    seventy: "70",
    eighty: "80",
    ninety: "90",
    hundred: "100",
    thousand: "1000",
    half: "0.5",
    quarter: "0.25",
    dozen: "12",
    third: "0.33",
    once: "1",
    twice: "2",
    double: "2",
    triple: "3",
    uno: "1",
    dos: "2",
    tres: "3",
    cuatro: "4",
    cinco: "5",
    seis: "6",
    siete: "7",
    ocho: "8",
    nueve: "9",
    diez: "10",
  },
  NUM_WORD_RX = new RegExp(`\\b(${Object.keys(NUM_WORDS).join("|")})\\b`, "gi"),
  digitsForWords = (s) => s.replace(NUM_WORD_RX, (w) => NUM_WORDS[w.toLowerCase()]),
  HEAD_PLAIN_RX = /^\s*(TYPE|TABLE|CHART|SOURCES)\s*:/i,
  HEAD_RX = /^\s*[*_#>\s]*(TYPE|TABLE|CHART|SOURCES)\s*[*_]*\s*:/i,
  HEAD_PREFIX_RX =
    /^\s*[*_#>\s]*(T|TY|TYP|TYPE|TA|TAB|TABL|TABLE|C|CH|CHA|CHAR|CHART|S|SO|SOU|SOUR|SOURC|SOURCE|SOURCES)?\s*[*_]*\s*$/i;
class Releaser {
  raw = "";
  pos = 0;
  held = !1;
  shown = "";
  reason = "";
  body = !1;
  prev = "";
  evidence;
  calcValues;
  sources;
  emit;
  constructor(evidence, calcValues, sources, emit) {
    this.evidence = evidence,
      this.calcValues = calcValues,
      this.sources = sources,
      this.emit = emit;
  }
  reset() {
    this.raw = "",
      this.pos = 0,
      this.held = !1,
      this.shown = "",
      this.reason = "",
      this.body = !1,
      this.prev = "";
  }
  hold(why) {
    this.held || (this.held = !0, this.reason = why);
  }
  feed(t) {
    for (this.raw += t; !this.held;) {
      const rest = this.raw.slice(this.pos);
      if (!rest) return;
      if (
        this.pos === 0 || this.raw[this.pos - 1] === `
`
      ) {
        const nl = rest.indexOf(`
`),
          head = nl === -1 ? rest : rest.slice(0, nl),
          hm = head.match(this.body ? HEAD_PLAIN_RX : HEAD_RX);
        if (hm) {
          if (nl === -1) return;
          if (hm[1].toUpperCase() === "TYPE" && /safety/i.test(head)) {
            this.hold("type_safety");
            return;
          }
          this.pos += nl + 1;
          continue;
        }
        if (
          nl === -1 && !this.body && HEAD_PREFIX_RX.test(head) ||
          nl === -1 && this.body && /^\s*[A-Z]{0,7}$/i.test(head) &&
            /^\s*(T|TY|TYP|TYPE|TA|TAB|TABL|TABLE|C|CH|CHA|CHAR|CHART|S|SO|SOU|SOUR|SOURC|SOURCE|SOURCES)?$/i
              .test(head)
        ) return;
      }
      const m = rest.match(/^[\s\S]*?(?:[.!?:](?=\s)|\n)/);
      if (!m) return;
      let unit = m[0];
      const after = rest.slice(unit.length).match(/^[ \t]+/);
      if (after && (unit += after[0]), !this.ok(unit)) return;
      this.pos += unit.length, unit.trim() && (this.body = !0, this.prev = unit);
      const out = this.tidy(unit);
      out && (this.shown += out, this.emit(out));
    }
  }
  ok(unit) {
    if (!unit.trim()) return !0;
    const u = unit.replace(/(?<=\p{L})’(?=\p{L})/gu, "'"),
      f = fold(u),
      both = fold(this.prev + " " + u);
    return /^\s*>/.test(u) || EMPH_RX.test(u) || QUOTE_RX.test(u) || OSHA_REF_RX.test(f) ||
        SAYS_RX.test(f) || REG_VOICE_RX.test(f)
      ? (this.hold("quote"), !1)
      : EMOJI_RX.test(u) || VERDICT_RX.test(f) || TAIL_VERDICT_RX.test(f) || HOLD_RX.test(both) ||
          preFilter(f.replace(GENERIC_RX, " "))
      ? (this.hold("hazard"), !1)
      : verifyNumbers(digitsForWords(u), this.evidence, this.calcValues).ok
      ? !0
      : (this.hold("number"), !1);
  }
  tidy(unit) {
    const known = new Set(this.sources().map((x) => String(x.n).toUpperCase()));
    let s = unit.replace(/\*\*/g, "");
    return (this.pos - unit.length === 0 || this.raw[this.pos - unit.length - 1] === `
`) && (s = s.replace(/^#+\s*/, "")),
      s = s.replace(
        /\[\s*(D?\d{1,3}(?:\s*[,;]\s*D?\d{1,3})*)\s*\]/gi,
        (_m, g) =>
          g.split(/\s*[,;]\s*/).map((r) => r.toUpperCase()).filter((r) => known.has(r)).map((r) =>
            `[${r}]`
          ).join(""),
      ).replace(/[ \t]+([.,;:])/g, "$1"),
      !this.shown && !s.trim() ? "" : s;
  }
}
const norm = (s) =>
  String(s || "").replace(/\[[^\]]{1,12}\]/g, " ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
function keptShown(shown, finalText) {
  const a = norm(shown);
  return !a || norm(finalText).includes(a);
}
const STREAM_NOTE = "Updated after a final check. Use this version.";
export { digitsForWords, HOLD_RX, keptShown, Out, readAnthropic, Releaser, STREAM_NOTE };
