// crew-join decision logic (feat onboard Nov 17; onboard2 Nov 19 2026, on r17.04). STAGED ONLY: never deployed from here.
// Pure: everything it touches comes in through `deps`, so the same file runs in the edge function (index.ts) and in the
// node test (tests/t_crewjoin_logic.mjs, mocked). Every rule about links (single use, expiry, revoked, company active or
// closed, seats, the brake on codes) is checked in the database: public.pb_onboard_svc (sql/01_onboard.sql), service
// role only. Nothing here runs when a link is merely opened: only the app's Join Crew tap calls this function.
// This file only orders the steps, makes the account (no email, no password anyone knows), and signs the phone in with
// a one-time magic-link hash that is never emailed.
//
// Request (POST JSON, the app's publishable key; no session needed):
//   { action: 'join',   token | code, name, terms: { t, p }, notice, phone_at, build }
//                                                                -> a new account in the link's company with its role; the
//                                                                   Terms (and the crew notice) ticked on the join screen are
//                                                                   recorded with the join, in its transaction (#17)
//   { action: 'signin', token | code }                           -> a handoff code: sign in to the account that made it
// Answer: always 200 { ok, code, ... }. On success { ok: true, token_hash, type: 'magiclink', company_name, role }.
// The phone then calls supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }) and is signed in.
// Logs: action and code only. Never a token, a code, a name or an address.

export const JOIN_DOMAIN = 'crew.pipelayersbible.com'; // owner decision: a subdomain with NO mail (MX) records
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;
const CODE = /^[A-Za-z0-9 -]{6,12}$/;
const VER = /^[0-9]{1,3}(\.[0-9]{1,3}){0,2}$/;

export const answer = (ok, code, extra = {}) => Object.assign({ ok, code: code || null }, extra);
const codeOf = (e) => { const m = /pb:[a-z_]+/.exec(String((e && e.message) || '')); return m ? m[0] : 'pb:server'; };

function randomHex(deps, n) { const b = deps.randomBytes(n); return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''); }

async function svc(deps, step, args) {
  const r = await deps.svc(step, args);
  if (r.error) return { fail: answer(false, codeOf(r.error)) };
  if (!r.data || typeof r.data !== 'object') return { fail: answer(false, 'pb:server') };
  return { data: r.data };
}

async function signInHash(deps, email) {
  const g = await deps.generateLink(email);
  const h = g && !g.error && g.data && g.data.properties && g.data.properties.hashed_token;
  return h || null;
}

export async function handle(deps, body) {
  const log = deps.log || (() => {});
  if (!body || typeof body !== 'object' || !['join', 'signin'].includes(body.action)) return answer(false, 'pb:bad_request');
  const token = typeof body.token === 'string' && TOKEN.test(body.token) ? body.token : null;
  const code = !token && typeof body.code === 'string' && CODE.test(body.code) ? body.code : null;
  if (!token && !code) return answer(false, 'pb:link_not_found');

  const c = await svc(deps, 'claim', token ? { token } : { code });
  if (c.fail) { log('crew-join claim', c.fail.code); return c.fail; }
  const L = c.data;
  if (!L.ok) { log('crew-join refused', L.code); return answer(false, L.code || 'pb:server'); }
  if (!UUID.test(String(L.link_id || ''))) return answer(false, 'pb:server');

  if (body.action === 'signin') {
    if (L.kind !== 'handoff') { await deps.svc('abandon', { link_id: L.link_id, why: 'pb:not_handoff' }); return answer(false, 'pb:use_join'); }
    const u = await svc(deps, 'handoff', { link_id: L.link_id });
    if (u.fail) return u.fail;
    if (!u.data.ok) return answer(false, u.data.code || 'pb:server');
    const h = await signInHash(deps, u.data.email);
    if (!h) { log('crew-join signin: no link'); return answer(false, 'pb:server'); }
    return answer(true, null, { token_hash: h, type: 'magiclink' });
  }

  // join: a new account with no email anyone reads and no password anyone knows
  if (L.kind !== 'join') { await deps.svc('abandon', { link_id: L.link_id, why: 'pb:not_join' }); return answer(false, 'pb:link_not_found'); }
  if (!body.terms || !VER.test(String(body.terms.t)) || !VER.test(String(body.terms.p))) { await deps.svc('abandon', { link_id: L.link_id, why: 'pb:terms' }); return answer(false, 'pb:terms_needed'); }
  const name = typeof body.name === 'string' ? body.name.slice(0, 400) : '';
  const email = 'm-' + randomHex(deps, 12) + '@' + JOIN_DOMAIN;
  const made = await deps.createUser({ email, email_confirm: true, password: randomHex(deps, 32), app_metadata: { pb_link: true }, user_metadata: { full_name: name.slice(0, 80) } });
  const uid = made && !made.error && made.data && made.data.user && made.data.user.id;
  if (!uid) { await deps.svc('abandon', { link_id: L.link_id, why: 'pb:create_failed' }); log('crew-join create failed'); return answer(false, 'pb:server'); }
  const legal = { terms: String(body.terms.t), privacy: String(body.terms.p), notice: VER.test(String(body.notice || '')) ? String(body.notice) : null,
    phone_at: typeof body.phone_at === 'string' ? body.phone_at.slice(0, 40) : null, build: typeof body.build === 'string' ? body.build.slice(0, 40) : '',
    ua: typeof deps.ua === 'string' ? deps.ua.slice(0, 300) : '' };
  const j = await svc(deps, 'join', { link_id: L.link_id, user_id: uid, name, legal });
  if (j.fail || !j.data.ok) {
    await deps.deleteUser(uid); // nothing half-made is left behind
    await deps.svc('abandon', { link_id: L.link_id, why: (j.fail ? j.fail.code : j.data.code) || 'pb:server' });
    return j.fail || answer(false, j.data.code || 'pb:server');
  }
  const h = await signInHash(deps, email);
  if (!h) { log('crew-join join: no link'); return answer(false, 'pb:joined_no_signin', { company_name: j.data.company_name, role: j.data.role }); }
  return answer(true, null, { token_hash: h, type: 'magiclink', company_name: j.data.company_name, role: j.data.role, legal: j.data.legal || null, paired_with: j.data.paired_with || null });
}
