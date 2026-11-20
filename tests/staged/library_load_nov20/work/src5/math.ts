// v25b: the full math engine behind calc (mathjs). calc's own strict parser runs first; anything it can't read
// (units, algebra, geometry helpers, more functions) comes here. Trig takes DEGREES for plain numbers
// (sin(45) = 0.7071) and inverse trig answers in degrees, same as calc; a unit angle (sin(0.5 rad)) still works.
import { all, create } from "npm:mathjs@13.2.0";

const m = create(all, { number: "number", precision: 64 });
const DEG = Math.PI / 180;
const orig = { evaluate: m.evaluate, parse: m.parse, sin: m.sin, cos: m.cos, tan: m.tan, asin: m.asin, acos: m.acos, atan: m.atan, atan2: m.atan2 };
const isNum = (x: unknown) => typeof x === "number";
const deny = (name: string) => () => { throw new Error(`${name} is not available`); };

// numeric solve: solve("x^2 + 3x = 10", "x") or solve("...", "x", lo, hi). Finds a root by bracketing + bisection.
function solve(eq: string, v = "x", lo?: number, hi?: number) {
  if (typeof eq !== "string" || typeof v !== "string" || !/^[a-z]\w{0,15}$/i.test(v)) throw new Error('solve("equation", "x", low, high)');
  const parts = eq.split("=");
  if (parts.length > 2) throw new Error("one = sign only");
  const L = orig.parse(parts[0]).compile(), R = parts.length === 2 ? orig.parse(parts[1]).compile() : null;
  const f = (x: number) => { const sc = { [v]: x }; const a = Number(L.evaluate(sc)), b = R ? Number(R.evaluate(sc)) : 0; return a - b; };
  const tryBracket = (a: number, b: number) => {
    let fa = f(a), fb = f(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
    if (fa === 0) return a; if (fb === 0) return b;
    if (Math.sign(fa) === Math.sign(fb)) return null;
    for (let k = 0; k < 200; k++) { const c = (a + b) / 2, fc = f(c); if (!Number.isFinite(fc)) return null; if (Math.abs(fc) < 1e-12 || (b - a) / 2 < 1e-12) return c; if (Math.sign(fc) === Math.sign(fa)) { a = c; fa = fc; } else { b = c; fb = fc; } }
    return (a + b) / 2;
  };
  const a0 = isNum(lo) ? lo! : -1e6, b0 = isNum(hi) ? hi! : 1e6;
  if (!(a0 < b0)) throw new Error("low must be below high");
  // scan the range in steps (finer near 0) and return every root found, smallest first
  const roots: number[] = [], N = 4000;
  const pts: number[] = [];
  if (isNum(lo) && isNum(hi)) { for (let k = 0; k <= N; k++) pts.push(a0 + (b0 - a0) * k / N); }
  else { for (let k = -N; k <= N; k++) { const t = k / N; pts.push(Math.sign(t) * Math.pow(Math.abs(t), 3) * 1e6); } }
  for (let k = 0; k < pts.length - 1 && roots.length < 6; k++) {
    let r: number | null = null; try { r = tryBracket(pts[k], pts[k + 1]); } catch { r = null; }
    if (r !== null && !roots.some((x) => Math.abs(x - r!) < 1e-7 * Math.max(1, Math.abs(r!)))) roots.push(r);
  }
  if (!roots.length) throw new Error("no solution found in that range; give a low and high bound");
  return roots.length === 1 ? roots[0] : m.matrix(roots);
}

// field helpers: feet-inches-fractions, stations, grade, volumes
function ftin(v: unknown, inches?: unknown): number {
  if (typeof v === "number") return v + (typeof inches === "number" ? inches / 12 : 0); // ftin(5, 3.5) = 5' 3-1/2"
  const t = String(v ?? "").trim().toLowerCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"').replace(/feet|foot|ft/g, "'").replace(/inches|inch|in\b/g, '"');
  const frac = (x: string) => x.trim().split(/[\s-]+/).filter(Boolean).reduce((a, w) => { const f = /^(\d+)\/(\d+)$/.exec(w); if (f) { if (+f[2] === 0) throw new Error("bad fraction"); return a + +f[1] / +f[2]; } if (!/^\d*\.?\d+$/.test(w)) throw new Error(`can't read "${x}" as feet and inches`); return a + Number(w); }, 0);
  const m1 = /^(-)?\s*(?:([\d.\s\/-]+)')?\s*(?:([\d.\s\/-]+)"?)?$/.exec(t);
  if (!m1 || (!m1[2] && !m1[3])) throw new Error(`can't read "${v}" as feet and inches (e.g. 5' 3 1/2")`);
  const ft = (m1[2] ? frac(m1[2]) : 0) + (m1[3] ? frac(m1[3]) / 12 : 0);
  return m1[1] ? -ft : ft;
}
function to_ftin(x: number, denom = 16): string {
  if (!Number.isFinite(x)) throw new Error("not a number");
  const neg = x < 0; let tot = Math.round(Math.abs(x) * 12 * denom) / denom;
  let f = Math.floor(tot / 12); let inch = tot - f * 12; if (inch >= 12) { f++; inch -= 12; }
  let w = Math.floor(inch + 1e-9), n = Math.round((inch - w) * denom), d = denom;
  while (n && n % 2 === 0) { n /= 2; d /= 2; }
  return `${neg ? "-" : ""}${f}' ${w}${n ? `-${n}/${d}` : ""}"`;
}
function sta(v: unknown): number {
  if (typeof v === "number") return v;
  const mm = /^\s*(-)?\s*(\d+)\s*\+\s*(\d{1,2}(?:\.\d+)?)\s*$/.exec(String(v ?? ""));
  if (!mm) throw new Error(`can't read "${v}" as a station (e.g. 12+50.25)`);
  const ft = Number(mm[2]) * 100 + Number(mm[3]); return mm[1] ? -ft : ft;
}
function to_sta(x: number, places = 2): string {
  const neg = x < 0, a = Math.abs(x), h = Math.floor((a + 1e-9) / 100), r = a - h * 100;
  return `${neg ? "-" : ""}${h}+${r.toFixed(places).padStart(places ? places + 3 : 2, "0")}`;
}
const field = {
  ftin, to_ftin, sta, to_sta,
  in_per_ft: (pct: number) => pct * 0.12,
  pct_from_in_per_ft: (x: number) => x / 0.12,
  grade_pct: (rise: number, run: number) => { if (!run) throw new Error("run can't be 0"); return rise / run * 100; },
  elev_at: (elev: number, pct: number, dist: number) => elev + pct / 100 * dist,
  pipe_cf: (d_in: number, len_ft: number) => Math.PI * (d_in / 12) ** 2 / 4 * len_ft,
  pipe_gal: (d_in: number, len_ft: number) => Math.PI * (d_in / 12) ** 2 / 4 * len_ft * 7.48052,
  trench_cy: (w_ft: number, depth_ft: number, len_ft: number) => w_ft * depth_ft * len_ft / 27,
  bedding_cy: (w_ft: number, below_in: number, od_in: number, above_in: number, len_ft: number) => {
    const box = w_ft * (below_in + od_in + above_in) / 12, pipe = Math.PI * (od_in / 12) ** 2 / 4;
    if (box <= pipe) throw new Error("trench is narrower than the pipe"); return (box - pipe) * len_ft / 27;
  },
};

m.import({
  ...field,
  sin: m.typed("sin", { number: (x: number) => Math.sin(x * DEG), Unit: (u: unknown) => orig.sin(u as never) }),
  cos: m.typed("cos", { number: (x: number) => Math.cos(x * DEG), Unit: (u: unknown) => orig.cos(u as never) }),
  tan: m.typed("tan", { number: (x: number) => { if (Math.abs(Math.cos(x * DEG)) < 1e-12) throw new Error("tan is undefined at that angle"); return Math.tan(x * DEG); }, Unit: (u: unknown) => orig.tan(u as never) }),
  asin: (x: number) => { if (x < -1 || x > 1) throw new Error("asin needs a value from -1 to 1"); return Math.asin(x) / DEG; },
  acos: (x: number) => { if (x < -1 || x > 1) throw new Error("acos needs a value from -1 to 1"); return Math.acos(x) / DEG; },
  atan: (x: number) => Math.atan(x) / DEG,
  atan2: (y: number, x: number) => Math.atan2(y, x) / DEG,
  solve,
  // geometry helpers for the field
  circle_area: (d: number) => Math.PI * d * d / 4,
  segment_area: (d: number, depth: number) => { const r = d / 2; if (depth < 0 || depth > d) throw new Error("depth must be 0 to d"); const t = 2 * Math.acos((r - depth) / r); return r * r * (t - Math.sin(t)) / 2; },
  // locked down (mathjs security guidance): no code loading, no new units, no nested parsing, no big allocations
  import: deny("import"), createUnit: deny("createUnit"), evaluate: deny("evaluate"), parse: deny("parse"), compile: deny("compile"),
  simplify: deny("simplify"), derivative: deny("derivative"), resolve: deny("resolve"), reviver: deny("reviver"),
  zeros: deny("zeros"), ones: deny("ones"), range: deny("range"), identity: deny("identity"), random: deny("random"), randomInt: deny("randomInt"), pickRandom: deny("pickRandom"),
}, { override: true });

const BLOCK = /\[|\bfunction\b|=>|\bmap\b|\bforEach\b|\bfilter\b/;
export function mathEval(expression: string): { ok: true; value: number; text: string } | { ok: false; error: string } {
  const src = String(expression ?? "").trim();
  if (!src) return { ok: false, error: "empty expression" };
  if (src.length > 400) return { ok: false, error: "expression too long (max 400 characters)" };
  if (BLOCK.test(src)) return { ok: false, error: "lists, function definitions and loops aren't supported; one expression per call" };
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/°/g, " deg");
  try {
    // assignments like "a = 5; a * 2" are not allowed (one expression per call); a solve() string keeps its own "="
    const outside = s.replace(/"[^"]*"/g, '""');
    if (/;|(^|[^<>=!])=(?!=)/.test(outside)) return { ok: false, error: 'one expression per call; for an equation use solve("left = right", "x")' };
    let r: unknown = orig.evaluate(s);
    let shown: string, value: number;
    if (r && typeof r === "object" && (r as { isUnit?: boolean }).isUnit) {
      const u = r as { toNumber: (x?: string) => number; formatUnits: () => string; toString: () => string };
      shown = m.format(r, { precision: 12 }); value = Number(m.format(u.toNumber(u.formatUnits()), { precision: 12 }));
    } else if (r && typeof r === "object" && (r as { isMatrix?: boolean }).isMatrix) {
      const arr = (r as { toArray: () => number[] }).toArray().map((x) => Number(Number(x).toPrecision(12)));
      if (!arr.length || !arr.every(Number.isFinite)) throw new Error("result is not a finite number");
      shown = arr.join(", "); value = arr[0];
      return { ok: true, value, text: `${src} = ${shown}`, values: arr } as never;
    } else if (typeof r === "number") {
      if (!Number.isFinite(r)) throw new Error("result is not a finite number");
      value = Number(r.toPrecision(12)); shown = String(value);
    } else if (typeof r === "boolean") { value = r ? 1 : 0; shown = String(r); }
    else if (typeof r === "string" && r.length < 60) {
      const nums = (r.match(/\d+(?:\.\d+)?/g) || []).map(Number);
      return { ok: true, value: nums[0] ?? 0, text: `${src} = ${r}`, values: nums } as never;
    }
    else throw new Error("the result isn't a number");
    if (!Number.isFinite(value)) throw new Error("result is not a finite number");
    return { ok: true, value, text: `${src} = ${shown}` };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message || e).slice(0, 200) };
  }
}
