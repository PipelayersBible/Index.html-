// crew-join: a crew member joins from a texted link with no email and no password (feat onboard Nov 17; onboard2
// Nov 19 2026, on r17.04). Opening a link never reaches this function: only the app's Join Crew tap does (scanners and previews use nothing).
// Deployed WITHOUT JWT verification (the person has no account yet). Secrets: none to add (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided).
// It makes accounts only for a live, single-use link (checked in the database); nothing else. Rate: the database brakes
// wrong codes per caller (security_nov22, sql/04_join_code_brake.sql): this function names the caller with the
// x-pb-caller header, an HMAC-SHA256 of the person's IP (first 32 hex; the IP itself never leaves this function), keyed
// with the optional secret JOIN_IP_SALT (else the service role key, like trial-request). Supabase's own edge rate limits
// apply on top. Owner: point no MX record at JOIN_DOMAIN. logic.mjs is UNCHANGED (deploy it as it is live).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handle, answer } from './logic.mjs';

const cors = { 'Access-Control-Allow-Origin': 'https://app.pipelayersbible.com', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// security_nov22: the caller's key for the wrong-code brake (same way trial-request keys its limit)
function clientIp(h: Headers): string {
  const xf = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  return (h.get('cf-connecting-ip') || xf || h.get('x-real-ip') || '').slice(0, 64);
}
async function callerKey(ip: string): Promise<string> {
  if (!ip) return '';
  const secret = Deno.env.get('JOIN_IP_SALT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'pb-join';
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ip)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req, info) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, answer(false, 'pb:bad_request'));
  const raw = await req.text();
  if (raw.length > 2000) return reply(200, answer(false, 'pb:bad_request'));
  let body: unknown; try { body = JSON.parse(raw); } catch { return reply(200, answer(false, 'pb:bad_request')); }
  const addr = info && (info.remoteAddr as Deno.NetAddr | undefined);
  const key = await callerKey(clientIp(req.headers) || (addr && 'hostname' in addr ? addr.hostname : ''));
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: key ? { 'x-pb-caller': key } : {} }, // read only for the service role (pb_onboard.caller)
  });
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
