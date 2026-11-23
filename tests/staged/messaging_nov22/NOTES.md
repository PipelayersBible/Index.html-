# Company Messages (staged Nov 22 2026) — notes

Tommy's ask: "internal company messages so people can talk about things directly", plus (later the same day) "give the
options for the supers to include pipe layers and the option to let them see the entire chat history".
Round 2 (lead, Nov 22 evening, Tommy's answers): 45 preview YES; 46 DMs: company account only, every download logged,
"Direct messages are company records" on every DM — **built**; 47 CHANGED to "anyone who's been assigned to the same job"
— **built** (below); 48, 50 YES; 49 message photos in the plan's storage allowance — **built** (`sql/04`). The app patch
is **rebased onto `tests/staged/r1716_final/work/index.src.html`** (md5 8255756f…, r17.16 · 2026-11-23; it applies
unchanged; `BASE=…/r1716_candidate/work/A sh build.sh` still builds on A). r1716_final was still being built by another
helper: if it changes, re-run `build.sh` (the patch is exact-once and fails loudly if an anchor moved).
Design and numbers: `PLAN.md`. **Nothing was applied, deployed, committed or published.** Live Supabase was only read
(SELECTs, function definitions, edge function source). `r1716_candidate/work/A/index.src.html` was copied, not edited.

## What was built

| Part | Files | What it does |
|---|---|---|
| Server | `sql/01_messaging.sql` | `pb_msg` schema (13 tables, RLS on, no API grants), records guards (no delete/truncate, versions kept by trigger, admin-log trigger), who-is-in rules, 18 app functions + 3 storage-policy helpers (all SECURITY DEFINER, `search_path=''`, EXECUTE only for `authenticated`), 4 service functions, alerts into `pb_push.outbox` (type `message` added to its check), quiet hours, folding, daily `pb_msg.sweep()` (pg_cron 09:17 UTC) |
| Storage | `sql/02_storage.sql` | private buckets `msg-photos` (JPEG, 3 MB) and `msg-archives` (ZIP, 100 MB); insert/select policies; no update/delete policy |
| Storage allowance | `sql/04_storage_allowance.sql` | `pb_billing.storage_room` (md5-guarded replace, live text kept for undo) sums `msg-photos` with the other photo buckets against the plan's allowance; drops 01's 2 GB ceiling |
| Off-site | `sql/03_offsite.sql`, `edge/pb-offsite/index.ts` | `pb_offsite_todo` also lists `msg-archives` (md5-guarded replace, live text kept for undo); B2 Object Lock 4 years (keep forever) or 396 days (13-month company) |
| Archive writer | `edge/msg-archive/` (`index.ts`, `logic.mjs`, `zip.mjs`, `test.mjs`) | one ZIP per chat: README (sha256 of every file), manifest, transcript.txt, transcript.html (photos inline, no scripts), chat.json (every version), photos at stored size; 60 MB parts if bigger; uploads, reports back; 13-month purge of files through the Storage API |
| App | `patches/m1_messages.py` + `patches/m1/{messages.js,messages.css,screens.html}` | Home card (unread chip), Messages, Chat, Chat info, Message settings, Settings row, outbox, photos, alert link `#/messages/<chat>`, 122 new Spanish strings + 10 patterns |
| Tests | `sql/tests/t0N.plpgsql` → `block_t0N.sql` (`python3 sql/tests/mk.py`), `sql/local/run_local.sh`, `tests/t_msg.js` + `tests/msgsrv.js`, `edge/msg-archive/test.mjs` | see Results |
| Undo | `sql/undo/99_undo_04.sql`, `99_undo_03.sql`, `99_undo_02.sql`, `99_undo_01.sql` (in that order) | 01's undo deletes every message: its first block alone only cuts the app off and keeps them |
| Build | `build.sh` | `work/index.src.html`, `work/build/` (publish), `work/build_hooks/` (tests) |
| Golden updates | `test_updates/tests/expect/` (3 files), `test_updates/verify.sh` | copy over `tests/` with the release commit that ships Messages |

### Who is in a chat (enforced in `pb_msg.jq` / `pb_msg.qual` / `pb_msg.can_read`, read at every call)
- Job chat = **everyone assigned to the job** (Tommy, answer 47). There is no "assign a crew to a job" screen in the app
  today, so "assigned" is read from what the app does assign per job: **PMs/supers**: `pb_pm.job_pms` (the job page's
  PM/super assignment, not ended); **foremen**: open inspection/test items assigned to them on that job
  (`pb_daily.items.foreman_uid`, status open), crew runs on that job assigned to them (`pb_prod.entries.assigned_to`,
  last 120 days), dailies the office filled in for them on that job (`pb_daily.reports.for_foreman`, 120 days).
  **Plus the company account and managers, always**, plus anyone the office adds to the chat.
- **Nobody assigned → fallback**, said on Chat info in plain words: foremen who filed work on the job in the last 120
  days ("Nobody is assigned to this job, so the foremen who worked it in the last 120 days are in."); and when no
  PM/super is assigned, every PM/super ("No PM or super is assigned…"), the same rule job alerts use today
  (`pb_pm.job_alert_recipients`). Each side falls back on its own. A PM/super is in only on jobs they're assigned to
  whenever any PM/super is assigned to that job.
- Membership follows assignments at every call: unassigned = out; assigned again = in; the fallback ends the moment
  someone is assigned (tested: 3m, 3m2, 3n). An office add keeps a person in regardless; the office can take anyone off
  except the company account and managers.
- Pipelayers: **only while the office has "Include pipelayers" on** (default OFF), and only those on the job: on the
  crew of a foreman who is in the chat, filed work on it, or added by the office. "Pipelayers see": **From when added**
  (default) or **Whole chat**; turning it off takes access away at once, on again adds them from that moment. Every
  change is logged and shown on Chat info.
- Runs the chat (switches, people, close, archive, delete others' messages): the company account, managers and the
  PMs/supers in that chat.
- Direct message: the two people, any roles. **Company records**: every DM thread shows "Direct messages are company
  records." at the top; only the **company account** sees "Direct messages (company records)" on the Messages screen
  (names and message counts, never the text; it cannot open the thread), can save a DM archive and download it.
- **Every archive download is logged** (job or DM): the app calls `pb_msg_archive_download` (who, when, which file →
  `pb_msg.downloads`, and "downloaded an archive" in the chat's Changes, so the two people in a DM see it); the storage
  rule (`pb_msg_archive_can_view`) opens the file only to that person for 15 minutes after a logged download.
- Removed from the company: nothing, at once (no cache, no grace), including their own DMs. Nobody outside the company
  can read, post, DM or be added. A company that is not active: read yes, post no.

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
| SQL, local throwaway Postgres 16 (`sql/local/run_local.sh`; one_device + security stubs + ours) | `block_t01` **RESULT: 74 pass, 0 fail** (incl. assignment rules, fallback, assignment changes, DM records, logged downloads); `block_t02` **14 pass, 0 fail**; `block_t03` **4 pass, 0 fail**; `block_t04` **5 pass, 0 fail** (storage allowance); each apply file run twice: ok; undo 04, 03, 02, 01: nothing left (storage_room, off-site list and outbox check back to the live text) | `results/sql_local.txt` |
| SQL mutation check (that the tests can fail) | grant on `pb_msg_photo_can_view` revoked → 4a and 4i-4l FAIL ("permission denied for function pb_msg_photo_can_view", the same shape as this morning's live bug); `pb_msg_info` made SECURITY INVOKER → 1d, 1x, 1y, 3h FAIL ("permission denied for schema pb_msg") | (run from `work/mut`, not kept) |
| Archive writer (`node edge/msg-archive/test.mjs`) | **all pass** (14): python `zipfile.testzip()` clean, CRC-32 check value, UTF-8 names, deleted/edited text kept, offline-typed time noted, company time zone, no `<script>`, missing photo noted not fatal, 60 MB parts; `deno check index.ts` ok (msg-archive and pb-offsite) | `results/edge_msg_archive.txt` |
| App rig (`tests/t_msg.js`, 360 x 740, fake server), on the r1716_final base | **all pass (55)** (see list below) | `results/t_msg.txt`, `results/shots/` |
| Full regression (r1716_final base) | pass 208, FAIL 14, skip 15 of 237: 11 are r1716_final's own (identical on its build), 3 mine and intended or fixed (see Regression); golden updates verified 3/3 | `results/full_regression.log`, `results/base14.log`, `results/rerun7/`, `results/test_updates_verify.log` |

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
no row; no page errors. Round 2 adds: Chat info says who is in (assigned / the fallback), every DM thread shows
"Direct messages are company records." (not on job chats), Download asks the server first (logged) for job and DM
archives, the company account's "Direct messages (company records)" list (names, counts, Save archive / Download),
hidden for everyone else.

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
   `sql/tests/block_t01.sql` (74), `block_t04.sql` (5; read-only check first: `md5(pg_get_functiondef('pb_billing.storage_room(uuid,text,integer)'::regprocedure))`
   = `9975ba51a21d2f2443b8d570e4b6d960`), `block_t02.sql` (14; if it stops at `create policy` with "must be owner of table
   objects", run it the way sec2's storage policies were applied), `block_t03.sql` (4). The blocks insert throwaway
   users/companies (plan `paid`, so the trial seat limit and the beta guard don't apply) and roll back. `pb_msg.no_kick`
   is set so no push or archive call goes out.
3. Apply `sql/apply/01_messaging.apply.sql`, then `02_storage.apply.sql` (storage owner path), then `03_offsite.apply.sql`,
   then `04_storage_allowance.apply.sql`.
4. Deploy `edge/msg-archive` (`--no-verify-jwt`; files index.ts, logic.mjs, zip.mjs) and `edge/pb-offsite/index.ts`.
5. Release the app with `patches/m1_messages.py` (on top of r17.16 A; `build.sh`) and copy `test_updates/tests` over
   `tests/` in the same commit. The app shows nothing until the server answers `pb_msg_list` with `member: true`, so the
   app can ship before or after the server part.
6. Backblaze: for 13-month companies, add a B2 lifecycle rule to delete `msg-archives/<company>/13m/` files after 400 days
   (Object Lock keeps them 396 days; nothing deletes B2 copies automatically today).
7. Undo: `sql/undo/99_undo_04.sql`, `99_undo_03.sql`, `99_undo_02.sql`, then `99_undo_01.sql` (read its header: it deletes messages).

## For Tommy's lawyer (notes only; legal docs not edited)
1. **Privacy Policy now says the opposite**: "We do not collect your contacts, messages, microphone audio or browsing
   history." (privacy.html, "What we don't collect"). With Messages it must say we store the messages and photos people
   send in the app's Messages (not phone texts or other apps' messages).
2. **Company owns the messages**: Terms 8.1 lists Company Data ("Jobs, runs, readings, photos, reports, permits, plans,
   notes…"): add "messages and photos sent in Messages, including direct messages between people in the company".
   8.3 (leaving a company): a removed person loses access to every chat at once, including their own direct messages;
   copies on their phone may remain.
3. **Not private from the company**: say plainly that job chats are visible to everyone assigned to the job, the
   company account and managers and, when included, pipelayers on the job; that direct messages are company records: the
   company account can save and download any direct-message thread, each download is logged and shown to the two people;
   that the office can delete messages but the original is kept in the record and in the archive; edits keep earlier versions.
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

## Decisions for Tommy
Answered Nov 22 (lead): 45 preview YES (as built); 46 DM archives for the company account only, logged, banner — built;
47 changed to "everyone assigned to the same job" — built; 48 pipelayer re-add YES (as built); 49 message photos in the
plan's storage allowance — built (`sql/04`); 50 24-hour edits YES. New ones from round 2:
1. **Foremen have no job assignment screen.** "Assigned" for a foreman is read from inspection items, assigned crew runs
   and office-filled dailies on that job; a company that uses none of those gets the fallback (foremen who worked it in
   120 days). **Recommend:** add "Foremen on this job" next to "PMs and supers" on the job page (same pattern as
   `pb_pm.job_pms`), and read it here first. Until then, the office can add a foreman to the chat from Chat info.
2. **No PM/super assigned → every PM/super is in** (the same rule job alerts use today). Strictly "only jobs they're
   assigned to" would leave such a job's chat with no PM at all. **Recommend: keep the fallback** (Chat info says so).
3. **Owner Dashboard storage figures** don't include message photos yet (the dashboard is not changed: no message data
   there). **Recommend:** add the `msg-photos` byte total to the dashboard's storage line with the next dashboard change
   (a count only, never contents).

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

## Regression (round 2, on the r1716_final base)
`tests/run_all.sh --build work/build_hooks/index.html --jobs 2 --out results/regression`: **pass 208, FAIL 14, skip 15
of 237** (`results/full_regression.log`). The same 14 run on **r1716_final's own build** (`results/base14.log`): **11 fail
there too with byte-identical output** (t127_billing0, t99_removed, critic/w1-w4, new/a7, new/f06_breakend (known flaky),
office/a1_ask, a3_stake, b3_owner) — r1716_final's own changes, not Messages (w1 differs from the base run only by the 4
new screen ids). The 3 that are mine: office/s1_smoke and sync/t03_roles (a company account now calls `pb_msg_list`,
intended) and offline/rig/t02_day ("server calls" 23 vs 22: the first `pb_msg_list` sometimes landed before the test cut
the signal; it was never an offline call — `pbMsgCanAsk` needs `navigator.onLine`). **Fixed**: the first messages call
now waits 8 s after the account loads (never competes with records on a weak signal). Re-run of the affected 7 on the
fixed build (`results/rerun7`): t02_day, t00b, t06_hash match their old goldens; s1_smoke, t03_roles, w1 differ as
intended; t99_removed fails as on the base. Golden updates (`test_updates/`, 3 files: w1, s1_smoke, t03_roles) verified on
a copy of tests/: **3/3 pass** (`results/test_updates_verify.log`). The full 237 were not re-run after the 8 s change; the
rig test (55/55) and the 7 were. Round 1 (on candidate A): pass 213, FAIL 9, all explained, kept in git history of this file.

## DONE
