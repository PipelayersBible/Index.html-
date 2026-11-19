// trial-request (staged Nov 18 2026, NOT deployed): the free-trial form on pipelayersbible.com posts here.
// Deploy WITHOUT JWT verification (the website has no login):
//   supabase functions deploy trial-request --no-verify-jwt --project-ref rogfassochneycezecxa      (files: index.ts, logic.ts)
// Needs sql/01_trial_requests.sql applied first (public.pb_trial_request_add / pb_trial_request_notified).
//
// Secrets: RESEND_API_KEY (already set, same as notify-report and feedback-notify). Optional: REPORT_FROM (sender, same
// default as the other functions), TRIAL_NOTIFY_TO (comma-separated; default tfontaine@pipelayersbible.com),
// TRIAL_IP_SALT (key for the IP hash; default: the service role key), TRIAL_ALLOW_LOCAL=0 to stop answering localhost.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase. Logs: counts and statuses only, no form content.

import { handle } from './logic.ts';

const FROM = Deno.env.get('REPORT_FROM') ?? "The Pipelayer's Bible <reports@pipelayersbible.com>";
const TO = (Deno.env.get('TRIAL_NOTIFY_TO') ?? 'tfontaine@pipelayersbible.com').split(',').map((s) => s.trim()).filter((s) => /^[^@\s]+@[^@\s]+$/.test(s));
const ALLOW_LOCAL = Deno.env.get('TRIAL_ALLOW_LOCAL') !== '0';

async function rpc(name: string, args: Record<string, unknown>) {
  const url = Deno.env.get('SUPABASE_URL')!, key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` }, body: JSON.stringify(args),
    });
    let data: unknown = null; try { data = await r.json(); } catch (_e) { data = null; }
    return { ok: r.ok, status: r.status, data };
  } catch (_e) { return { ok: false, status: 0, data: null }; }
}

// HMAC-SHA256 of the IP, first 32 hex characters: enough to count requests per IP, not reversible without the key
async function hashIp(ip: string) {
  const secret = Deno.env.get('TRIAL_IP_SALT') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'pb-trial';
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ip)));
  return Array.from(sig.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

const rk = ((Deno.env.get('RESEND_API_KEY') ?? '').match(/re_[A-Za-z0-9_\-]+/) ?? [''])[0];
const sendEmail = rk ? async (payload: Record<string, unknown>) => {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rk}` }, body: JSON.stringify(payload),
    });
    return { ok: r.ok, status: r.status };
  } catch (_e) { return { ok: false, status: 0 }; }
} : null;

Deno.serve((req, info) => {
  const addr = info && (info.remoteAddr as Deno.NetAddr | undefined);
  return handle(req, { rpc, sendEmail, hashIp, from: FROM, to: TO, log: (...a) => console.log(...a) }, { allowLocal: ALLOW_LOCAL, remoteIp: addr && 'hostname' in addr ? addr.hostname : '' });
});
