# Easier crew onboarding: "text him a link, he taps it, he's in" (on r16.95)

Folder: /tmp/claude-0/feat/onboard/ (cur.html = r16.95 + patches, served on port 8878).
Status: done (see `## DONE`). Recommendation: section 3; owner choices: `## DECISIONS FOR THE OWNER`.

## 1. How it works today (read from r16.95 and the live database, read-only)

**Adding a person** (Settings > Company > Crew members, `pbCmAdd`, company account only: owner, PM/super or a listed
manager, `pb_prod.managed_company`). Email + optional Name + Role (Foreman / Pipelayer; owner also PM / Super). The app
calls the `crew-admin` edge function (`action: 'invite'`), which goes through `pb_crew_svc` steps:
- `svc_invite_begin`: role check (PM owner-only), 30 invites / company / 24 h (`pb_crew.invites_today`), beta seat cap
  (`pb_billing.trial_seats_full`: company account + 6), and the shared email budget (`pb_pm.email_budget_take('invite')`:
  the app may use 70 of Resend's 100 emails a day; the other ~30 are kept for Supabase Auth's own sign-in emails).
- **New address**: `auth.admin.inviteUserByEmail` sends Supabase's invite email; `svc_invite_finish` inserts
  `company_members (company_id, user_id, role)` at once (a seat). The person opens the email link (`#...type=invite`),
  the app's link handler makes them **Set New Password**, then ends the link sign-in and they **log in** with email +
  password (`signInWithPassword`, the only sign-in the app has; there is no self sign-up screen).
- **Existing account**: an in-app invitation (`pb_crew.invitations`, 7 days) shown on Home / Settings, Accept / Decline
  (`answer_invitation`), which inserts the membership.
- `company_members` has `UNIQUE (user_id)` (one company per account), role check `foreman | pipelayer | pm`, and
  triggers: `pb_trial_seats` (hard seat cap on insert), `joined_at` stamp, crew-link / report-key / PM sync, and
  `pb_member_removed`. pb_prod reads the role through `pb_prod.my_member` (`is_foreman_of`, `is_pipelayer_of`).
- The owner sees members (Active / Invited / Not signed in yet, last sign-in) and pending invitations, can Resend,
  Withdraw, change role, Remove (`crew-admin remove` -> `svc_take_out`, audited in `pb_crew.audit`).

**After the first login**, three things stand between the pipelayer and work:
1. **Terms** (`pbTermsCheck`, r16.78): a full-screen sheet, tick the box, I Agree; recorded with `pb_terms_accept`
   (`PB_TERMS_VER` 1.0 / `PB_PRIV_VER` 1.0, kept on the phone as `pbTermsPend:<uid>` and sent when there's signal).
2. **Crew notice** (`pbCrewNoticeCheck`, r16.83): "What Your Company Sees" modal on Home 1.5 s after the Terms, for a
   member who isn't a manager; remembered only in `localStorage` (`pbCrewNotice:<uid>`). The server has
   `pb_notice_ack(notice, version, ...)` but the app doesn't call it, so there is no server record of the notice.
3. **iPhone notifications** need iOS 16.4+ and the app on the Home Screen (`pbPushEnv`: `ios_homescreen`). The
   Notifications screen tells them: Share > Add to Home Screen > open the icon > **log in again** > Settings >
   Notifications. A Home Screen web app on iOS has its **own storage and its own login**, separate from Safari
   (the app already warns: "the Home Screen app keeps its own records, separate from Safari"). The manifest
   (`manifest.webmanifest`, `start_url: "./"`) is static, so the Home Screen icon never carries the link it was added
   from, and a token in the URL would not reach it.

So for each person: an email account they may not have, a password to make up and remember, an email to find (often in
spam: Supabase invite email via the shared Resend budget), Terms, notice, and on iPhone a second login. That is the
30 to 45 minute tailgate.

**What Supabase Auth offers** (checked against the docs and the project; auth settings themselves can't be read with
SQL):
- Email magic link / email OTP: free, but every one is an email through the same Resend account (100/day shared, 30
  kept for sign-in). Still needs an email address. No good for "doesn't use email".
- Phone OTP (SMS): needs an SMS provider (Twilio / MessageBird / Vonage / Textlocal) on the project. Costs per text
  (Twilio US roughly $0.008 a segment plus carrier fees; Twilio Verify about $0.05 per verification) and US 10DLC
  registration for plain Twilio messaging. Gives a real identity (the phone number) that survives a new phone.
  0 phone users today.
- Anonymous sign-in (`signInAnonymously`): free, must be switched on in Auth settings; the user gets role
  `authenticated` with `is_anonymous: true` in the JWT. 0 anonymous users today. The session lives only in that
  browser's storage: lose it (new phone, cleared Safari, the separate Home Screen app) and the account is gone. Turning
  it on lets anyone mint `authenticated` sessions, and the existing RPCs and RLS policies don't look at
  `is_anonymous`.
- Admin API from an edge function (service role): `auth.admin.createUser({ email, email_confirm: true })` makes an
  account without sending anything; `auth.admin.generateLink({ type: 'magiclink', email })` returns a `hashed_token`
  **without sending an email**, which the phone turns into a session with `auth.verifyOtp({ token_hash, type })`.
  This is the documented "build your own flow" path and costs nothing.
- Invite tokens: Supabase has none apart from the email invite; we build our own (a table + RPCs).

## 2. Options compared

Taps are counted for the new pipelayer from "the text arrives" to "Home screen of the app, in the company with his
role", on an iPhone, including Add to Home Screen where the option allows it. "Today" for reference: open email (if he
has one), tap link, type a password twice, Save, type email + password to log in, tick Terms, I Agree, Got It on the
notice; on iPhone then Share, Add to Home Screen, Add, open icon, type email + password again: about 20+ taps and a lot
of typing, and an email account he may not have.

| Option | What he needs | Cost | Security | Taps (iPhone, incl. Home Screen) | Build |
|---|---|---|---|---|---|
| A. Today's email invite, but texted (crew-admin `generateLink('invite')` instead of sending the email) | an email address, a password | free | as today (email-bound) | about 15 + typing a password twice + logging in again in the Home Screen app | small: edge change |
| B. Join link + **anonymous sign-in** (`signInAnonymously`, then `pb_onboard_join`) | nothing | free (Auth setting) | weak spot: turning anonymous sign-in on lets ANY script mint `authenticated` sessions; every existing RPC / RLS policy treats them as users (no `is_anonymous` checks today). Account is lost with the browser storage (new phone, Safari cleared, Home Screen app) | 6 to 8 | SQL + client only (no edge function). Needs an audit of every RPC / policy / edge function for anonymous users, plus captcha |
| **C. Join link + no-password account made by an edge function (recommended)** | nothing (a name) | free: `admin.createUser` + `admin.generateLink` send nothing; no Resend budget used | accounts can only be made with a live, single-use link; normal (non-anonymous) users; nothing new opens to the internet except `pb_onboard_peek` (read-only, no secrets) and the join function, which refuses without a valid link | 6 to 8 (see the flow below) | SQL (done) + one small edge function (staged) + client (prototyped) |
| D. Join link + **phone number OTP** (Supabase phone auth) | his phone number, a 6-digit text code | SMS provider: Twilio Verify about $0.05 per sign-in, or Twilio SMS ~$0.0079/segment + carrier fees + 10DLC brand/campaign registration (~$4 + ~$15 one-time, ~$2/month); every new phone / reinstall is another paid text | strongest identity: the account IS the phone number, so a new phone just signs in again; SIM-swap risk as with any SMS login | 8 to 10 (+ typing his number and the code; the Home Screen app needs another code = another text) | SQL + client + provider setup; the code would arrive by text, which iOS can autofill |
| E. Username + PIN | a username and a 4 to 6 digit PIN | free | a PIN is guessable online (Supabase's sign-in rate limit is per IP; a few hundred tries an hour per address); not acceptable for an account that files sealed run records | 8 to 10 + typing | edge function to create users with synthetic emails |

Why C over B: the same tap count, but B opens anonymous sign-up for the whole project and depends on every present and
future RPC remembering `is_anonymous`; C keeps "no account without an invitation" exactly as today. C over D: no money,
no provider, no number to type; D remains the upgrade path if lost-phone recovery turns out to matter (decision below).

Both B and C hit the **Home Screen problem**: the Home Screen app is a separate browser storage and login. C solves it
with a one-time **handoff code** (or by joining inside the Home Screen app in the first place, which is what the
recommended flow does on iPhone): see section 3.

## 3. Recommendation: option C, "join link"

### The flow

**Foreman / office** (Crew members > "Text a Join Link", or for a foreman Settings > "Add a Pipelayer by Text"):
Name (optional) > Pipelayer / Foreman > **Make Join Link** > **Text It** (opens Messages with the text filled in:
"Join DIG Civil Construction on The Pipelayer's Bible as Pipelayer: https://app.pipelayersbible.com/#join=... Works once,
for 24 hours."). He picks the contact and sends from his own phone. Also Copy Link / Share, and the 6-character code
(shown as `K7M 4QP`) to read out. The same screen lists his links: Waiting / Opened / **Joined: Mike Rivera 6:42 AM** /
Expired / Revoked, with Revoke on live ones. The office sees every link of the company; a foreman sees his own.

**Pipelayer, Android (or any phone already in a Home Screen app)**: tap the link (1) > the join sheet says "DIG Civil
Construction: Tommy invited you to join as Pipelayer", name filled in from what the foreman typed > tick "I agree to
the Terms of Use and Privacy Policy" (2) (the crew notice "What your company sees" is on the same sheet) > **Join
Crew** (3) > "You're in" > **Start** (4). 4 taps, no typing. The Terms are recorded (`pb_terms_accept` via the
existing pending-terms path) and the crew notice is marked read on the phone and on the server (`pb_notice_ack`), so
neither pops up again.

**Pipelayer, iPhone in Safari**: tap the link (1) > the sheet first says "Step 1 of 2: put the app on your Home
Screen" with the Share > Add to Home Screen > Add pictures, and **Copy Join Code** (2) (copies the link's token) >
Share (3) > Add to Home Screen (4) > Add (5) > open the new icon (6) > the Home Screen app opens on Log In with a big
**Paste Join Code** (7) (iOS shows its Paste bubble (8)) > the same join sheet: tick Terms (9) > Join Crew (10) > Start
(11). Typing the 6-character code works instead of Paste. "Skip: join here in Safari" is always there (4 taps, then the
existing Notifications screen offers a one-time code for the Home Screen app later). The join happens INSIDE the Home
Screen app, so there is one login, in the place he'll use; nothing to carry over from Safari.

### Why this is safe enough for a forwarded link
- **Single use**: the first account that joins uses it up (row lock, `used_at`); the edge function also holds a
  2-minute claim while it makes the account, so two phones can't race one link.
- **Short life**: 24 hours (decision below), revocable; at most 10 live links and 30 a day per company.
- **The token is 192 random bits** and only its SHA-256 is stored; it travels in the `#` part of the URL, which
  browsers never send to the web server or in a Referer, and the app wipes it from the address bar at once.
- **Typed codes** (6 of 23 unambiguous characters, ~148 million) only match live links, and a global brake refuses
  every code lookup after 30 misses in 10 minutes (tokens still work). Logged.
- **The inviter sees who joined** (the name they typed, the time) and the office can **Remove from Company** (the
  existing crew-admin remove). If a stranger got in first, the real pipelayer's link says "already used: ask Tommy
  for a new one", which is the alarm.
- A foreman can only make **Pipelayer** links, only for his company, and the company can turn foreman links off.
- The beta seat cap counts live links (like pending invitations) and the `pb_trial_seats` trigger still guards the insert.
- No new way to make an account without a link: `crew-join` refuses anything the database doesn't vouch for, and the
  rest of the API is unchanged. `pb_onboard_peek` (signed out) returns only the company name, role, inviter name and
  the name typed for him.
- Every step is logged (`pb_onboard.events`: made, opened, claimed, joined, refused, revoked, handoff).

### What a no-email account means
- The account has a hidden address `m-<random>@crew.pipelayersbible.com` (never mailed; the subdomain should have no
  MX record) and a random password nobody knows, flagged `app_metadata.pb_link = true`.
- Signing in again (Home Screen app, a second browser) uses a **handoff code**: Settings / Notifications > "Get a code
  for the Home Screen app" (15 minutes, single use, 5 an hour, made by the person for themselves).
- **New phone / app deleted**: the account can't be recovered by the person (no email, no password). The foreman sends
  a new link (new account) and the office removes the old one; work already sent to the company stays the company's.
  Records that were only on the lost phone are lost either way. Later options: let the person add an email in
  Settings (turns it into a normal account), or a "new phone link" made by the office for that account (decision below).
- Log Out on a no-email account warns first: "This account has no email or password. To get back in you need a code
  from this phone or a new link from your foreman."
- The prototype shows the person's name instead of the hidden address wherever the app shows the account.

### Server (sql/01_onboard.sql, staged, not applied)
Schema `pb_onboard` (API can't reach it): `links` (join and handoff, hashed tokens, codes, expiry, opened / used /
revoked), `misses` (the brake), `events` (log), `settings` (foreman links on/off). API:
`pb_onboard_link_make(role, name)`, `pb_onboard_links()`, `pb_onboard_link_revoke(id)`, `pb_onboard_peek(token|code)`
(anon), `pb_onboard_join(token|code, name)` (the account already signed in on that phone), `pb_onboard_handoff_make()`,
`pb_onboard_settings_set(foreman_links)`, and `pb_onboard_svc(step, args)` for the edge function (service role only:
claim / join / handoff / abandon). All SECURITY DEFINER with `search_path ''`.

Edge function `functions/crew-join` (staged, not deployed): `{action:'join', token|code, name, terms}` > claim > 
`auth.admin.createUser` (hidden address, confirmed, random password, `pb_link`) > join (if refused, the account is
deleted again) > `auth.admin.generateLink('magiclink')` > returns only the `hashed_token`; the phone calls
`auth.verifyOtp({ token_hash, type: 'magiclink' })`. `{action:'signin', token|code}` does the same for a handoff code
without making an account. Deploy with `--no-verify-jwt` (the person has no account yet). Unit test with mocks:
`node tests/t_crewjoin_logic.mjs` (12 checks pass).

### Server test (rolled back)
`sql/01_onboard_test.sql` (built by `sql/mktest.py`): all of 01_onboard.sql run with EXECUTE inside one DO block, two
throw-away accounts inserted, each step run as the real role (`set_config('request.jwt.claims', ...)` + `set local role
authenticated | anon | service_role`), then `raise exception 'RESULT: ...'`, so everything (schema included) rolls back.

**Live run: not done.** The Supabase `execute_sql` call for this block was cancelled by this session's client 0.6 s
after it was sent ("Nothing was run"): a DO block with DDL needs a confirmation that a background session can't give.
Nothing was written. To run it live, paste `sql/01_onboard_test.sql` into the SQL editor (it ends in an exception, so
nothing stays) or run it from a session that can confirm.

**Run instead on a local Postgres 16** (throw-away cluster, port 55478) loaded with `sql/00_replica_local.sql`: the
live definitions of every object 01_onboard.sql touches (`pb_prod.my_member / my_company / managed_company /
is_foreman_of`, `pb_crew.clean_name / label_of / own_name / display_name / put_label / in_other_company`,
`pb_billing.trial_*` and the `pb_trial_seats` trigger, `auth.uid / auth.role`), copied verbatim with read-only
`pg_get_functiondef`, the live company's ids as seed. Also checked: 01_onboard.sql applies cleanly as a plain file on a
fresh copy, and after the test block the local DB has no `pb_onboard` schema and no extra users or members (rolled back).
Result (`sql/01_onboard_test.result.txt`):
```
RESULT: 1.O.make=true toklen=32 code=true role=pipelayer exp_h=24 O.makeForeman=true O.makePm=pb:bad_role
 | 2.F.makePl=true F.makeFm=pb:foreman_pipelayer_only
 | 3.P.make=pb:not_company_account
 | 4.anon.peek=true co=DIG Civil Construction role=pipelayer label=Mike by=Your company codeBack=true peekByCode=true codeHidden=true peekWrong=pb:link_not_found anon.join=denied anon.find=denied anon.svc=denied
 | 5.svc.claim=true kind=join claimAgain=pb:link_busy join=true role=pipelayer member=pipelayer label=Mike own=Mike Rivera claimUsed=pb:link_used peekUsed=pb:link_used
 | 6.N2.join=true role=pipelayer co=DIG Civil Construction again=pb:link_used
 | 7.P.join=pb:already_member P.role=pipelayer
 | 8.F.revokeOwners=pb:not_company_account O.revoke=true peekRevoked=pb:link_revoked
 | 9.peekExpired=pb:link_expired
 | 10.O.links=4 statuses=expired,joined,joined,revoked joinedName=Mike F.links=1 F.mgr=false P.links=0
 | 11.N1.handoff=true min=15 peekHandoffAsJoin=pb:link_not_found claim=handoff email=m-test1@crew.pipelayersbible.com use=true user=true again=pb:link_not_found
 | 12.peekCodeBraked=pb:busy peekFreshTokenBraked=ok
 | 13.trial make1=ok make2=pb:trial_seats seatsUsed=6
 | 14.liveMade=10 then=pb:too_many_links
 | 15.F.off=pb:foreman_links_off F.setting=pb:not_company_account F.svc=permission denied for function pb_onboard_svc
 | events=claimed:2,handoff_made:1,handoff_used:1,joined:2,made:16,opened:2,refused:2,revoked:1
```
Reading it: the owner makes Pipelayer and Foreman links (192-bit token, 6-char code, 24 h), not PM; the foreman only
Pipelayer; a pipelayer none. Signed out, peek shows company / role / the typed name and gives the code back only to the
token holder; a wrong token is "not found"; anon can't join, can't reach the schema or the service function. The edge
path: claim (a second claim is "busy"), join as Pipelayer with the label "Mike" and own name "Mike Rivera", then the
link is used for claim and peek. A signed-in account joins with the foreman's typed code; a second use is refused; an
existing member gets `already_member` with his role unchanged. The foreman can't revoke the owner's link (this caught a
null-check bug, fixed), the owner can; revoked and expired links are refused. The owner lists all 4 of the company's
links, the foreman his 1, a pipelayer none. Handoff: 15 min, can't be used as a join code, signs in the same account
once. 30 misses brake codes but not tokens. Beta cap: 6 seats used + 1 live link = 7 refuses the next link. 10 live
links max. Foreman links off: the foreman is refused, and he can't change the setting or call the service function.

## 4. Client prototype (patches/01_onboard.py + patches/01_onboard.js, on r16.95)

`python3 patches/01_onboard.py index.html cur.html` (exact-once replacements with asserts, repo style; the module text
is read from `01_onboard.js` beside it and inserted after the Terms code, whose `PB_TERMS_VER`, `pbTermsLs` and
`pbTermsSendPending` it reuses). `node --check` of the main script passes.
- **Start-up**: `#join=<token>` is read before anything else and removed from the address bar / history at once; when
  start-up has settled (signed in or not) the join sheet opens.
- **Join sheet** (one overlay above every screen, z-index just under the app's modals so its confirmations stay on top):
  checks the link (`pb_onboard_peek`), then on an iPhone in Safari (iOS 16.4+, not standalone, signed out) shows
  "Step 1 of 2: Put the App on Your Home Screen" with Copy Join Code (copies `PBJOIN:<token>`), the code to type, and
  "Skip: Join Here in Safari"; otherwise (Android, desktop, the Home Screen app, or Skip) the join form: company, who
  invited him, role, his name (filled in from what the inviter typed), the crew notice text, the Terms box, Join Crew.
  Signed out: `crew-join` (join) then `auth.verifyOtp` with the one-time hash, then the app's own
  `pbSwitchToSignedInUser` (so records, plan, access load exactly as after a login). Signed in: `pb_onboard_join` with
  the current account. Before the switch the Terms are put in the existing pending-Terms slot (sent by
  `pbTermsSendPending`) and the crew notice is marked read (localStorage + `pb_notice_ack('crew_notice','1.0')`), so
  neither pops up. Then "You're In".
- **Log In > "Join a Crew or Use a Code"**: Paste Join Code (reads `PBJOIN:` / `PBCODE:` / a pasted link / a code) or
  type the 6-letter code. A join code opens the join form; otherwise it's tried as a sign-in (handoff) code.
- **Handoff**: for a no-email account, Settings (under the account) and Notifications (above the iPhone steps) show
  "Get a Code for the Home Screen App" (`pb_onboard_handoff_make`, 15 min), Copy Code copies `PBCODE:<token>`.
- **Inviter sheet** "Text a Join Link": Crew members (office) gets a button above Add by email; a foreman (member,
  role foreman, not manager) gets Settings > "Your crew" > "Add a Pipelayer by Text". Name, role (a foreman sees
  Pipelayer only), Make Join Link > card with **Text It** (`sms:?&body=...`, works on iOS and Android), Share... (when the
  phone has it), Copy Link, the code to read out. Below: links of the last 7 days with status and Cancel Link.
- **No-email accounts in the app**: Settings shows "Signed in as Mike Rivera", never the hidden address; Crew members
  shows "Joined by text link (no email)" instead of it; Log Out first explains there's no email or password.
- Words for every refusal (`pb:link_used`, `link_expired`, `link_revoked`, `link_busy`, `busy`, `trial_seats`,
  `too_many_links`, `foreman_links_off`, ...). Offline: "No signal. Nothing was changed"; nothing is queued.

### Rig test: tests/t125_onboard.js (port 8878) - ALL PASS, 40 checks
Own fake (`tests/fakesb_ob.js`: signed-out start, `verifyOtp`, `functions.invoke`) and a shared Node stand-in for the
server (`tests/obsrv.js`, the same rules as the SQL: single use, 24 h, revoke, foreman Pipelayer-only, no-email account +
one-time hash) behind every browser context, so the office, Safari, the Home Screen app (separate storage, standalone
iPhone) and an Android phone talk to one "server". Boot: `tests/boot_ob.js`.
Covers: office makes "Mike / Pipelayer" > sms: link with the URL, role, 24 h > iPhone Safari: token gone from the
address bar, Step 1 of 2, Copy Join Code copies the token, Skip offered > Home Screen app: Log In > Join a Crew >
Paste > join sheet (company, inviter, role, name, notice) > Terms > Join Crew > one `crew-join` call, `verifyOtp`
magiclink, member of the company as Pipelayer, Terms 1.0/1.0 and crew notice recorded, neither pops up, app access
says member / pipelayer, "Signed in as Mike Rivera" > the link on a third phone: "already used" > office list: "Mike ·
Pipelayer Joined" > foreman: Settings row, Pipelayer only, Android joins with no Home Screen step > handoff code from
Settings signs a second Home Screen app in to the same account via `signin` (no new account) > Log Out warns > a
cancelled link is refused > no page errors in any of the 9 pages.
Also `node tests/t_crewjoin_logic.mjs` (edge function logic, 12 checks pass).
Screens (390 px): shots/invite.png, shots/b_homestep.png, shots/c_joinform.png, shots/c_done.png, shots/login.png,
shots/codesheet.png.

## 5. Not built / to do before shipping
- **Apply and deploy** (lead only): run `sql/01_onboard_test.sql` live in the SQL editor (ends in an exception, nothing
  stays), then apply `sql/01_onboard.sql`, deploy `functions/crew-join` with `--no-verify-jwt`, point no MX record at
  `crew.pipelayersbible.com`, then ship the patch.
- **Seats / billing**: crew-admin calls `onSeatsChanged` on every add; crew-join should call the same hook when the
  billing batch fills it in (today it is a no-op in crew-admin too).
- **Tell the inviter when someone joins** (a push "Mike Rivera joined with your link"): needs push-send, not touched here.
  Today the inviter sees it on the link list and the office on Crew members.
- **Auto-pair**: a pipelayer who joins with a foreman's link could be crew-linked to that foreman at once (saves the My
  production pairing step). Not built: pairing is the crew's own choice today (owner decision, see below).
- Per-IP limits on `pb_onboard_peek` / crew-join: the SQL brake is global; the edge function can add a per-IP count
  (`x-forwarded-for`) if abuse is ever seen.
- The rig's shared `co.js` was changed by another session at 21:29 (crew notice key `'3'`); r16.95 still checks `'2'`,
  so every test using it fails on r16.95 itself (the notice modal covers the screen). The regression below uses a local
  copy (`tests/rig_local/co.js`) with r16.95's key `'2'`; nothing else differs.

## 6. Regression (port 8878): passes, same as r16.95
The repo's t101 to t124, t90, t91, t95 copied to `tests/reg/` (pointing at http://127.0.0.1:8878/cur.html) and to
`tests/base/` (unpatched r16.95 `index.html`), run with `tests/runreg.sh reg|base`, outputs in `tests/reg.out/` and
`tests/base.out/`, table in `tests/reg.summary.final.txt`. Every test exits 0 on both. Patched and unpatched outputs are
the same except for timestamps, random ids and file names, and PDF text spacing (diffed line by line).
- t124 needed the rig's `co2.js` / `co_pl.js` copied next to the local `co.js` too (they build on `co.js`): 26 PASS on
  both builds after that.
- t123 prints 3 FAILs **on both builds**: its checks name r16.96 behaviour (interval / wall under the pipe), so the
  repo's t123 is ahead of the r16.95 build. Nothing to do with this feature.

## DECISIONS FOR THE OWNER
1. **Go with join links and no-email crew accounts (option C)?** Email stays available (the email invite on Crew
   members is unchanged, and PMs / supers still come by email) but is no longer required for foremen and pipelayers.
   *Recommendation: yes.* It turns the 30 to 45 minute tailgate into about 4 taps on Android and about 11 on an iPhone,
   including the Home Screen, with no email, no password and no second login, and it costs nothing.
2. **Pay for text-message (SMS) sign-in (option D)?** About $0.05 per sign-in with Twilio Verify, or roughly $0.01 a
   text plus 10DLC registration (~$20 one-time plus ~$2/month) with plain Twilio. What it buys: a lost or new phone can
   sign in again with the phone number. *Recommendation: not now.* Start with C. Turn D on later if lost phones become a
   real problem; C's tables and screens stay as they are.
3. **A lost phone on a no-email account.** (a) The foreman sends a new link, which makes a new account, and the office
   removes the old one (what the prototype does). (b) The office can make a "new phone link" that signs in to the old
   account, which means the office can sign in as a crew member. (c) The person can add an email in Settings, which
   turns it into a normal account. *Recommendation: (a) now, and (c) as the next small step. Not (b).*
4. **How long a link lasts.** *Recommendation: 24 hours* (the prototype). For comparison, email invites last 7 days.
   At a tailgate the link is used within minutes. 24 hours also covers "I'll do it tonight".
5. **Can a foreman add pipelayers by link?** Each join adds a paid seat. *Recommendation: yes, on by default, Pipelayer
   only.* The office sees every link and every join, and can turn foreman links off per company (the server setting is
   built; the switch on the office's screen isn't).
6. **Should the inviter approve each join?** The inviter would tap Approve before the new person gets in. That closes
   the gap where a stranger with a forwarded link joins first, but a remote hire waits until the foreman taps.
   *Recommendation: no for now.* The safeguards are: the link works once, lasts 24 hours, the inviter sees who joined
   and when, the office can remove them, and the real person's link then says "already used". Revisit if a forwarded
   link is ever misused.
7. **Pair the foreman and the pipelayer automatically?** When a foreman's link is used, the pipelayer could be put on
   that foreman's crew at once (today crews pair themselves in My production, which was your decision).
   *Recommendation: yes.* It saves a step at the tailgate. Not built.
8. **The hidden address domain.** `crew.pipelayersbible.com` must have no mail (MX) records so nothing can ever be
   delivered there. *Recommendation: confirm this subdomain, or name another.*
9. **Terms ticked on the join sheet.** The same box and the same `pb_terms_accept` record as the Terms sheet, but the
   tick happens a moment before the account exists (it is recorded right after sign-in). *Recommendation: accept it,
   and add a line on it to the legal review drafts.*

## DONE
Studied how people join today: the email invite through crew-admin (`inviteUserByEmail`, then set a password, then log
in), in-app invitations, `company_members` with its seat trigger, the Terms (`pb_terms_accept`, 1.0 / 1.0), the crew
notice (kept only on the phone today), and the iPhone Home Screen app with its separate storage and login. Also checked
what Supabase Auth offers. Compared five options and recommended join links that make no-email accounts through an
edge function: free, nothing new open to the internet, single use, 24 hours, revocable, and the inviter sees who joined.
On an iPhone the person joins inside the Home Screen app (Copy Join Code, then Paste), so he only signs in once, and a
one-time handoff code covers anyone who joined in Safari.

Built:
- the server side, staged and not applied: `sql/01_onboard.sql`;
- the edge function, staged and not deployed: `functions/crew-join`, with a 12-check unit test that passes;
- the client patch: `patches/01_onboard.py` plus `patches/01_onboard.js`, applied to r16.95; syntax check passes.

The server test is rolled back but could not be run on the live project: the client cancelled the confirmation, and
nothing was written. It was run instead on a local Postgres loaded with verbatim copies of the live definitions, and
every check came out as expected. It caught one bug (a foreman could cancel the office's link), which is fixed.

`tests/t125_onboard.js` passes all 40 checks: office makes a link, the pipelayer taps it in iPhone Safari, Add to Home
Screen, Paste in the Home Screen app, Join Crew, and he is in the company as Pipelayer with no email, no password and
no extra pop-ups. Also covered: the foreman's path, Android, used and cancelled links, the handoff code and the Log Out
warning. The regression (t101 to t124, t90, t91, t95) is the same as on r16.95. Nothing was deployed, applied,
committed or pushed.
