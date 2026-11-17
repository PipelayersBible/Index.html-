# 01 — Terms of Use and Privacy Policy: line-by-line review and replacement text

Prepared 2026-11-16 by an AI helper. **This is not legal advice and I am not a lawyer.** It is a working draft for a California-licensed attorney to check. Items I could not verify are marked **[verify]**.

How I checked: I read both draft documents in full, read the app source (`/home/claude/index.html-/index.html`), listed every database table, storage bucket, storage policy, cron job and edge function in Supabase project `rogfassochneycezecxa` (read-only), read the source of the `pb-backup`, `feedback-notify` and `weather` edge functions, and read the definitions of the database functions named below. I changed nothing. The `ai` edge function loads its real code encrypted from the database, so I did not read the AI server code itself; what I say about AI storage comes from the tables and functions around it.

---

## Status / next steps

**Status: complete (2026-11-16).** All nine sections below are written and saved in this file.

| Part | State |
|---|---|
| Both drafts read in full | Done |
| App code, database, storage, cron and edge functions checked | Done (read-only; nothing changed) |
| Mismatch table (section 2) | Done, 18 rows |
| Issue findings (section 4) | Done, 29 items |
| Revised Terms of Use (section 5) and Privacy Policy (section 6) | Done, full text |
| Customer Agreement and DPA outline (section 7) | Done, outline only |
| Lawyer questions (section 8), sources (section 9) | Done |

**Not done, for a fresh helper or the coordinator:**

- The `ai` edge function's real code is stored encrypted in the database (`pb_ai.code`); I did not read it. What AI requests are logged server-side is inferred from tables and functions, not from that code.
- I did not read `push-send`, `notify-report`, `pm-digest-email`, `weather-alerts`, `plans`, `docs`, `crew-admin` or `owner-admin`.
- I could not open Project notes (no Projects tool in this session), so the r16.7x release notes were not cross-checked.
- Items marked **[verify]** were stated from general knowledge and not re-checked online: statute section numbers, older cases, SB 446, other states' thresholds, Anthropic's retention period. The list is at the end of section 9.
- Nothing was written to the two draft documents. The replacement text exists only in this file.

**Key sources already checked:** listed in section 9 under "Opened and read in this session".

---

## 1. Executive summary

**The two drafts are a sound start, but four things make them weaker than they look.**

1. **Nobody has agreed to the Terms yet, and the app has no way for them to (Critical).** The Terms say you accept by "tap to accept", but there is no such screen. The login screen (`index.html` lines 4676–4689) has no link to the Terms, the app has no sign-up screen (only `signInWithPassword`, line 13436), and no table records acceptance. Under current Ninth Circuit cases (*Chabolla v. ClassPass*, Feb. 27, 2025; *Godun v. JustAnswer*, Apr. 15, 2025), terms that a user never clearly agreed to are not enforced. Until this is fixed, the arbitration clause, the liability cap and every disclaimer are at risk. **Fix: a full-screen "I agree" gate with a stored record, before the beta starts.** Exact flow in section 4.1.

2. **The Privacy Policy says things the app does not do (High).** The draft says "every item below matches what the app does today". It does not. Ten mismatches are listed in section 2. The worst are:
   - Location is sent to OpenStreetMap at full precision (about 4 inches), not "rounded to about 35 ft", and it is sent whenever a Run screen is open, not only when a photo is taken.
   - The app tells users AI questions are "not stored by the app", but some questions and answers are stored (without the user's identity) for quality review.
   - The policy promises deletion 60 days after an account closes, but nothing in the system deletes anything, and sealed PDFs and permits are built so they cannot be deleted.
   - Push notifications, the US Census geocoder, and emergency share links are not mentioned.
   A privacy policy that is wrong is worse than a short one: a false statement is the classic basis for an FTC or California Unfair Competition Law claim.

3. **The biggest money risk is an injured crew member, and the Terms do not protect against it as well as they could (High).** A worker hurt in a trench or confined space usually cannot sue his employer (workers' compensation is the exclusive remedy), so his lawyer looks for third parties, including a safety-app vendor. Two points:
   - A liability cap cannot limit liability for fraud, willful injury, gross negligence or violation of law (Civil Code 1668; *New England Country Foods v. VanLaw*, Cal. Supreme Court, Apr. 24, 2025). A cap also binds only the people who agreed to it.
   - California Labor Code 3864 says an employer has no duty to reimburse a third party for an injured employee's claim **unless there is a written agreement to do so signed before the injury**. So the employer's indemnity is the key protection, and it should be in a **signed Customer Agreement**, not only in click-through terms.
   **Fix: a short signed Customer Agreement for every company (section 4.18), the right insurance, and a separate legal entity.**

4. **Missing sections (Medium–High).** The Terms have no confined space section, no sealed-records section, no beta terms, no AI section that names plan reading and takeoff, no "not engineering or surveying" statement, no DMCA process, no opt-out or mass-arbitration handling in the arbitration clause, and a price-change promise ("at least 30 days") that conflicts with California's Automatic Renewal Law window (7 to 30 days).

**What I recommend, in order:**

| # | Action | Type | When |
|---|---|---|---|
| 1 | Build the acceptance gate and the acceptance record (4.1) | App | Before beta |
| 2 | Replace both documents with the text in sections 5 and 6, after attorney review | Document | Before beta |
| 3 | Fix the location-to-OpenStreetMap precision and the "not stored by the app" line (section 2, rows 2–4) | App | Before beta |
| 4 | Sign a one-page Customer Agreement with each beta company (4.18, outline in section 7) | Business | Before each company starts |
| 5 | Form or confirm a separate entity for the app (not DIG Civil), and buy Tech E&O + cyber + general liability | Business | Before paid launch |
| 6 | Write and test an operator-only purge procedure for closed accounts, including sealed PDFs (4.17) | App / process | Before paid launch |
| 7 | Build ARL-compliant checkout and cancel flow when Stripe goes in (4.14) | App | With Stripe |
| 8 | Register a DMCA agent ($6) if document sharing between users stays in the product | Business | Before paid launch |

---

## 2. Mismatch table: what the documents say vs. what the app does

Severity: **C** critical, **H** high, **M** medium, **L** low.

| # | Sev | Document says | App actually does (evidence) | Fix |
|---|---|---|---|---|
| 1 | C | ToS §1: you accept when you "tap to accept" | No accept screen, no Terms link on login (lines 4676–4689), no sign-up in the app (accounts come from invitations via the `crew-admin` function), no acceptance table in any schema | Build the gate and record in 4.1 |
| 2 | H | PP: OpenStreetMap receives "the photo's coordinates, rounded to about 35 ft" | The request sends 6 decimal places, about 4 inches (line 70609: `f.lat.toFixed(6)`). Only the cache key is rounded to 4 places (line 70603). It goes straight from the phone, so OpenStreetMap also sees the phone's IP address | App: round to 4 decimals in the request. Or correct the policy. I recommend the app fix |
| 3 | H | PP: location is used "only while you are on a screen that needs it: taking stamped photos…" | Location tracking (`watchPosition`, high accuracy) starts on opening or tapping Run Setup or Run Results and runs until 5 minutes after the last tap (lines 70577–70602). Every new position triggers an address lookup at OpenStreetMap (`addrFor(G.fix)`, line 70582), **whether or not a photo is taken** | App: look up the address only when a photo is taken. Policy text in section 6 describes the corrected behaviour and flags it |
| 4 | H | In-app AI notice: "Sent to Anthropic to be read; not stored by the app" (lines 5539, 16347, 17461) | `pb_ai.gaps` stores the question (up to 600 characters) and the answer when Ask could not answer well or the user taps "not right" (function `pb_ai_gap_put`; 12 rows today). No user ID is stored; the person is represented by a salted hash that rotates weekly. `pb_billing.ai_cost` stores cost per user per feature per day. The stake notice (line 18918) correctly says the photo is "kept with this point's photos" | Change the in-app line to: "Sent to Anthropic to be read. Questions Ask can't answer well may be kept, without your name, to improve it." Policy text in section 6 |
| 5 | H | PP: after an account closes "we keep its data for at least 60 days… then delete it within a reasonable time"; ToS §6 same | No cron job, function or screen deletes a closed account (24 cron jobs checked; none purge). `run-seals` bucket has insert and read policies only, and trigger `run_seals_locked` blocks update and delete. `pb_safety.permit_delete_guard` makes permits permanent except in the owner's delete-job flow | Policy and Terms now say what is true (section 6 retention table). Build the purge procedure in 4.17 |
| 6 | M | PP provider table | Missing: **US Census Bureau geocoder** (job street addresses, `weather` function); **web push services** run by Apple, Google and Mozilla (47 push subscriptions in `pb_push.subscriptions`; pushes carry names, job numbers and "EMERGENCY: confined space"); the `weather-alerts` function | Added in section 6 |
| 7 | M | PP: emergency messages "go through your phone's own text or email app" | True for texts (line 31768). But the server also pushes an emergency notice to the foreman and PMs (`pb_safety.em_notify`), and the app makes emergency share links that anyone holding the link can open (`pb_safety.em_links`, with view counts) | Added in section 6 |
| 8 | M | PP: "the app has no advertising or analytics trackers" | No third-party trackers: true. But the app counts every screen opened and feature used, per user per day (`pbTrack`, line 38657; `pb_usage_add`; table `pb_billing.usage` with `user_id` and `company_id`), and the owner sees it per company in Beta Accounts. There is a switch for crash reports but none for usage counts | Say "no third-party advertising or analytics trackers" and describe the counts. Done in section 6 |
| 9 | M | PP: your company "decides… how long they are kept" | The company has no retention setting. Runs can be "removed" (soft delete, `pb_prod_run_remove`), not erased | Reworded in section 6 |
| 10 | M | ToS §5 calls it a "demo"; ToS has no beta terms | The app and database call it a beta (`pb_billing.beta_closed`, `companies.trial_ends_at`, "Beta Accounts" screen) | Section 5, clause 6 "Beta" |
| 11 | M | Neither document mentions sealed originals | r16.76 sealed PDFs with SHA-256 fingerprint and server timestamp exist (`pb_prod.run_seals`, `pb_run_seal_add`) | Section 5, clause 9; section 6 retention table |
| 12 | M | ToS §6: company "owns" its data; PP: company controls records | A removed member keeps: the copy on the phone; read access to sealed PDFs he made (`pb_prod.can_view_run_seal` returns true for the maker with no membership check); and **full control, including delete, over his own folder in `run-photos`** (storage policy "Users can manage their own files in run-photos", command ALL). A departing employee can delete photos the company relies on | App: after a run is sent, remove the member's delete right on those photos. Terms now state who owns what and what a departing member keeps |
| 13 | M | PP: "Anonymous reports are stored without your identity, and the company can't see who sent them" | Verified in `pb_report_submit_anonymous`: no user ID stored, time rounded to the hour, held and released in batches. But it is an absolute promise. Wording, a small crew, or photos can still identify someone | Softened in section 6 |
| 14 | L | PP: Sentry "IP addresses are not stored" | The app "asks" Sentry not to keep it (line 4983). That depends on a Sentry project setting I could not see | **[verify]** the Sentry setting "Prevent Storing of IP Addresses" is on. Text softened |
| 15 | L | PP header: "Every item below matches what the app does today" | Not true (rows 2–9) | Removed |
| 16 | L | PP: Google Fonts, jsDelivr, Cloudflare listed | True (lines 912–913, 46807). Note `supabase-js@2` loads from jsDelivr unpinned and without an integrity hash. That is a supply-chain risk and bears on "reasonable security" | App: pin the version and add `integrity=`; or bundle it like jsPDF |
| 17 | L | PP: California residents "have these rights under the CCPA" | The company almost certainly is not a CCPA "business" yet (section 4.19). Promising statutory rights you are not bound by turns them into promises you can be held to | Offered as a voluntary practice in section 6 |
| 18 | L | ToS §5: price changes on "at least 30 days' notice" | California's Automatic Renewal Law requires notice **no less than 7 and no more than 30 days** before the change (Bus. & Prof. Code 17602) for covered customers | Section 5, clause 7 |

Things I checked that **do** match: photos are re-drawn so EXIF and GPS metadata are stripped, keeping only the time taken (lines 17335, 38235, 48111); crash reports are scrubbed and carry no user ID (lines 601–612); library photos get no location stamp; emergency texts go through the phone, not a server; companies are separated by row-level security (enabled on every table I listed); backups run nightly and keep 30 daily folders (`pb-backup`, `KEEP_DAYS = 30`); no phone numbers are stored in login records (0 of 5 users).

---

## 3. People who are in the data but never see the documents

The app stores names of people who are not users: confined space entrants and attendants (`public.entrant_roster`), toolbox talk attendees (`pb_prod.talks_given.attendees`), crew names (`crew_log`, `pb_crew.own_names`), and emergency contacts. They have agreed to nothing. The fix is contractual: the company customer promises it has the right to enter those names and has told its people. This is in the revised Terms (clause 8) and the Customer Agreement outline (section 7).

---

## 4. Issue-by-issue findings

Ranked roughly by severity × likelihood. Each has: the problem, the fix, and whether it needs a lawyer.

### 4.1 Acceptance mechanics — **Critical**

**Problem.** The Terms claim three ways to accept: creating an account, tapping to accept, or using the Service. Only "using the Service" exists today, and that is browsewrap. Courts rarely enforce browsewrap. For "sign-in wrap" (a notice near a button), the Ninth Circuit in 2025 refused to enforce terms twice because the notice was small, grey, far from the button, or the button text did not say it meant agreement. A real clickwrap (an unticked box plus a button that says you agree) is the form courts enforce most reliably.

A second problem is specific to this product: **crew members are added by their employer.** A pipelayer who was invited by email and typed a password has not agreed to anything. He is also the person most likely to be hurt.

**Recommended flow (app change).**

1. **Gate on first login, for every user.** After a successful login and before any screen opens, show a full-screen page titled "Before you start":
   - Three plain bullets in normal-size, high-contrast text: (a) "This app is a tool. Check every number against the stakes, cut sheets and plans." (b) "It does not decide whether a trench or confined space is safe. Your competent person and entry supervisor do." (c) "Disputes go to individual arbitration, not court or class actions. You can opt out within 30 days."
   - Links, underlined and in a contrasting colour, to the full Terms of Use and Privacy Policy. The user must be able to open and scroll them.
   - An **unticked** checkbox: "I have read and agree to the Terms of Use and the Privacy Policy."
   - A button that reads **"I Agree"**. It stays disabled until the box is ticked. No other way forward except "Log out".
2. **Company gate, once, for the company account owner.** A second unticked box: "I am authorized to accept these Terms for [Company name], and I accept them for the company." Capture typed full name and title.
3. **Offline.** The gate needs a connection the first time. If offline and never accepted on this phone, block use and say why. After acceptance, cache it so the app opens offline.
4. **Re-acceptance.** Store a version number for each document. When a document changes in a way that matters, show the gate again with a one-paragraph summary of what changed.
5. **AI first-use notice.** Keep the existing "Before You Use AI" dialog (line 16388), but store the acknowledgement on the server too. Today it is only in `localStorage` (`pbAiPrivacyAck`), which proves nothing later.

**Record-keeping (database change).** Add an append-only table, protected the same way as `pb_prod.run_seals` (no update, no delete):

| Column | Why |
|---|---|
| `user_id`, `company_id` | Who |
| `document` (terms / privacy / company_authority / ai_notice) | What |
| `version`, `sha256` of the exact text shown | Which text |
| `accepted_at` (server time) | When. Do not rely on the phone clock |
| `app_build`, `user_agent` | Which screen design they saw |
| `typed_name`, `title` (company gate only) | Authority |
| `method` ("checkbox+button") | How |

Also keep, outside the database: a dated PDF of each version of each document, and screenshots of the gate for each release that changes it. If this is ever challenged, the evidence is a declaration from the owner attaching the record row, the document version and the screenshot.

**Lawyer?** Yes, to confirm the wording on the gate and button.

### 4.2 Injured-worker claims, indemnity and Labor Code 3864 — **High**

**Problem.** Draft §7 indemnity is broad but generic. It does not name claims by the customer's own employees, which is the claim that matters. And as noted, Labor Code 3864 requires a written agreement "executed prior to the injury" before an employer must reimburse a third party for an employee's injury claim. Whether a click-through counts as "executed" is a question for a lawyer; a signed agreement removes the doubt.

**Fix.**
- Document: the revised indemnity (section 5, clause 13) names employee, subcontractor and third-party injury claims and states it is intended as a written agreement under Labor Code 3864.
- Business: every company signs the Customer Agreement (section 7) before its crew uses the app.
- Business: ask each company to carry general liability and workers' compensation, and consider asking to be named as an additional insured. A lawyer and an insurance broker should advise whether that is realistic for a software vendor.
- Business: the app's own insurance. Technology errors and omissions (confirm it covers bodily injury arising from software, which many E&O forms exclude), cyber liability, and general liability.
- Business: a separate entity. The drafts leave "[Company legal name]" blank. If the app is sold by DIG Civil Construction itself, a claim against the app reaches the contracting business, its equipment and its bonding capacity. A separate LLC or corporation, properly funded and insured, is the standard answer. **Needs a lawyer and a CPA.**

### 4.3 Limitation of liability and Civil Code 1668 — **High**

**Problem.** Draft §7 caps liability at the greater of 12 months' fees or $100, and excludes "fraud or willful misconduct" from the cap. Under California law the cap also cannot cover:
- willful injury to person or property (*New England Country Foods*, 2025, held this applies to damage *limits*, not only full releases);
- gross negligence (*City of Santa Barbara v. Superior Court*, 2007);
- violation of law, whether willful or negligent (text of Civil Code 1668).

For ordinary negligence and plain breach of contract, caps between businesses are generally enforced. The exception is a service that affects the "public interest" (*Tunkl v. Regents*, 1963). A safety-related app sold to an industry is not obviously inside *Tunkl*, but a court could be asked to apply it to the confined space features. **Uncertain; needs a lawyer.**

A $100 cap during a free beta is the most aggressive part. Between businesses it is defensible; against an individual it invites an unconscionability argument.

**Fix.** Revised clause 12: all capitals or bold for conspicuousness; a short plain-English lead-in; carve-outs that track 1668 word for word instead of a vague "can't be limited by law"; a statement that the price reflects the allocation of risk; and a severability sentence so that if one limit fails the others stand. Conspicuousness also depends on the gate in 4.1 calling out the limits.

### 4.4 Confined space permit disclaimer — **High**

**Problem.** Draft §3 covers safety in general and is good. But the highest-risk feature has no clause of its own. A permit-required confined space program is the employer's duty under federal OSHA construction rules (29 CFR 1926 Subpart AA, sections 1926.1201–1213) and Cal/OSHA (Title 8, sections 5157–5158 and, for construction, sections 1950–1962). The employer must test the air with a calibrated direct-reading instrument, designate the entry supervisor and attendant, arrange rescue, and keep cancelled permits for at least one year (29 CFR 1926.1205(f)). **[verify the Title 8 section numbers with counsel.]**

The app already says, on the permit screen (line 8609), "Not a substitute for your safety program". Good. The Terms should say it with legal weight.

**Fix.** Revised clause 4: the app is a form and a timer, not a gas monitor, attendant, rescue service or safety device; it does not read instruments; readings are whatever a person typed; reminders and the emergency button can fail; the employer keeps the legally required copy. App change: require the entry supervisor to tick, on each permit, "I am the entry supervisor. I have verified these conditions myself." and store that with the permit.

### 4.5 AI output disclaimers — **High**

**Problem.** Draft §4 is strong on stake reading. It is thin on (a) plan reading, takeoff and bid features, where a wrong quantity becomes a wrong bid; (b) Ask answers about specs and safety, which quote standards that vary by agency and year; and (c) the fact that the user must confirm values. Anthropic's Commercial Terms (effective June 17, 2025) also require its customers to tell their users that AI output should not be relied on without checking. The app does this in-app; the Terms should too.

**Fix.** Revised clause 5 separates stake reading, Ask, and plan reading. It says quantities and bid summaries are estimates and not a bid; a missing conflict is not a clean set of plans; spec answers must be checked against the agency's current edition and the project's special provisions. **[verify]** Anthropic's Usage Policy for any extra rules on safety-critical uses; I did not open it.

### 4.6 "Not engineering, surveying or safety advice" — **Medium**

**Problem.** The draft says safety content is "not legal, engineering or safety advice". It does not say the app is not practising engineering or land surveying. In California those are licensed professions (Bus. & Prof. Code 6700 and following; 8700 and following). Setting line and grade is the surveyor's work.

**Fix.** Revised clause 3 says so directly: the Service does not perform engineering or land surveying, does not establish line, grade or control, and no licensed professional has reviewed any output for your project.

### 4.7 Calculator disclaimers — **Medium**

**Problem.** Covered in draft §4, but mixed with AI. A calculator error is the owner's own code, not an AI misread, and should be addressed on its own: units (decimal feet), rounding, and the fact that results depend on what was typed.

**Fix.** Revised clause 5, first bullet group.

### 4.8 Arbitration and class waiver — **Medium** (High if individual plans launch)

**Problem with the draft.**
- No opt-out. A 30-day opt-out costs little and helps against unconscionability arguments.
- AAA Commercial Rules for everyone. If an individual pipelayer buys a plan, AAA may treat it as a consumer agreement and apply its Consumer Rules and fee schedule regardless.
- Fixed venue in a California county for everyone. For an individual in another state this is a classic unconscionability point.
- No carve-out for public injunctive relief. In California a waiver of the right to seek public injunctive relief in any forum is unenforceable (*McGill v. Citibank*, 2017).
- No mass-arbitration handling. *Heckman v. Live Nation* (9th Cir. 2024) struck down an aggressive batching scheme run by a new provider, and held unilateral, retroactive changes against the company. The lesson is to keep it simple, use an established provider, and not bind people to other people's results.
- The jury waiver. In California a pre-dispute jury waiver outside arbitration is not enforceable (*Grafton Partners v. Superior Court*, 2005). So if arbitration fails, the jury waiver likely fails too.
- One-year time limit. Shortened limits are allowed if reasonable; one year is commonly upheld between businesses and often attacked for individuals.
- Arbitration fees. Under California Code of Civil Procedure 1281.97–1281.98, a business that drafts a consumer arbitration clause and pays AAA late can lose the right to arbitrate. **[verify current state after *Hohenshelt v. Superior Court* (Cal. 2025).]**

**Real exposure.** For company customers the mass-arbitration risk is low: there are few of them and each has a signed agreement. It rises if thousands of individuals buy plans.

**A genuine choice for the lawyer.** For a small vendor with business customers, arbitration is not obviously better than court. AAA commercial filing and arbitrator fees can exceed the amount in dispute. An alternative is: no arbitration for companies, exclusive venue in the owner's home county, a class waiver and the liability cap. I have drafted the arbitration version because the task asked for it and it protects best against class actions from individuals. **Ask the lawyer which to use for companies.**

**Fix.** Revised clause 14: informal resolution first; AAA; Commercial Rules for companies, Consumer Rules where AAA says they apply; hearing by video or in the individual's home county; small-claims carve-out; IP injunction carve-out; public injunctive relief carve-out; 30-day opt-out by email; class waiver with a "if the waiver fails, that claim goes to court" clause; simple coordination clause for 25 or more similar claims that defers to AAA's Mass Arbitration Supplementary Rules; changes to the clause never apply to a dispute already notified.

### 4.9 Governing law and venue — **Low**

California law and the owner's home county are right for a California company. Fill in the county (Riverside appears correct from the shared context). For individuals outside California, their home state's consumer protections may still apply whatever the clause says. Revised clause 15.

### 4.10 Company accounts vs. individual accounts; who owns the data — **High**

**Problem.** The draft says "You (or your company) own" the data. That leaves open the question that will actually come up: a foreman leaves, and wants "his" runs; or a pipelayer is fired and the company wants his phone copy gone; or the company and the employee are in a wage dispute and both want the timestamps.

**What the app does today.** Records sync to the company. The member keeps the phone copy. On removal the membership row is deleted and a "you left" record is written (`pb_billing.on_member_removed`); nothing is wiped; the member can still read sealed PDFs he made and can delete his own photos in storage (mismatch 12).

**Fix (document).** Revised clause 8 sets a clear rule:
- Records made while a member of a company belong to that company ("Company Data").
- The company's account owner controls access, and we act on the company's instructions.
- A departing member may keep the copies already on his device as a personal record of his own work, but may not use or disclose them against the company's confidentiality rules. The company can ask for more by its own policies.
- Records made on an individual plan belong to the individual.
- We do not referee disputes between a company and its people. We follow the account owner, or a court order.

**Fix (app).** Remove the member's delete right on photos once a run has been sent to the company. Decide deliberately whether a removed member should keep reading his sealed PDFs; today he can.

**Lawyer?** Yes. The rule about what a departing employee keeps touches employment law (access to one's own records, wage claims) and the owner should not improvise it.

### 4.11 License and SaaS terms — **Medium**

Draft §6 has a one-line licence. Revised clause 2 adds: limited, non-exclusive, non-transferable, revocable licence for internal business use; per-user seats, no shared logins; no service-level promise; we may change features; third-party content (standard specs, agency documents) belongs to its owners; open-source components under their own licences.

### 4.12 Acceptable use — **Medium**

Draft is adequate. Additions in revised clause 10: no uploading other people's personal information without the right to; no false or backdated safety records; no using the Service as the sole basis to discipline or fire a worker; no use outside the United States; no automated access.

The "sole basis" rule is new and worth explaining. On September 30, 2026 California's governor signed three workplace technology bills: AB 1883 and AB 1331 (limits on workplace surveillance tools) and SB 947 (employers may not rely solely on an automated decision system to discipline or terminate; effective July 1, 2027). The duties fall on employers, not vendors. But production tracking, timestamps and GPS-stamped photos are exactly the data an employer might misuse. The clause moves that responsibility to the customer in writing. **[verify]** details; I read one law-firm summary only.

### 4.13 Warranty disclaimer — **Medium**

Draft is fine. Revised clause 11 keeps the capitals, adds "no warranty that records will be accepted by any agency, owner, court or insurer", and adds that the disclaimer does not remove rights that cannot be waived.

### 4.14 Subscriptions and auto-renewal — **Medium now, High when Stripe launches**

**The law.**
- California's Automatic Renewal Law (Bus. & Prof. Code 17600–17606), as amended by AB 2863, applies to contracts made, amended or extended on or after July 1, 2025. Its definition of "consumer" is a person buying for personal, family or household purposes (17601). A contractor buying a work tool is probably outside it. An individual pipelayer buying his own plan is a grey area. **Comply anyway**: it costs little and removes the question.
- The federal Restore Online Shoppers' Confidence Act (ROSCA) applies to online negative-option sales and requires clear disclosure before taking billing details, express informed consent, and a simple way to cancel.
- The FTC's "click-to-cancel" rule is **not in effect**. The Eighth Circuit vacated it in July 2025. In March 2026 the FTC issued an advance notice of proposed rulemaking to try again; comments closed April 13, 2026. No new rule is final as far as I could find. The FTC continues to enforce ROSCA and Section 5.

**What the checkout must do (app requirements for the Stripe build).**

| Requirement | Detail |
|---|---|
| Disclosure next to the button | Price, billing period, that it renews until cancelled, how to cancel. Clear, in larger or contrasting type, right by the consent |
| Separate consent | An unticked box for the renewal terms, separate from the Terms of Use box |
| Confirmation email | Renewal terms, cancellation steps, in a form the customer can keep |
| Cancel online | If you can sign up online you must be able to cancel online, without obstruction. A "Cancel plan" button in the account, and a prominent link in any save-offer screen |
| Price change notice | No less than 7 and no more than 30 days before it takes effect, with how to cancel |
| Annual reminder | Once a year: what the plan is, the charge and frequency, how to cancel |
| Free-to-paid | Do not take a card during the free beta. Today the beta ends in read-only, which avoids the whole problem. Keep it that way |
| Records | Keep proof of consent for 3 years, or 1 year after the contract ends, whichever is longer |

**Fix (document).** Revised clause 7. It also fixes the "at least 30 days" conflict (mismatch 18).

### 4.15 Beta terms — **Medium**

Missing. Revised clause 6: the beta is free, pre-release, may have bugs and data loss; limits apply; we may end it; feedback is ours to use; usage is measured and we may contact you; no service-level promise; the beta turns read-only at the end and nothing is charged automatically. The phone number on the feedback form is optional and used only to call about that feedback.

### 4.16 Termination, suspension and export — **Medium**

**Problem.** The draft promises 60 days to export after closure. There is no company-wide export. There are per-screen exports: "Download all" as spreadsheet or PDF in Records (line 6923), a stats spreadsheet (line 8318), and per-record JSON (line 46779). There is no way for a company to pull every member's records, photos and sealed PDFs in one go.

**Fix.** Revised clause 16 promises what exists: use the export tools while the account is open and for 60 days after it becomes read-only; on written request within that window we will provide a reasonable export of Company Data, and may charge for unusual effort. App: consider one "Export everything" job for company owners before paid launch.

### 4.17 Sealed copies that "can never be deleted" vs. deletion rights — **High**

**The conflict.** The seal is valuable because nobody can alter or delete it. Privacy law gives people a right to ask for deletion, and the policy promises deletion after an account closes. Both cannot be absolute.

**How to resolve it. Four parts.**

1. **Say "users cannot delete", not "can never be deleted".** No user, foreman or office account can change or delete a sealed copy. The operator can, under a written procedure, in three cases: the company account has closed and the retention period has run; a law or court order requires it; or the file contains something that must not be kept (for example, a photo uploaded by mistake that shows something unlawful). The service-role key can already do this; what is missing is the procedure and a log.
2. **Rely on the legal exceptions, and say so.** California's deletion right has exceptions that fit: completing the transaction and performing the contract, complying with a legal obligation, and internal uses reasonably aligned with the person's expectations (Civil Code 1798.105(d)). More basically, for crew members the app is the employer's service provider. The employer decides. We pass the request to the employer and follow its instruction.
3. **Keep personal information in sealed files to a minimum.** A run report needs the pipelayer's and foreman's names. It does not need personal phone numbers or email addresses. Review the PDF template once with that in mind.
4. **Set an end date.** Sealed copies are kept for the life of the company account plus a fixed period. I suggest the Terms say "at least 60 days after closure, and we may keep sealed copies and audit logs for up to [4] years for legal claims". Four years matches California's limitation period for written contracts (Code of Civil Procedure 337); construction defect periods run longer (up to 10 years for latent defects, CCP 337.15). **The right number is a lawyer's call**, and storage cost matters too.

**Related: what a seal proves.** It proves the file has not changed since the server recorded its fingerprint. It does not prove the contents are true, that the phone's clock was right, or that a court or agency will accept it. Revised clause 9 says this. Do not market it as "court-proof" or "tamper-proof evidence"; "tamper-evident" is accurate.

### 4.18 Do company customers need a separate agreement? — **High. Yes.**

**Recommendation: three layers.**

| Layer | Who agrees | How | What it holds |
|---|---|---|---|
| **Terms of Use** | Every user | Click-through gate (4.1) | Rules of use, disclaimers, user-level limits, arbitration |
| **Customer Agreement** (1–2 pages plus the Terms) | The company | Signature (e-signature is fine) by an officer or owner | Plan, price, seats, term; authority; indemnity including employee claims (Labor Code 3864); insurance; employer duties (notice to employees, phone reimbursement, OSHA program); order of precedence |
| **Data Processing Addendum** (1 page, attached) | The company | Signed with the Customer Agreement | Service-provider terms: we process Company Data only for the company; no selling or sharing; sub-processors listed; security; help with requests; breach notice; return or deletion at end |

Why the DPA matters even for a small vendor: many underground contractors exceed the CCPA revenue threshold ($26.625 million). They are CCPA "businesses", their employees' data is covered, and the law requires them to have a written contract with specific terms with each service provider (Civil Code 1798.100(d), 1798.140(ag)). A larger customer's lawyer will ask for it. Having one ready is a sales advantage.

For the beta, a one-page version signed by each company is enough. Outline in section 7.

### 4.19 Does CCPA/CPRA apply? — **Low today**

A for-profit company doing business in California is a CCPA "business" only if it meets one of three tests: annual gross revenue above **$26,625,000** (the figure since January 1, 2025; adjusted in odd-numbered years, so expect a new figure in January 2027); buys, sells or shares personal information of **100,000** or more consumers or households a year; or gets **50%** or more of revenue from selling or sharing personal information. A new app company meets none. **But check the entity question:** if the app is run by, or under common control and common branding with, a company that does exceed $26.625 million, the answer can change (Civil Code 1798.140(d)(2)). **[lawyer]**

**What applies anyway:**

| Law | What it requires | Status in the drafts |
|---|---|---|
| **CalOPPA** (Bus. & Prof. Code 22575–22579) | A conspicuously posted privacy policy listing categories collected and third parties shared with, how to review or correct, how changes are notified, the effective date, how the service responds to Do Not Track signals, and whether third parties collect data across sites. It protects "consumers" (personal or household use), so a work tool is arguably outside it. Comply anyway | Missing the Do Not Track statement and a conspicuous in-app link. Fixed in section 6 and 4.1 |
| **Breach notification** (Civil Code 1798.82) | Applies to any business holding computerized personal information of California residents, at any size. Triggered by defined data: name plus Social Security, driver's licence, financial account, medical or health insurance data; or a username or email with a password. The app holds emails and password hashes (in Supabase Auth). As a company that *maintains* data owned by customers, it must notify the customer immediately after discovering a breach. A 2025 amendment (SB 446) set a 30-day deadline for notice to individuals **[verify]** | Draft says "as the law requires". Fine. Customer notice added to the DPA |
| **Reasonable security** (Civil Code 1798.81.5) | Reasonable security procedures for the same defined data, and contracts requiring the same from vendors | Draft security wording softened so it does not overpromise |
| **FTC Act §5 and California's Unfair Competition Law** | Do not say things in the policy that are untrue | The reason for section 2 |
| **All 50 states' breach laws** | Similar to California's, with differing deadlines | Handled by one incident plan |

### 4.20 Employee data: the app as service provider — **High (conceptual)**

Crew members are employees of the customer. For their work records the customer is the "business" (or, outside California, simply the employer), and the app is its **service provider**. That has five consequences, all now in the documents:

1. **The employer decides.** Access, correction and deletion requests about work records go to the employer. We help the employer respond. We do not delete a company's permit because an ex-employee asks.
2. **The employer gives notice.** If the employer is a CCPA business it owes its California employees a notice at collection covering this app, including precise location (sensitive personal information). We give the employer the facts; the Customer Agreement makes the notice the employer's job.
3. **We may not use Company Data for our own purposes**, apart from running, securing and improving the Service. No selling, no sharing for advertising, no combining with other customers' data except in de-identified or aggregate form. The usage counts and de-identified Ask questions fit within "improving the Service" but must be disclosed.
4. **We are the direct controller for a smaller set**: login credentials, the user's own name and email, feedback and its optional phone number, crash reports, and usage counts. The Privacy Policy is our notice for that set.
5. **Monitoring.** GPS-stamped photos, timestamps and production per person are worker monitoring in substance. California's new workplace laws (4.12) and existing rules put duties on the employer. Two employer duties worth naming in the Customer Agreement: telling workers what is collected, and reimbursing a reasonable share of personal phone costs when workers must use their own phones (Labor Code 2802; *Cochran v. Schwan's Home Service*, 2014).

### 4.21 Other state privacy laws — **Low**

About 19 states now have comprehensive privacy laws. Almost all apply only above thresholds (typically 100,000 residents' data a year; lower in a few), and all except California exclude data about people acting as employees or business contacts. A B2B field app with a few thousand users is outside them. Three things to keep it that way: do not add biometric features such as face recognition (Illinois BIPA has no size threshold and a private right of action); do not collect health data from individuals outside the employment context (Washington's My Health My Data Act has no threshold); and do not sell data. **[verify thresholds before selling heavily in any one state.]**

### 4.22 AI vendor disclosure — **Medium**

The draft names Anthropic. Good. The revision adds: exactly what is sent (stake photos, cut sheets, plan sheets, typed questions and attached photos, and for company users the job records Ask looks up to answer: production, dailies, delays, tickets, per the in-app notice at line 16391); that Anthropic's commercial terms say it may not train its models on this content; that Anthropic keeps content for a limited time under its own policies **[verify the current period]**; what we keep ourselves (mismatch 4); and that AI output is checked by the user before it is used. Remove the bracketed note to self from the published policy.

`pb_ai.eval_images` holds 76 test images. **Question for the owner:** are all of these his own photos? If any came from a customer's job, they are Company Data being used for testing, which the policy must permit and the customer should know.

### 4.23 Children — **Low**

Fine as drafted. The app is a work tool for adults; trenching and excavation are barred to under-18s by federal child labor rules. No age gate needed. COPPA does not apply.

### 4.24 Security statements — **Medium**

Draft: "each company's records are separated so other companies can't see them." That is an absolute promise. Revised: "designed so that". Do not publish "encrypted at rest" unless Supabase's current documentation confirms it for the database and storage **[verify]**. Do not use "secure", "bank-level" or "military-grade" anywhere in marketing. Things I noticed that a security reviewer should look at, because "reasonable security" is a legal standard: seven edge functions run with JWT verification off and rely on a shared secret; `supabase-js` is loaded from a CDN unpinned; backups are stored in the same Supabase project as the live data, so they do not protect against loss of the project itself; backups cover the database but I saw nothing backing up storage files (photos, plans, sealed PDFs).

### 4.25 Retention schedule — **Medium**

The draft has one sentence. The revision has a table (section 6). Where the system has no deletion today, the table says "kept while the account is open" instead of promising a period that nothing enforces.

### 4.26 User rights flow — **Medium**

Draft: "email [privacy email]… we'll answer within 45 days." Revised flow:

1. Request by email from the account's address, or in writing.
2. We confirm identity by replying to the account email (and for an agent, signed permission).
3. We sort the request: **(a)** our own data about you (login, feedback, usage counts, crash reports are not linked to you): we handle it; **(b)** work records in a company account: we forward to the company within 10 business days and tell you we did.
4. We answer within 45 days, and can extend once by 45 days if we tell you.
5. We keep a log of requests for 24 months.
6. What we cannot delete and why: records the company must keep, sealed copies and audit logs, backups until they roll off (30 days).

Build a simple internal checklist for step 3(a): delete or anonymize rows in `pb_support.messages`, `pb_billing.usage`, `pb_billing.ai_cost`, `public.ai_usage`, `pb_push.subscriptions`, `pb_crew.own_names`, and the Auth user. Today that is manual SQL; write it down before the first request arrives.

### 4.27 Changes to terms — **Medium**

Draft: 15 days' notice, then continued use is acceptance. After *Heckman*, unilateral change clauses are a target. Revised clause 17: at least 30 days' notice in the app and by email for material changes; re-acceptance through the gate; changes are not retroactive and do not apply to a dispute already raised; if you do not agree you may stop and export.

### 4.28 DMCA and IP — **Medium**

**Problem.** The draft has no copyright process. The database has a document-sharing feature (`pb_docs.documents` with `shareable`, `pb_docs.share_events`, `pb_docs.strikes`) and an owner review screen ("Documents review… Shared documents to check"). If users can share uploaded documents with other companies' users, the safe harbour for user-uploaded content (17 U.S.C. 512(c)) matters. It requires a designated agent registered with the Copyright Office ($6), a posted notice-and-takedown process, and a repeat-infringer policy.

Separately, the Ask knowledge base holds "standard specs" and "spec books". If those include copyrighted publications (for example a published standard specifications book), that is the owner's own content, the safe harbour does not cover it, and it needs a licence or a fair-use opinion. That is outside this review; flagged for the IP helper and the lawyer.

**Fix.** Revised clause 18. Register the agent.

### 4.29 Smaller points — **Low**

- **Electronic notices.** Add consent to receive notices electronically (E-SIGN / California UETA). Clause 19.
- **Publicity.** Do not name a customer in marketing without permission. Clause 19.
- **US only.** State that the Service is offered in the United States and data is processed there **[verify the Supabase project region]**. Clause 19.
- **Feedback phone calls.** A manual call to a number the user volunteered "if you're OK with a call" is fine. Do not put those numbers into any auto-dialer or text campaign (TCPA).
- **OpenStreetMap's usage policy.** The public Nominatim server has a usage policy that limits volume and discourages use by apps at scale. The server-side `weather` function was already blocked by it (comment in the function: "it answered 403"). The phone-side lookup still uses it. As users grow this may break or be cut off, and it sends precise worker locations to a third party with no contract. Consider a paid geocoder with a data agreement, or the Census geocoder already in use.

---

## 5. Proposed revised Terms of Use (complete, ready to paste after attorney review)

> Bracketed items must be filled in. Bold capitals are deliberate: the law gives more weight to limits that are conspicuous.

---

# The Pipelayer's Bible — Terms of Use

**Version [1.0]. Effective [date].**

These Terms of Use (the "Terms") are a contract between **[Company legal name]**, [business address] ("we", "us"), and you. They cover The Pipelayer's Bible app, website and related services (the "Service").

**Please read these first:**

- **This is a tool, not a decision-maker.** Check every number against the stakes, cut sheets and plans. The Service does not decide whether any trench, excavation or confined space is safe. (Sections 3, 4 and 5.)
- **Our liability is limited.** (Sections 11 and 12.)
- **Disputes go to individual arbitration, not to court, a jury or a class action. You can opt out within 30 days.** (Section 14.)

## 1. Agreeing to these Terms

1.1 **How you agree.** You agree to these Terms when you tick the box and tap "I Agree" in the app. We keep a record of the date, the version and your account.

1.2 **If you use the Service for a company.** If you create or manage a company account, you confirm that you have authority to accept these Terms for that company, and you accept them for it. "Customer" means that company. If you were added to a company's account, you agree to these Terms for yourself, and your company is also bound through its own acceptance and any signed Customer Agreement.

1.3 **Signed agreements come first.** If your company has a signed Customer Agreement or order with us, that document controls wherever it conflicts with these Terms.

1.4 **Who can use it.** You must be at least 18 and able to enter a contract. The Service is a work tool for the construction trade. It is not offered for personal, family or household use, and it is offered only in the United States.

1.5 **Privacy.** Our Privacy Policy explains what we collect and how we use it.

## 2. Your right to use the Service

2.1 **Licence.** While your account is in good standing, we give you a limited, non-exclusive, non-transferable, revocable right to use the Service for your own construction work, or your company's.

2.2 **Accounts.** Each person needs their own login. Keep it private. You are responsible for what is done under your login. Tell us at [support email] right away if you think someone else has used it.

2.3 **Company accounts.** The company's account owner adds and removes users, sets their roles, and decides who sees what. The company is responsible for its users and for making sure they follow these Terms.

2.4 **Changes and availability.** We may add, change or remove features. The Service may be unavailable at times, and some features need a signal. We do not promise any level of uptime.

2.5 **Phones.** The Service runs on your phone or your company's. You are responsible for the device, its settings, its battery, its clock and its connection.

## 3. What the Service is not

3.1 **It does not replace the people and documents that control the work.** The Service is a reference, calculation and record-keeping tool.

3.2 **Not engineering or surveying.** We are not your engineer or surveyor. The Service does not perform engineering or land surveying and does not establish line, grade or control. No licensed professional has reviewed anything the Service produces for your project.

3.3 **Survey and plans govern.** The stakes, cut sheets, approved plans, specifications, and the surveyor and engineer of record control line and grade. If the Service disagrees with any of them, they win. Stop and resolve the difference before you dig or lay pipe.

3.4 **Not safety, legal or professional advice.** Toolbox talks, rule summaries, tables, checklists, forms and answers about safety or regulations are general reference material. They may be out of date, incomplete, or not apply to your job or your state. They are not advice for your site.

3.5 **Safety decisions are made on site, by the right person.** The Service never decides whether a trench, excavation or confined space is safe to enter, whether a protective system is adequate, whether soil is classified correctly, or whether air readings are acceptable. Your competent person, your entry supervisor and your safety program decide, as OSHA, Cal/OSHA and other laws require.

3.6 **Utilities.** The Service does not locate utilities. Call 811, follow the locate marks and your state's excavation law, and pothole as required. Colour codes and mark guides in the Service are reference only.

3.7 **Your responsibility.** You and your company remain fully responsible for your work, your crew's safety, your compliance with every law, permit and contract, and the quality of what you build.

## 4. Confined space permits and emergency features

4.1 **The employer remains responsible.** If you use the confined space permit feature, your company remains the employer responsible for its permit-required confined space program under OSHA (29 CFR Part 1926, Subpart AA), Cal/OSHA and any other law that applies. That includes identifying and classifying the space, training, testing the air with a calibrated instrument, ventilation, the attendant, the entry supervisor, rescue and emergency services, and keeping the records the law requires.

4.2 **The permit feature is a form.** It records what people type and when. **It is not a gas monitor, an attendant, a rescue service or a safety device.** It does not read any instrument. It does not check whether a reading is true or acceptable. A completed permit in the Service does not mean a space is safe or that the law has been met.

4.3 **Timers, reminders and alerts can fail.** They depend on your phone, its battery, its settings and your signal. Do not rely on them as your only way to keep track of readings, entrants or time.

4.4 **Emergencies.** In an emergency, call 911 or your site's rescue number first, by the fastest means you have. The emergency button, texts, alerts to your foreman or office, shared links and location in the Service may be delayed or may not go through at all. Never rely on them as your only way to call for help.

4.5 **Keep your own copies.** The law may require you to keep cancelled permits and other safety records for set periods. Keeping them is your company's responsibility. Download copies. Do not rely on the Service as your only record.

## 5. Check every calculation, reading and answer

5.1 **Calculators.** Grade, slope, invert, rod reading, cut and fill, stake-out, quantity and similar results depend on the numbers entered and on rounding. The Service works in decimal feet unless it says otherwise. A wrong entry gives a wrong answer.

5.2 **AI can be wrong.** The Service uses artificial intelligence to read photos of stakes, cut sheets, tickets and plan sheets, and to answer questions. AI can misread handwriting, paint, numbers and drawings. It can give answers that sound right and are wrong. It can miss things.

5.3 **You must check before you use.**
- Check every value against the stake, the cut sheet, the plans and your own instrument before you rely on it. The Service may flag values it is unsure of. A value that is not flagged can still be wrong.
- **Never set grade, cut, dig or lay pipe from a value you have not checked.** Shoot grade the way you normally would.
- Nothing the AI reads is final until a person has reviewed it. When you tap to use a value, you are confirming you checked it.

5.4 **Ask.** Answers from Ask about trade practice, specifications, standards, locate marks or safety are general information. Specifications differ by agency, edition and project. Check the answer against the current edition and your project's own documents. Ask does not replace your competent person, engineer, inspector or safety program.

5.5 **Plan reading, takeoff and bid features.** Quantities, material lists, summaries and lists of conflicts produced from plan sets are estimates to help you review. They can be incomplete or wrong. They are not a takeoff you can bid from without checking, and they are not a bid. If no conflict is listed, that does not mean the plans have none.

5.6 **Photo stamps and times.** Dates, times, locations, addresses and compass directions come from your phone and from outside services. They can be wrong. A phone's clock can be set wrong.

5.7 **You bear the results.** You are responsible for what happens when you use any calculation, reading or answer, including rework, re-excavation, wrong orders, damaged utilities, delays, back charges and lost bids.

## 6. Beta

6.1 **What the beta is.** If you use the Service in a beta, trial or demo, you get it free for the period we tell you (normally 30 days), for evaluation. It is not finished. It may have errors, may lose data, and may change or end at any time.

6.2 **Limits.** Beta accounts have limits, such as a number of users, AI uses per day and plan-set uploads.

6.3 **When it ends.** The account becomes read-only. Nothing is charged automatically. To keep working you choose a paid plan.

6.4 **Feedback and usage.** During a beta we measure which features are used and how often, and we may contact you about your experience. If you give us a phone number with feedback, we may call you about it.

6.5 **Beta terms.** Sections 11 and 12 apply in full. For a free beta, our total liability is limited to $100.

## 7. Paid plans

7.1 **Plans and prices.** Prices, user counts, limits and what each plan includes are shown when you sign up and in your account, or in your signed order.

7.2 **Automatic renewal.** **Paid plans are billed in advance, monthly or yearly, and renew automatically for the same period at the then-current price until you cancel.** By starting a paid plan you authorize us and our payment processor to charge your payment method each period.

7.3 **Cancelling.** You can cancel at any time in your account settings, or by emailing [support email]. Cancellation takes effect at the end of the period you have paid for, and you keep access until then.

7.4 **Price changes.** We will tell you about a price change in the app and by email no less than 7 days and no more than 30 days before it takes effect, with how to cancel. A signed order may set a different notice period for that Customer.

7.5 **Reminders.** For yearly plans we will remind you before renewal.

7.6 **Refunds.** Fees already paid are not refundable, except where the law requires a refund or we end your plan without cause.

7.7 **Taxes.** Prices do not include taxes. You pay any sales, use or similar taxes.

7.8 **Usage limits.** Plans include limits on AI features, uploads and storage. When you reach a limit, that feature pauses until the limit resets or you buy more.

7.9 **Failed payments.** If a payment fails, we may make the account read-only until it is paid.

## 8. Your data

8.1 **Company Data.** Jobs, runs, readings, photos, reports, permits, plans, notes and other content that a company's users put into the Service while they are members of that company's account are "Company Data". Between the company and us, the company owns it. The company's account owner controls who can see it, and we act on the company's instructions about it.

8.2 **Individual plans.** If you use the Service on your own plan and not through a company, the content you enter is yours.

8.3 **Leaving a company.** If you leave or are removed from a company's account, Company Data stays with the company. Copies already saved on your own phone may remain there. You may keep them as a personal record of your own work, but your company's confidentiality rules and your agreements with it still apply. We do not decide disputes between a company and its people. We follow the account owner's instructions, or a court order.

8.4 **Permission to us.** You give us permission to host, copy, process, transmit and display your data, and to send it to our service providers (such as hosting, email, mapping, weather and AI providers), as needed to run, secure, support and improve the Service.

8.5 **What we will not do.** We will not sell your data. We will not use it for advertising. We will not use it to train AI models offered to others, and our AI provider's terms say it may not train its models on it.

8.6 **Improving the Service.** We may use information about how the Service is used, and questions the AI could not answer well, to fix and improve it. We remove names and other identifying details before keeping those questions. We may use and share statistics that do not identify you, your company, your people or your projects.

8.7 **Your right to upload.** You confirm that you have the right to put your data into the Service. That includes plans and specifications that belong to an owner, agency or engineer, and the names and details of crew members, entrants, attendants, attendees and emergency contacts. If your contracts require you to keep project documents confidential, do not upload or send to AI anything those contracts forbid.

8.8 **Your people.** If you are an employer, you are responsible for telling your workers what the Service collects about them, including photos, times and location, and for any consent or reimbursement the law requires.

8.9 **Records you must keep.** Laws and contracts may require you to keep records such as permits, daily reports and inspections for years. That is your responsibility. Export what you need.

## 9. Sealed originals and change history

9.1 **What a sealed original is.** When a run is finished and synced, the Service can save a sealed PDF copy and record a digital fingerprint of it with the server's date and time. Users cannot change or delete a sealed copy. Later edits create a new version, and the Service logs who made each edit and when.

9.2 **What it shows, and what it does not.** A matching fingerprint shows that the file has not changed since it was sealed. It does not show that the information in it is true, complete or accurate. The file is made on the phone from what was entered, and times inside it come from the phone's clock.

9.3 **No promise of acceptance.** We do not promise that any owner, agency, inspector, insurer, arbitrator or court will accept a sealed copy, a photo stamp, a timestamp or any other record from the Service as proof of anything.

9.4 **How long we keep them.** We keep sealed copies and change history while the account is open and for the period in Section 16. We may delete them after that, or earlier if the law requires it.

## 10. Rules of use

You will not, and will not let others:

- share a login, or resell, rent or give access to the Service to anyone outside your company;
- copy, modify, reverse-engineer or decompile the Service, or copy its features, content, calculations or libraries into another product;
- scrape the Service, access it with automated tools, or use it to build or train a competing product or AI model;
- get around usage limits, security or access controls;
- enter false, backdated or misleading records, or use the Service to create a record of a safety check that was not done;
- upload anything unlawful, harmful, infringing, or that you have no right to share, or anything containing malware;
- upload Social Security numbers, bank or card numbers, medical records or similar sensitive personal information; the Service is not built for it;
- use the Service as the only basis for a decision to discipline, demote or dismiss a worker;
- use the Service in a way that breaks the law or harms other people.

## 11. No warranties

**THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". TO THE FULLEST EXTENT THE LAW ALLOWS, WE DISCLAIM ALL WARRANTIES, EXPRESS, IMPLIED OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, TITLE AND NON-INFRINGEMENT.**

**WE DO NOT PROMISE THAT THE SERVICE, ITS CALCULATIONS, ITS AI READINGS AND ANSWERS, ITS SAFETY CONTENT OR ITS RECORDS WILL BE ACCURATE, COMPLETE, CURRENT OR ERROR-FREE; THAT THE SERVICE WILL BE UNINTERRUPTED OR WILL WORK WITHOUT A SIGNAL; THAT ALERTS OR EMERGENCY FEATURES WILL BE DELIVERED; THAT DATA WILL NEVER BE LOST; OR THAT ANY RECORD WILL BE ACCEPTED BY ANY AGENCY, OWNER, INSURER OR COURT.**

Keep your own copies of important records. Some laws do not allow certain warranties to be excluded; where that is so, the exclusion applies only as far as the law allows.

## 12. Limits on our liability

**Please read this section. It limits what you can recover from us.** Our prices are set on the basis that the limits in this section apply.

12.1 **NO INDIRECT DAMAGES. TO THE FULLEST EXTENT THE LAW ALLOWS, WE AND OUR OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS AND SUPPLIERS ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, BIDS, DATA OR BUSINESS, OR FOR REWORK, RE-EXCAVATION, REPLACED PIPE OR MATERIAL, DAMAGED UTILITIES OR PROPERTY, DELAYS, LIQUIDATED DAMAGES, BACK CHARGES, FINES OR PENALTIES, EVEN IF WE WERE TOLD THEY WERE POSSIBLE.**

12.2 **CAP. TO THE FULLEST EXTENT THE LAW ALLOWS, OUR TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF (A) THE AMOUNT YOU OR YOUR COMPANY PAID US FOR THE SERVICE IN THE 12 MONTHS BEFORE THE EVENT THAT GAVE RISE TO THE CLAIM, OR (B) $100. FOR A FREE BETA, TRIAL OR DEMO, IT IS LIMITED TO $100.**

12.3 **How the limits apply.** They apply to every kind of claim, whether based on contract, warranty, negligence, strict liability or any other theory, and even if a remedy fails of its essential purpose.

12.4 **What the limits do not cover.** Nothing in these Terms limits or excludes liability for our fraud, for willful injury to a person or to property, for our gross negligence, or for a violation of law, to the extent California Civil Code section 1668 or other law does not allow that liability to be limited.

12.5 **If part of this section is not enforceable**, the rest still applies, and the unenforceable part applies as far as the law allows.

## 13. Your duty to defend and reimburse us

13.1 **Company customers.** If you are a company, you will defend us and our owners, officers, employees and contractors against, and pay for, any claim, loss, damage, fine or cost (including reasonable attorneys' fees) brought by anyone else that arises from:
- your work, your projects or your job sites;
- injury to or death of any person, including your own employees, subcontractors and anyone else on your sites, or damage to any property or utility, connected with your work;
- your data, including any claim that you had no right to upload or share it;
- your use of the Service, or your users' use of it; or
- your breach of these Terms or of any law.

This is a written agreement to indemnify, made before any injury, for the purposes of California Labor Code section 3864.

13.2 **Individuals.** If you use the Service as an individual, you will reimburse us for claims by others that arise from your breach of these Terms or your misuse of the Service.

13.3 **Limit.** This section does not apply to the extent a claim was caused by our own gross negligence, fraud or willful misconduct.

13.4 **Process.** We will tell you promptly about a claim, let you control the defence with lawyers reasonably acceptable to us, and cooperate at your cost. You may not settle in a way that admits fault for us or puts obligations on us without our written consent.

## 14. Disputes: individual arbitration

**This section affects your rights. It requires most disputes to be decided by an arbitrator, one case at a time, instead of in court or in a class action.**

14.1 **Talk first.** Before either of us starts a claim, the one with the complaint will send the other a written notice describing the problem and what they want. Send ours to [support email]. We will send yours to your account email. We will both try in good faith to resolve it for 30 days. Any time limit for the claim is paused during those 30 days.

14.2 **Arbitration.** If it is not resolved, any dispute between you and us relating to the Service or these Terms will be decided by binding arbitration administered by the American Arbitration Association (AAA), before one arbitrator. AAA's Commercial Arbitration Rules apply, unless AAA decides its Consumer Arbitration Rules apply to you. The Federal Arbitration Act governs this section.

14.3 **Where.** The hearing will be by video or phone, on written submissions, or in person in [Riverside] County, California. If you are an individual, you may choose to have any in-person hearing in the county where you live.

14.4 **What stays out of arbitration.** Either of us may bring an individual claim in small claims court. Either of us may ask a court for an order to stop misuse of intellectual property or unauthorized access to the Service. If the law does not allow a claim for public injunctive relief to be waived or arbitrated, that claim may be brought in court after the arbitration of the other claims is finished.

14.5 **No class actions. Claims may be brought only on an individual basis. Neither of us may bring a claim as a plaintiff or class member in any class, collective, consolidated or representative proceeding, and the arbitrator may not combine claims of different people without the written consent of everyone affected.** If a court decides this paragraph cannot be enforced for a particular claim, that claim (and only that claim) will be decided in court, not in arbitration.

14.6 **Many similar claims.** If 25 or more similar claims are brought against us by the same or coordinated lawyers, AAA's Mass Arbitration Supplementary Rules apply. Each claimant keeps their own case and their own result.

14.7 **Jury.** **In arbitration there is no judge or jury. To the extent the law allows, you and we each give up the right to a jury trial.**

14.8 **Your right to opt out.** You may opt out of this Section 14 by emailing [support email] within 30 days after you first accept these Terms, with your name, your account email and the words "I opt out of arbitration". Opting out does not affect any other part of these Terms.

14.9 **Time limit.** To the extent the law allows, any claim must be started within one year after the person bringing it knew or should have known of it.

14.10 **Changes.** If we change this Section 14, the change will not apply to a dispute that either of us has already given written notice of.

## 15. Governing law and courts

California law governs these Terms, without regard to its conflict-of-law rules. For any dispute that is not arbitrated, the state and federal courts located in [Riverside] County, California have exclusive jurisdiction, and you and we consent to them.

## 16. Ending use, suspension and your data afterwards

16.1 **You.** You may stop using the Service at any time. A company's account owner may close the company account by writing to [support email].

16.2 **Us.** We may suspend or end your access if you break these Terms, do not pay, or use the Service in a way that creates risk or legal exposure for us or others. Where we reasonably can, we will tell you first and give you a chance to fix it.

16.3 **Your data afterwards.** For at least 60 days after an account closes or becomes read-only, you can still sign in and use the export tools. If you ask us in writing during that time, we will give the account owner a reasonable export of the company's data, and may charge for unusual effort. After that we may delete your data. We may keep sealed copies, change history and records we need for legal claims or legal duties for up to [4 years], and copies in routine backups until they roll off.

16.4 **What continues.** Sections 3, 4, 5, 8, 9, 11, 12, 13, 14, 15, 16, 18 and 19 continue after your use ends.

## 17. Changes to these Terms

We may update these Terms. For changes that matter, we will tell you in the app and by email at least 30 days before they take effect, and we will ask you to agree again. Changes are not retroactive. If you do not agree, stop using the Service; you may export your data under Section 16.

## 18. Our property, feedback and copyright complaints

18.1 **Ours.** We own the Service, including its software, design, calculations, content, libraries and the name The Pipelayer's Bible. Standards, specifications and agency documents referred to in the Service belong to their owners.

18.2 **Feedback.** If you send us ideas or feedback, we may use them freely, without payment and without any duty to you.

18.3 **Copyright complaints.** If you believe content in the Service infringes your copyright, send a notice to our copyright agent: [name], [address], [email]. Include your signature, the work, the content you say infringes and where it is, your contact details, a statement of good-faith belief, and a statement under penalty of perjury that the notice is accurate and that you are the owner or authorized to act. We remove infringing content, and we end the accounts of repeat infringers.

## 19. General

19.1 **Whole agreement.** These Terms, the Privacy Policy and any signed Customer Agreement are the whole agreement between us about the Service.

19.2 **Electronic notices.** You agree that we may send you notices and records electronically, in the app or to your account email.

19.3 **Severability and waiver.** If part of these Terms cannot be enforced, the rest stays in effect. If we do not enforce a right, we have not given it up.

19.4 **Transfer.** You may not transfer these Terms without our written consent. We may transfer them with our business.

19.5 **Events outside our control.** We are not responsible for delays or failures caused by things beyond our reasonable control, including outages of signal, power, hosting, mapping, weather, email or AI providers.

19.6 **No third-party rights.** These Terms are for you and us only. They give no rights to anyone else.

19.7 **Names.** We will not use your company's name or logo in our marketing without your permission.

19.8 **Contact.** [Company legal name], [business address], [support email].

---

## 6. Proposed revised Privacy Policy (complete, ready to paste after attorney review)

> This text describes the app **after** the three app fixes in section 2 (rows 2, 3 and 4). If those are not made first, use the alternative wording shown in *italic brackets*.

---

# The Pipelayer's Bible — Privacy Policy

**Version [1.0]. Effective [date].**

This Privacy Policy explains what information **[Company legal name]** ("we", "us") collects through The Pipelayer's Bible app and website (the "Service"), how we use it, who it goes to, and your choices.

**The short version**

- We collect what the app needs to do its job: your account, your work records and photos, and your location when you use features that need it.
- We do not sell your information or share it for advertising. The app has no third-party advertising or analytics trackers.
- AI providers process your photos, plans and questions to give you an answer. Their terms with us say they may not train their models on them.
- If you use the app through your employer, your employer controls the work records in its account.

## 1. Who is responsible for what

**If you use the Service through a company's account**, that company decides what work records are collected and who sees them. We process those records for the company, as its service provider. Questions and requests about them go to your company first.

**For a smaller set of information, we are responsible ourselves:** your login, your name and email, feedback you send us, crash reports, and counts of how the app is used.

**If you use the Service on your own plan**, we are responsible for all of it.

## 2. What we collect

| Information | Examples | Where it comes from |
|---|---|---|
| Account | Name, email, company, role and title, password (stored only in scrambled form), login records | You, or your company's account owner |
| Work records | Jobs, runs, stations, offsets, stake and rod readings, grades, notes, delays, daily reports, production and footage, crew and foreman names, quantities, tickets, inspections, schedules | You and your crew |
| Safety records | Confined space permits, air readings, names of entrants, attendants and supervisors, emergency events, toolbox talk attendance, reports to management (named or anonymous) | You and your crew |
| Photos and files | Stake photos, run and site photos, plan sets, cut sheets, tickets, uploaded documents, company logo | You and your crew |
| Photo stamps | Date, time, GPS position, nearby street address, compass direction, optional caption, printed on photos taken with the app's camera | Your phone |
| Location | Your phone's position while Run Setup or Run Results is open, when you ask for weather at your position, and after you press the confined space emergency button | Your phone, with your permission |
| Job locations | A job's address or map position | You or your office |
| AI requests | The photo, sheet or question you send, attached photos, the answer, and whether you marked it "not right" | You |
| Emergency contacts | Names and phone numbers entered for confined space alerts | You |
| Notifications | A push address created by your phone's browser, and which alerts you turned on | Your phone, with your permission |
| Feedback | What you write, the screen you were on, and your phone number if you choose to add it | You |
| Usage counts | Which screens and features are used and how many times a day, per user and per company; AI use counts and cost | Your phone, automatically |
| Crash reports | The type of error, where in the app's code it happened, app version, screen name, plan type, browser and system version, and time. No name, email, account, job details or anything you typed | Your phone, automatically. You can turn this off in Settings |
| Payment | Billing name, plan and payment status. Card details go to our payment processor, not to us | You and the payment processor |
| Change history | Who created, edited, approved, sent back or removed a record, and when | The Service |

**About other people.** Work and safety records include names of people who may not use the app, such as entrants, attendees and emergency contacts. The company that enters them is responsible for having the right to do so.

**What we do not collect.** We do not collect your contacts, messages, microphone audio or browsing history. Photos are re-drawn before upload, which removes the hidden data cameras add (such as GPS), except the time the photo was taken. Photos picked from your library get no location stamp.

## 3. How we use it

- To run the Service: save and sync records, calculate, read photos and plans, answer questions, build reports, and send the emails, notifications and alerts that you or your company set up.
- To show a company's records to the people that company allows.
- To keep the Service secure, enforce limits and our Terms, and prevent misuse.
- To fix problems and improve the Service, using crash reports, usage counts, feedback, and AI questions that were not answered well. We remove your identity from those questions before keeping them.
- To plan features and pricing, using usage counts and feedback.
- To bill paid accounts and contact you about your account, changes and security.
- To meet legal duties and to establish or defend legal claims.

**What we do not do.** We do not sell personal information. We do not share it for advertising. We do not use it to build profiles for marketing. We do not use it to train AI models offered to others.

## 4. Who it goes to

**Within your company.** Records in a company account are visible to the people the company's account allows: generally the office, managers, your foreman, and you. Photo stamps, times, production figures and names on records are visible to them.

**Service providers.** These companies run parts of the Service for us and receive only what each needs:

| Provider | What it does | What it receives |
|---|---|---|
| Supabase | Database, logins, file storage, server functions, backups | Everything stored in the Service |
| Anthropic | AI that reads photos, cut sheets, tickets and plans, and answers Ask | The photo or sheet being read, your question, and the job records needed to answer it. Anthropic's commercial terms say it may not train its models on this content, and it keeps it only for a limited time under its own policies |
| Resend | Sends the app's emails | The recipient's email address and the email's content, which can include report and job details |
| Apple, Google or Mozilla push services | Deliver notifications to your phone | The notification's content, which can include a name, a job number and a short message |
| Sentry | Crash reports | Error details as described above. It sees your phone's internet address when a report arrives; we have set it not to store it |
| OpenStreetMap (Nominatim) | Turns a photo's position into a street address | The position, rounded to about 35 feet, and your phone's internet address *[if the app fix is not made: "The position at full precision, while Run Setup or Run Results is open, and your phone's internet address"]* |
| National Weather Service | Weather for daily reports and alerts | The job's approximate position |
| US Census Bureau geocoder | Turns a job's street address into a map position | The job's street address |
| Stripe | Payments for paid plans | Billing details and card information |
| GitHub, Cloudflare, jsDelivr, Google Fonts | Deliver the app's files and fonts to your phone | Your phone's internet address and browser type, as with any website |

**When you send it.** An emergency text to 911 or your contacts, a report you email, or a file you download and pass on goes through your phone's own apps. If you create an emergency share link, anyone who has the link can see the information it shows until it is ended.

**Other cases.** We may disclose information when the law requires it, in response to a valid legal demand, or to protect people's safety or our rights. For records in a company account we will tell the company first where we lawfully can. If the business is sold or merged, information may pass to the new owner, who must continue to honour this policy or tell you before changing it.

## 5. Location, camera, compass, notifications and phone storage

- **Location.** Your phone asks your permission first. Location runs while Run Setup or Run Results is in use and stops about 5 minutes after your last tap. It is also used once when you ask for weather at your position, and after an emergency button press. It is used to stamp photos taken in the app and to show where you are in an emergency. We do not keep a trail of your movements. You can refuse or turn it off in your phone's settings; photos are then saved without a location stamp.
- **Camera** is used only when you choose to take a photo.
- **Compass** is used only to add a direction to a photo stamp. The app asks once.
- **Notifications** are sent only if you allow them. You can turn them off in the app or in your phone's settings.
- **Phone storage.** The app keeps your work on your phone so it works with no signal, and sends it when the signal returns. Anyone who can unlock your phone may be able to see it. Use a screen lock. If you lose the phone, tell your company.
- **Do Not Track.** The app does not track you across other sites or apps, so it does not respond to browser Do Not Track signals. No third party collects information about your activity over time and across different sites through the Service.

## 6. How long we keep it

| Information | How long |
|---|---|
| Work records, safety records, photos and files in a company account | While the company's account is open. Many of these must be kept for years by law or contract |
| Sealed original PDFs and change history | While the account is open. Users cannot change or delete them. After an account closes we may keep them for up to [4 years] for legal claims, then delete them |
| Confined space permits | While the account is open. Users cannot delete them except by deleting the whole job as the account owner |
| Everything in an account, after it closes | At least 60 days, so it can be exported. After that we may delete it, except as stated above or where the law requires us to keep it |
| Routine backups | Made nightly. Each is deleted after about 30 days |
| Usage counts and AI use counts | While the account is open |
| AI questions kept to improve answers | Kept without your identity until reviewed, then for as long as they are useful for testing |
| Feedback, with any phone number | Until it has been dealt with and for up to [24 months] after |
| Crash reports | Under our error service's standard period, currently [90 days] |
| Push addresses | Until you turn notifications off or the address stops working |
| Copies on your phone | Until you delete them, clear the app's data, or remove the app |

## 7. Security

We use measures intended to protect your information: connections to the Service are encrypted, a login is required, and the Service is designed so that one company's records are not visible to another company. Access by us is limited to what is needed to run and support the Service.

No system is completely secure, and we cannot promise that information will never be lost or accessed without permission. If we learn of a breach that affects your information, we will notify you, or your company, as the law requires.

## 8. Your choices and requests

You can:

- **See and correct** much of your information in the app.
- **Turn off** crash reports, location, compass and notifications.
- **Ask us** for a copy of the personal information we hold about you, to correct it, or to delete it.

**How to ask.** Email [privacy email] from your account's email address. We may need to confirm it is you. Someone you authorize in writing can ask for you. We aim to answer within 45 days, and will tell you if we need more time.

**Records in a company account.** If your request is about work or safety records in your employer's account, we will pass it to your company, because your company controls them. We will tell you that we have done so.

**What we may not be able to delete.** Records a company is required to keep, sealed originals and change history, information needed for legal claims or duties, and copies in backups until they roll off.

**Anonymous reports.** A report you send to management anonymously is stored without your name or account and with only the hour it was sent. Your company cannot see who sent it through the Service. What you write, or a photo you attach, could still identify you, so think about what you include.

**California and other states.** We offer the choices above to everyone, wherever you live. We do not sell personal information, do not share it for cross-context behavioural advertising, and do not use sensitive information such as precise location for anything other than providing the Service. We will not treat you differently for making a request. If your employer is covered by the California Consumer Privacy Act or a similar law, your employer is responsible for your rights under it for the records it controls, and we help it respond.

## 9. Children

The Service is for adults at work. We do not knowingly collect information from anyone under 18. If you think we have, contact us and we will delete it.

## 10. Where information is processed

The Service is offered in the United States, and information is stored and processed in the United States.

## 11. Changes

We will post any update here with its date. For changes that matter, we will tell you in the app or by email before they take effect.

## 12. Contact

[Company legal name], [business address], [privacy email].

---

## 7. Outline: Customer Agreement and Data Processing Addendum (for each company)

Not full text; an outline for the lawyer to draft from. Target length: two pages plus a one-page addendum.

**Customer Agreement**

1. Parties, effective date, the person signing and their title.
2. Plan: beta (free, 30 days, limits) or paid (price, seats, term, renewal, notice to cancel).
3. The Terms of Use are part of this agreement. This agreement controls if they conflict.
4. Authority: the signer may bind the company and accepts for all its users.
5. **Employer responsibilities:**
   - The company's own safety program, competent persons and entry supervisors control all safety decisions. The app is a record-keeping aid.
   - The company keeps its own copies of records the law requires.
   - The company tells its workers what the app collects (photos, times, location, production) and gives any notice or consent the law requires.
   - The company handles reimbursement for work use of personal phones.
   - The company will not use app data as the sole basis for discipline or dismissal.
   - The company has the right to upload its plans and the names it enters.
6. **Indemnity**, including claims by the company's employees and subcontractors for injury or death, stated to be a written agreement under Labor Code 3864.
7. Insurance: the company carries general liability and workers' compensation. [Additional insured: lawyer and broker to advise.]
8. Limits of liability: as in the Terms, restated in bold.
9. Data: the company owns Company Data; export on request for 60 days after the end; then deletion, subject to the retention carve-outs.
10. Confidentiality, both ways.
11. Disputes: as in the Terms, or courts only, per the lawyer's advice (4.8).
12. Signatures.

**Data Processing Addendum**

1. Roles: the company is the business or employer; we are its service provider.
2. We process Company Data only to provide the Service and for the limited business purposes the law allows (security, fixing errors, improving the Service with de-identified data).
3. We do not sell or share Company Data, and do not combine it with other customers' data except in de-identified or aggregate form.
4. Sub-processors: the list in Privacy Policy section 4, with notice of changes.
5. Security: reasonable measures; our people are bound to confidentiality.
6. Requests from individuals: we forward them and help the company respond.
7. Breach: we notify the company without undue delay after discovering a breach of its data.
8. End of service: return or deletion, with the stated exceptions.
9. The company may take reasonable steps to check we comply (for example, a written questionnaire once a year).

---

## 8. Questions for a lawyer

**Formation and structure**
1. Which entity should own and sell the app? Is a new LLC or corporation, separate from DIG Civil Construction, enough to wall off the contracting business, and what must be done to keep that wall intact?
2. Does the acceptance gate in 4.1, with the record described, meet the Ninth Circuit's current standard? Any change to the wording on the box or button?
3. For crew members invited by their employer, is their own click enough, or should the employer also collect a signed acknowledgement?

**Liability**
4. Does a click-through indemnity satisfy Labor Code 3864's "written agreement… executed prior to the injury", or must it be signed? Should every company sign before any crew member logs in?
5. How would a California court treat the liability cap and the warranty disclaimer if a worker were hurt after relying on the confined space permit feature or a grade value? Does *Tunkl* apply? Would you remove any feature, or change how it is described, to lower the risk?
6. Is a $100 cap for the free beta defensible against a company? Against an individual?
7. Should the confined space feature require an on-screen attestation by the entry supervisor for each permit, and what should it say?
8. What insurance should the app company carry, and does typical Tech E&O cover bodily injury claims arising from software? Can we reasonably ask customers to name us as an additional insured?
9. Could the app, or the owner personally, be said to be practising engineering or land surveying by offering stake-out math and AI plan reading? Is the disclaimer in clause 3.2 enough?

**Disputes**
10. For company customers, is arbitration worth it, or is "courts in Riverside County, class waiver, liability cap" better for a small vendor? Different answer for individual plans?
11. Is the one-year limit on claims enforceable against companies and against individuals?
12. What is the current state of California's arbitration-fee statutes (CCP 1281.97–1281.98) after *Hohenshelt*, and what internal process do we need so we never pay late?

**Subscriptions**
13. Does California's Automatic Renewal Law apply to (a) contractor companies and (b) individual tradespeople buying a work tool? Should we simply comply for everyone?
14. Please review the planned Stripe checkout and cancellation screens against the ARL and ROSCA before launch.

**Data**
15. Is the company a CCPA "business" given its ownership and any common control with DIG Civil? If not, is it wise to offer the rights voluntarily as drafted?
16. Who owns records created by a crew member on a personal phone, and what may a departing employee keep? Is clause 8.3 sound under California employment law?
17. How long should sealed PDFs, permits and audit logs be kept after an account closes: 4 years, 10 years, or something else? Should the customer be able to choose?
18. Is the handling of the "undeletable seal vs. deletion request" conflict in 4.17 sound?
19. Do the new California workplace laws signed September 30, 2026 (AB 1883, AB 1331, SB 947) or the CCPA regulations on automated decision-making put any duty on us as the vendor, given production tracking and GPS-stamped photos?
20. Is the description of anonymous reports safe to publish, or should it be weaker still?
21. Do we need a written incident response plan to meet "reasonable security", and what should the breach clause in the DPA promise on timing?

**IP**
22. If users can share documents with users at other companies, do we need to register a DMCA agent now?
23. Does the Ask knowledge base include copyrighted standards or spec books, and if so what licence or analysis is needed?

**Questions for the owner (facts I could not determine)**
- What is the legal name and address of the selling entity?
- Are all 76 images in `pb_ai.eval_images` your own, or do some come from customers' jobs?
- Is "Prevent Storing of IP Addresses" switched on in the Sentry project?
- Which region hosts the Supabase project?
- Do you want a removed crew member to keep access to sealed PDFs he made?

---

## 9. Sources

**Opened and read in this session**

- Terms of Use draft: https://claude.ai/artifact/PZbUTQsw9xigxqgcjunudM (read through the Docs connector; not changed)
- Privacy Policy draft: https://claude.ai/artifact/5n5SKCBdZQjj33io8jvTgT (read through the Docs connector; not changed)
- App source: `/home/claude/index.html-/index.html` (line numbers cited above)
- Supabase project `rogfassochneycezecxa`: table list, storage buckets and policies, cron jobs, edge function list; source of `pb-backup`, `feedback-notify`, `weather`, `ai` (loader only); function definitions `pb_ai_gap_put`, `pb_usage_add`, `pb_feedback_send`, `pb_report_submit_anonymous`, `pb_run_seal_add`, `pb_prod.can_view_run_seal`, `pb_prod.can_view_run_photo`, `pb_crew.svc_take_out`, `pb_billing.on_member_removed`, `pb_safety.permit_delete_guard`, `pb_safety.em_notify`, `pb_safety.em_register`, `pb_prod.cron_trim`, `pb_docs.purge`, `pb_prod_run_remove`
- Jones Day, "FTC Revives Click-to-Cancel Rule: New Risks for Subscription Businesses" (May 2026): https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses
- Jackson Lewis, "Navigating the California Consumer Privacy Act: 30+ Essential FAQs for Covered Businesses, Including Clarifying Regulations Effective 1/1/26": https://www.jacksonlewis.com/insights/navigating-california-consumer-privacy-act-30-essential-faqs-covered-businesses-including-clarifying-regulations-effective-1126
- Fenwick, "Ninth Circuit Reinforces Stricter Standards for Online User Agreements" (*Godun v. JustAnswer*; *Chabolla v. ClassPass*): https://www.fenwick.com/insights/publications/ninth-circuit-reinforces-stricter-standards-for-online-user-agreements
- JD Supra, "California's Latest Automatic Renewal Law Amendments Take Effect in July 2025": https://jdsupra.com/legalnews/california-s-latest-automatic-renewal-5514590
- Venable, "California Supreme Court Finds Parties Cannot Contract Away Liability for Willful Injury" (*New England Country Foods v. VanLaw*, S282968, Apr. 24, 2025): https://www.venable.com/insights/publications/2025/04/california-supreme-court-finds-parties-cannot
- Horvitz & Levy, "Limitations on damages for willful injury are prohibited by California Civil Code section 1668": https://www.horvitzlevy.com/limitations-on-damages-for-willful-injury-are-prohibited-by-california-civil-code-section-1668/
- Perkins Coie, "Ninth Circuit Rejects Mass Arbitration Rules, Backs California Class Actions" (*Heckman v. Live Nation*): https://perkinscoie.com/insights/update/ninth-circuit-rejects-mass-arbitration-rules-backs-california-class-actions
- Ogletree Deakins, "California Governor Signs 3 Bills Targeting AI and Workplace Surveillance" (AB 1883, AB 1331, SB 947; signed Sept. 30, 2026): https://ogletree.com/insights-resources/blog-posts/california-governor-signs-3-bills-targeting-ai-and-workplace-surveillance/
- Anthropic Commercial Terms of Service (effective June 17, 2025): https://www.anthropic.com/legal/commercial-terms

**Found in search but not opened (titles only; useful for the lawyer)**

- Gibson Dunn, "FTC Restarts Negative Option Rulemaking After Eighth Circuit Vacatur; Enforcement Under ROSCA Continues": https://gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/
- Eric Goldman, "The Ninth Circuit Has a Lot to Say About Online Contract Formation — Chabolla v. ClassPass": https://blog.ericgoldman.org/archives/2025/03/the-ninth-circuit-has-a-lot-to-say-about-online-contract-formation-much-of-it-confusing-chabolla-v-classpass.htm
- Epstein Becker Green, "Four New California Laws Reshape the Rules for Workplace AI": https://www.ebglaw.com/insights/publications/four-new-california-laws-reshape-the-rules-for-workplace-ai
- Anthropic Data Processing Addendum: https://www.anthropic.com/legal/commercial-terms/dpa

**Stated from my own knowledge, not re-checked online in this session. Treat each as [verify]**

- Statutes: Cal. Civil Code 1668, 1798.81.5, 1798.82, 1798.100(d), 1798.105(d), 1798.140; Cal. Bus. & Prof. Code 17600–17606 (definition of "consumer" in 17601), 22575–22579, 6700 et seq., 8700 et seq.; Cal. Labor Code 2802, 3864; Cal. Code Civ. Proc. 337, 337.15, 1281.97–1281.98; 29 CFR 1926.1201–1213 (permit retention at 1926.1205(f)); Cal. Code Regs. Title 8 sections 5157–5158 and 1950–1962; 17 U.S.C. 512(c); ROSCA (15 U.S.C. 8401–8405).
- Cases: *Tunkl v. Regents of the University of California* (Cal. 1963); *City of Santa Barbara v. Superior Court* (Cal. 2007); *McGill v. Citibank* (Cal. 2017); *Grafton Partners v. Superior Court* (Cal. 2005); *Cochran v. Schwan's Home Service* (Cal. Ct. App. 2014); *Hohenshelt v. Superior Court* (Cal. 2025); the Eighth Circuit's July 2025 decision vacating the FTC rule.
- SB 446 (2025) 30-day breach notice deadline; the count and thresholds of other states' privacy laws; AAA Mass Arbitration Supplementary Rules threshold of 25 claims; Anthropic's content retention period.
