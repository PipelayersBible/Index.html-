# Onboarding round 2: join by text link, lost phone, getting started, Home Screen card (on r17.04)

Folder: `tests/staged/onboard2/`. Rebased from `tests/staged/onboard/` (built on r16.95) onto r17.04 and finished
with Tommy's Nov 18 answers. Nothing was applied, deployed, committed or pushed. On live I only ran read-only SELECTs.

I could not read the Project doc `claude/Decisions_Nov18_Answers.md`: this session has no Projects tool. I built from
the answers as the lead summarised them (#2 #3 #9 #11 #12 #13 #15 #17 yes as recommended; #10 text-message sign-in and
#14 inviter approval not built; #16 no mail on crew.pipelayersbible.com) and from the recommendation texts in
`/tmp/claude-0/decisions_source.html`.

## What was built, by decision

| # | What Tommy decided | Built |
|---|---|---|
| 9 | Join by text link, email optional for foremen and pipelayers | The office (Crew members > **Text a Join Link**) or a foreman (Settings > **Add a Pipelayer by Text**) makes a one-person link with the role preset, then **Text It** (opens Messages), Share or Copy Link, plus a 6-letter code to read out. The person taps it, ticks the Terms, taps **Join Crew**, and is in. No email, no password. The account has a hidden address `m-<random>@crew.pipelayersbible.com` that is never mailed. Email invites on Crew members are unchanged. |
| 12 | Links last 24 hours | Yes. Single use, cancellable. At most 10 waiting and 30 made a day per company. |
| 13 | Foremen add pipelayers by link, office on/off switch | Foremen make Pipelayer links only. The office's link sheet has the switch **Foremen can add pipelayers by link** (on by default). Turning it off also cancels the foremen's links that aren't used yet. The office sheet shows seats: beta "N of 6 people, plus N links waiting"; paid "Paid seats: N · people now: M", and when the next join goes above the paid seats it says so (yearly: a catch-up charge; monthly: on the next invoice). Seats never block a paid company (the r17.02 rule). Foremen see no billing lines. |
| 15 | Pair the pipelayer with the foreman who invited him, automatically | A foreman's link puts the pipelayer on his crew when he joins (`pb_prod.crew_links`). The office can also pick a foreman for a Pipelayer link (optional). The join screen and the "You're In" screen say "You'll be on Ray's crew". |
| 17 | Ticking the Terms on the join screen counts as accepting | The tick is recorded on the server in the join's own transaction, in `pb_legal.acceptances` (the table `pb_terms_accept` writes; `app_build` starts "join link ·", with the user agent). The crew notice (version 3, shown on the join screen) goes to `pb_legal.notice_acks`. Neither sheet pops up after joining. If the server couldn't record one, the phone falls back to the normal pending path. |
| 11 | Lost phone on a no-email account: new link, old account removed | Crew members shows **Lost Phone: New Link** on anyone who joined by link. One step on the server: the old account is taken out of the company (the same two audit rows as Remove), its sessions are ended (the lost phone is signed out within the hour, when its access token runs out), and a new link is made with the same role, name and foreman. The link list says "new phone for Mike". |
| 2 | Getting-started card on a new company's Home | Top of the company Home: **Add your crew** (checks off when someone is in the company), **Add a job** (when the company has a job), **Tell the crew to install the app** (when someone on the crew has signed in on a phone). Add Crew / New Job buttons. **Hide This** hides it for good on that phone; it also goes away once all three are done, so companies that are already set up never see it. It shows only after the server's numbers have come in once; after that it works offline from the copy on the phone. |
| 3 | iPhone "Add to Home Screen" one-time card, plus steps in the invite email | On an iPhone in Safari (not the Home Screen app), Home shows **Put the App on Your Home Screen** with the 3 steps. A no-email account also gets **Get a Code** (it signs the Home Screen app in to the same account). **Got It** hides it for good. It stands in for the notifications card's iPhone line while it shows. Invite email text for Tommy to paste: below. |
| 16 | No mail on crew.pipelayersbible.com | Nothing to build. Tommy checks his domain settings (below). |
| 10, 14 | Not now | Not built. |

Also kept from round 1: on an iPhone in Safari the join sheet first asks for Add to Home Screen and copies the join
code, so the person joins inside the Home Screen app and signs in once; "Skip: Join Here in Safari" is always there.
Log In has **Join a Crew or Use a Code**. A no-email account gets **Get a Code for the Home Screen App** in Settings and
Notifications, and Log Out warns first that there is no email or password.

### Scanner-proof links (same rule as r17.04)
The link is `https://app.pipelayersbible.com/#join=<token>`. Opening it uses nothing up:
- The `#` part never reaches a web server, so a link preview, a text-message preview or a mail scanner that only fetches
  the page sends nothing to the database.
- A scanner that runs the page only gets the join sheet. The sheet calls `pb_onboard_peek`, which **only reads**: it
  doesn't mark the link used, opened or claimed (tested: the links table and the event log are byte-for-byte the same
  after 4 peeks). The status list has no "opened" state any more, so a bot can't even make it look opened.
- Only the **Join Crew** tap uses the link (`crew-join` edge function, or `pb_onboard_join` for a phone already signed in).
- With no signal, opening the link shows "No Signal. Nothing was used up: the link still works" with Try Again, and a
  Join Crew tap with no signal says the same. Nothing is queued.

## Files
- `sql/01_onboard.sql`: schema `pb_onboard` (links, misses, events, settings; RLS on; the API can't reach it) and the
  API, all SECURITY DEFINER with `set search_path to ''`, explicit grants, revoked from public/anon:
  `pb_onboard_link_make(role, name, pair_foreman)`, `pb_onboard_links()`, `pb_onboard_link_revoke(id)`,
  `pb_onboard_peek(token, code)` (anon too; read only), `pb_onboard_join(token, code, name, legal)`,
  `pb_onboard_handoff_make()`, `pb_onboard_settings_set(foreman_links)`, `pb_onboard_lost_phone(user)`,
  `pb_onboard_start()`, and `pb_onboard_svc(step, args)` for the edge function (service_role only).
- `sql/02_onboard_test.sql` (built by `sql/mktest.py`): the rolled-back test. One DO block runs all of 01 with EXECUTE,
  makes 3 throw-away accounts, runs every function as the real role (owner, foreman, pipelayer, PM, anon,
  service_role) against the live company's ids, and ends with `raise exception 'RESULT: ...'`, so nothing stays.
  `sql/00_replica_local.sql`: a local stand-in of every live object 01 touches (function bodies copied verbatim from
  live with `pg_get_functiondef`).
- `functions/crew-join/` (index.ts + logic.mjs): makes the no-email account, joins it, signs the phone in with a one-time
  magic-link hash that is never emailed. Deploy with `--no-verify-jwt`. Unit test `tests/t_crewjoin_logic.mjs`.
- `patches/01_onboard.py` + `patches/01_onboard.js`: the client patch on r17.04 (`python3 patches/01_onboard.py in.html out.html`).
- `tests/t130_onboard.js` with `tests/boot_ob.js`, `tests/fakesb_ob.js`, `tests/obsrv.js` (a Node stand-in for the server
  with the same rules, shared by every browser context so office, Safari, the Home Screen app and Android talk to one
  "server"). Screens: `shots/*.png` (390 px, light and dark).

### Shared code the patch touches (for stacking with other patches)
Narrow anchors, each exact-once: an insert just **before** `pbCleanAuthUrl();` at start-up (reads `#join=` and takes it
out of the address bar; r17.04's tap-link reader is untouched); the module goes after the Terms code's `online`
listener; Crew members (the add section, `pbCmName`, the email line of a member row, one button before "Remove from
Company"); the Log In terms line; the account line in `updateLoginStatusDisplay`; one empty div at the top of
`#homeCompany`. Wrapped at run time (no text change): `window.pbCxRender`, `window.pbPushCardHtml`, `window.pbLogout`.

## Test results
- **Server, local Postgres 16** with the replica (`sql/02_onboard_test.result.local.txt`): every check as expected.
  Highlights: grants (anon can't make links, call the service step, lost phone or the inner functions); 192-bit token,
  6-letter code, 24 h; owner makes Pipelayer/Foreman, not PM, and can pair only with a foreman; foreman Pipelayer only,
  paired with himself; pipelayer none; **peek changed nothing**; edge claim (second claim busy), join records Terms
  1.0/1.0 ("join link · ...") and notice 3, label "Mike", own name "Mike Rivera", crew link to Ray; signed-in join by
  code also paired; existing member refused with role unchanged; revoke rules; expiry; lists (office sees seats, foreman
  his own, pipelayer none); handoff; the code brake; beta: 5 people + 1 link = full (`pb:trial_seats`), the last link
  can still be claimed, beta ended refuses make/peek/claim; paid with a billing row: seats shown, never blocked, read-only
  refuses; 10 live links max; switch off cancels the foreman's link and keeps the office's; lost phone: foreman refused,
  email account refused, PM refused, owner OK: removed, sessions 2 > 0, crew link ended, audit requested + ok, new link
  same role/name/foreman, new phone joins back on Ray's crew; getting-started numbers. `01_onboard.sql` also applies
  cleanly as a plain file, and after the test block the local database has no `pb_onboard` schema and no extra users.
- **Server, live rolled-back run: not done.** The block is 64 KB; I did not paste it through execute_sql this time.
  It is ready: paste `sql/02_onboard_test.sql` as one query (SQL editor or the main session's execute_sql). Success is
  an error that starts with `RESULT: 0.grants ...` and should match `sql/02_onboard_test.result.local.txt` except
  names (live Ray's name instead of "Foreman F") and counts that depend on live data (crew / signedIn in step 18,
  people in steps 10/13/14). It ends in an exception, so nothing stays.
- **Edge function logic**: `node tests/t_crewjoin_logic.mjs`: 15/15 PASS (new: Terms, notice, build and user agent go
  to the join step; a non-version Terms value is refused before any account is made).
- **t130** (`NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/cur.html node tests/t130_onboard.js`):
  **69/69 PASS**, no page errors (`tests/t130.out.txt`). Covers every screen at 390 px, light and dark, offline, and
  the scanner/preview cases (a plain fetch of the link touches nothing; a page-running scanner only peeks; the link
  stays unused until the tap).
- **Full regression** on the patched build: 212 entries, `--jobs 2`: pass 185, FAIL 11, xfail 1
  (the known t04), skip 15. I re-ran all 13 tests that failed in that run or during it on the **unpatched r17.04**
  (`--build` of the live index.html) and on the patched build (with the getting-started change below):
  - **Expected changes from this patch (5).** The goldens need updating when it ships (`tests/run_all.sh --only
    '<id>' --update-golden`). I didn't change the shared goldens. `critic/w3`: a foreman's Settings gains "Your crew ›
    Add a Pipelayer by Text" (+1 button). `critic/w4`, `office/c1_crew`, `sync/t03_roles`: Crew members gains "Text a
    Join Link" and its line. `office/s1_smoke`: the company Home's RPC list gains `pb_onboard_start`. Each diff is
    only that addition.
  - **Environment, not this patch.** `cs2/s1` (and `cs2/l1`, a cs2 sibling): a test bug. cs2's lib.js took the permit
    date from the Node clock while the page clock is pinned to Nov 18. The coordinator fixed it in the repo (commit
    0315676); it fails the same way on unpatched r17.04. `safety/p6` and `safety/d2` fail the same way on unpatched
    r17.04 (date "Nov 19" against the Nov 18 golden; report count). `offline/rig/t10_quota` failed on unpatched r17.04
    and passed on the patched re-run. `offline/rig/t09_bigweek`, `new/a4` (900 s timing came out as 901 s on the
    loaded box) and `t88` passed on the re-run. Three other helpers were using this 2-core box at the same time.
  - One change from the run: in the first run the getting-started card also showed on rig company accounts that have
    no `pb_onboard_start` answer ("checks off with signal"). It now shows **only once the server's numbers have arrived**
    (a copy is kept for offline), so existing goldens of the company Home don't change. t130 re-run after it: 69/69.

## Apply and deploy (lead only), in order
1. Run `sql/02_onboard_test.sql` live (rolled back) and compare with the local result.
2. Apply `sql/01_onboard.sql`.
3. Deploy `functions/crew-join` with `--no-verify-jwt` (index.ts + logic.mjs). No secrets to add.
4. Tommy confirms #16 (below).
5. Ship the patch (bump PB_APP_BUILD in the release step).
Before step 2–3 the app's link buttons answer "Something went wrong. Nothing was changed." and nothing else changes.

## For Tommy to paste or check
**#3 Invite email** (Supabase dashboard > Authentication > Emails > Invite user). Keep the link line you have now
exactly as it is (it is the r17.04 scanner-proof link); add these lines under it:

```html
<p>On an iPhone, open the link in Safari. After you set your password:</p>
<ol>
  <li>Tap <b>Share</b> (the square with the arrow, at the bottom of Safari).</li>
  <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
  <li>Open The Pipelayer's Bible from your Home Screen and log in there with your email and new password.</li>
</ol>
<p>On Android, Chrome offers "Install app" or "Add to Home screen" in its menu.</p>
<p>The app works without signal once it is on your Home Screen. Notifications on iPhone only work from the Home Screen app.</p>
```

**#16** In the DNS settings for pipelayersbible.com, make sure `crew.pipelayersbible.com` has **no MX record** (and no
wildcard `*` MX that would cover it). Nothing is ever sent there; this makes sure nothing could be delivered either.

**#17 Note for the lawyer** (add to the legal review drafts): "Crew members who join by a text link accept the Terms of
Use and Privacy Policy by ticking a box on the join screen, under links to both documents, before tapping Join Crew. The
crew notice ('What your company sees') is shown on the same screen. The server records the acceptance (account,
Terms and Privacy versions, server time, phone time, app build, browser) in the same transaction that adds the person
to the company, in the same table as the in-app Terms sheet. These accounts have no email address. Question: is this
clickwrap enough as is, and does the no-email account change anything about notices of future Terms changes (today
the app asks again in-app when the version changes)?"

## What's left
- The live rolled-back run (above), then apply/deploy.
- A push to the inviter when someone joins with his link (needs push-send). Today the inviter sees it in the link
  list, the office on Crew members.
- The old account after a lost phone is taken out and signed out but **not deleted**: deleting an auth user can cascade
  into records that point at it, and it has no email or password, so nobody can sign in to it again.
- An email invite doesn't count waiting links toward the beta cap (`pb_billing.trial_seats_used` is shared billing
  code; not changed). If the office fills the last beta seat by email while a link is out, that link is refused when
  tapped, **before** any account is made ("the company's beta is full").
- Per-IP limits on peek / crew-join: only the global brake on typed codes; add in the edge function if abuse shows up.
- Letting a no-email person add an email later (turns it into a normal account): not built.

## Decisions for Tommy
1. **Lost phone keeps the old login, unused.** It's out of the company and signed out, but not deleted (deleting can
   take records with it). *Recommendation: keep it this way.*
2. **Turning foreman links off also cancels their unused links.** Otherwise a link a foreman texted an hour ago still
   works after you switch it off. *Recommendation: yes, as built.*
3. **"Crew installed the app" checks off when anyone on the crew has signed in on a phone.** The app can't see an
   install itself. *Recommendation: accept.*
4. **Office links can go on a foreman's crew too** (optional picker on Pipelayer links; foremen's own links always
   pair). *Recommendation: keep the picker.*
5. **Run the rolled-back server test live before applying.** *Recommendation: yes, it takes one paste.*

## DONE
