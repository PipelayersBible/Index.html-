// The quote checker must not eat the text between two quotes when a short quoted phrase comes first (eval tr14, Nov 20).
import { checkOshaQuotes } from "../src/guard.ts";
const ok = (c: unknown, m = "") => { if (!c) throw new Error("fail " + m); };
const OSHA = ["All simple slope excavations 20 feet or less in depth shall have a maximum allowable slope of 1:1.", "Sloping or benching for excavations greater than 20 feet deep shall be designed by a registered professional engineer."];
Deno.test("quote check: a short quoted phrase does not shift the pairing", () => {
  const a = 'For Type B, OSHA Appendix B gives 1:1 only for excavations "20 feet or less" (Figure B-1.2) and "less than 20 feet deep" (Table B-1); deeper is "Engineer Required". Figure B-1.2 of 29 CFR 1926 Subpart P: "All simple slope excavations 20 feet or less in depth shall have a maximum allowable slope of 1:1."';
  const r = checkOshaQuotes(a, OSHA, {});
  ok(!/quote removed\]Engineer Required/.test(r.text) && /\(Figure B-1\.2\) and "less than 20 feet deep/.test(r.text) && /\(Table B-1\); deeper is/.test(r.text), r.text);
  ok(/"All simple slope excavations 20 feet or less in depth shall have a maximum allowable slope of 1:1\."/.test(r.text), "the real quote stays: " + r.text);
});
Deno.test("quote check: a made-up OSHA quote is still removed, also after a short one and after inch marks", () => {
  const a = 'OSHA calls it a "shield". 29 CFR 1926.652 says "Employees may work under a trench box at any depth without a ladder." Use 8" pipe.';
  const r = checkOshaQuotes(a, OSHA, {});
  ok(r.removed === 1 && /"shield"/.test(r.text) && /\[quote removed/.test(r.text) && /Use 8" pipe\./.test(r.text), JSON.stringify(r));
  const b = checkOshaQuotes('29 CFR 1926.652 says "Employees may work under a trench box at any depth without a ladder."', OSHA, {});
  ok(b.removed === 1, JSON.stringify(b));
});
