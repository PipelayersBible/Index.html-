# pipelayersbible.com: marketing website (staged Nov 18 2026)

Nothing here is live. No GitHub repo was created, nothing was pushed or deployed, DNS was not touched, the SQL was not
applied (only run inside a rolled-back test) and the edge function was not deployed. The app repo
(/home/claude/index.html-) was only read: no commits, no changes.

## What's built

```
site/
  www/                     the static site (copy these files to the root of the GitHub Pages repo)
    index.html             one long page, inline CSS and ~90 lines of inline JS (the form). No libraries, no build step.
    404.html               "Off grade" page with links home and to the app
    CNAME                  pipelayersbible.com
    .nojekyll              tells Pages to serve the files as they are
    robots.txt, sitemap.xml
    favicon.ico, favicon-32.png, apple-touch-icon.png   from the app icon
    img/logo-96.png, logo-192.png                       app icon (header, hero, footer)
    img/shot-*.webp        4 real app screenshots, 560x1212 (2x for a 280 px phone frame), 35-47 KB each
    img/og-share.png       1200x630 share image: logo, name, "Field to office, seamlessly", hazard stripe
  sql/01_trial_requests.sql        table + 2 service-only functions (staged)
  sql/02_test_trial_requests.sql   rolled-back test (DO block ending in RESULT exception)
  edge/trial-request/index.ts      Supabase Edge Function (Deno), verify_jwt false
  edge/trial-request/logic.ts      the pure logic (validation, CORS, bot checks, email), used by index.ts and the tests
  edge/trial-request/logic_test.ts Deno tests (mocks, plus index.ts itself with Deno.serve captured and fetch mocked)
  shots/                   final screenshots of the site (phone full page, desktop full page, form states, 404)
  tools/                   how the images and tests were made (see "How it was tested")
```

### The page (sections in the brief's order)
1. Dark hero: app icon, "The Pipelayer's Bible", tagline, the given sub-line, "Start a free trial" (jumps to the form)
   and "Open the app" (https://app.pipelayersbible.com). Hazard stripe under it, like the app's header. A slim top bar
   has the logo and a Call button (shows the number on wider screens), since most visitors come from a cold call.
   On desktop the hero also shows the grade sheet in a phone frame (hidden and not downloaded on phones).
2. "12 years of underground experience went into building this program." with a short story paragraph, signed Thomas
   Fontaine. It says "12 years in underground construction" and never calls him a contractor (see decision 4).
3. Pipelayer / Foreman / Office columns, the approved wording word for word (a test checks it); "add-on" is a small tag.
   Stacked on phones, three across on desktop.
4. "See it in the app": 4 screenshots in phone frames, swipeable row on phones (the page itself never scrolls sideways),
   one row on desktop. Captions say what each shows; a line says they are real screens with made-up demo data.
5. Free 30-day trial: the given text and 3 numbered steps, button to the form.
6. Goal line: bold, yellow left rule, signed Thomas Fontaine.
7. FAQ: 6 `<details>` accordions. Answers were checked against the live Terms/Privacy files in the app repo
   (terms.html v1.0, privacy.html) and the legal review (claims doc 03): ownership quotes Terms 8.1 ("between the company
   and us, the company owns it", account owner controls who sees it); export "while the account is open, and for at least
   60 days after it closes" (Terms 16.3); "we don't sell your information" (Privacy); after 30 days uses Terms 6.3
   (records already sent stay in the account; new runs wait on each phone until a plan starts; never turns into a paid
   plan by itself, no card). No-signal answer adds the qualifier from the claims doc (AI, sign-in and office features
   need signal; until a record sends, the only copy is on that phone). Safety answer adds that the emergency button
   opens the dialer and someone still makes the call.
8. Trial form: name, company, role (Owner / PM / Superintendent / Foreman / Other), email, phone, crew size, message
   (last three optional). Hidden honeypot field, fill time sent with the request (the server drops anything under 3 s).
   Inline errors, focus moves to the first bad field. Success replaces the form with "Thanks. Thomas will reach out,
   usually the same day." Any failure (server error, rate limit, no network, odd answer) shows "Sorry, that didn't go
   through. Call or text Thomas at (909) 435-5250 or email tfontaine@pipelayersbible.com." with links, and keeps what was
   typed. Next to the form: "Prefer to call or text? (909) 435-5250" with Call (tel:) and Text (sms:) buttons and the
   email as text.
9. Footer: logo, tagline, Open the app, Terms, Privacy, phone, email, "© 2026 The Pipelayer's Bible". No entity named.

Wording: no pricing, no time/money-saved, accuracy, court, tamper-proof, OSHA-compliant or expert claims, no
testimonials, logos, counts or stars, no em-dashes (all checked by the test). Meta: description, canonical,
theme-color #111318, Open Graph and Twitter card with the share image.

Accessibility: skip link, one h1, every image has alt text (screenshots described in words), every field labelled,
errors tied to fields with aria-describedby / aria-invalid, status area role=alert, 3 px focus rings (yellow on dark,
ink on light), all checked text pairs at least 4.5:1 (lowest 5.9:1), 52 px tap targets, reduced-motion respected.

Weight: the phone loads 11 requests, 258 KB in all with every screenshot and font (target was under 1.5 MB). HTML is
37 KB before GitHub's gzip. Screenshots are lazy-loaded WebP.

### Screenshots (how they were made)
Taken with Playwright from the real app (index.html at r17.04) using the repo's test rig (fake Supabase, `co.js`):
`tools/shots_app.js` makes a 250 ft, 8 in run for job "24-117 Main St Sewer", locks it, marks laid to 50 then 125 ft,
logs a 35-minute "Waiting on inspector" delay (the page clock is moved forward between steps), then opens View Report
and the Daily report (Hours & Sign tab, delay already carried over). `tools/shots_office.js` opens the office Home with
the rig's dashboard fixture after replacing its job names, places and job numbers with demo ones ("Main St Sewer",
"Oak Ave Storm Drain", 24-117 / 24-121); the script refuses to run if any original name is left. The pipelayer name is
"Mike Reyes" (made up). The floating Feedback button was hidden for the shots. `tools/make_images.py` resizes them to
WebP and builds the logo, favicons and share image (Oswald from the npm @fontsource copy).

## Trial-request backend (staged)

**SQL (`sql/01_trial_requests.sql`)**: table `pb_support.trial_requests` (id, created_at, name, company, role, email,
phone, crew_size, message, ip_hash, user_agent, status default 'new' [new/contacted/set_up/declined/spam],
notified_at, notes) with length and format checks. RLS on, no policies, all rights revoked from anon/authenticated.
Two functions in the same style as the existing service functions (pb_feedback_claim): SECURITY DEFINER,
`search_path ''`, EXECUTE for service_role only:
- `pb_trial_request_add(...)`: 5 per hour per hashed IP, 200 per day in all, under an advisory lock so two fast requests
  can't both slip under the limit; returns {ok,id} or {ok:false,error:'rate'|'invalid'}.
- `pb_trial_request_notified(id)`: stamps notified_at once Resend accepts the email.

Why an RPC instead of a direct service-role insert: `pb_support` isn't a schema the REST API serves, and it keeps the
limit check and the insert atomic.

**Edge function `trial-request`**: POST JSON only. CORS answers only https://pipelayersbible.com,
https://www.pipelayersbible.com and http://localhost / 127.0.0.1 (set secret `TRIAL_ALLOW_LOCAL=0` to turn localhost
off after launch); any other or missing Origin gets 403. Bodies over 8 KB or not JSON: 400. Honeypot filled or sent
under 3 s: 200 {ok:true}, nothing stored or sent. Fields are cleaned (control characters out, spaces folded) and
length-limited to match the table. IP is stored only as HMAC-SHA256 (first 32 hex), keyed with `TRIAL_IP_SALT` or, if
unset, the service role key. Then it stores the row and emails Thomas a plain summary (subject "Trial request:
<company> (<role>)", Reply-To set to the requester so he can just hit Reply). It answers ok when either the row was
stored or the email went; 502 only when both failed (the page then shows phone and email). Logs: counts and statuses only.

Email: copied from the deployed `feedback-notify` / `notify-report`: same secret `RESEND_API_KEY` (already set; key
values were never read or printed), same sender `REPORT_FROM` ?? "The Pipelayer's Bible <reports@pipelayersbible.com>",
same `https://api.resend.com/emails` call. Recipient: `TRIAL_NOTIFY_TO` (comma list) or tfontaine@pipelayersbible.com.

**Later: showing requests in the app's Beta Accounts (not built).** Add an admin-only RPC `pb_trial_requests_list()` /
`pb_trial_request_set_status(id, status, notes)` that checks `pb_support.admins` (like the other admin screens), and a
"Trial requests" card at the top of Settings > Beta Accounts: newest first, tap to call/email, status buttons
(Contacted / Set up / Declined / Spam), and a "Set up company" button that opens the existing beta-company setup with
the company name and the runner's email filled in, then marks the request set_up.

## How it was tested

- **SQL**: `sql/01` + `sql/02` sent as one `execute_sql` call to project rogfassochneycezecxa. Result:
  `RESULT: PASS 14/14` (stored and trimmed, notified once, bad role / email / long message / empty name / non-hex IP
  hash refused, 6th request from one IP in an hour refused, other IP fine, allowed again after an hour, RLS on with no
  policies, no table or function rights for anon/authenticated, service_role can execute, both functions SECURITY
  DEFINER with empty search_path). Everything rolled back; checked afterwards that the table and functions don't exist.
  `tools/test_sql.sh` prints the combined query.
- **Edge function** (Deno 2.9): `deno test --allow-env edge/trial-request/logic_test.ts`: 35 passed, 0 failed
  (origins, validation, bots, CORS preflight, 403/405/400/429/502 paths, HTML escaping, email shape, Resend down,
  database down, no key, and index.ts wiring with mocked fetch: service key on the RPC, IP only as 32-hex HMAC,
  Resend call with the right key/sender/recipient). `deno check` clean. Output in tools/deno_test.out.txt.
- **Site** (Playwright, Chromium; `tools/test_site.js`, 60 passed, 0 failed, output in tools/test_site.out.txt):
  phone 390x844 (mobile, 2x) and desktop 1280x800: no horizontal overflow (before and after scrolling), sections in
  order, exact wording of hero / roles / trial / steps / goal, banned words, no em-dash, no pricing, links (tel:, sms:,
  mailto:, app, Terms, Privacy), meta tags, alt text and labels, skip link and focus rings, honeypot hidden and
  untabbable, contrast, every image loads, screenshots 2x and lazy, page weight; form: empty submit, bad email, bad
  phone, good submit (fields + empty honeypot + fill time), thank-you, server error, 429, network down, odd answer;
  **live run**: the real edge function running in Deno on localhost against a fake PostgREST (`tools/mock_supabase.js`),
  with the browser doing the real CORS preflight: good request stored with the service key and a hashed IP, honeypot and
  too-fast dropped silently, rate limit shows the contact message. Plus 404, CNAME, robots, sitemap, favicon, share image.
  Google Fonts can't be reached from this sandbox, so the tests answer it with the npm copy of Oswald.
- Found and fixed during testing: re-checking a field on blur made its error line disappear while the Send button was
  being tapped, so the button moved and the tap was lost. Fields now re-check as they're typed in, not on blur.
- Not tested here: the real Supabase gateway, real Resend delivery, real GitHub Pages / DNS, iOS Safari. The live
  Terms/Privacy URLs couldn't be fetched from this sandbox (proxy); the files are in the app repo, which is what
  app.pipelayersbible.com serves.

## Deploy steps (for Thomas, in this order)

### 1. Backend (form works as soon as this is done; until then the form shows the phone and email)
1. Supabase > SQL editor (or `apply_migration`): run `sql/01_trial_requests.sql`. Optional check: run 01 + 02 together
   again in a scratch query; it must end with `RESULT: PASS 14/14` and changes nothing.
2. Deploy the function without JWT verification (the website has no login):
   `supabase functions deploy trial-request --no-verify-jwt --project-ref rogfassochneycezecxa`
   from a folder `supabase/functions/trial-request/` holding `index.ts` and `logic.ts` (not the test file).
3. Secrets: nothing new is required (`RESEND_API_KEY` is already set). Optional: `TRIAL_NOTIFY_TO`, `TRIAL_IP_SALT`
   (any long random string), `TRIAL_ALLOW_LOCAL=0`.
4. Quick check from a terminal (should answer 204 with `access-control-allow-origin: https://pipelayersbible.com`):
   `curl -i -X OPTIONS -H "Origin: https://pipelayersbible.com" https://rogfassochneycezecxa.supabase.co/functions/v1/trial-request`
   If the gateway ever answers 401, add the project's publishable key as an `apikey` header in the form's fetch (the
   function already allows that header).

### 2. GitHub repo and Pages
1. Create a new public repo under the GitHub account/org `pipelayersbible` (the `www` CNAME below points at
   `pipelayersbible.github.io`; if the account has another name, use `<that-name>.github.io` instead), e.g.
   `pipelayersbible/website`.
2. Put the **contents** of `site/www/` at the repo root (index.html, 404.html, CNAME, .nojekyll, robots.txt,
   sitemap.xml, favicons, img/). Commit and push to `main`.
3. Repo Settings > Pages: Source "Deploy from a branch", branch `main`, folder `/ (root)`. Custom domain:
   `pipelayersbible.com` (already in the CNAME file). Save.
4. Recommended: GitHub account Settings > Pages > "Add a domain" to verify pipelayersbible.com. This asks for one
   **new** TXT record `_github-pages-challenge-<account>`; add it as a new record and leave every existing TXT record
   (SPF, DKIM, DMARC) exactly as it is. It stops anyone else's repo from claiming the domain.

### 3. Porkbun DNS (only these changes)
1. Delete the root (`pipelayersbible.com`, host blank) **ALIAS** record that points to `uixie.porkbun.com`. If Porkbun
   URL forwarding is switched on for the root domain, switch it off too.
2. Add four **A** records, host blank: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
3. Add four **AAAA** records, host blank: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`,
   `2606:50c0:8003::153`.
4. Add **CNAME** `www` -> `pipelayersbible.github.io` (replace an existing `www` record if there is one).
5. Wildcard `*.pipelayersbible.com`: leave it as it is for now (see decision 3). Never point it at GitHub.
6. **Do not touch**: `app`, `e`, `send`, `rsend`, the MX records, and every TXT record (SPF/DKIM/DMARC). Explicit
   records always win over the wildcard, so the app and email are unaffected by any of the above.

### 4. After DNS
1. Wait for GitHub's DNS check to go green in Settings > Pages (minutes to a few hours), then tick **Enforce HTTPS**
   once the certificate is issued.
2. Check: https://pipelayersbible.com and https://www.pipelayersbible.com (www should redirect to the root), the app
   still opens at https://app.pipelayersbible.com, email still sends and arrives.
3. Send one real trial request from a phone; confirm the email arrives (Reply goes to the requester) and the row is in
   `pb_support.trial_requests` with `notified_at` set. Mark it `status = 'spam'` or delete it after.
4. Paste https://pipelayersbible.com into a text message or Facebook's sharing debugger to see the share card.

## Decisions for Thomas

1. **Terms / Privacy links and the selling entity.** The footer and FAQ link to
   https://app.pipelayersbible.com/terms.html and /privacy.html (the public files the app serves). The live Terms v1.0
   name "Desert Infrastructure Group" as the contracting party, while the plan is a Pipelayer's Bible LLC; the website
   names no entity. *Recommendation:* keep these links (the Terms already say they cover "the website"), and publish the
   v1.1 Terms/Privacy with the right entity when the LLC is formed, before a big push of cold-call traffic.
2. **Fonts: Google Fonts or self-hosted.** Built as asked (Oswald from Google Fonts, loaded without blocking the page,
   Arial fallback). That sends each visitor's IP to Google, and the Privacy Policy doesn't list Google. *Recommendation:*
   self-host Oswald (3 files, about 30 KB, same look, one less outside request); a 5-minute change.
3. **Wildcard `*.pipelayersbible.com`.** *Recommendation:* keep it unchanged during the switch (zero risk to app or
   email), then remove it later once you've confirmed nothing uses a subdomain other than app/e/send/rsend/www. Never
   repoint it to GitHub Pages.
4. **Story paragraph.** Written in third person from what I know ("12 years in underground construction"; grade worked
   out by hand, delays not written down, the daily report retyped at night). *Recommendation:* read it once and change
   any line that isn't your own experience; keep it free of job titles you haven't held and of any "contractor" wording.
5. **Analytics.** None on the site (no trackers, no cookies, nothing to disclose). *Recommendation:* keep it that way
   for now and judge the site by trial requests and calls; if you want visit counts later, use a cookie-free counter
   and add one line to the Privacy Policy first.

## DONE
