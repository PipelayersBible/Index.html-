# Company Messages (staged Nov 22 2026) — notes

Tommy's ask: "internal company messages so people can talk about things directly", plus (later the same day) "give the
options for the supers to include pipe layers and the option to let them see the entire chat history".
Design and numbers: `PLAN.md`. **Nothing was applied, deployed, committed or published.** Live Supabase was only read
(SELECTs, function definitions, edge function source). `r1716_candidate/work/A/index.src.html` was copied, not edited.

## What was built

| Part | Files | What it does |
|---|---|---|
| Server | `sql/01_messaging.sql` | `pb_msg` schema (13 tables, RLS on, no API grants), records guards (no delete/truncate, versions kept by trigger, admin-log trigger), who-is-in rules, 18 app functions + 3 storage-policy helpers (all SECURITY DEFINER, `search_path=''`, EXECUTE only for `authenticated`), 4 service functions, alerts into `pb_push.outbox` (type `message` added to its check), quiet hours, folding, daily `pb_msg.sweep()` (pg_cron 09:17 UTC) |
| Storage | `sql/02_storage.sql` | private buckets `msg-photos` (JPEG, 3 MB) and `msg-archives` (ZIP, 100 MB); insert/select policies; no update/delete policy |
| Off-site | `sql/03_offsite.sql`, `edge/pb-offsite/index.ts` | `pb_offsite_todo` also lists `msg-archives` (md5-guarded replace, live text kept for undo); B2 Object Lock 4 years (keep forever) or 396 days (13-month company) |
| Archive writer | `edge/msg-archive/` (`index.ts`, `logic.mjs`, `zip.mjs`, `test.mjs`) | one ZIP per chat: README (sha256 of every file), manifest, transcript.txt, transcript.html (photos inline, no scripts), chat.json (every version), photos at stored size; 60 MB parts if bigger; uploads, reports back; 13-month purge of files through the Storage API |
| App | `patches/m1_messages.py` + `patches/m1/{messages.js,messages.css,screens.html}` | Home card (unread chip), Messages, Chat, Chat info, Message settings, Settings row, outbox, photos, alert link `#/messages/<chat>`, 122 new Spanish strings + 10 patterns |
| Tests | `sql/tests/t0N.plpgsql` → `block_t0N.sql` (`python3 sql/tests/mk.py`), `sql/local/run_local.sh`, `tests/t_msg.js` + `tests/msgsrv.js`, `edge/msg-archive/test.mjs` | see Results |
| Undo | `sql/undo/99_undo_03.sql`, `99_undo_02.sql`, `99_undo_01.sql` (in that order) | 01's undo deletes every message: its first block alone only cuts the app off and keeps them |
| Build | `build.sh` | `work/index.src.html`, `work/build/` (publish), `work/build_hooks/` (tests) |

### Who is in a chat (enforced in `pb_msg.qual` / `pb_msg.can_read`, read at every call)
- Job chat: the office always (company account, managers, PMs/supers); foremen who filed work on that job in the last
  120 days or whom the office added; pipelayers **only while the office has "Include pipelayers" on** (default OFF):
  pipelayers who filed work on the job, are on the crew of a foreman in the chat, or whom the office added.
- "Pipelayers see": **From when added** (default; stored as the chat's message number when they were added) or
  **Whole chat**. Turning pipelayers off takes access away at once (rows go to `off`); turning it on again adds them from
  that moment. Every change: `pb_msg.chat_log` (who, what, old, new, when), shown on Chat info to everyone in the chat.
- Direct message: the two people, any roles (a pipelayer can message anyone in the company).
- Removed from the company: nothing, at once (no cache, no grace), including their own DMs; the other side keeps reading
  (records) but cannot post to someone gone (`pb:other_left`). Nobody outside the company can read, post, DM or be added.
- A company that is not active: read yes, post no (`pb:company_inactive`).

### Alerts (decision: what the lock screen shows)
Title `Job 1234 · Mike` (DM: `Mike Ruiz`), body the first 60 characters (`…` if longer; "Photo" for a photo alone).
Reason: Web Push is encrypted end to end, so only the phone reads it; for a crew the preview is what tells a man with
gloves on whether to stop; 60 characters is a line, not a conversation. Each person can turn "Show message words on the
lock screen" off (then `Messages` / `New message in Job 1234 from Mike`). An alert not yet out folds further messages
in ("3 new messages. Last: …"), is cancelled when the person opens the chat or mutes it, or when its only message is
deleted. Quiet hours (default on, 7 PM to 6 AM in the company's time zone, `pb_pm.settings.tz`; a DM uses the person's
own phone time zone when known) hold the alert until they end; they are set per person in Message settings.

## Results

| What | Result | Saved |
|---|---|---|
| SQL, local throwaway Postgres 16 (`sql/local/run_local.sh`; one_device + security stubs + ours) | `block_t01` **RESULT: 63 pass, 0 fail**; `block_t02` **14 pass, 0 fail**; `block_t03` **4 pass, 0 fail**; each apply file run twice: ok; undo 03, 02, 01: nothing left (0 buckets, 0 policies, off-site list and outbox check back to the live text) | `results/sql_local.txt` |
| SQL mutation check (that the tests can fail) | grant on `pb_msg_photo_can_view` revoked → 4a and 4i-4l FAIL ("permission denied for function pb_msg_photo_can_view", the same shape as this morning's live bug); `pb_msg_info` made SECURITY INVOKER → 1d, 1x, 1y, 3h FAIL ("permission denied for schema pb_msg") | (run from `work/mut`, not kept) |
| Archive writer (`node edge/msg-archive/test.mjs`) | **all pass** (14): python `zipfile.testzip()` clean, CRC-32 check value, UTF-8 names, deleted/edited text kept, offline-typed time noted, company time zone, no `<script>`, missing photo noted not fatal, 60 MB parts; `deno check index.ts` ok (msg-archive and pb-offsite) | `results/edge_msg_archive.txt` |
| App rig (`tests/t_msg.js`, 360 x 740, fake server) | **all pass (49)** (see list below) | `results/t_msg.txt`, `results/shots/` |
| Full regression | (filled in below) | `results/full_regression.log` |

SQL tests run every app call **as role `authenticated` with the person's JWT claims** (`set_config('role', ...)` inside
the call, the way PostgREST runs it), photo uploads/reads as real `insert`/`select` on `storage.objects` through the
policies, and statically check: every public `pb_msg_*` app function executable by authenticated, none by anon, no
private or service function by authenticated, **no SECURITY INVOKER function of ours callable by authenticated**, every
definer function pins `search_path`, schema/tables closed to the API, and **every function referenced by a `msg_*`
storage policy (pg_depend) executable by authenticated**.

App rig checks: Home card + unread chip (not yellow, 44 px+); list order; 5 tabs, Messages under Home; chat with
Edited / Message deleted; Send disabled + not yellow when empty, solid yellow when ready; Send/Photo/Info/box/options
44 px+; box above the tab bar; send with signal (phone's id, expect-uid); no signal: queued, "Waiting for signal", Home
"1 message waiting for signal", outbox saved in the records store (IndexedDB), sent when signal returns with the typed
time; a queued message survives an app restart and is sent once with the same id; photo resized ≤ 900 px JPEG (112 KB),
uploaded to `<company>/<chat>/<me>/<id>-1.jpg` before the message names it; foreman's Info read-only (no switch, no
archive), Mute; alert link opens its chat; edit own message; every text on the 4 screens has Spanish; office: Include
pipelayers OFF by default → on → "Pipelayers see" appears (From when added chosen) → Whole chat, both logged with name;
office tools (Download, Save archive now, Close chat with a question, Add a person, Take off); no decorative yellow on
Info; quiet hours 19:00-06:00 default and saved when changed; Keep messages: Forever, 13 months asks first; Settings
row; pipelayer: no job chat while not included, can't start one (plain words), can DM anyone; not in a company: no card,
no row; no page errors.

## Costs for keeping chats forever (numbers in PLAN.md section 8)
Measured busy job chat (5,400 messages, 300 photos): **one 36.5 MB ZIP** (text part 0.47 MB; a PDF of the text alone
would be about 0.35 MB and 133 pages, photos the same 36 MB either way). Keeping it: Supabase $0.0213/GB-month →
**$0.0008 a month** ($0.09 over 10 years); B2 copy $6.95/TB-month → **$0.00025 a month**. 1,000 such jobs: 36.5 GB
archives ($0 inside Supabase Pro's 100 GB, else $0.78/month) + $0.25/month B2 + 3.3 GB of message rows (measured 602 B a
message; inside the 8 GB included disk, else $0.41/month) + the live photos in `msg-photos` (36 GB, $0.77/month over
the included 100 GB). Photos are 95%+ of the cost.

## Apply order (lead; nothing done)
1. Read-only first: `select md5(pg_get_functiondef('public.pb_offsite_todo(integer)'::regprocedure))` =
   `45901ab80847fafa890d8532337ac31e` (03 checks it anyway and refuses otherwise).
2. Run the test blocks on live, each must end with the error `RESULT: n pass, 0 fail` (everything rolled back):
   `sql/tests/block_t01.sql` (63), `block_t02.sql` (14; if it stops at `create policy` with "must be owner of table
   objects", run it the way sec2's storage policies were applied), `block_t03.sql` (4). The blocks insert throwaway
   users/companies (plan `paid`, so the trial seat limit and the beta guard don't apply) and roll back. `pb_msg.no_kick`
   is set so no push or archive call goes out.
3. Apply `sql/apply/01_messaging.apply.sql`, then `02_storage.apply.sql` (storage owner path), then `03_offsite.apply.sql`.
4. Deploy `edge/msg-archive` (`--no-verify-jwt`; files index.ts, logic.mjs, zip.mjs) and `edge/pb-offsite/index.ts`.
5. Release the app with `patches/m1_messages.py` (on top of r17.16 A; `build.sh`). The app hides everything until the
   server answers `pb_msg_list` (a missing function → no card), so the app can ship first.
6. Backblaze: for 13-month companies, add a B2 lifecycle rule to delete `msg-archives/<company>/13m/` files after 400 days
   (Object Lock keeps them 396 days; nothing deletes B2 copies automatically today).
7. Undo: `sql/undo/99_undo_03.sql`, `99_undo_02.sql`, then `99_undo_01.sql` (read its header: it deletes messages).

## For Tommy's lawyer (notes only; legal docs not edited)
1. **Privacy Policy now says the opposite**: "We do not collect your contacts, messages, microphone audio or browsing
   history." (privacy.html, "What we don't collect"). With Messages it must say we store the messages and photos people
   send in the app's Messages (not phone texts or other apps' messages).
2. **Company owns the messages**: Terms 8.1 lists Company Data ("Jobs, runs, readings, photos, reports, permits, plans,
   notes…"): add "messages and photos sent in Messages, including direct messages between people in the company".
   8.3 (leaving a company): a removed person loses access to every chat at once, including their own direct messages;
   copies on their phone may remain.
3. **Not private from the company**: say plainly that job chats are visible to the office (company account, managers,
   PMs/supers) and, when included, pipelayers on the job; that direct messages are company records kept by the company
   (see decision 2 on whether the office can open them in the app); that the office can delete messages but the
   original is kept in the record and in the archive; edits keep earlier versions.
4. **Retention**: default kept as long as the company's account is open (like other records), plus the archive file and
   an off-site copy (B2, locked for 4 years); a company can choose "Delete after 13 months" (messages, photos and
   archives older than 13 months are deleted daily; backups and locked off-site copies roll off later, up to 396 days).
   Privacy section 6 ("How long we keep it") needs a Messages row.
5. **Crew notice** (shown when someone joins a company): one line that the company's messages are company records,
   readable by the office, kept per the company's retention setting. Not for emergencies: call.
6. **Notifications**: alerts can show the first 60 characters of a message on the lock screen unless the person turns
   that off (Message settings). Privacy "Notifications are sent only if you allow them" stays true; add the preview.
7. **Service providers**: messages and photos are stored by our hosting provider (Supabase) and copied to Backblaze B2;
   push alerts go through the phone maker's push service (Google, Apple, Mozilla, Microsoft) encrypted end to end.
8. **Acceptable use**: harassment, threats and unlawful content in Messages are the company's to police; we act on the
   account owner's instructions or a court order (matches Terms 8.3 wording).

## Decisions for Tommy (each with my recommendation)
1. **What the lock screen shows.** Built: `Job 1234 · Mike` + the first 60 characters; each person can switch the words
   off. Alternative: never show words. **Recommend: keep as built.** The preview is what makes it useful in the field;
   the switch covers the person who wants privacy.
2. **Can the office open direct messages?** You said the office can download "any chat's archive". Built: the office
   archives and downloads **job chats**; direct messages are kept as company records (database, backups) but the office
   cannot open someone else's DMs in the app. **Recommend:** let only the company account (not PMs/supers) download a
   DM archive, each download logged, and put one line at the top of every DM: "Direct messages are company records."
   (a small add-on; not built until you choose).
3. **Who is in a job chat.** Built: foremen who worked the job in the last 120 days or whom the office added; every PM
   and super of the company (the office is always in). Alternatives: every foreman in every job chat; PMs/supers only
   on the jobs they're assigned to. **Recommend: keep as built** (no noise from other jobs; the office adds anyone);
   revisit PMs-assigned-only when a company has more than 3 supers.
4. **Pipelayers switched off and on again.** Built: with "From when added", turning pipelayers back on adds them from
   that moment (they don't get back what they saw before). Alternative: remember the first time they were added.
   **Recommend: keep as built** (off means off; simplest to explain).
5. **Message photo limits.** Built: the existing daily cap (`storage_room`: 150 a day per person, 20 for the company
   account) plus a separate 2 GB per company ceiling for message photos (about 17,000 photos), not counted in the plan's
   10 GB. **Recommend:** count message photos in the plan's storage allowance (one number for customers) in the next
   billing change; keep 2 GB until then.
6. **Edits.** Built: the author can edit for 24 hours and delete any time; the office can delete any message; every
   version is kept. **Recommend: keep 24 hours** (enough to fix a typo, not long enough to rewrite history).

## Not built / follow-ups
- No live push into an open chat: an open chat checks every 15 s, the list every 15 s while on screen, Home every 20 s at
  most when shown. (Realtime would need the tables exposed to the API, and Realtime does not pass the session gate:
  security_nov22 finding 5.)
- Message photo uploads go through Storage, which the session gate (two-step code, device lock) does not cover
  (security_nov22 follow-up); same gap as run photos.
- Edits, deletes, chat info and settings need signal (they say so); only new messages queue offline.
- No search, read receipts, @mentions or typing dots. No Owner Dashboard change (nothing about messages is shown there).
- Spanish stays off (PB_ES_ENABLED false); new strings are in the dictionary. Message text is never translated.
- The app build stamp is unchanged (r17.16 A's); the lead stamps the release.

## Regression
(filled in below)
