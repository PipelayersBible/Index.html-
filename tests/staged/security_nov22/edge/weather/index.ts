// weather: observed weather for a JOB's work day, for the foreman's daily report. Batch 23 DAILY, Oct 20 2026.
// v3 (feat_wxfix, Oct 29 2026): a city/state is looked up OFFLINE in the database (pb_daily_place_lookup over the US
// Census places table pb_daily.us_places); Nominatim is gone (it answered 403 to Supabase's edge). A street address still
// goes to the US Census geocoder first. An attempt that gets no NWS answer is given back (pb_daily_weather_release).
// security_nov22 (Nov 21 2026): the caller's session must pass the API's own gate first (two-step login code entered when
// it is on; this device not locked by the one-device rule): sessionCheck() below. Needs sql/01_mfa_gate.sql; without it
// the check allows, as before. logic.ts is UNCHANGED (deploy it as it is live, beside this file).
// The app calls it with supabase.functions.invoke('weather', { body: { job_number, work_date, place?, address?, lat?, lon?, source?, refresh? } }).
// Why a function: api.weather.gov requires a User-Agent header and browsers can't set one.
// Outside hosts: api.weather.gov (NWS) and geocoding.geo.census.gov (Census, street addresses only). No key, no secrets.
// Optional secret WEATHER_UA_CONTACT: contact put in the User-Agent, as NWS asks (default: the app's website).
// Logs: status codes and counts only; never an address, coordinates or a person.
import { fail, handle } from './logic.ts';

const CONTACT = Deno.env.get('WEATHER_UA_CONTACT') ?? 'https://app.pipelayersbible.com/';
const UA = `PipelayersBible-weather/2.0 (+${CONTACT})`; // the app name + a contact, as NWS asks (no personal email)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const URL0 = Deno.env.get('SUPABASE_URL')!, SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

async function svc(name: string, args: Record<string, unknown>) {
  try {
    const r = await fetch(`${URL0}/rest/v1/rpc/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SVC, Authorization: `Bearer ${SVC}` }, body: JSON.stringify(args) });
    let data: unknown = null; try { data = await r.json(); } catch (_e) { data = null; }
    return { ok: r.ok, data: data as any };
  } catch (_e) { return { ok: false, data: null }; }
}
async function get(url: string) {
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/geo+json, application/json' }, signal: ctl.signal });
    clearTimeout(t);
    let j: unknown = null; try { j = await r.json(); } catch (_e) { j = null; }
    console.log('weather: GET', new URL(url).host, r.status);
    return { status: r.status, json: j as any };
  } catch (_e) { return { status: 0, json: null }; }
}
async function whoIs(auth: string | null): Promise<string | null> {
  if (!auth || !/^Bearer\s+\S+$/.test(auth)) return null;
  try {
    const r = await fetch(`${URL0}/auth/v1/user`, { headers: { Authorization: auth, apikey: ANON || SVC } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && typeof u.id === 'string' ? u.id : null;
  } catch (_e) { return null; }
}

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(fail('pb:bad_request'), 405);
  const uid = await whoIs(req.headers.get('Authorization'));
  if (!uid) return json({ ok: false, code: 'pb:signed_out', message: 'Sign in again to get the weather.' }, 401);
  // security_nov22: the same gate as every app request (two-step code, device lock, ended session)
  const sc = await sessionCheck(URL0, req.headers.get('Authorization')!, req.headers.get('apikey') || ANON);
  if (!sc.ok) { console.log('weather:', sc.code); return json({ ok: false, code: sc.code, message: sc.message }); }
  let body: unknown = null; try { body = await req.json(); } catch (_e) { body = null; }
  const out = await handle({ svc, get, now: () => Date.now() }, uid, body);
  console.log('weather:', (out as any).ok ? ((out as any).cached ? 'cached' : 'fetched') : (out as any).code);
  return json(out);
});
