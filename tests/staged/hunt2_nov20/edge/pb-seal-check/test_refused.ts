// hunt2: deno run --allow-env --allow-read test_refused.ts <index.ts to test>
// Mocks Deno.serve + fetch. Case A: the database refuses the todo calls with 403 (what happened until Nov 20).
// Case B: everything answers and nothing waits. Case C: one seal waits and is checked.
const file = Deno.args[0]; let handler: ((r: Request) => Promise<Response>) | null = null;
(Deno as any).serve = (h: any) => { handler = h; return {}; };
Deno.env.set('SUPABASE_URL', 'http://sb.test'); Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc');
const SECRET = 'x'.repeat(32); let mode = 'A'; const logs: string[] = [], errs: string[] = [];
console.log = (...a: unknown[]) => { logs.push(a.join(' ')); }; console.error = (...a: unknown[]) => { errs.push(a.join(' ')); };
const J = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = (async (u: any, init?: any) => {
  const url = String(u);
  if (url.endsWith('/rpc/pb_push_svc_cron_secret')) return J(SECRET);
  if (/\/rpc\/pb_(seal_check|photo_check)_todo$/.test(url)) return mode === 'A' ? J({ code: '42501', message: 'permission denied for function' }, 403) : J(mode === 'C' && /seal/.test(url) ? [{ id: 'a', path: 'c/r/x.pdf', sha256: 'nope', bytes: 3 }] : []);
  if (url.endsWith('/rpc/pb_audit_day_todo')) return J([]);
  if (url.endsWith('/rpc/pb_seal_check_put')) return J({ ok: true });
  if (url.includes('/storage/v1/object/run-seals/')) return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
  if (/digicert|freetsa/.test(url)) return new Response(new Uint8Array([0x30, 0x05, 0x30, 0x03, 0x02, 0x01, 0x00]), { status: 200 });
  return J(null, 404);
}) as any;
await import(file);
const out = await import('node:process'); const say = (s: string) => out.stdout.write(s + '\n');
let fails = 0; const ok = (c: boolean, m: string) => { say((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const call = async (m: string) => { mode = m; logs.length = 0; errs.length = 0; const r = await handler!(new Request('http://fn/pb-seal-check', { method: 'POST', headers: { 'x-pb-push-secret': SECRET } })); return r.status; };
let st = await call('A');
ok(errs.some((e) => /rpc_refused/.test(e) && /pb_seal_check_todo/.test(e) && /403/.test(e)), 'a refused pb_seal_check_todo (403) is logged as an error: ' + (errs[0] || '(nothing)'));
ok(errs.some((e) => /rpc_refused/.test(e) && /pb_photo_check_todo/.test(e)), 'a refused pb_photo_check_todo (403) is logged as an error');
ok(!logs.some((l) => /"waiting":0/.test(l)), 'it does not report an ordinary "waiting":0 line when the list was refused: ' + (logs[0] || '(no plain line)'));
ok(st === 500, 'the function answers 500, not 204 (' + st + ')');
st = await call('B');
ok(st === 204 && !errs.length && logs.length === 1 && /"seal_check":0/.test(logs[0]) && !/refused/.test(logs[0]), 'everything answers, nothing waits: 204 and the usual one-line summary');
st = await call('C');
ok(st === 204 && !errs.length && /"seal_check":1,"mismatched":1/.test(logs[0] || ''), 'one seal waits: checked and counted as before: ' + (logs[0] || ''));
say(fails ? 'RESULT: ' + fails + ' failed' : 'RESULT: all passed'); Deno.exit(fails ? 1 : 0);
