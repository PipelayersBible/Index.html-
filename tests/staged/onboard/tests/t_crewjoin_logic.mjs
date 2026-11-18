// node tests/t_crewjoin_logic.mjs : the crew-join edge logic with the database and Auth mocked.
import { handle } from '../functions/crew-join/logic.mjs';
import { randomBytes } from 'node:crypto';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
function mk(over = {}) {
  const calls = []; const users = {};
  const deps = {
    calls, users,
    svc: async (step, args) => { calls.push(step); const f = over[step]; return f ? f(args) : { data: { ok: true } }; },
    createUser: async (a) => { calls.push('createUser'); if (over.createFail) return { error: { message: 'x' } }; const id = '11111111-2222-4333-8444-555555555555'; users[id] = a; return { data: { user: { id } } }; },
    deleteUser: async (id) => { calls.push('deleteUser'); delete users[id]; return {}; },
    generateLink: async (email) => { calls.push('generateLink:' + email.replace(/^m-[0-9a-f]+/, 'm-X')); return { data: { properties: { hashed_token: 'HASH' } } }; },
    randomBytes: (n) => randomBytes(n),
  };
  return deps;
}
const LID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', TOK = 'A'.repeat(32);
// 1. join, happy path
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'join', role: 'pipelayer' } }), join: (a) => ({ data: { ok: true, company_name: 'DIG', role: 'pipelayer', user_id: a.user_id } }) });
  const r = await handle(d, { action: 'join', token: TOK, name: 'Mike', terms: { t: '1.0', p: '1.0' } });
  const u = Object.values(d.users)[0];
  ok(r.ok && r.token_hash === 'HASH' && r.type === 'magiclink' && r.role === 'pipelayer', 'join: signed-in hash back with the role');
  ok(u && /^m-[0-9a-f]{24}@crew\.pipelayersbible\.com$/.test(u.email) && u.email_confirm === true && u.app_metadata.pb_link === true && u.password.length === 64, 'join: account with a hidden address, confirmed, random password, pb_link');
  ok(d.calls.join(',') === 'claim,createUser,join,generateLink:m-X@crew.pipelayersbible.com', 'join: order claim, create, join, sign-in link (no email sent): ' + d.calls.join(',')); }
// 2. the database refuses the link: no account is made
{ const d = mk({ claim: () => ({ data: { ok: false, code: 'pb:link_used' } }) });
  const r = await handle(d, { action: 'join', token: TOK, name: 'X', terms: { t: '1', p: '1' } });
  ok(!r.ok && r.code === 'pb:link_used' && !d.calls.includes('createUser'), 'used link: refused, no account made'); }
// 3. join refused after the account was made (seat cap hit meanwhile): the account is deleted, the claim let go
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'join' } }), join: () => ({ data: { ok: false, code: 'pb:trial_seats' } }) });
  const r = await handle(d, { action: 'join', code: 'k7m-4qp', name: 'X', terms: { t: '1', p: '1' } });
  ok(!r.ok && r.code === 'pb:trial_seats' && d.calls.includes('deleteUser') && d.calls.includes('abandon') && !Object.keys(d.users).length, 'join refused late: account deleted, claim abandoned'); }
// 4. no terms: refused before an account is made
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'join' } }) });
  const r = await handle(d, { action: 'join', token: TOK, name: 'X' });
  ok(!r.ok && r.code === 'pb:terms_needed' && !d.calls.includes('createUser'), 'no Terms: refused, nothing made'); }
// 5. handoff sign-in
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'handoff', email: 'm-abc@crew.pipelayersbible.com' } }), handoff: () => ({ data: { ok: true, user_id: 'u', email: 'm-abc@crew.pipelayersbible.com' } }) });
  const r = await handle(d, { action: 'signin', code: 'ABCDEF' });
  ok(r.ok && r.token_hash === 'HASH' && !d.calls.includes('createUser'), 'handoff: signs in the same account, makes none'); }
// 6. a join code used for sign-in (and the other way round) is refused
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'join' } }) });
  const r = await handle(d, { action: 'signin', code: 'ABCDEF' });
  ok(!r.ok && r.code === 'pb:use_join' && d.calls.includes('abandon'), 'join code on sign-in: refused, claim let go'); }
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'handoff', email: 'e' } }) });
  const r = await handle(d, { action: 'join', code: 'ABCDEF', terms: { t: 1, p: 1 } });
  ok(!r.ok && !d.calls.includes('createUser'), 'handoff code on join: refused, nothing made'); }
// 7. junk input
{ const d = mk(); ok((await handle(d, { action: 'join', token: 'x<script>' })).code === 'pb:link_not_found' && !d.calls.length, 'junk token: refused before the database');
  ok((await handle(d, { action: 'drop' })).code === 'pb:bad_request', 'unknown action refused'); }
// 8. Auth refuses to make the account
{ const d = mk({ claim: () => ({ data: { ok: true, link_id: LID, kind: 'join' } }), createFail: true });
  const r = await handle(d, { action: 'join', token: TOK, name: 'X', terms: { t: 1, p: 1 } });
  ok(!r.ok && d.calls.includes('abandon') && !d.calls.includes('join'), 'account not made: claim abandoned, no join'); }
console.log(fails ? fails + ' FAILED' : 'ALL PASS'); process.exit(fails ? 1 : 0);
