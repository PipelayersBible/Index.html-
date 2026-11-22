# Security review fixes (staged Nov 21-22 2026, on live r17.14)

Source: Project doc "Review – Security and Privacy – 2026-11-21". Every finding was checked against the LIVE definitions
(read-only SQL, `pg_get_functiondef`, edge function source). **Nothing was applied, deployed or published.** The server
was only read. The repo's `_src/index.html` is untouched.

## What was verified

| # | Finding | Verdict | Evidence (live, Nov 21) |
|---|---|---|---|
| 1 | Two-step login only checked by the app screen | **TRUE (HIGH)** | `public.pb_session_gate()` (live md5 86427e6a…, set as `pgrst.db_pre_request` on `authenticator`) never reads `aal`. `pb_crew_list`, `pb_ai_company_overview` etc. check only `auth.uid()`. `crew-admin` and `weather` edge functions have no aal check. |
| 1 | `owner-admin` has no aal check | **FALSE ALARM** | `owner-admin` calls `pb_owner_admin_ok(actor, aal from the JWT)` → `pb_support.admin_ok`, which demands aal2 when a factor is verified. |
| 1 | `pb_auth.session_started` skips aal1 / `pb_auth.slots` leaves aal1 out | **True but by design, harmless once the gate checks aal** | The password-only session can't do anything after fix 1, so not counting it as a device is right (the code step takes the slot: `session_started` UPDATE branch). No change. |
| 2 | Removed member can add permit versions; closed_at overwritten | **TRUE (MED)** | `pb_permit_backup(text,jsonb,uuid)` finds the permit by (user, client id) only; `closed_at = coalesce(v_closed, closed_at)`. The 4-arg version the app calls ends in it. |
| 2 | `pb_run_seal_add` lacks company check | **TRUE (MED)** | looks up `run_records` by (user, entry) only. |
| 3 | Removed uploader keeps control | **TRUE (MED)**, and wider than listed | `pb_docs.can_manage`, `pb_docs_set_scope`, `pb_docs_put_pages`, `pb_plans_remove`: uploader = `user_id/created_by = me`, no company look. Also **`pb_docs_remove` has its own copy of the old test** (not `can_manage`), and **`pb_plans.can_upload_to`** (storage upload policy `plan_sets_insert`) lets a removed uploader keep adding sheets to a set still uploading. |
| 4 | Join-code brake is app-wide | **TRUE (LOW)** | `pb_onboard.braked()` = 30 misses in 10 min from anyone; `pb_onboard_peek` is anon-callable; `crew-join` (service role) shares it. |
| 5 | Device lock only covers PostgREST | **TRUE (LOW)** | `crew-admin`, `weather` use the service role for their work and never pass the gate. (`docs` asks `pb_docs_can_manage` with the caller's token, so it does pass the gate.) Storage uploads/downloads and Realtime never pass the gate: **gap noted, not built**. |
| 6 | Email link expiry > 1 hour | **TRUE (LOW)** | Security advisor: `auth_otp_long_expiry` (WARN). Dashboard setting, steps below. |
| 7 | No Content Security Policy | **TRUE (LOW)** | no CSP meta or header (GitHub Pages can't send headers). |

## What was built (all staged)

### Server: `sql/` (run in this order; each file is one transaction; apply copies in `sql/apply/`)
Every replaced function goes through `pb_sec.guard(tag, function, md5)` (`00_guard.sql`, included in each apply copy): it
**refuses the whole migration if the live definition is not the one read Nov 21**, and saves the exact live text in
`pb_sec.fn_backup` so each undo puts back the exact text that was live (`pb_sec.restore`). Each file can run twice.

| Apply copy (`sql/apply/`) | Test (rolled back, `sql/tests/`) | Undo (`sql/undo/`) | What |
|---|---|---|---|
| `01_mfa_gate.apply.sql` | `block_t01.sql` → `RESULT: 15 pass, 0 fail` | `99_undo_01.sql` | gate refuses aal1 when the login has a verified factor: `pb:signed_out` / detail `code_needed` (HTTP 401). New `public.pb_session_ok()` (invoker, authenticated only) for edge functions. |
| `02_removed_member_writes.apply.sql` | `block_t02.sql` → `RESULT: 22 pass, 0 fail` | `99_undo_02.sql` | permit versions only from someone still in the permit's company (member row or owner; company status NOT checked so an unpaid/closed company never blocks a crew's backups); re-sending the filed version still answers ok/same; `closed_at` never moves; freeze option `pb_safety.closed_frozen()` **default false**; seal add needs `pb_prod.my_company = run's company` (an already-filed seal still answers `again`). |
| `03_removed_uploader.apply.sql` | `block_t03.sql` → `RESULT: 15 pass, 0 fail` | `99_undo_03.sql` | `pb_docs.still_in(company, user)`; uploader side of `can_manage`, `pb_docs_remove` (now calls `can_manage`), `set_scope`, `put_pages`, `pb_plans_remove`, `pb_plans.can_upload_to` needs the item's company to still be theirs (no company = their own item, unchanged). Office side unchanged. |
| `04_join_code_brake.apply.sql` | `block_t04.sql` → `RESULT: 16 pass, 0 fail` | `99_undo_04.sql` | each miss filed with a caller key (`u:` login hash; `i:` HMAC-SHA256 of the IP with a random 32-byte key in `pb_onboard.caller_salt`, 32 hex, IP never stored; `e:` the key crew-join sends in `x-pb-caller`, trusted only from the service role). Brake = 30 / 10 min per caller (the old number) OR 600 / 10 min app-wide. No key at all → shared bucket of 30 (never worse than today). |

Local runs: throwaway Postgres 16 (`sql/local/run_local.sh`, port 10751; one_device stubs + the real
`one_device_nov20/sql/01_one_device.sql` for `pb_auth` + `sql/local/stubs.sql`): every block passes; every apply copy
runs twice then its undo; all four applied in order and undone leave nothing (`pb_sec 0, new functions 0, who column 0`).
Locally the md5 guard is skipped with `PGOPTIONS='-c pb_sec.guard=skip-local-test'` (the stand-ins aren't the live text).
**On live the blocks have NOT been run** (server read-only for me). The block tests insert throwaway users/companies and
end with `raise 'RESULT …'`, so everything is rolled back; on live they also exercise the real md5 guard and undo.
`2r-2u` (seals) skip themselves with a note if `storage.objects` isn't writable by the role running the block.

### Edge functions: `edge/` (staged code, not deployed)
- `edge/session_check.ts` + `session_check_test.ts` (`deno test --allow-net=127.0.0.1 edge/session_check_test.ts`: 8 PASS):
  calls `pb_session_ok` with the caller's own token, so the gate runs: `pb:code_needed` ("Enter your two-step login code
  first, then try again."), `pb:locked`, `pb:signed_out`; server part not applied yet (PGRST202/404) → allowed as before;
  other errors → refused `pb:server`.
- `edge/crew-admin/index.ts` and `edge/weather/index.ts`: the check inlined, run right after "who is this". **`logic.ts`
  unchanged** (deploy the live one beside it). Both answer 200 `{ok:false, code, message}`; the app shows `message`.
- `edge/crew-join/index.ts`: sends `x-pb-caller` = HMAC of the caller's IP (secret `JOIN_IP_SALT`, else the service role
  key, like trial-request). **`logic.mjs` unchanged.**
- All three parse (esbuild). Not type-checked against the jsr import (no deploy here).

### App: `patches/p01_csp.py` (exact-once, on `_src/index.html` r17.14 md5 25adfdd9…)
Adds `<meta http-equiv="Content-Security-Policy">` after the viewport meta:
`default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://rogfassochneycezecxa.supabase.co; media-src 'self' data: blob:; connect-src 'self' https://rogfassochneycezecxa.supabase.co wss://rogfassochneycezecxa.supabase.co https://o4512143154806784.ingest.us.sentry.io https://nominatim.openstreetmap.org https://cdnjs.cloudflare.com https://cdn.jsdelivr.net data: blob:; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' blob: data:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`
- Measured: 15 inline `<script>` blocks, ~1,400 inline `on…=` handlers, jsPDF/pdf.js injected as inline script text
  (`pbLazy*`) → **`'unsafe-inline'` is required** for scripts (hashes can't cover handlers). No `'unsafe-eval'` needed
  (pdf.js runs with `isEvalSupported: false`; jsPDF has no eval). GoatCounter is not used in the app (website only).
  So the policy's value is: scripts only from the page + jsdelivr, data can only be sent to the listed hosts, no plugins,
  no `<base>` hijack. It does **not** stop an injected inline script (that needs the handlers moved out: a big refactor).
- `patches/build_csp.sh` rebuilds: `index.src.html` (md5 84a1ec7a…), publish `build/` (md5 89f59881…), test
  `build_hooks/` (+ `p99_csp_log_TEST_ONLY.py`: logs violations as `CSP-VIOLATION …`; never publish).
- `tests/t_csp_smoke.js` on the CSP test build: **all 11 pass**: no violation at start-up or moving between screens; jsPDF
  loads and makes a PDF with an image; pdf.js activates its blob worker and reads a page; Supabase REST/storage/functions,
  Realtime wss, Sentry, OSM, cdnjs, `data/` reachable; data:/blob: images load; **a host not listed is blocked**.
- Full regression on the CSP hooks build: see "Regression" below.
- When a future patch adds a new outside host (a font CDN, a map, an API), the policy must list it or it is blocked.

### App behaviour with the new gate: `tests/t_mfa_gate.js` (rig; every RPC answers like the new gate while aal1): **all 12 pass**
The app's RPCs before the code (incl. `pb_device_seen`) get `pb:signed_out`/`code_needed`; the code sheet is up; the app
does not sign out, shows no "Signed Out" / lock / two-devices message; after the code, the check-in goes through. Why
it is safe in the code: `pb1dEnded` acts only on other_device/moved/ended/in_use/full (`_src` 67533); every sync queue
treats `pb:signed_out` as "nothing filed, try later" (`_src` 24680, 43336, 44681, 45328, 46574, 48302, 61136). The code
sheet uses only the Auth API (`_src` 67000-67030). Before step-up the app sees "Sign in again…" in a few status lines
until the code is entered (cosmetic).

## Apply order (lead)
1. On live, read-only first: `select md5(pg_get_functiondef('public.pb_session_gate()'::regprocedure))` = 86427e6a… (the
   guard checks all of them anyway).
2. Run each test block, expect the RESULT line (an error that says `RESULT: n pass, 0 fail`): `sql/tests/block_t01.sql`
   (15), `block_t02.sql` (22, or fewer with the seal note), `block_t03.sql` (15), `block_t04.sql` (16). Rebuild them with
   `python3 sql/tests/mk.py` after any edit.
3. Apply `sql/apply/01_mfa_gate.apply.sql`. Check: the app still opens signed in and signed out; a two-step login gets the
   code sheet and works after the code.
4. Deploy `edge/crew-admin/index.ts` (+ live `logic.ts`) and `edge/weather/index.ts` (+ live `logic.ts`), JWT verify on as now.
5. Apply `02`, `03`, `04`. After 04 deploy `edge/crew-join/index.ts` (+ live `logic.mjs`). Check keys arrive:
   `select left(who, 2), count(*) from pb_onboard.misses group by 1` after a wrong typed code in the app (signed out → `i:`;
   via Join Crew → `e:`). If you see only nulls, the IP header isn't reaching the database: the brake is then exactly as today.
6. App: release `p01_csp.py` with the next build (`patches/build_csp.sh`); open the live page once with the console open
   and look for "Refused to …" lines.
7. Dashboard: email link expiry (below).
8. Undo, any one: `sql/undo/99_undo_0N.sql` (exact live text back from `pb_sec.fn_backup`), then `99_undo_guard.sql` last
   once all are undone. Edge: redeploy the live versions. App: rebuild without p01.

## Finding 6: steps for Tommy (Supabase dashboard)
1. supabase.com → sign in → project **rogfassochneycezecxa** (The Pipelayer's Bible).
2. Left menu **Authentication** → **Sign In / Providers** (older dashboards: **Providers**) → **Email**.
3. **Email OTP Expiration**: type **3600** (seconds = 1 hour) or less → **Save**.
4. Check: Advisors → Security Advisor → the "Auth OTP long expiry" warning is gone after a refresh.
This one setting is how long every emailed link works: password reset, email sign-in links **and crew invite emails**
(Crew members → Invite). A crew member who opens an invite more than an hour later gets "link expired" and the office
taps Resend (allowed once an hour). Texted Join Crew links/codes are separate (their own expiry, kept in the database) and are
not affected. See decision 3.

## Not built / follow-ups
- Storage and Realtime don't pass the gate (device lock and two-step code): a password-only session of a two-step login
  can still upload/download files its storage policies allow. Fix later in the storage policies
  (`(auth.jwt()->>'aal') = 'aal2' or not exists (verified factor)`).
- `ai` / `ai-next` (Ask; its code is stored encrypted in the database) and `plans` edge functions were not checked for the
  gate; they should call `sessionCheck` too.
- supabase-js is loaded as `@supabase/supabase-js@2` (unpinned) from jsdelivr: pin an exact version (and ideally self-host
  it like pbx/) so a bad publish upstream can't run in the app.
- Security advisor (read-only, Nov 22 04:38 UTC, before anything applied): WARN `auth_otp_long_expiry` (finding 6);
  WARN `anon_security_definer_function_executable` ×10, all by design (signed-out uses: `pb_em_view`, `pb_onboard_peek`,
  `pb_plan_prices`, anonymous report ×4, `pb_session_take_slot`, `pb_session_why`, and `pb_session_gate`, which must stay
  executable because PostgREST runs it as the request's role); WARN `authenticated_security_definer_function_executable`
  ×303 (the app's RPC design: each checks `auth.uid()`); INFO `rls_enabled_no_policy` ×183 (private schemas, by design).
  The new objects add nothing to it: `pb_session_ok` is SECURITY INVOKER; the rest live in schemas the API can't reach,
  with EXECUTE revoked. It can only be re-run for real after applying.

## Decisions for Tommy (recommendations)
1. **Freeze closed permits?** (built as an option, OFF.) On: once a permit is closed, no new version is accepted
   (`pb:permit_closed`); late notes would need an "addendum" feature that doesn't exist yet, and the app today treats
   that code as a retryable failure (needs one line in `PB_PERMIT_BK_REFUSED` and wording). **Recommend: keep OFF now**;
   closed_at already can't move, and the app already tells the foreman a closed permit can't be reopened. Revisit with
   an addendum feature.
2. **A removed member's unsent permit versions stay on their phone** (refused, retried with back-off) and never reach the
   company. Alternative: accept them but mark "sent after removal". **Recommend: refuse** (the review's point), the
   company still has every version filed before the removal.
3. **Email link expiry 1 hour** also shortens crew invite emails to 1 hour. **Recommend: 3600 anyway**; most crews join by
   texted link/code now, and Resend works.
4. **CSP needs 'unsafe-inline'.** Ship the policy now (it limits where data can go and where scripts load from), and later
   move the ~1,400 inline handlers to listeners so `'unsafe-inline'` can go. **Recommend: ship now.**
5. **Brake numbers**: 30 wrong codes / 10 min per phone, 600 / 10 min for everyone. **Recommend: keep**; mobile carriers
   put many phones behind one IP, so a crew joining together on one carrier still gets 30 tries between them.

## Regression
(filled in below when the run ends)

## DONE
