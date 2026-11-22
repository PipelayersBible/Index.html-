// crew-admin decision logic (batch 13 C, Oct 19 2026; review 1 fixes in; batch 19 PM: the role 'pm', Project manager). Pure: everything it touches comes in through
// `deps`, so the same file runs in the edge function (index.ts) and in the node test (tests/t_fn_logic.mjs, mocked).
//
// Every permission check, and the audit row of every action, is made in the database (sql/01_crew.sql and
// sql/02_crew_remove.sql), reached through ONE function, public.pb_crew_svc(step, args), which refuses unless the
// request carries the service role. This file orders the steps, sends invite emails, and turns codes into words.
// Removals are made by the database step 'take_out' (02), never by this file.
// Batch 19 PM: role may also be 'pm' (Project manager) for invite and set_role. Every PM rule (owner only, a PM can't
// touch the owner or another PM) is checked in the database (sql/01_pm.sql); this file only passes the role through.
// It never logs an email address (logs carry the action and a code only).

export const APP_URL = 'https://app.pipelayersbible.com/'; // r15.50: the app's own domain (was the GitHub Pages address)

export type Res = { data?: any; error?: { message?: string; status?: number; code?: string } | null };
export type Deps = {
  svc: (step: string, args: Record<string, unknown>) => Promise<Res>; // public.pb_crew_svc(p_step, p_args)
  invite: (email: string, redirectTo: string) => Promise<Res>;        // auth.admin.inviteUserByEmail
  onSeatsChanged?: (companyId: string, oldCount: number, newCount: number) => Promise<void> | void;
  log?: (...a: unknown[]) => void;
};

// The words the app shows (the app keeps the same table, for when it can't reach this function at all).
export const MESSAGES: Record<string, string> = {
  'pb:signed_out': 'Sign in again, then try again.',
  'pb:not_company_account': 'Only your company account (the owner, a PM or superintendent, or a manager the owner added) can manage crew members.',
  'pb:company_changed': 'Your company access changed since this screen loaded. Refresh and try again.',
  'pb:bad_email': 'That doesn’t look like an email address. Check it and try again.',
  'pb:bad_role': 'Pick Foreman, Pipelayer, Project manager or Superintendent.', // feat_super: role 'superintendent' = a PM with that title (the database turns it into role pm + the title)
  'pb:bad_request': 'The app sent something the server couldn’t read. Refresh and try again.',
  'pb:bad_target': 'That person couldn’t be found. Refresh and try again.',
  'pb:already_member': 'They’re already in your company.',
  'pb:already_invited': 'They already have an invitation waiting in the app. They join when they accept it.',
  'pb:is_owner': 'That’s the company owner. The owner is always part of the company and can’t be changed here.',
  'pb:self': 'You can’t change or remove your own account here.',
  'pb:owner_only': 'Only the company owner can do that.',
  'pb:is_pm': 'They’re a PM or superintendent, so company access comes with the role. To take it away, change their role or remove them.',
  'pb:not_member': 'They’re not in your company any more. Refresh to see the current list.',
  'pb:invite_limit': 'Your company has sent 30 invites in the last 24 hours, the most allowed. Try again tomorrow.',
  'pb:email_limit': 'The invite email couldn’t be sent: the sign-in email service has reached its hourly limit. Nothing was changed. Try again in an hour.',
  'pb:invite_failed': 'The invite email couldn’t be sent. Nothing was changed. Try again.',
  'pb:not_waiting': 'They’ve already opened their invite and set up their account, so there’s nothing to resend.',
  'pb:resend_soon': 'An invite went to them less than an hour ago. Wait an hour before sending it again: the sign-in email service only sends a few emails an hour.',
  'pb:remove_failed': 'They couldn’t be removed. Nothing was changed. Try again.',
  'pb:unlist_failed': 'Manager access couldn’t be taken off. Nothing was changed. Try again.',
  'pb:not_ready': 'The company server isn’t ready for this yet. Nothing was changed.',
  'pb:wrong_account': 'Another account is signed in on this phone now. Open Crew members again.',
  'pb:name_too_long': 'That name is too long. Names can be up to 80 characters.',
  'pb:not_found': 'That invitation couldn’t be found. It may have been withdrawn.',
  'pb:already_answered': 'You’ve already answered that invitation.',
  'pb:invitation_expired': 'That invitation has expired (invitations last 7 days). Ask the company to invite you again.',
  'pb:not_pending': 'That invitation was already answered, withdrawn or replaced. Refresh to see the list.',
  'pb:company_inactive': 'That company isn’t active right now, so the invitation can’t be accepted.',
  'pb:server': 'The company server didn’t answer properly. Refresh to see what changed, then try again.',
  // see refuseOtherCompany()
  'pb:other_company': 'They’re already in another company. Joining more than one company with the same account is coming soon.',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(['invite', 'resend', 'set_role', 'remove', 'set_manager', 'answer_invitation', 'withdraw']);

export const answer = (ok: boolean, code: string | null, extra: Record<string, unknown> = {}) =>
  Object.assign({ ok, code, message: code ? (MESSAGES[code] || MESSAGES['pb:server']) : null }, extra);

// The pb:... code inside a database error ("pb:not_company_account" raised by pb_crew.ctx), else pb:server.
export const codeOf = (e: any) => { const m = /pb:[a-z_]+/.exec(String((e && e.message) || '')); return m ? m[0] : 'pb:server'; };

// ALREADY IN ANOTHER COMPANY: the one branch for this case. Owner (Oct 19): refuse for now, never move anyone.
// Batch 14 (one account in several companies) turns this into an invitation the person accepts.
// you: the person themselves is answering an invitation (they read "You're ...").
export function refuseOtherCompany(you = false, extra: Record<string, unknown> = {}) {
  const r = answer(false, 'pb:other_company', Object.assign({ otherCompany: true }, extra));
  if (you) r.message = 'You’re already in another company. Joining more than one company with the same account is coming soon.';
  return r;
}

// SEATS: every add, remove and role change goes through here. No-op for now; the billing batch hooks Stripe
// quantity updates in (plan $99/month includes 5 users; owner, Oct 19 10:20). Never blocks or fails the action.
// A pending in-app invitation is not a seat; accepting it is the add.
export async function onSeatsChanged(deps: Deps, companyId: string, oldCount: number, newCount: number) {
  try { if (deps.onSeatsChanged) await deps.onSeatsChanged(companyId, oldCount, newCount); }
  catch (_e) { (deps.log || (() => {}))('crew-admin: onSeatsChanged failed'); }
}

const isRateLimit = (e: any) => !!e && (e.status === 429 || /rate.?limit|over_email_send_rate_limit|too many/i.test(String(e.code || '') + ' ' + String(e.message || '')));
// Review 1 N3: only a real "already registered" answer, not every 422.
const isExists = (e: any) => !!e && /email_exists|user_already_exists|already been registered|already registered/i.test(String(e.code || '') + ' ' + String(e.message || ''));

async function step(deps: Deps, name: string, args: Record<string, unknown>) {
  const r = await deps.svc(name, args);
  if (r.error) return { fail: answer(false, codeOf(r.error)) };
  if (!r.data || typeof r.data !== 'object') return { fail: answer(false, 'pb:server') };
  return { data: r.data };
}
// The refusal the database returned, in words. pb:other_company always goes through the one branch.
const refusal = (d: any, you = false) => d.code === 'pb:other_company' ? refuseOtherCompany(you) : answer(false, d.code || 'pb:server', d.status ? { status: d.status } : {});

export async function handle(deps: Deps, actor: string | null, body: any) {
  const log = deps.log || (() => {});
  if (!actor || !UUID.test(actor)) return answer(false, 'pb:signed_out');
  if (!body || typeof body !== 'object' || !ACTIONS.has(body.action)) return answer(false, 'pb:bad_request');
  const company = body.company_id == null ? null : String(body.company_id);
  if (company !== null && !UUID.test(company)) return answer(false, 'pb:bad_request');
  const base = { p_actor: actor, p_expect_company: company };

  // The person answers their own invitation (Home / Settings). Not a company-account action.
  if (body.action === 'answer_invitation') {
    const inv = body.invitation_id == null ? '' : String(body.invitation_id);
    if (!UUID.test(inv) || typeof body.accept !== 'boolean') return answer(false, 'pb:bad_request');
    const r = await step(deps, 'answer_invitation', { p_actor: actor, p_invitation: inv, p_accept: body.accept });
    if (r.fail) return r.fail;
    if (!r.data.ok) { log('crew-admin: answer refused', r.data.code); return refusal(r.data, true); }
    if (r.data.status === 'accepted' && !r.data.already) await onSeatsChanged(deps, r.data.company_id, Number(r.data.seats_before), Number(r.data.seats_after));
    return answer(true, null, { status: r.data.status, company_name: r.data.company_name || null, role: r.data.role || null });
  }

  // The company account withdraws a pending invitation (R2-S1).
  if (body.action === 'withdraw') {
    const inv = body.invitation_id == null ? '' : String(body.invitation_id);
    if (!UUID.test(inv)) return answer(false, 'pb:bad_request');
    const r = await step(deps, 'withdraw', Object.assign({ p_invitation: inv }, base));
    if (r.fail) return r.fail;
    if (!r.data.ok) return refusal(r.data);
    return answer(true, null, { status: 'withdrawn' });
  }

  const target = body.user_id == null ? null : String(body.user_id);
  if (body.action !== 'invite' && (!target || !UUID.test(target))) return answer(false, 'pb:bad_target');
  const role = body.role == null ? null : String(body.role);

  if (body.action === 'invite') {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || email.length > 254) return answer(false, 'pb:bad_email');
    // batch 19: the name the company typed (optional). The database cleans it (plain text, 80 characters) and logs it.
    const name = typeof body.name === 'string' ? body.name : null;
    if (name !== null && name.length > 400) return answer(false, 'pb:name_too_long');
    for (let tries = 0; tries < 2; tries++) {
      const b = await step(deps, 'invite_begin', Object.assign({ p_email: email, p_role: role, p_name: name }, base));
      if (b.fail) { log('crew-admin: invite', b.fail.code); return b.fail; }
      const d = b.data;
      if (!d.ok) { log('crew-admin: invite refused', d.code); return refusal(d); }
      if (d.done) return answer(true, null, { added: 'invitation', user_id: d.user_id }); // existing account: an in-app invitation, no member yet, no seat
      // a new address: send the invite (the app's link handler asks them to set a password)
      const inv = await deps.invite(d.email, APP_URL);
      const newId = inv && !inv.error && inv.data && inv.data.user && inv.data.user.id;
      if (!newId) {
        const code = isRateLimit(inv && inv.error) ? 'pb:email_limit' : isExists(inv && inv.error) ? 'pb:email_exists' : 'pb:invite_failed';
        await deps.svc('invite_finish', Object.assign({ p_audit_id: d.audit_id, p_user: null, p_role: role, p_error: code }, base));
        log('crew-admin: invite not sent', code);
        if (code === 'pb:email_exists' && tries === 0) continue; // an account appeared meanwhile: start again (now an in-app invitation)
        return answer(false, code === 'pb:email_exists' ? 'pb:invite_failed' : code);
      }
      const f = await step(deps, 'invite_finish', Object.assign({ p_audit_id: d.audit_id, p_user: newId, p_role: role, p_error: null, p_name: name }, base));
      if (f.fail) { log('crew-admin: invite finish', f.fail.code); return answer(false, f.fail.code, { invited_not_added: true }); }
      if (!f.data.ok) return refusal(f.data);
      await onSeatsChanged(deps, f.data.company_id, Number(f.data.seats_before), Number(f.data.seats_after));
      return answer(true, null, { added: 'invited', user_id: newId });
    }
    return answer(false, 'pb:invite_failed');
  }

  if (body.action === 'resend') {
    const b = await step(deps, 'resend_begin', Object.assign({ p_target: target }, base));
    if (b.fail) return b.fail;
    if (!b.data.ok) { log('crew-admin: resend refused', b.data.code); return refusal(b.data); }
    const inv = await deps.invite(b.data.email, APP_URL);
    const code = !inv || inv.error ? (isRateLimit(inv && inv.error) ? 'pb:email_limit' : 'pb:invite_failed') : null;
    await deps.svc('resend_finish', Object.assign({ p_audit_id: b.data.audit_id, p_error: code }, base));
    if (code) { log('crew-admin: resend not sent', code); return answer(false, code); }
    return answer(true, null, { resent: true });
  }

  if (body.action === 'set_role') {
    const r = await step(deps, 'set_role', Object.assign({ p_target: target, p_role: role }, base));
    if (r.fail) return r.fail;
    if (!r.data.ok) return refusal(r.data);
    if (!r.data.unchanged) await onSeatsChanged(deps, r.data.company_id, Number(r.data.seats_before), Number(r.data.seats_after));
    return answer(true, null, { role: r.data.role, unchanged: !!r.data.unchanged });
  }

  if (body.action === 'set_manager') {
    if (typeof body.on !== 'boolean') return answer(false, 'pb:bad_request');
    const r = await step(deps, 'set_manager', Object.assign({ p_target: target, p_on: body.on }, base));
    if (r.fail) return r.fail;
    if (!r.data.ok) return refusal(r.data);
    if (!r.data.need_take_out) return answer(true, null, { manager: body.on, unchanged: !!r.data.unchanged });
    const t = await step(deps, 'take_out', Object.assign({ p_audit_id: r.data.audit_id }, base));
    if (t.fail) return answer(false, t.fail.code === 'pb:server' ? 'pb:unlist_failed' : t.fail.code);
    if (!t.data.ok) { log('crew-admin: manager off refused', t.data.code); return t.data.code === 'pb:not_ready' ? answer(false, 'pb:not_ready') : refusal(t.data); }
    return answer(true, null, { manager: false });
  }

  // remove: checks + the 'requested' audit row first, then the database takes the listing and the membership out
  // in one transaction after checking again (02_crew_remove.sql pb_crew.svc_take_out)
  const b = await step(deps, 'remove_begin', Object.assign({ p_target: target }, base));
  if (b.fail) return b.fail;
  if (!b.data.ok) return refusal(b.data);
  const t = await step(deps, 'take_out', Object.assign({ p_audit_id: b.data.audit_id }, base));
  if (t.fail) return answer(false, t.fail.code === 'pb:server' ? 'pb:remove_failed' : t.fail.code);
  if (!t.data.ok) { log('crew-admin: remove refused', t.data.code); return t.data.code === 'pb:not_ready' ? answer(false, 'pb:not_ready') : refusal(t.data); }
  await onSeatsChanged(deps, t.data.company_id, Number(t.data.seats_before), Number(t.data.seats_after));
  return answer(true, null, { removed: true });
}
