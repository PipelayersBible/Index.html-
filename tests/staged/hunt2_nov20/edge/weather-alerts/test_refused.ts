// hunt2: deno run --allow-read --no-check test_refused.ts <logic file>   (the excerpt before / after patch_weather_alerts.py)
const { runOnce } = await import(Deno.args[0]);
let fails = 0; const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const mk = (due: any, fin: any, logs: string[]) => ({ rpc: async (fn: string) => fn === 'pb_wx_due' ? due : fin, get: async () => ({ status: 0, json: null }), now: () => 0, sleep: async () => {}, log: (...a: unknown[]) => { logs.push(a.join(' ')); } });
let logs: string[] = [];
let c = await runOnce(mk({ ok: false, status: 403, data: { code: '42501' } }, null, logs));
ok(Array.isArray(c.refused) && c.refused[0].rpc === 'pb_wx_due' && c.refused[0].status === 403, 'pb_wx_due refused (403): the summary carries refused: ' + JSON.stringify(c));
ok(logs.some((l) => /pb_wx_due was refused \(HTTP 403\)/.test(l)), 'and an error line is logged: ' + (logs[0] || '(nothing)'));
logs = []; c = await runOnce(mk({ ok: true, status: 200, data: { ok: true, runs: [] } }, null, logs));
ok(!c.refused && !logs.length && c.runs === 0, 'nothing due: the usual summary, no error line: ' + JSON.stringify(c));
logs = []; c = await runOnce(mk({ ok: true, status: 200, data: { ok: true, runs: [{ company_id: 'c', kind: 'eve', local_date: '2026-11-20' }] } }, { ok: false, status: 403, data: null }, logs));
ok(Array.isArray(c.refused) && c.refused[0].rpc === 'pb_wx_finish', 'pb_wx_finish refused: counted and logged: ' + JSON.stringify(c.refused));
console.log(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); Deno.exit(fails ? 1 : 0);
