// crew-join: a crew member joins from a texted link with no email and no password (feat onboard Nov 17; onboard2
// Nov 19 2026, on r17.04). STAGED ONLY: the lead deploys it, after sql/01_onboard.sql (onboard2) is applied.
// Opening a link never reaches this function: only the app's Join Crew tap does (scanners and previews use nothing).
//
// Deploy WITHOUT JWT verification (the person has no account yet):  supabase functions deploy crew-join --no-verify-jwt
// (with logic.mjs beside it). Secrets: none to add (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided).
// It makes accounts only for a live, single-use link (checked in the database); nothing else. Rate: the database brakes
// wrong codes globally; Supabase's own edge rate limits apply on top. Owner: point no MX record at JOIN_DOMAIN.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handle, answer } from './logic.mjs';

const cors = { 'Access-Control-Allow-Origin': 'https://app.pipelayersbible.com', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, answer(false, 'pb:bad_request'));
  const raw = await req.text();
  if (raw.length > 2000) return reply(200, answer(false, 'pb:bad_request'));
  let body: unknown; try { body = JSON.parse(raw); } catch { return reply(200, answer(false, 'pb:bad_request')); }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const deps = {
    svc: async (step: string, args: Record<string, unknown>) => await admin.rpc('pb_onboard_svc', { p_step: step, p_args: args }),
    createUser: async (a: Record<string, unknown>) => await admin.auth.admin.createUser(a as any),
    deleteUser: async (id: string) => await admin.auth.admin.deleteUser(id),
    generateLink: async (email: string) => await admin.auth.admin.generateLink({ type: 'magiclink', email }), // sends NO email
    randomBytes: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    log: (...a: unknown[]) => console.log(...a),
    ua: req.headers.get('user-agent') || '', // recorded with the Terms acceptance, like pb_terms_accept's p_ua
  };
  try { return reply(200, await handle(deps, body)); }
  catch (_e) { console.log('crew-join: unexpected failure'); return reply(200, answer(false, 'pb:server')); }
});
