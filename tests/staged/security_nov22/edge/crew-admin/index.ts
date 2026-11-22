// crew-admin: the company account's "Crew members" actions, and a person answering their own invitation
// (batch 13 C, Oct 19 2026; review 1 fixes in; batch 19 PM: role 'pm' passes through). STAGED ONLY: the lead deploys it.
// security_nov22 (Nov 21 2026): before any action, the caller's session must pass the API's own gate (two-step login code
// entered when it is on; this device not locked by the one-device rule; session not ended): sessionCheck() below.
// Needs sql/01_mfa_gate.sql (public.pb_session_ok); without it the check allows, as before. logic.ts is UNCHANGED (deploy
// it as it is live, beside this file).
// Batch 19 needs sql/01_pm.sql (and OWNER_PASTE_04_pm.sql for anything PM); without them a 'pm' role answers pb:bad_role.
//
// Deploy WITH JWT verification (the default):  supabase functions deploy crew-admin   (with logic.ts beside it)
// Secrets: none to add. SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. The service
// role key stays in this function; it is never sent to the app.
// Needs sql/01_crew.sql. Remove and Remove Manager also need sql/02_crew_remove.sql; until it is applied they answer
// "The company server isn't ready for this yet. Nothing was changed." (and change nothing).
// Auth: add https://app.pipelayersbible.com/ to Authentication > URL Configuration > Redirect URLs, or the
// invite link quietly falls back to the Site URL (review 1 N7).
//
// Every database step goes through ONE public function, pb_crew_svc(step, args). It refuses in its body unless the
// request carries the service role; the steps themselves live in schema pb_crew, which the API can't reach.
//
// Request (POST, JSON, the caller's own session):
//   { action: 'invite' | 'resend' | 'set_role' | 'remove' | 'set_manager', company_id (the company the screen showed),
//     email + role (invite; role: 'foreman' | 'pipelayer' | 'pm'; optional name: the name the company gives them), user_id (the others), role (set_role), on (set_manager) }
//   { action: 'answer_invitation', invitation_id, accept: true | false }   (any signed-in person, their own invitation)
//   { action: 'withdraw', company_id, invitation_id }   (company account: withdraw a pending invitation)
// Answer: always 200 { ok, code, message, ... } for anything the caller did or was refused, so the app can show the words.
// Logs: action and code only. Never an email address.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handle, answer, type Deps } from './logic.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ---- security_nov22: session check (same text as edge/session_check.ts) ----
type SessionCheck = { ok: true } | { ok: false; code: string; message: string };
async function sessionCheck(url: string, authHeader: string, apikey: string): Promise<SessionCheck> {
  try {
    const r = await fetch(`${url}/rest/v1/rpc/pb_session_ok`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey, Authorization: authHeader }, body: '{}',
    });
    if (r.ok) return { ok: true };
    let j: any = null; try { j = await r.json(); } catch (_e) { j = null; }
    const m = String((j && j.message) || ''), d = String((j && j.details) || ''), c = String((j && j.code) || '');
    if (/pb:signed_out/.test(m)) {
      if (d === 'code_needed') return { ok: false, code: 'pb:code_needed', message: 'Enter your two-step login code first, then try again.' };
      if (d === 'locked') return { ok: false, code: 'pb:locked', message: 'This account is in use on your other device right now. Try again when that one has been idle for 5 minutes.' };
      return { ok: false, code: 'pb:signed_out', message: 'Sign in again, then try again.' };
    }
    if (r.status === 404 || c === 'PGRST202') return { ok: true }; // the server part isn't applied yet: as before
    return { ok: false, code: 'pb:server', message: 'The server didn’t answer properly. Try again.' };
  } catch (_e) {
    return { ok: false, code: 'pb:server', message: 'The server didn’t answer. Check the signal and try again.' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, answer(false, 'pb:bad_request'));

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  // Whose session this is (the gateway already checked the token is valid).
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return reply(200, answer(false, 'pb:signed_out'));
  // security_nov22: the same gate as every app request (two-step code, device lock, ended session)
  const sc = await sessionCheck(Deno.env.get('SUPABASE_URL')!, 'Bearer ' + token, req.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY') || '');
  if (!sc.ok) { console.log('crew-admin: session refused', sc.code); return reply(200, { ok: false, code: sc.code, message: sc.message }); }

  const raw = await req.text();
  if (raw.length > 4000) return reply(200, answer(false, 'pb:bad_request'));
  let body: unknown; try { body = JSON.parse(raw); } catch { return reply(200, answer(false, 'pb:bad_request')); }

  const deps: Deps = {
    svc: async (step, args) => await admin.rpc('pb_crew_svc', { p_step: step, p_args: args }),
    invite: async (email, redirectTo) => await admin.auth.admin.inviteUserByEmail(email, { redirectTo }),
    // SEATS: the billing batch hooks Stripe quantity updates in here (logic.ts onSeatsChanged). No-op for now.
    onSeatsChanged: (_companyId, _oldCount, _newCount) => {},
    log: (...a) => console.log(...a.map((x) => (typeof x === 'string' && x.includes('@') ? '[redacted]' : x))),
  };
  try {
    return reply(200, await handle(deps, who.user.id, body));
  } catch (_e) {
    console.log('crew-admin: unexpected failure');
    return reply(200, answer(false, 'pb:server'));
  }
});
