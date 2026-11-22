// trial-request logic (staged Nov 18 2026). Pure: everything outside (database, Resend, clock, hashing) is passed in, so
// logic_test.ts runs it with mocks. index.ts wires the real ones.
//
// What it does with a POST from the website form:
//  * answers only the website's origins (and localhost for testing); anything else gets 403 with no CORS headers
//  * bodies over 8 KB, or not JSON, get 400
//  * a filled honeypot field (`website`) or a form sent under 3 s after the page opened: 200 {ok:true} and nothing is
//    stored or sent (a bot sees the same answer as a person)
//  * checks and length-limits every field (400 {ok:false,error:'invalid',fields:[...]})
//  * stores the row through public.pb_trial_request_add (5 an hour per hashed IP, 200 a day in all: 429 {error:'rate'})
//  * emails Thomas a plain summary through Resend, Reply-To set to the requester; marks the row notified when accepted
//  * firstweek_web_nov22: optional `state` (a US state, DC, or "More than one state"); it goes in Thomas's email and is
//    stored at the top of the message ("State: Texas"), so pb_trial_request_add is unchanged
//  * firstweek_web_nov22: once the row is stored (so the database's rate limits apply), a confirmation email goes to the
//    requester: what happens next, Thomas's phone, the free tools. It repeats nothing they typed (the form can't be used
//    to send someone else a message), Reply-To is Thomas. deps.confirm === false turns it off (TRIAL_CONFIRM=0).
//  * answers {ok:true} when the row was stored or the email went (either is enough for Thomas to see it), else 502

export const ROLES = ['Owner', 'PM', 'Superintendent', 'Foreman', 'Other'] as const;
export const LIMITS = { name: 100, company: 120, email: 254, phone: 40, crew_size: 40, message: 2000 } as const;
export const STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'More than one state'] as const;
export const PHONE_SHOWN = '(909) 435-5250';
const PHONE_TEL = '+19094355250';
const SITE = 'https://pipelayersbible.com';
export const MIN_FILL_MS = 3000;
export const MAX_BODY = 8192;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const ORIGINS = ['https://pipelayersbible.com', 'https://www.pipelayersbible.com'];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export type Clean = { name: string; company: string; role: string; email: string; phone: string | null; crew_size: string | null; state?: string | null; message: string | null };
export type Deps = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; status: number; data: unknown }>;
  sendEmail: ((payload: Record<string, unknown>) => Promise<{ ok: boolean; status: number }>) | null; // null: no RESEND_API_KEY
  hashIp: (ip: string) => Promise<string>;
  from: string;
  to: string[];
  confirm?: boolean; // false: no confirmation email to the requester (TRIAL_CONFIRM=0)
  log?: (...a: unknown[]) => void;
};

export function allowedOrigin(origin: string | null, allowLocal = true): string | null {
  if (!origin) return null;
  if (ORIGINS.includes(origin)) return origin;
  if (allowLocal && LOCAL.test(origin)) return origin;
  return null;
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info', // the page sends only content-type; the rest in case the gateway ever wants a key
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// one line of text: control characters out, runs of spaces folded, trimmed
const line = (v: unknown) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
// the message keeps its line breaks
const block = (v: unknown) => (typeof v === 'string' ? v : '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

export function validate(body: unknown): { ok: true; value: Clean } | { ok: false; fields: string[] } {
  const b = (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>;
  const v = {
    name: line(b.name), company: line(b.company), role: line(b.role), email: line(b.email).toLowerCase(),
    phone: line(b.phone), crew_size: line(b.crew_size), state: line(b.state), message: block(b.message),
  };
  const bad: string[] = [];
  if (!v.name || v.name.length > LIMITS.name) bad.push('name');
  if (!v.company || v.company.length > LIMITS.company) bad.push('company');
  if (!(ROLES as readonly string[]).includes(v.role)) bad.push('role');
  if (!v.email || v.email.length > LIMITS.email || !EMAIL.test(v.email)) bad.push('email');
  if (v.phone.length > LIMITS.phone || (v.phone && !/^[0-9+().\-\s xextEXT]{7,40}$/.test(v.phone))) bad.push('phone');
  if (v.crew_size.length > LIMITS.crew_size) bad.push('crew_size');
  if (v.state && !(STATES as readonly string[]).includes(v.state)) bad.push('state');
  if (v.message.length > LIMITS.message) bad.push('message');
  if (bad.length) return { ok: false, fields: bad };
  return { ok: true, value: { ...v, phone: v.phone || null, crew_size: v.crew_size || null, state: v.state || null, message: v.message || null } };
}

// true when the request looks like a bot: honeypot filled, or sent too fast (or with no fill time at all)
export function isBot(body: unknown): boolean {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (typeof b.website === 'string' && b.website.trim() !== '') return true;
  const ms = Number(b.elapsed_ms);
  return !Number.isFinite(ms) || ms < MIN_FILL_MS;
}

export function clientIp(h: Headers): string {
  const xf = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  return (h.get('cf-connecting-ip') || xf || h.get('x-real-ip') || '').slice(0, 64);
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const tel = (p: string) => p.replace(/[^0-9+]/g, '');

export function emailFor(c: Clean, from: string, to: string[]) {
  const subject = `Trial request: ${c.company} (${c.role})`.slice(0, 150);
  const rows: [string, string][] = [['Name', c.name], ['Company', c.company], ['Role', c.role], ['Email', c.email],
    ['Phone', c.phone || '-'], ['Crew size', c.crew_size || '-'], ['State', c.state || '-']];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nMessage:\n${c.message || '-'}\n\n` +
    'Sent from the trial form on pipelayersbible.com. Reply to this email to answer them.';
  const html = '<p><strong>New trial request</strong> from the website.</p><table cellpadding="4" style="border-collapse:collapse">' +
    rows.map(([k, v]) => {
      let val = esc(v);
      if (k === 'Email') val = `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`;
      if (k === 'Phone' && c.phone) val = `<a href="tel:${esc(tel(c.phone))}">${esc(c.phone)}</a>`;
      return `<tr><td style="color:#666">${esc(k)}</td><td>${val}</td></tr>`;
    }).join('') + '</table>' +
    `<p style="white-space:pre-wrap">${esc(c.message || '-')}</p>` +
    '<p style="color:#666;font-size:13px">Sent from the trial form on pipelayersbible.com. Reply to this email to answer them.</p>';
  return { from, to, reply_to: c.email, subject, text, html };
}

// the requester's confirmation: fixed text only (nothing they typed), so the form can't be used to mail a stranger a message
export function confirmEmailFor(c: Clean, from: string, replyTo: string | null) {
  const subject = "Your free trial request: The Pipelayer's Bible";
  const tools: [string, string][] = [['Pipe grade calculator', SITE + '/tools/pipe-grade-calculator/'], ['Rod reading to invert', SITE + '/tools/rod-reading-to-invert/'],
    ['Trench sloping', SITE + '/tools/trench-sloping/'], ['All free tools and guides', SITE + '/tools/']];
  const text = 'Thanks for asking for a free 30-day trial of The Pipelayer\'s Bible. We got your request.\n\n' +
    'What happens next:\n' +
    '1. Thomas sets up your company, usually the same day.\n' +
    '2. He emails an invite to this address. Open it on your phone and choose a password.\n' +
    '3. Add your crew from the app. A foreman or pipelayer can join from a text, with no email.\n\n' +
    'The trial is free for your company and 6 people, with no credit card. Nothing is charged when it ends.\n\n' +
    `Questions? Call or text Thomas at ${PHONE_SHOWN}, or reply to this email.\n\n` +
    'While you wait, the free tools work on any phone:\n' + tools.map(([k, u]) => `${k}: ${u}`).join('\n') + '\n\n' +
    'You got this because this address was entered on the trial form at pipelayersbible.com. If that wasn\'t you, ignore this email: nothing else will be sent.';
  const html = '<p>Thanks for asking for a free 30-day trial of The Pipelayer\'s Bible. We got your request.</p>' +
    '<p><strong>What happens next</strong></p><ol>' +
    '<li>Thomas sets up your company, usually the same day.</li>' +
    '<li>He emails an invite to this address. Open it on your phone and choose a password.</li>' +
    '<li>Add your crew from the app. A foreman or pipelayer can join from a text, with no email.</li></ol>' +
    '<p>The trial is free for your company and 6 people, with no credit card. Nothing is charged when it ends.</p>' +
    `<p>Questions? Call or text Thomas at <a href="tel:${PHONE_TEL}">${PHONE_SHOWN}</a>, or reply to this email.</p>` +
    '<p>While you wait, the free tools work on any phone:</p><ul>' + tools.map(([k, u]) => `<li><a href="${esc(u)}">${esc(k)}</a></li>`).join('') + '</ul>' +
    '<p style="color:#666;font-size:13px">You got this because this address was entered on the trial form at pipelayersbible.com. If that wasn\'t you, ignore this email: nothing else will be sent.</p>';
  const out: Record<string, unknown> = { from, to: [c.email], subject, text, html };
  if (replyTo) out.reply_to = replyTo;
  return out;
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } });

export async function handle(req: Request, deps: Deps, opts: { allowLocal?: boolean; remoteIp?: string } = {}): Promise<Response> {
  const log = deps.log || (() => {});
  const origin = allowedOrigin(req.headers.get('origin'), opts.allowLocal !== false);
  if (!origin) return new Response(null, { status: 403 });
  const cors = corsHeaders(origin);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' }, cors);

  const raw = await req.text().catch(() => '');
  if (!raw || raw.length > MAX_BODY) return json(400, { ok: false, error: 'invalid' }, cors);
  let body: unknown;
  try { body = JSON.parse(raw); } catch (_e) { return json(400, { ok: false, error: 'invalid' }, cors); }

  if (isBot(body)) { log('trial-request: dropped (honeypot or too fast)'); return json(200, { ok: true }, cors); }
  const v = validate(body);
  if (!v.ok) return json(400, { ok: false, error: 'invalid', fields: v.fields }, cors);
  const c = v.value;

  const ip = clientIp(req.headers) || (opts.remoteIp || '').slice(0, 64); // the platform's forwarded header first, else the socket address
  const ipHash = ip ? await deps.hashIp(ip) : null;
  const ua = line(req.headers.get('user-agent')).slice(0, 300) || null;

  let stored = false, id: string | null = null;
  const r = await deps.rpc('pb_trial_request_add', {
    p_name: c.name, p_company: c.company, p_role: c.role, p_email: c.email, p_phone: c.phone, p_crew_size: c.crew_size,
    p_message: c.state ? (`State: ${c.state}` + (c.message ? '\n\n' + c.message : '')).slice(0, LIMITS.message) : c.message, p_ip_hash: ipHash, p_user_agent: ua,
  }).catch(() => ({ ok: false, status: 0, data: null }));
  const d = (r.data && typeof r.data === 'object' ? r.data : {}) as Record<string, unknown>;
  if (r.ok && d.ok === true) { stored = true; id = typeof d.id === 'string' ? d.id : null; }
  else if (r.ok && d.error === 'rate') { log('trial-request: rate limited'); return json(429, { ok: false, error: 'rate' }, cors); }
  else if (r.ok && d.error === 'invalid') return json(400, { ok: false, error: 'invalid' }, cors);
  else log('trial-request: store failed, status', r.status);

  let emailed = false;
  if (deps.sendEmail && deps.to.length) {
    const e = await deps.sendEmail(emailFor(c, deps.from, deps.to)).catch(() => ({ ok: false, status: 0 }));
    emailed = e.ok;
    if (!e.ok) log('trial-request: Resend refused, status', e.status);
    if (e.ok && id) await deps.rpc('pb_trial_request_notified', { p_id: id }).catch(() => null);
  } else log('trial-request: no RESEND_API_KEY, not emailed');

  let confirmed = false; // firstweek_web_nov22: only for a stored row (the database's rate limits apply)
  if (stored && deps.sendEmail && deps.confirm !== false) {
    const e = await deps.sendEmail(confirmEmailFor(c, deps.from, deps.to[0] || null)).catch(() => ({ ok: false, status: 0 }));
    confirmed = e.ok;
    if (!e.ok) log('trial-request: confirmation refused, status', e.status);
  }

  log(`trial-request: stored ${stored}, emailed ${emailed}, confirmed ${confirmed}`);
  if (!stored && !emailed) return json(502, { ok: false, error: 'server' }, cors);
  return json(200, { ok: true }, cors);
}
