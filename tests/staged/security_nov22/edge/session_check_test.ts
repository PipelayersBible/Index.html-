// deno test --allow-net=127.0.0.1 edge/session_check_test.ts : sessionCheck against a fake PostgREST (port 10752)
import { sessionCheck } from './session_check.ts';
const answers: Record<string, [number, unknown]> = {
  good: [200, true],
  code: [401, { code: 'PT401', message: 'pb:signed_out', details: 'code_needed', hint: null }],
  locked: [401, { code: 'PT401', message: 'pb:signed_out', details: 'locked', hint: 'phone|120|0' }],
  ended: [401, { code: 'PT401', message: 'pb:signed_out', details: 'ended', hint: null }],
  missing: [404, { code: 'PGRST202', message: 'Could not find the function public.pb_session_ok without parameters in the schema cache' }],
  broken: [500, { message: 'boom' }],
};
let seen: { auth: string | null; apikey: string | null; path: string } | null = null;
const ac = new AbortController();
const srv = Deno.serve({ port: 10752, hostname: '127.0.0.1', signal: ac.signal, onListen() {} }, (req) => {
  const who = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  seen = { auth: req.headers.get('Authorization'), apikey: req.headers.get('apikey'), path: new URL(req.url).pathname };
  const [s, b] = answers[who] || [500, {}];
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
});
const U = 'http://127.0.0.1:10752';
Deno.test('session check', async () => {
  const r = async (w: string) => await sessionCheck(U, 'Bearer ' + w, 'anon-key');
  const eq = (a: unknown, b: unknown, m: string) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(m + ': ' + JSON.stringify(a)); console.log('PASS', m); };
  eq(await r('good'), { ok: true }, 'good session passes');
  eq(seen, { auth: 'Bearer good', apikey: 'anon-key', path: '/rest/v1/rpc/pb_session_ok' }, 'calls pb_session_ok with the caller token + apikey');
  eq((await r('code') as any).code, 'pb:code_needed', 'aal1 with two-step on -> pb:code_needed');
  eq((await r('locked') as any).code, 'pb:locked', 'locked device -> pb:locked');
  eq((await r('ended') as any).code, 'pb:signed_out', 'ended -> pb:signed_out');
  eq(await r('missing'), { ok: true }, 'server part not applied yet -> allowed (as before)');
  eq((await r('broken') as any).code, 'pb:server', 'server error -> refused (pb:server)');
  eq((await sessionCheck('http://127.0.0.1:10769', 'Bearer x', 'k') as any).code, 'pb:server', 'no answer -> refused (pb:server)');
  ac.abort(); await srv.finished;
});
