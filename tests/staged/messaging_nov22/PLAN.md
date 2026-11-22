# Company Messages: plan (staged Nov 22 2026)

Tommy's ask: "internal company messages so people can talk about things directly". Later the same day: "give the
options for the supers to include pipe layers and the option to let them see the entire chat history".
Nothing here is applied, deployed or published. Server read only (SELECTs on live, Nov 22).

## 1. Who talks to whom

Two kinds of conversation, both inside one company only. A person is in exactly one company (live: `company_members`
has `UNIQUE (user_id)`), or is the company account (`companies.owner_user_id`).

| Kind | Who can read and write |
|---|---|
| **Job chat** (one per job: company + job key, same key the app already uses, `pb_prod.job_key(job_number)`) | **The office, always**: the company account, managers (`pb_reports.managers`), PMs and supers (`company_members.role = 'pm'`). **Foremen on the job, always**: a foreman who filed work on that job in the last 120 days (production entry, run record or job book/site log, the same 120 days the app's job list uses) or whom the office added. **Pipelayers only when the office turns on "Include pipelayers"** for that chat (default OFF): pipelayers who filed work on the job, are on the crew of a foreman in the chat (`pb_prod.crew_links`, live link), or whom the office added. |
| **Direct message** (1-on-1) | The two people, any roles, both in the same company. A pipelayer can message anyone in the company. |

- Once on a job chat a person stays on it (like any group chat) until the office takes them off, they leave the
  company, or (pipelayers) the office turns "Include pipelayers" off.
- **Removed from the company = no access at once**: every check reads `company_members` / `companies` at the moment of
  the call (no cache, no grace). Messages queued on their phone are refused (`pb:not_in_chat`) and stay on the phone.
- **Nobody outside the company, ever**: every read and write compares the chat's company with the caller's company now.
  The app owner's Owner Dashboard shows nothing from messages (not even counts are added there).
- **Pipelayer history** (only when pipelayers are included; the office chooses per chat): **"From when added"**
  (default): a pipelayer sees messages sent after they were added (stored as the chat's message number at that moment,
  not a clock time). **"Whole chat"**: they see everything. Turning pipelayers off takes their access away again;
  turning it back on adds them again from that moment.
- Every change of these switches and every add/remove is logged (`pb_msg.chat_log`: who, what, old, new, when) and
  shown on the chat's info screen.

## 2. Data model (`pb_msg` schema, private: no API access; the app only calls `public.pb_msg_*` functions)

| Table | What |
|---|---|
| `chats` | id, company, kind (job/dm), job key + number, dm pair (a < b), `include_pipelayers` (default false), `pipelayer_history` ('from_added' default / 'all'), last message number + time, closed at/by |
| `people` | roster per chat: user, state (`in` / `out` = taken off by the office / `off` = pipelayers switched off), how (auto/office/dm/creator), `since` + `since_seq` (when added), changed by/at |
| `messages` | id, chat, company, `seq` (1, 2, 3 ... per chat), author + name at the time, `client_id` (the phone's id, makes a re-send harmless), body (≤ 4,000 chars), photos (≤ 6: storage path, bytes, sha256, size), sent at, typed at (phone), edited at, deleted at/by, version |
| `message_versions` | every earlier version of a message (edit or delete), written by a trigger, insert only |
| `reads` | last message number each person has seen per chat (unread counts) |
| `mutes` | per person per chat |
| `person_prefs` | message alerts on/off, show words on the lock screen on/off, quiet hours on/off, from, to (default 19:00 to 06:00) |
| `company_settings` | retention: `forever` (default) or `13m`; who/when; `company_log` keeps every change |
| `chat_log` | every switch change, add/remove, close/reopen, archive request |
| `archives` | one row per archive: chat, reason (closed/office/idle), state, file path(s), bytes, sha256, counts |
| `push_pending` | the one waiting alert per person per chat (several messages fold into one alert) |
| `purge_log` | what retention deleted (counts only) |

Records rules (like B9): `messages` and `message_versions` refuse DELETE / TRUNCATE (`pb:history_is_permanent`) except
the retention job, which sets `pb.allow_record_delete = 'on'` for its own transaction. Only the edit/delete fields of a
message can change, the version must go up by one, and the old version is copied first. All of them get the admin log
trigger (`pb_audit.direct_write`) like the other record tables.

Photos: new private bucket `msg-photos`, path `<company>/<chat>/<author>/<message client id>-<n>.jpg`. Resized on the
phone exactly like run and note photos (longest side 900 px, JPEG 0.72, about 80-150 KB). Upload policy: the author's
own folder, still allowed to post in that chat, chat open, and the existing daily photo cap
(`pb_billing.storage_room(uid, 'msg-photos', 150)`: 150 a day for a crew member, 20 for the company account, from
`pb_billing.plan_limits`) plus a 2 GB per company ceiling for message photos. Read policy: only someone who can see the
message that carries the photo (a deleted message's photos are hidden). No update/delete policy: nobody can overwrite.

## 3. Server functions (all `SECURITY DEFINER`, `search_path = ''`, EXECUTE only for `authenticated`, each checks `auth.uid()` and `p_expect_uid`)

`pb_msg_list`, `pb_msg_people`, `pb_msg_open_job`, `pb_msg_open_dm`, `pb_msg_fetch`, `pb_msg_send`, `pb_msg_edit`,
`pb_msg_delete`, `pb_msg_read`, `pb_msg_info`, `pb_msg_set` (Include pipelayers / history; office only),
`pb_msg_person` (office adds/takes off), `pb_msg_mute`, `pb_msg_prefs_set`, `pb_msg_company_set` (retention; company
account and managers), `pb_msg_close` (office), `pb_msg_archive_request` (office), `pb_msg_archives` (office).
Storage policy helpers `pb_msg_photo_put_ok(name)`, `pb_msg_photo_can_view(name)`, `pb_msg_archive_can_view(name)`
(EXECUTE for `authenticated`: policies run as the caller; this morning's live bug was a policy calling a function
`authenticated` could not run; the SQL tests check every function a new policy uses).
Service only (`pb_push.is_service()`): `pb_msg_svc_archive_next`, `pb_msg_svc_archive_done`, `pb_msg_svc_purge_list`,
`pb_msg_svc_purged`. Cron: `pb_msg.sweep()` (close job chats idle 120 days and queue their archive; retention purge;
re-queue stuck archives), daily.

Edits: the author, within 24 hours. Deletes: the author any time, the office any time (moderation). Others then see
"Message deleted"; every version stays in `message_versions` and in the archive. Rate limit: 500 messages per person a day.

## 4. Alerts

- Existing push system: a row in `pb_push.outbox` (type `message`, added to its type list), sent by `push-send`
  unchanged. The `pb_push_out_type` check gets `'message'`; nothing else in `pb_push` changes.
- **What the alert says** (decision): title `Job 1234 · Mike` (a direct message: `Mike`), body the first 60 characters
  of the message ("Photo" for a photo alone). Why: the payload is encrypted end to end (Web Push, RFC 8291), so only
  the phone can read it; the risk is the lock screen. For crews the preview is the whole point: it tells a man with
  gloves on whether to stop. 60 characters is enough to tell "pipe truck here" from "call me", short enough not to put a
  whole conversation on a lock screen. Each person can switch **"Show message words on the lock screen"** off: then the
  alert is `Messages` / `New message in Job 1234 from Mike`. Nothing about the message is ever put in the alert after it
  is deleted or read (a waiting alert is cancelled when the person opens the chat).
- Folding: several messages in one chat before the alert goes out make one alert ("3 new messages. Last: ...").
- **Mute** per person per chat. **Quiet hours** per person, default ON 7 PM to 6 AM, in the job's local time (the
  company's time zone, `pb_pm.settings.tz`, the time zone the office already set for the morning email; a direct
  message uses the person's own phone time zone when the app has it). An alert due in quiet hours waits until the end
  of quiet hours (one folded alert), it is not lost; opening the chat before then cancels it.
- Not for emergencies: the Messages screen says "For an emergency, call." Emergency flows stay as they are.

## 5. Keeping chats: the archive file

Messages are kept in the database (forever by default). When a job chat is closed (by the office, or automatically
after 120 days with no message), or whenever the office taps **Save archive now**, the `msg-archive` edge function
writes the whole chat into **one ZIP file**:

```
Job-1234-chat-2026-11-22.zip
  README.txt          what this is, how to open it, sha256 of every file
  transcript.txt      every message, oldest first, plain text (opens on anything, forever)
  transcript.html     the same with the photos shown inline (opens in any browser, no internet, no scripts)
  chat.json           everything, machine-readable, including every earlier version of edited/deleted messages,
                      the people list and the switch log
  photos/0001-....jpg every photo at its stored size (not re-compressed)
```

Why ZIP + text/HTML rather than PDF: the photos are 95%+ of the size either way (they are already JPEG; a PDF stores the
same JPEG bytes), the text compresses about 8:1 in ZIP, ZIP is readable by every computer made since 1995 and is an
ISO/IEC 21320 archive format, plain text and HTML need no special reader in 10 years, and a PDF of a long chat is
hundreds of pages that someone has to scroll. The edge function makes it without any library (stored + deflate,
CRC-32 checked). Measured sizes and costs: section 8 and NOTES.md.

- Saved to the private bucket `msg-archives` at `<company>/<keep|13m>/<chat>/<time>-<id>.zip` (archives over 60 MB
  are split into numbered parts; that is about 450 photos).
- Copied off-site like run photos and sealed records: `pb_offsite_todo` lists `msg-archives`, `pb-offsite` copies it
  to Backblaze B2 with Object Lock: 4 years for a "keep forever" company, 396 days for a 13-month company.
- The office downloads any chat's archive from the chat's info screen (signed link, 10 minutes).
- **Retention** (company setting, office: company account and managers): **Keep forever** (default) or **Delete after
  13 months**. With 13 months, a daily job deletes messages (and their versions) older than 13 months, their photos and
  archives made more than 13 months ago (files through the Storage API by the edge function: live storage refuses SQL
  deletes). Every change of the setting is logged.

## 6. Phone: offline, screens, design

- **Offline**: the chat list and the last 200 messages of each of the 40 most recent chats are kept on the phone (same
  per-account storage as Records: IndexedDB through `pbGetFor/pbSetFor`; photos stored apart like run photos). A
  message typed with no signal goes into the phone's message outbox at once (shown "Waiting for signal"), photos
  included, and is sent when signal is back (online event, app open, every 60 s while waiting). The phone's id makes a
  second send harmless. Refusals (removed from company, chat closed) are shown on the message and kept.
- **Where it lives** (no 6th tab): a **Messages card on Home** (all company people) with the unread count, and a
  **Messages screen** under the Home tab. Why not a tab: the bar already has 5 (Home, Calculators, More, Reports, Ask);
  a 6th at 360 px makes every tab under 60 px wide with gloves, and the alert opens the chat directly anyway.
- Screens: Messages (list: job chats then direct messages, unread first), Chat (messages, photo, send), Chat info
  (people, Include pipelayers, Pipelayers see, change log, Mute, office tools: Add person, Take off, Save archive now,
  Download archive, Close chat), Message settings (alerts, lock screen words, quiet hours; office: Keep messages).
- **Yellow rule**: solid yellow only on **Send** when there is something to send (the next step). The message box has
  no yellow outline (nothing has to be filled in to use a chat); the unread count is a plain white/grey chip; a chosen
  option on the message screens (Pipelayers see, Keep messages) is shown inverted, not yellow, because nothing is
  waiting for a decision there. Every button and row 44 px or more.
- **Spanish**: every new string has a Spanish line in `pbI18nDict` (Spanish stays switched off). Message text itself is
  never translated (`data-noi18n`).

## 7. Files

`sql/01_messaging.sql` (schema, functions, push type), `sql/02_storage.sql` (buckets + policies; owner of
`storage.objects` needed, see NOTES), `sql/03_offsite.sql` (`pb_offsite_todo` lists msg-archives, md5-guarded), tests
`sql/tests/block_t0N.sql` (rolled back, `RESULT: N pass, M fail`), undo `sql/undo/`. `edge/msg-archive/` (writer +
zip + tests), `edge/pb-offsite/index.ts` (lock days for msg-archives). `patches/m1_messages.py` (app), `tests/t_msg.js`.

## 8. Costs (measured archive sizes; prices read Nov 22 2026)

Prices: Supabase Pro file storage 100 GB included, then **$0.0213 per GB-month**; database disk 8 GB included, then
**$0.125 per GB-month** (supabase.com/pricing). Backblaze B2 **$6.95 per TB-month** = $0.00695 per GB-month, no
minimum storage duration (backblaze.com/pricing). A message photo is about 120 KB (900 px JPEG 0.72; the rig's test
photo came out at 112 KB).

Measured (`edge/msg-archive/test.mjs`, the real archive writer on a made-up busy job chat):

| A busy job chat, 6 months: 5,400 messages (30 a day), 300 photos | Size |
|---|---|
| transcript.txt | 562 KB raw, 131 KB in the ZIP |
| chat.json (everything incl. versions) | 1.48 MB raw, 186 KB in the ZIP |
| **the whole archive file (README, manifest, txt, html, json, 300 photos)** | **36.5 MB (34.8 MiB), one file, made in 1.3 s** |
| the same chat with no photos | 0.47 MB |
| for comparison: a PDF of the same transcript text alone | about 0.35 MB, 133 pages (photos would add the same 36 MB) |

| Keeping it | Per busy job | 1,000 busy jobs (100 a year for 10 years) |
|---|---|---|
| archive in Supabase Storage | $0.0008 a month ($0.09 over 10 years) | 36.5 GB: $0 inside the included 100 GB, else $0.78 a month |
| archive copy in B2 | $0.00025 a month | $0.25 a month |
| messages in the database (measured 602 B a message with indexes) | 3.3 MB | 3.3 GB: inside the included 8 GB, else $0.41 a month |
| the live photos in `msg-photos` (same bytes as the archive) | 36 MB | 36 GB: $0.77 a month over the included 100 GB |

So keeping every chat forever costs cents a month even for a large company; photos are 95%+ of it.
