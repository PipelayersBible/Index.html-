# speed2: phone speed (#51, #52, #53, #54), on r17.04

Nothing deployed, committed, pushed or changed live. Everything is in `tests/staged/speed2/`.
Base: `/home/claude/index.html-/index.html` and `sw.js` as of r17.04 (Nov 18). Build stamps are left at r17.04 (the
release step bumps them).

## How to apply

    tests/staged/speed2/apply_all.sh index.html sw.js <out>
      <out>/src/index.html   the patched one-file source (patches 01-05 in order)
      <out>/site/            what gets published: index.html (built, smaller), pbx/ (4 files), sw.js

| file | item | what |
|---|---|---|
| `patches/01_update_line.py` | #51 | "New version ready - Reload" line; watchdog recovery buttons |
| `patches/SW_01_cache_first_shell.py` | #51, #53 | sw.js: open from the kept copy, update behind it, recovery, lazily loaded parts kept offline |
| `patches/02_photo_store.py` | #52 | photos stored apart from Records; migration; verification; tidy |
| `patches/03_photo_clear.py` | #52 | offer to clear phone copies of photos already sent (setting) |
| `patches/04_records_room_warning.py` | #54 | the "about 5 MB" warning replaced by one based on `navigator.storage.estimate` |
| `patches/05_lazy_parts.py` | #53 | page side of lazily loaded parts (pdf.js, jsPDF in their own files) |
| `build/build.py` | #53 | the release build: parts to `pbx/`, scripts/CSS minified (no renaming) |

Anchors are narrow; shared code touched: `pbBigGet`/`pbBigSet` (Records storage), `loadRunArchive`, the
`JSON.stringify` line and the size warning in `saveRunArchive`, `pbRptCanonical` (two lines), `pbEnsurePdfjs` (one line),
the jsPDF loader, the boot watchdog, the push `message` listener block (code added after it), Settings > Preferences and
the Records top banners (one row each). Other helpers' patches that touch those spots may need re-anchoring.

**Deploy changes (decision 2):** publish `<out>/site/` (index.html + pbx/ + sw.js) in ONE commit. The source page stays
the thing that is patched and tested; `build.py` runs at release. It needs `esbuild` (here: ~/.npm-global/bin/esbuild
0.28.2) and node.

---

## #51 Open from the phone's own copy every time

**What it does now**
- The worker answers the app page from its kept copy at once (no 304 round trip, no 4 s wait on lie-fi). Behind it,
  it downloads the page whole (never a partial page), at most every 30 s; when the fingerprint differs it stores it for
  the next open, keeps the copy it replaced as the "previous copy", and tells every open app.
- The page shows a slim line above the tabs: **New version ready  [Reload]  ×**. It also asks the worker 3 s after
  start, whenever the app comes back to the foreground, and when a new worker takes over, so a crew that leaves the app
  open for days still sees it. Reload with unsaved typing on the screen asks first ("NOT been saved ... Reload Anyway").
- Never stranded:
  - no kept copy yet (first install, cleared cache): exactly the r17.01 path (network first, 4 s budget for the whole
    page, then the copy).
  - the boot watchdog (the screen shown when the app doesn't start) now has **Load the Newest Version** (`?pbfresh=1` =
    the r17.01 network-first path) and **Open the Previous Version** (`?pbprev=1`; shown when a worker controls the page).
    The previous copy becomes the kept copy again, and the broken page's fingerprint is remembered so that exact page is
    never stored again; the next release (different fingerprint) is offered normally.
  - a broken page still gets fixed on its own: the worker keeps checking behind it on every open.
- Only the app page itself (scope / index.html, any query) is answered from the copy; terms.html etc. as before.
- supabase-js: from its copy at once, refreshed behind it (no copy: r17.01 path).

**Trade-off:** with good signal a new release now appears one open later (or on Reload). A hotfix published WITHOUT a
build-stamp bump is stored but no line shows (the line compares build stamps). See decision 3.

**Measured** (`tests/m51_opens.js`: real HTTPS server like GitHub Pages - ETag/304, gzip - one bar = 400 kbps with
400 ms before each answer, 4x CPU, each open a fresh browser start on the same phone storage; ms from navigation start
to a usable Home; shared 2-core box with load average 10-14 from other helpers, so +-20 % noise and up):

| one bar, 4x CPU: ms to a usable Home | r17.04 (page + worker) | this release (built page + new worker) |
|---|---:|---:|
| cold first open, no worker yet (transfer-bound) | 49,400 (white until 12.6 s) | 29,768 (first paint 2.1 s) |
| reopen, app unchanged | 6,333 / 6,475 | 1,839 / 2,141 |
| reopen on lie-fi (bars, nothing answers) | 6,136 / 6,836 | 1,486 / 1,745 |
| first open after a new release | 5,814 / 6,500 | 1,444 / 1,772 |

(two runs each, run turn about with r17.04 so the box's load hits both alike; `tests/m51_opens.js 400 400 2`.) The reopen
gains are #51 (no round trip, no 4 s wait) plus #53 (a 5.1 MB page parses faster than 8.75 MB); the cold open is #53.

## #52 Photos stored apart from Records

**What it does now** (details in the header of `02_photo_store.py`)
- Every photo (any `data:` URL or bare base64 string of 2000+ characters anywhere in a record) is stored once in its
  own IndexedDB entry (`pb-photos`/`ph`, key = SHA-256 of the text); the Records text holds `pbph:1:<sha256>`.
  In memory nothing changes: records still hold their photos as data URLs, so the ~70 places that read photos (reports,
  PDFs, record export, cloud upload, seal, crew send, restore) are untouched.
- Save: `JSON.stringify` with a replacer writes the reference for photos already stored and verified (a Map from the
  photo text to its key; no copy of a photo is made). New photos (up to 6 per save) are stored, read back and compared
  before the Records text is written; every reference in a text is checked to exist and put back from memory if not.
- Load: references resolved in the parsed records in one read transaction. Every other reader of the stored text
  (conflict merge, account moves, office tools) gets the text with photos inside, as before.
- Migration: in the background 4 s after start, one photo at a time (store, read back, compare), then one ordinary save
  writes the short text atomically (the old text stays until then), then the written text is read back and compared
  with memory and every reference with the store. Any check failing: Records is written whole again (photos inline).
  Killed at any point: it continues on the next start (content-fingerprint keys, so a photo already there is reused).
  Storage full: it stops, removes what it wrote this time, and tries on the next start.
- Unreferenced photos are removed at most once a day, under the Records save lock, only when every Records text on the
  phone (each account, IndexedDB and localStorage) was read, and only 24 h after they were stored.
- Photo store unreadable at start-up: "Records Failed to Load" and saving blocked (never "no photos"). One photo missing:
  Records opens, that photo is missing, its reference is kept, a crash note is sent.
- Rolled back to r17.04: opens fine (separate database), shows references where photos were (missing pictures) and keeps
  them when it saves; back on the new build every photo is there.

**Clear phone copies of photos already sent** (`03_photo_clear.py`)
- Settings > Preferences: "Offer to clear sent photos from this phone after" 30 / **60** / 90 days / Never (per phone).
- Records shows "N sent photos can leave this phone" only when there are some; nothing happens until he confirms.
- A photo can go only if: it is in a run (not a permit, not a management report) of the account whose Records is open;
  the run ended, isn't the open run, wasn't restored from the cloud; it was locked AND ended more than N days ago
  (N >= 30, well past the 21 days in which office copies and sealed originals are still sent); and this phone's own
  upload log shows that exact photo file reached the company (`run-photos/<uid>/runs/<run>/<sha>.jpg`). Unsent photos,
  inline base64 fields and photos whose log entry was pruned always stay.
- Each cleared photo becomes a small picture "Photo kept by your company / Cleared from this phone <date> / SHA-256 ...",
  so every report, PDF and export keeps working and says where the photo is. The run keeps `_phoneCleared` (sha,
  picture sha, file path, time). The record fingerprint (rev) still counts the ORIGINAL photo, so it matches the
  company's sealed original. The save must succeed or everything is put back; the originals leave the photo store at once.

**Measured** (`tests/m52_laid_speed.js`: Records = 41 runs, 45.7 MB of text in r17.04's format, 82 distinct photos;
4x CPU; 3 laid marks each; the copies are 22+ days old so the crew-send/seal passes don't run in either build):

| one laid mark, 45.7 MB Records, 4x CPU | r17.04 | this release |
|---|---:|---:|
| main thread blocked after the tap (long tasks, avg) | 3368 ms (worst single 3.5 s) | 329 ms (worst single 0.2 s) |
| the save itself (saveRunArchive, avg) | 3688 ms | 132 ms |
| main thread blocked during the save | 2098 ms | 174 ms |
| written to IndexedDB per laid mark | 61 MB (45.7-91 MB) | 0.73 MB |
| stored Records text | 45.7 MB | 0.77 MB (+ photos, once each) |

Memory: records still hold photos in memory (unchanged; loading photos only when shown would be the next step).

## #53 Smaller download

`build/build.py` (also runs the checks: node --check on every minified script, no `</script` inside a script, same
number of scripts/styles, part fingerprints):

| | r17.04 | this release (built) |
|---|---:|---:|
| page, raw | 8.75 MB | 5.15 MB |
| page, gzip -9 (what Pages sends) | 2.40 MB (2,400,731 B) | **1.43 MB** (1,428,342 B) |
| pbx/pdfjs-3.5.141 + worker (cutsheet PDFs, plans viewer) | inside the page | 370 KB gz, own files, kept across releases |
| pbx/jspdf-2.5.1 + autotable | inside the page | 127 KB gz, own files, read right after load |

- Install / update on one bar (400 kbps): ~48 s of transfer -> ~29 s for the page (the parts follow after the app is up;
  they only change when the libraries change).
- Minification: whitespace, comments and syntax only, target es2020 (the source already uses `??`), utf8. **No renaming**
  (crash reports keep function names; full renaming would save ~94 KB gz more: decision 4). The ES5 boot watchdog is
  left as written. The build stamp and the crew-notice version keep their source form (the worker, Settings and the test
  runner read them from the page text).
- Offline after the first load: the worker keeps the parts (`pb-lazy-v1`) when it stores a page; the page also keeps them
  itself (Cache Storage) and reads its own copy first, so they work offline even without a worker (the test rig blocks
  workers; `office/p3_viewer_offline.js` passes on the build). jsPDF: read into the page 1.5 s after load; a PDF made
  before that reads it synchronously (from the worker's copy).
- Left inline: the toolbox-talks JSON (43 KB gz) and the PDF fonts inside the main script (~75 KB gz).

## #54 "Records is getting large, about 5 MB"

With Records in IndexedDB (since r16.47) the warning now comes from the browser's own figures: once per session, when this
app's storage is 85 % used or has under 100 MB left: "This phone's storage for the app is getting full (90% used, about
191 MB left). Once it's full, new runs will stop saving. Delete old runs you don't need from Records, or clear phone copies
of photos already sent." No estimate available: no warning (no guessing). Records still in localStorage (no IndexedDB on
that phone): the old 4 MB rule and wording, true there. Checked at most every 10 min, after the save. (The Stats "about
5 MB" warning is unchanged: Stats really are in localStorage.)

---

## Tests

Own tests (`tests/`; `run_speed2.sh <site> <r17.04 index.html> <r17.04 sw.js> <out> [port]` runs them all; the site is a
build made with `build.py --hooks` or the patched source):

SPEED2_RESULTS

Bug found and fixed by these tests: p06 caught two Records writes running at the same time (each storing new photos)
sharing one global RegExp's `lastIndex` across awaits, which corrupted the second text. Fixed (each write uses its own
RegExp) before the final runs.

Full regression (`tests/run_all.sh --jobs 2`):

REGRESSION

Golden files that change on purpose (proposed new files in `tests/expect_updates/`, after reading each diff):
EXPECT_UPDATES

## Risks

- #52 is a storage format change. Mitigations above (verify-before-replace, resumable, whole-text fallback, rollback
  readable). Residual: a phone whose photo store is wiped separately from Records (not something browsers do on their
  own: both live in the same origin's IndexedDB) loses those photos; Records itself still opens.
- Old builds after the move show missing pictures (data intact). Don't roll back below this release once it shipped
  unless needed; if so, the photos come back with the next forward release.
- Photos still live in memory once loaded: start-up time and memory with a huge Records are unchanged (decision-free next
  step: load photos only when shown).
- #51: a release reaches a phone one open later unless Reload is tapped. The line compares build stamps: always bump them.
- #53: deploy is "build, then publish index.html + pbx/ + sw.js together". A page published without its pbx/ files would
  lose PDF making (jsPDF) on phones that never kept them. `build.py` fails loudly if esbuild is missing.
- The HTTPS test helper uses a self-signed test certificate valid until Dec 18 2026 (`tests/cert.pem`, copied from the
  perf audit rig); renew it after that (s02, m51).
- Timings come from a shared, heavily loaded 2-core box; relative differences are far outside the noise, absolute numbers
  are not phone numbers.

## Decisions for Tommy (at most 5)

1. **Clear sent photos: default 60 days** (choices 30 / 60 / 90 / Never; never automatic, always asks). Recommendation: 60.
2. **Publishing becomes "build, then push"**: the tested one-file source stays the master; `build.py` makes the smaller
   page + `pbx/` at release. Recommendation: yes (it is what makes 2.40 -> 1.43 MB possible).
3. **Urgent fixes reach phones one open later** (or on Reload). Option later: a "must reload" flag in a release that makes
   the app reload itself when it is on Home with nothing typed. Recommendation: not now; use the line.
4. **Minify without renaming** (keeps crash reports readable; full renaming would save ~94 KB gz more).
   Recommendation: keep it readable.
5. **Approve the changed golden files** (t07_sw: the second tab now shows the kept build and the parts are kept;
   t09_bigweek: Records text is ~1 MB instead of ~56 MB because the test copies one run's photo references; critic
   w3/w4: the new Settings row). Recommendation: approve.

## DONE
