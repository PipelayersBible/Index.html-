// security_nov22 (review findings 1 and 5): the checks PostgREST makes on every app request, for an edge function.
// It calls the no-op RPC public.pb_session_ok() WITH THE CALLER'S OWN TOKEN, so the API's pre-request gate
// (public.pb_session_gate) runs first: two-step login code entered when it is on (aal2), this device not locked by the
// one-device rule, the session not ended. The function's own service-role calls skip that gate, which is why this is needed.
// Server part: sql/01_mfa_gate.sql. Until it is applied (no pb_session_ok): allowed, exactly as before.
// Copied verbatim into crew-admin/index.ts and weather/index.ts (each deploys as its own files).
export type SessionCheck = { ok: true } | { ok: false; code: string; message: string };
export async function sessionCheck(url: string, authHeader: string, apikey: string): Promise<SessionCheck> {
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
