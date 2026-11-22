import * as S from "../src/state.ts";
const eq = (a: unknown, b: unknown, m = "") => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); };
Deno.test("phone location ('here') is used after the company state and the last job, before 'told'", () => {
  eq(S.resolveState({ question: "How long is my ticket good for?", appState: "NV", appHow: "here" }).code, "NV");
  eq(S.resolveState({ question: "How long is my ticket good for?", appState: "NV", appHow: "here" }).how, "here");
  eq(S.resolveState({ question: "How long is my ticket good for?", appState: "NV", appHow: "here", companyState: "TX" }).code, "TX");
  eq(S.resolveState({ question: "How long is my ticket good for?", appState: "NV", appHow: "here", addressState: "AZ" }).code, "AZ");
  eq(S.resolveState({ question: "ticket life in Utah?", appState: "NV", appHow: "here" }).code, "UT");
  if (!/where this phone is/.test(S.stateLines({ code: "NV", how: "here" }, true, 1))) throw new Error("label");
});
