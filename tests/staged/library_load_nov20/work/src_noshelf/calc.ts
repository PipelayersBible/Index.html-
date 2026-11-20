const FUNCS = {
    round: (a) => {
      const p = a.length > 1 ? Math.trunc(a[1]) : 0;
      if (p < 0 || p > 6) throw new Error("round places must be 0-6");
      const f = 10 ** p;
      return Math.round((a[0] + Math.sign(a[0]) * 1e-12) * f) / f;
    },
    ceil: (a) => Math.ceil(a[0] - 1e-12),
    floor: (a) => Math.floor(a[0] + 1e-12),
    abs: (a) => Math.abs(a[0]),
    min: (a) => Math.min(...a),
    max: (a) => Math.max(...a),
    // v25: field trig is in DEGREES (miters, bevels, slopes, offsets); inverse functions answer in degrees
    sqrt: (a) => { if (a[0] < 0) throw new Error("sqrt of a negative number"); return Math.sqrt(a[0]); },
    pow: (a) => Math.pow(a[0], a[1]),
    hypot: (a) => Math.hypot(...a),
    sin: (a) => Math.sin(a[0] * DEG),
    cos: (a) => Math.cos(a[0] * DEG),
    tan: (a) => { if (Math.abs(Math.cos(a[0] * DEG)) < 1e-12) throw new Error("tan is undefined at that angle"); return Math.tan(a[0] * DEG); },
    asin: (a) => { if (a[0] < -1 || a[0] > 1) throw new Error("asin needs a value from -1 to 1"); return Math.asin(a[0]) / DEG; },
    acos: (a) => { if (a[0] < -1 || a[0] > 1) throw new Error("acos needs a value from -1 to 1"); return Math.acos(a[0]) / DEG; },
    atan: (a) => Math.atan(a[0]) / DEG,
    atan2: (a) => Math.atan2(a[0], a[1]) / DEG,
    pi: () => Math.PI,
  },
  DEG = Math.PI / 180,
  ARITY = { round: [1, 2], ceil: [1, 1], floor: [1, 1], abs: [1, 1], min: [1, 20], max: [1, 20], sqrt: [1, 1], pow: [2, 2], hypot: [2, 3], sin: [1, 1], cos: [1, 1], tan: [1, 1], asin: [1, 1], acos: [1, 1], atan: [1, 1], atan2: [2, 2], pi: [0, 0] },
  NAMES = Object.keys(ARITY).join(", ");
function calc(expression) {
  const src = String(expression ?? "").trim();
  if (!src) return { ok: !1, error: "empty expression" };
  if (src.length > 300) return { ok: !1, error: "expression too long (max 300 characters)" };
  const s = src.replace(/\u00d7/g, "*").replace(/\u00f7/g, "/").replace(/\u2212/g, "-");
  let i = 0, depth = 0, inFunc = 0;
  const ws = () => {
      for (; i < s.length && /\s/.test(s[i]);) i++;
    },
    fail = (m) => {
      throw new Error(m);
    },
    num = () => {
      ws();
      const m = (inFunc ? /^\d+(\.\d+)?|^\.\d+/ : /^(\d{1,3}(,\d{3})+|\d+)(\.\d+)?|^\.\d+/).exec(
        s.slice(i),
      );
      return m || fail(`expected a number at position ${i + 1}`),
        i += m[0].length,
        Number(m[0].replace(/,/g, ""));
    },
    factor = () => {
      ws(), ++depth > 40 && fail("too deeply nested");
      try {
        if (s[i] === "-") return i++, -factor();
        if (s[i] === "+") return i++, factor();
        if (s[i] === "(") {
          i++;
          const v = expr();
          return ws(), s[i] !== ")" && fail("missing )"), i++, v;
        }
        const name = /^[a-z][a-z0-9]*/i.exec(s.slice(i));
        if (name) {
          const f = name[0].toLowerCase();
          FUNCS[f] ||
          fail(`unknown name "${name[0]}" (allowed: ${NAMES})`),
            i += name[0].length,
            ws(),
            s[i] !== "(" && fail(`${f} needs (`),
            i++,
            inFunc++;
          ws();
          if (s[i] === ")" && ARITY[f][0] === 0) { inFunc--, i++; return FUNCS[f]([]); }
          const args = [expr()];
          for (ws(); s[i] === ",";) {
            /\d/.test(s[i - 1] || "") && /^,\d{3}(?!\d)/.test(s.slice(i)) &&
            fail(
              "ambiguous comma: write numbers inside round() / min() / max() without thousands commas, and put a space after each argument comma",
            ),
              i++,
              args.push(expr()),
              ws();
          }
          inFunc--, s[i] !== ")" && fail("missing )"), i++;
          const [lo, hi] = ARITY[f];
          return (args.length < lo || args.length > hi) &&
            fail(`${f} takes ${lo === hi ? lo : lo + "-" + hi} argument(s)`),
            FUNCS[f](args);
        }
        return num();
      } finally {
        depth--;
      }
    },
    power = () => {
      const b = factor();
      ws();
      if (s[i] === "^") { i++; const e = unary(); const v = Math.pow(b, e); return v; }
      return b;
    },
    unary = () => { ws(); if (s[i] === "-") return i++, -unary(); if (s[i] === "+") return i++, unary(); return power(); },
    term = () => {
      let v = unary();
      for (;;) {
        ws();
        const op = s[i];
        if (op === "*") i++, v *= unary();
        else if (op === "/") {
          i++;
          const d = unary();
          d === 0 && fail("division by zero"), v /= d;
        } else return v;
      }
    },
    expr = () => {
      let v = term();
      for (;;) {
        ws();
        const op = s[i];
        if (op === "+") i++, v += term();
        else if (op === "-") i++, v -= term();
        else return v;
      }
    };
  try {
    const v = expr();
    ws(),
      i < s.length && fail(`unexpected "${s[i]}" at position ${i + 1}`),
      Number.isFinite(v) || fail("result is not a finite number");
    const value = Number(v.toPrecision(12));
    return { ok: !0, value, text: `${src} = ${value}` };
  } catch (e) {
    return { ok: !1, error: String(e.message || e) };
  }
}
import { mathEval } from "./math.ts";
// v25b: calc's strict parser first (exact, predictable); anything it can't read goes to the full math engine
function calcAny(expression) {
  const a = calc(expression);
  if (a.ok) return a;
  const b = mathEval(expression);
  return b.ok ? b : { ok: !1, error: /^(division by zero|tan is undefined|asin needs|acos needs|sqrt of a negative)/.test(a.error) ? a.error : b.error };
}
export { calcAny as calc, calc as calcStrict };
