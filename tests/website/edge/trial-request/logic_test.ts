// deno test edge/trial-request/logic_test.ts   (no network: the database and Resend are mocked)
// Part 1 runs logic.ts with injected mocks. Part 2 loads index.ts itself with Deno.serve captured and global fetch mocked,
// so the real wiring (REST RPC call with the service key, Resend call, IP hash) is exercised too.
import { allowedOrigin, confirmEmailFor, emailFor, handle, isBot, validate, type Deps } from './logic.ts';

let fails = 0, passes = 0;
function ok(c: unknown, m: string) { if (c) { passes++; console.log('PASS', m); } else { fails++; console.log('FAIL', m); } }

const GOOD = { name: 'Joe Smith', company: 'Acme Pipeline', role: 'Superintendent', email: 'Joe@Example.com', phone: '(555) 010-2000', crew_size: '8-15', message: 'Two crews.\nStart Monday?', website: '', elapsed_ms: 12000 };
const req = (body: unknown, o: { origin?: string | null; method?: string; raw?: string; ip?: string } = {}) => {
  const h = new Headers({ 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 test', 'x-forwarded-for': (o.ip ?? '203.0.113.9') + ', 10.0.0.1' });
  if (o.origin !== null) h.set('origin', o.origin ?? 'https://pipelayersbible.com');
  return new Request('https://x.supabase.co/functions/v1/trial-request', { method: o.method ?? 'POST', headers: h, body: (o.method ?? 'POST') === 'POST' ? (o.raw ?? JSON.stringify(body)) : undefined });
};
function mock(over: Partial<{ add: unknown; addStatus: number; email: { ok: boolean; status: number } | null; confirm: boolean }> = {}) {
  const calls: { rpc: [string, Record<string, unknown>][]; email: Record<string, unknown>[] } = { rpc: [], email: [] };
  const deps: Deps = {
    rpc: async (n, a) => { calls.rpc.push([n, a]); if (n === 'pb_trial_request_add') return { ok: (over.addStatus ?? 200) < 300, status: over.addStatus ?? 200, data: over.add ?? { ok: true, id: '0b7c3c1e-1111-4111-8111-111111111111' } }; return { ok: true, status: 200, data: { ok: true } }; },
    sendEmail: over.email === null ? null : async (p) => { calls.email.push(p); return over.email ?? { ok: true, status: 200 }; },
    hashIp: async (ip) => 'h' + ip.replace(/\D/g, '').padEnd(31, '0').slice(0, 31).replace(/[^0-9a-f]/g, '0'),
    from: "The Pipelayer's Bible <reports@pipelayersbible.com>", to: ['tfontaine@pipelayersbible.com'], confirm: over.confirm,
  };
  return { deps, calls };
}

Deno.test('trial-request logic', async () => {
  // origins
  ok(allowedOrigin('https://pipelayersbible.com') && allowedOrigin('https://www.pipelayersbible.com') && allowedOrigin('http://localhost:8080') && allowedOrigin('http://127.0.0.1:5500'), 'site, www and localhost origins allowed');
  ok(!allowedOrigin('https://evil.example') && !allowedOrigin('http://pipelayersbible.com') && !allowedOrigin(null) && !allowedOrigin('https://pipelayersbible.com.evil.io') && !allowedOrigin('http://localhost:80', false), 'other origins, http, missing origin, look-alikes, localhost when turned off: refused');

  // validation
  const v = validate(GOOD);
  ok(v.ok && v.value.email === 'joe@example.com' && v.value.message === 'Two crews.\nStart Monday?', 'good form passes, email lowercased, message line break kept');
  const bad = validate({ name: '', company: 'x'.repeat(121), role: 'CEO', email: 'nope', phone: 'call me maybe', crew_size: 'x'.repeat(41), message: 'y'.repeat(2001) });
  ok(!bad.ok && ['name', 'company', 'role', 'email', 'phone', 'crew_size', 'message'].every((f) => (bad as { fields: string[] }).fields.includes(f)), 'every bad field named');
  const opt = validate({ ...GOOD, phone: '', crew_size: '  ', message: '' });
  ok(opt.ok && opt.value.phone === null && opt.value.crew_size === null && opt.value.message === null, 'optional fields may be empty (stored as null)');
  ok(validate({ ...GOOD, name: ' Joe\u0000\u0007  Smith ' }).ok && (validate({ ...GOOD, name: ' Joe\u0000\u0007  Smith ' }) as { value: { name: string } }).value.name === 'Joe Smith', 'control characters stripped, spaces folded');
  ok(!validate(null).ok && !validate([1]).ok && !validate('x').ok, 'non-object bodies refused');

  // bots
  ok(isBot({ ...GOOD, website: 'http://spam' }) && isBot({ ...GOOD, elapsed_ms: 900 }) && isBot({ ...GOOD, elapsed_ms: undefined }) && !isBot(GOOD), 'honeypot, too fast, missing fill time = bot; the good form is not');

  // happy path
  let m = mock(); let r = await handle(req(GOOD), m.deps); let j = await r.json();
  ok(r.status === 200 && j.ok === true, 'good request: 200 ok');
  ok(r.headers.get('access-control-allow-origin') === 'https://pipelayersbible.com' && r.headers.get('vary') === 'Origin', 'CORS answers the site origin only, Vary: Origin');
  const add = m.calls.rpc.find((c) => c[0] === 'pb_trial_request_add');
  ok(add && add[1].p_email === 'joe@example.com' && add[1].p_role === 'Superintendent' && typeof add[1].p_ip_hash === 'string' && add[1].p_user_agent === 'Mozilla/5.0 test' && !('website' in add[1]), 'stored through pb_trial_request_add with hashed IP and user agent, no honeypot field');
  const em = m.calls.email[0] as Record<string, unknown>;
  ok(em && (em.to as string[])[0] === 'tfontaine@pipelayersbible.com' && em.reply_to === 'joe@example.com' && /Acme Pipeline \(Superintendent\)/.test(String(em.subject)) && /Phone: \(555\) 010-2000/.test(String(em.text)), 'emails Thomas: subject with company and role, Reply-To requester, plain text summary');
  ok(m.calls.rpc.some((c) => c[0] === 'pb_trial_request_notified'), 'marks the row notified after the email is accepted');

  // html escaping
  const e2 = emailFor({ ...(validate(GOOD) as { value: never }).value, company: '<b>X</b>', message: '<script>alert(1)</script>' } as never, 'f', ['t']);
  ok(!/<script>/.test(e2.html) && /&lt;script&gt;/.test(e2.html) && !/<b>X<\/b>/.test(e2.html), 'email HTML escapes what was typed');

  // honeypot / too fast: 200 ok, nothing stored or sent
  m = mock(); r = await handle(req({ ...GOOD, website: 'x' }), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && m.calls.rpc.length === 0 && m.calls.email.length === 0, 'honeypot: silent success, nothing stored or emailed');
  m = mock(); r = await handle(req({ ...GOOD, elapsed_ms: 1200 }), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && m.calls.rpc.length === 0 && m.calls.email.length === 0, 'too fast: silent success, nothing stored or emailed');

  // invalid
  m = mock(); r = await handle(req({ ...GOOD, email: 'bad' }), m.deps); j = await r.json();
  ok(r.status === 400 && j.error === 'invalid' && j.fields.includes('email') && m.calls.rpc.length === 0, 'invalid email: 400 with the field, nothing stored');
  m = mock(); r = await handle(req(null, { raw: '{not json' }), m.deps);
  ok(r.status === 400, 'not JSON: 400');
  m = mock(); r = await handle(req(null, { raw: JSON.stringify({ ...GOOD, message: 'x'.repeat(9000) }) }), m.deps);
  ok(r.status === 400 && m.calls.rpc.length === 0, 'body over 8 KB: 400');

  // origin / method
  m = mock(); r = await handle(req(GOOD, { origin: 'https://evil.example' }), m.deps);
  ok(r.status === 403 && !r.headers.get('access-control-allow-origin') && m.calls.rpc.length === 0, 'other origin: 403, no CORS header, nothing stored');
  m = mock(); r = await handle(req(GOOD, { origin: null }), m.deps);
  ok(r.status === 403, 'no Origin header: 403');
  m = mock(); r = await handle(req(null, { method: 'OPTIONS', origin: 'https://www.pipelayersbible.com' }), m.deps);
  ok(r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://www.pipelayersbible.com' && /content-type/.test(r.headers.get('access-control-allow-headers') || ''), 'preflight from www: 204 with CORS headers');
  m = mock(); r = await handle(req(null, { method: 'GET' }), m.deps);
  ok(r.status === 405, 'GET: 405');
  m = mock(); r = await handle(req(GOOD, { origin: 'http://localhost:8080' }), m.deps, { allowLocal: false });
  ok(r.status === 403, 'localhost refused when TRIAL_ALLOW_LOCAL=0');

  // rate limit
  m = mock({ add: { ok: false, error: 'rate' } }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 429 && j.error === 'rate' && m.calls.email.length === 0, 'rate limited: 429, no email');

  // failures
  m = mock({ addStatus: 500, add: null }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && m.calls.email.length === 1 && !m.calls.rpc.some((c) => c[0] === 'pb_trial_request_notified'), 'database down but email sent: still ok (Thomas has the email)');
  m = mock({ email: { ok: false, status: 500 } }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && !m.calls.rpc.some((c) => c[0] === 'pb_trial_request_notified'), 'Resend refused but row stored: ok, row left un-notified');
  m = mock({ addStatus: 500, add: null, email: { ok: false, status: 500 } }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 502 && j.ok === false, 'both failed: 502 (the page shows phone and email instead)');
  m = mock({ email: null }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && m.calls.email.length === 0, 'no Resend key: stored only, still ok');

  // ---- firstweek_web_nov22: state + confirmation email ----
  ok(validate({ ...GOOD, state: 'Texas' }).ok && (validate({ ...GOOD, state: 'Texas' }) as { value: { state: string } }).value.state === 'Texas', 'state: a real state passes');
  ok(validate({ ...GOOD, state: 'District of Columbia' }).ok && validate({ ...GOOD, state: 'More than one state' }).ok, 'state: DC and "More than one state" pass');
  ok((validate({ ...GOOD, state: '' }) as { value: { state: unknown } }).value.state === null && (validate(GOOD) as { value: { state: unknown } }).value.state === null, 'state: optional, empty stored as null');
  const bs = validate({ ...GOOD, state: 'Narnia' });
  ok(!bs.ok && (bs as { fields: string[] }).fields.join() === 'state', 'state: anything else is refused with fields ["state"]');
  m = mock(); r = await handle(req({ ...GOOD, state: 'Nevada' }), m.deps); j = await r.json();
  const addS = m.calls.rpc.find((c) => c[0] === 'pb_trial_request_add');
  ok(r.status === 200 && addS && addS[1].p_message === 'State: Nevada\n\nTwo crews.\nStart Monday?', 'state stored at the top of the message (no database change)');
  ok(/State: Nevada/.test(String((m.calls.email[0] as Record<string, unknown>).text)), "state in Thomas's email");
  m = mock(); r = await handle(req({ ...GOOD, state: 'Nevada', message: 'z'.repeat(2000) }), m.deps);
  ok(String(m.calls.rpc.find((c) => c[0] === 'pb_trial_request_add')![1].p_message).length === 2000, 'state + a 2,000-character message: stored message kept to 2,000 (the column limit)');
  m = mock(); r = await handle(req({ ...GOOD, state: 'Narnia' }), m.deps); j = await r.json();
  ok(r.status === 400 && JSON.stringify(j.fields) === '["state"]' && m.calls.rpc.length === 0, 'bad state: 400 with fields ["state"] (the page marks that field)');
  // confirmation
  m = mock(); r = await handle(req({ ...GOOD, name: 'Visit http://spam.example now', company: 'Buy pills <a href=x>' }), m.deps);
  ok(m.calls.email.length === 2, 'happy path: two emails (Thomas, then the requester)');
  const cf = m.calls.email[1] as Record<string, unknown>;
  ok(cf && (cf.to as string[]).join() === 'joe@example.com' && cf.reply_to === 'tfontaine@pipelayersbible.com' && cf.from === "The Pipelayer's Bible <reports@pipelayersbible.com>", 'confirmation: to the requester, Reply-To Thomas, the usual sender');
  ok(/\(909\) 435-5250/.test(String(cf.text)) && /tel:\+19094355250/.test(String(cf.html)) && /What happens next/.test(String(cf.text)) && /pipelayersbible\.com\/tools\/pipe-grade-calculator\//.test(String(cf.text)), "confirmation: what happens next, Thomas's phone, links to the free tools");
  ok(!/spam\.example|pills|Joe|Acme/i.test(String(cf.text) + String(cf.html) + String(cf.subject)), 'confirmation repeats nothing that was typed (name, company, message)');
  m = mock({ add: { ok: false, error: 'rate' } }); r = await handle(req(GOOD), m.deps);
  ok(m.calls.email.length === 0, 'rate limited: no confirmation either');
  m = mock({ addStatus: 500, add: null }); r = await handle(req(GOOD), m.deps);
  ok(m.calls.email.length === 1 && (m.calls.email[0].to as string[])[0] === 'tfontaine@pipelayersbible.com', 'row not stored: no confirmation (only rate-limited, stored requests get one)');
  m = mock({ confirm: false }); r = await handle(req(GOOD), m.deps);
  ok(m.calls.email.length === 1, 'TRIAL_CONFIRM=0: no confirmation');
  m = mock({ email: { ok: false, status: 500 } }); r = await handle(req(GOOD), m.deps); j = await r.json();
  ok(r.status === 200 && j.ok && m.calls.email.length === 2, 'Resend refusing does not change the answer (stored: ok)');
  m = mock({ addStatus: 500, add: null }); r = await handle(req({ ...GOOD, website: 'x' }), m.deps);
  ok(m.calls.email.length === 0, 'honeypot: no confirmation');
  ok(!('reply_to' in confirmEmailFor((validate(GOOD) as unknown as { value: never }).value, 'f', null)), 'no Thomas address configured: no Reply-To');

  if (fails) throw new Error(`${fails} failed`);
});

Deno.test('trial-request index.ts wiring (Deno.serve captured, fetch mocked)', async () => {
  Deno.env.set('SUPABASE_URL', 'https://example-ref.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-key-for-test');
  Deno.env.set('RESEND_API_KEY', 're_testkey_123');
  let handler: ((r: Request) => Promise<Response>) | null = null;
  const realServe = Deno.serve, realFetch = globalThis.fetch;
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: (r: Request) => Promise<Response>) => { handler = h; return { finished: Promise.resolve() }; };
  const seen: { url: string; headers: Headers; body: unknown }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), headers = new Headers(init?.headers), body = init?.body ? JSON.parse(String(init.body)) : null;
    seen.push({ url, headers, body });
    if (url.endsWith('/rest/v1/rpc/pb_trial_request_add')) return new Response(JSON.stringify({ ok: true, id: '0b7c3c1e-1111-4111-8111-111111111111' }), { status: 200 });
    if (url.endsWith('/rest/v1/rpc/pb_trial_request_notified')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    if (url === 'https://api.resend.com/emails') return new Response(JSON.stringify({ id: 'e1' }), { status: 200 });
    return new Response('no', { status: 404 });
  }) as typeof fetch;
  try {
    await import('./index.ts?wiring');
    ok(!!handler, 'index.ts registers a Deno.serve handler');
    const r = await handler!(req(GOOD));
    const j = await r.json();
    ok(r.status === 200 && j.ok, 'index.ts: good request answers 200 ok');
    const add = seen.find((s) => s.url.endsWith('/pb_trial_request_add'));
    ok(add && add.headers.get('apikey') === 'service-key-for-test' && add.headers.get('authorization') === 'Bearer service-key-for-test', 'RPC sent to SUPABASE_URL with the service role key');
    ok(add && /^[0-9a-f]{32}$/.test(String((add.body as Record<string, unknown>).p_ip_hash)) && !JSON.stringify(add.body).includes('203.0.113.9'), 'IP sent only as a 32-hex HMAC, never the raw address');
    const rs = seen.find((s) => s.url === 'https://api.resend.com/emails');
    ok(rs && rs.headers.get('authorization') === 'Bearer re_testkey_123' && (rs.body as Record<string, unknown>).from === "The Pipelayer's Bible <reports@pipelayersbible.com>" && ((rs.body as Record<string, unknown>).to as string[])[0] === 'tfontaine@pipelayersbible.com', 'Resend call: RESEND_API_KEY, the REPORT_FROM default sender, to Thomas');
    ok(seen.some((s) => s.url.endsWith('/pb_trial_request_notified')), 'notified RPC called after the email');
    const rs2 = seen.filter((s) => s.url === 'https://api.resend.com/emails');
    ok(rs2.length === 2 && ((rs2[1].body as Record<string, unknown>).to as string[])[0] === 'joe@example.com', 'index.ts: the confirmation goes to the requester (TRIAL_CONFIRM not set = on)');
  } finally {
    globalThis.fetch = realFetch;
    // deno-lint-ignore no-explicit-any
    (Deno as any).serve = realServe;
  }
  console.log(`\nRESULT: ${passes} passed, ${fails} failed`);
  if (fails) throw new Error(`${fails} failed`);
});
