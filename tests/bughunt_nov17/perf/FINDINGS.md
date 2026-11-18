# Performance audit: cheap phone, weak signal (r16.97, Nov 17 2026)

Folder: /tmp/claude-0/audit/perf/  (index.html + sw.js = live r16.97 copies; base/ = untouched copy served for the rig;
new/ = patched copy). Nothing under the repo was edited; nothing deployed, applied, committed or pushed.

## Rig
- rig/srv.js: one server on port 8884, plain HTTP (repo regression) and HTTPS on the same port. Mimics GitHub Pages:
  gzip, ETag/Last-Modified, `Cache-Control: max-age=600`, 304 on If-None-Match. Network shaping is done IN THE SERVER
  (`/__net?kbps=400&rtt=400`, `hang=1` = lie-fi) because CDP network throttling does not reliably cover requests made by
  the service worker. supabase-js (fake, padded to ~35 KB gz) and *.supabase.co come from the same server, so they
  cost a weak link too.
- rig/perf.js: Playwright Chromium, phone viewport, CDP `Emulation.setCPUThrottlingRate` (4x / 6x), the real service
  worker on https://app.pipelayersbible.com/<variant>/ (host-resolver-rules -> 127.0.0.1:8884, test cert pinned by SPKI
  so the HTTP cache works; no Playwright routes, since any route switches the HTTP cache off). Page marks: FCP,
  DOMContentLoaded, "Home interactive" (pbGoto defined + Home's New Run button visible), long tasks.
- "Weak" = 400 kbps down, 400 ms RTT. The page is 8.68 MB (2.39 MB gzipped): ~48 s of pure transfer at 400 kbps.

## Measurements (baseline r16.97)
(First passes; the clean before/after tables are in `## DONE`. Early runs overlapped other work, so they are noisy;
the conclusions below were each re-checked.)

- Cold first open on one bar, no worker yet (4x CPU): white screen ~12-16 s (FCP), usable Home at ~50-60 s. Almost
  all of it is the 2.39 MB transfer; nothing cheap fixes a first install except a smaller page (see decisions).
- Reopen within 10 min: the HTTP cache (GitHub Pages max-age=600) answers, no network: Home ~3.7-5 s at 4x CPU, all
  of it CPU (parse + start-up script + style).
- Reopen later, app unchanged: one 304 round trip, then the same CPU cost.
- Reopen after a NEW BUILD was published, one bar: **~51-62 s to a usable Home, white for 13-16 s**, every time a
  release lands, even though the worker holds a good copy. See finding 2.
- Lie-fi (bars, nothing answers): the 4 s wait, then the copy (~7 s at 4x). Offline: the copy at once.

## 1. Start-up spends most of its script time asking each form field for its labels  [severity: high]
Where: Batch 10 A accessibility script (index.html ~line 10294), hasName() / addRunCtx(): `el.labels`.
Repro: rig/prof.js base load 1 (CDP CPU profile): hasName = 914 ms self time of ~1.9 s of script at desktop speed;
rig/lbl.js: `el.labels` for the 435 controls on Home = 410 ms (Chromium walks the whole document per control). The
same scan runs again (MutationObserver) for every screen that adds fields: New Run, hubs, Records, crew view.
Why it's wrong: x4-6 on a cheap phone that is seconds of frozen start-up for an attribute nobody sees.
Fix: patches/01_a11y_labels_map.py: one label[for] lookup per scan pass, same semantics as el.labels.
(tested: yes, rig/a11y_same.js: every control's aria-label / aria-labelledby / aria-describedby / for / role is
identical before and after on Home, Review, New Run with 4 hubs and Records; start-up long tasks 613 -> 202 ms at 1x.)

## 2. A new release on a weak signal = ~1 minute of white / unusable app, every time  [severity: high]
Where: sw.js pbNetFirst(): the 4 s PB_NET_WAIT_MS race is against the network's HEADERS, not the page.
Repro: rig/t_sw_budget.js base: new build, 400 kbps / 400 ms RTT, 4x CPU -> usable Home at 61.6 s (FCP 15.8 s).
Headers arrive in <1 s, so the worker hands the page a 2.4 MB stream that trickles in for ~50 s while the good copy
sits unused. Also hits whenever the phone's HTTP cache has dropped the page.
Why it's wrong: the wait was meant to cap a bad network at 4 s; on one bar it caps nothing. A foreman opening the app
at the trench after a release waits a minute (an open permit's screens are behind that too).
Fix: patches/02_sw_whole_page_budget.py (on sw.js): the 4 s now covers the whole page. Whole in 4 s -> shown (newest
app with signal, as before; unchanged app = quick 304, as before). Not whole in 4 s -> the kept copy, while the
download finishes in the background and replaces the copy for the next open. 404/5xx, no answer, supabase-js: as
before. (tested: yes, rig/t_sw_budget.js swnew: weak + new build -> Home 12.3 s on a loaded machine (base 61.6 s),
old build shown; the next open shows the new build; good signal shows a new build at once; lie-fi and offline open
the kept copy.)

## 3. Every save copies all of Records once more just to word a message  [severity: medium-high with photos]
Where: saveRunArchive() attemptWriteUnderLock: `new Blob([json]).size` (and saveStatsLog).
Repro: rig/prof.js base laid 1 (Records with photos): Blob = 419 ms of ~1 s main-thread time for one laid mark.
Why it's wrong: a 70 MB second copy on the main thread per laid mark / note / Lock, for a number only shown in two
messages.
Fix: patches/03_archive_save_no_blob_copy.py: size from json.length (base64 photos are 1 byte/char).
(tested: yes, rig/prof.js p04.html laid 1: Blob gone, laid-mark busy time ~1.0 s -> ~0.45 s at 1x; repo regression.)
Side note (not perf, not patched): the ">4 MB: Records is getting large (… of about 5 MB total). Once it's full, new
runs will stop saving" alert dates from localStorage days; since r16.47 Records live in IndexedDB, so anyone with
photos (70 MB) gets a false "getting full / will stop saving" alert once per session. Worth rewording (owner).

## 4. jsPDF + AutoTable run at every start-up  [severity: low-medium]
Where: the two bundled <script> blocks at lines 136 and 538 (~400 KB).
Repro: rig/jsb2.js: evaluating them costs 44 ms at 1x, 160-240 ms at 4-6x (first run), at every start.
Fix: patches/04_jspdf_on_first_use.py: kept as inert text (like pdf.js already is) and run the first time anything
reads window.jspdf (a getter), synchronously, so every caller sees what it saw before; still works offline.
(tested: yes, rig/t_jspdf.js p04.html: not run at start-up; the offline run report PDF has identical text.)

## Load measurements, final batch (rig/loads2.js; files rig/final/loads_*.json)
One bar = 400 kbps / 400 ms RTT, served gzip like Pages, the HTTP-cache copy already stale (an open more than 10 min
after the last one). "Home" = ms from navigation start to a usable Home. base = r16.97, new = all patches.
The machine is a shared 2-core box (other agents' test runs were going), so single numbers carry +-20 % noise;
the big effects are far outside it.

| Scenario (one bar)                       | base 4x | new 4x | base 6x | new 6x |
|------------------------------------------|--------:|-------:|--------:|-------:|
| A cold first open, no worker (FCP)        | 13.1 s  | 13.9 s | 16.4 s  | 13.0 s |
| A cold first open, no worker (Home)       | 53.4 s  | 55.0 s | 58.4 s  | 53.8 s |
| B reopen, app unchanged (304)             | 4.2 s   | 3.1 s  | 6.5 s   | 4.5 s  |
| C reopen after a NEW BUILD                | 54.6 s  | 6.1 s  | 55.9 s  | 7.6 s  |
| D lie-fi (bars, nothing answers) *        | 7.6 s   | 2.7 s  | 10.1 s  | 5.3 s  |
| E offline (Playwright offline) **         | 8.6 s   | 7.3 s  | 9.5 s   | 8.1 s  |
| start-up long tasks, B (sum)              | 2.7 s   | 1.9 s  | 4.7 s   | 2.7 s  |

\* D in "new" ran inside the 60 s quick window that C's late page opened (pbSlowUntil), so it skipped the 4 s wait;
outside that window it is 4 s + start-up, as before.
\** Under Playwright's offline emulation the worker's fetch hangs instead of failing, so the copy comes at the 4 s
wait (respEnd ~4.4 s in both). On a phone in airplane mode the fetch fails at once and the copy is immediate (the
code path is unchanged by the patches). Not a regression; noted as a rig limit.
Cold first install (A) is transfer-bound (2.39 MB at 400 kbps): only a smaller page helps (decision 4).

## In-app measurements (rig/inapp.js, 4x CPU, files rig/final/inapp_*_4_p60.json)
450 ft run, 10 ft interval, 4 hubs (92 rows on the sheet). Records = the open run + 30 finished runs with photos.
The 200-photo / 70 MB Records could NOT be held by the rig: the page stalled for >6 min building/loading it on this
shared 8 GB box (an OOM kill was logged for another headless Chrome). So the photo numbers below are for 60 photos
(22 MB of Records); every save cost scales with the Records size, so at 200 photos (~70 MB) expect ~3x these.
That a desktop-class Chrome struggles to hold 70 MB of Records is itself the warning for a 2-3 GB phone (decision 3).

| Action (4x CPU)                                   | base             | new              |
|---------------------------------------------------|-----------------:|-----------------:|
| Open, empty Records -> usable Home                | 4.1 s (lt 3.3 s) | 2.8 s (lt 1.8 s) |
| Tap New Run -> screen painted                     | 0.29-0.54 s      | 0.43-0.86 s (*)  |
| Review & Calculate (450 ft, 4 hubs)               | 0.22-0.33 s      | 0.24 s           |
| Laid mark, Records = 1 run                        | 0.10-0.18 s      | 0.10-0.18 s      |
| Open with 22 MB Records -> usable Home            | 4.8 s            | 3.6 s            |
| JS heap after load with 22 MB Records             | 74 MB            | 118 MB (**)      |
| Laid mark, 22 MB Records (each)                   | 1.8 / 3.0 / 2.4 s| 2.2 / 1.2 / 1.6 s|
| Two laid marks 0.3 s apart, 22 MB Records         | 6.2 s            | 2.4 s            |
| Open Records (31 records)                         | 0.75 s           | 0.83 s           |
| Type 6 letters in Records search                  | 2.2 s (lt 1.1 s) | 1.5 s (lt 0.3 s) |
| Run report PDF (open run)                         | 1.3 s            | 1.5 s (first use loads jsPDF) |
| Run report PDF (a run with 2 photos)              | 1.1 s            | 0.9 s            |
| Pipelayer: open -> Home / Crew list / grade sheet | 4.0 s / 0.12 s / 0.09 s | 3.0 s / 0.11 s / 0.08 s |
| Storage used (22 MB Records)                      | 45 MB            | 45 MB            |

(*) New Run: repeated runs (rig/nr.js) give base 0.29-0.34 s vs new 0.43-0.45 s, but a CPU profile of the same tap
(rig/prof.js newrun) shows the a11y work going from 57 ms to ~0 and the rest is style/layout ("(program)") that
swings by +-100 ms between runs on this shared box; nothing in the patches touches New Run's layout. Treat New Run as
unchanged within noise. (**) heap: the GC had not run yet at that sample (heap_after_marks 113 vs 159 MB, heap_end
60 vs 196 MB swing the other way); heap here mostly = the 22 MB Records text held 2-3x (string + parsed objects +
the save's JSON), which no patch changes.
Start-up script (CPU profile at 4x, rig/prof.js load, twice each): hasName + addRunCtx 550-635 ms -> ~10 ms.
A laid mark with photos is still 1-2 s at 4x with 22 MB and would be ~3-6 s with 70 MB: what remains is
JSON.stringify of all of Records + one IndexedDB write of all of it, per mark. Not cheaply fixable: decision 3.

## DECISIONS FOR THE OWNER

1. Ship the service-worker change (patch 02)?  Recommendation: YES, in the next release.
   What changes for a user: on a weak signal, the first open after a release shows the app he already had (in ~4 s
   plus start-up) instead of a minute of white, and the new release is there on the following open. With good signal
   nothing changes (the new release still shows at once). Trade-off: on a weak signal a crew may run the previous
   build for one more open after a release. If a release ever must reach phones at once (a grade-math fix), say so in
   the release and have them reopen with signal; or (below) add an "update ready" line.
   Gain: first open after each release on one bar ~51-62 s -> ~5-12 s to a usable Home.

2. Later, a full "stale-while-revalidate" app shell + a small "New version ready - Reload" line?  Recommendation:
   yes, after patch 02 has been out a week. The kept copy is shown at once on every open (no 304 round trip, no 4 s
   lie-fi wait), the network refresh happens behind it, and the page shows a line when a newer build was stored.
   Gain: every warm open ~0.5-1.5 s faster on one bar; lie-fi opens 4 s faster. Cost: ~0.5 day (sw.js + a banner +
   a test). Trade-off: even with good signal the new build appears one open later unless he taps Reload.

3. Store photos as separate IndexedDB entries (Records text holds only a photo id)?  Recommendation: yes; the
   biggest remaining field-speed and memory problem once a phone has a few weeks of photos.
   Today every save (each laid mark, note, Lock, End, sent flag) re-serializes and rewrites ALL of Records, photos
   included: 70 MB with 200 photos, i.e. a 70 MB string built on the main thread and a 70 MB IndexedDB write per laid
   mark (flash wear too), and every start-up parses all 70 MB into memory (heap +140 MB on a phone that may kill the
   tab around 300-500 MB). With photos stored apart: a save writes ~0.1-0.5 MB, start-up parses ~0.5 MB, photos load
   when shown (report, PDF, upload, export).
   Gain: a laid mark with 22 MB of Records costs 1.2-2.2 s at 4x CPU even after patch 03 (measured; ~3-6 s at
   70 MB by scaling), with photos stored apart it would cost about what it costs with an empty Records (0.1-0.2 s).
   Start-up with 22 MB of Records 3.6 s vs 2.8 s empty; heap -50 to -150 MB depending on photo count.
   Cost: ~3-4 days with care: a one-time migration (old Records -> text + photo store, with the old copy kept until
   the new one verifies), the ~70 places that read entry.photos[].url (PDF, run report, cloud upload, seal, export /
   backup / restore, crew send), delete/cleanup of orphan photos, the multi-tab revision lock, tests. Risk: data loss
   if the migration is wrong, so it wants its own bug hunt.

4. Make the page smaller (a build step)?  Recommendation: yes, before the user count grows.
   The page is 8.68 MB (2.39 MB gzipped): a first install on one bar is ~48 s of transfer alone, and so is every
   release download. Measured with esbuild here: minifying the main script alone 1.61 -> 1.06 MB gzipped (-0.55 MB,
   ~-11 s on one bar, and less to parse); serving the bundled pdf.js (0.37 MB gzipped) as its own file that the
   worker caches and keeps across releases (it never changes) saves another ~7 s per release. Together ~2.39 ->
   ~1.45 MB gzipped (~29 s instead of ~48 s on one bar). Cost: ~1-2 days (a build script that keeps the one-file
   source as is, the worker caching 2-3 files instead of 1, offline tests). Trade-off: deploys become "build then
   push" instead of copying one file; source maps for crash reports.

5. Reword the stale "Records is getting large (… of about 5 MB total). Once it's full, new runs will stop saving"
   alert?  Recommendation: yes (wording only). Since r16.47 Records live in IndexedDB; anyone with a few photos
   (>4 MB) gets this false alarm on the first save of every session. Either drop it, or base it on
   navigator.storage.estimate() (usage vs quota). Not changed here because the right threshold is your call.

Not recommended: lowering PB_NET_WAIT_MS below 4 s. With patch 02 the wait only matters on lie-fi and on a release
download that is still coming; 4 s keeps "newest app with signal" for anything faster than ~5 Mbps.

## Regression
- Page patches 01+03+04 together = /tmp/claude-0/audit/perf/p04.html (each patch also applies alone to r16.97);
  sw.js patch 02 = /tmp/claude-0/audit/perf/sw_p02.js. Syntax: main script, the a11y block, the lazy loader and the
  inert jsPDF text all pass `node --check`.
- Repo tests t90, t91, t95, t101-t124, t126 (port 8884, regress/regB vs regress/regA): all exit 0 on both, outputs
  identical apart from times, photo hashes and a time-width shift in two truncated strings (t117, t120).
- tests/bughunt_nov17/* (all 110 files incl. the cs2/office2/pdfs folders other agents added today; the offline/rig
  scripts excluded: they need their own 8877 server): 48 pass on the patched page; the other 62 fail in exactly the same
  way on the unpatched r16.97 (debug hooks such as window.__ev / __dbg that the hunters' own pages had, or tests
  written against pre-fix pages). Same exit code and PASS/FAIL counts base vs patched for every one
  (regress/cmp.sh). The service worker isn't exercised by these tests (the rig blocks workers); patch 02 is covered by
  rig/t_sw_budget.js.
- Patch tests (each fails on r16.97, passes patched): rig/a11y_same.js (patch 01: el.labels reads at start-up
  1226 -> 0, every name/role identical), rig/t_sw_budget.js (patch 02), rig/t_saveblob.js (patch 03),
  rig/t_jspdf.js (patch 04).

## DONE
Before/after (4x CPU unless noted; one bar = 400 kbps / 400 ms RTT; shared 2-core box, +-20 % noise):

| What                                                    | before (r16.97)  | after (patches 01-04) |
|---------------------------------------------------------|-----------------:|----------------------:|
| First open after a release, one bar -> usable Home      | 54.6 s (6x 55.9) | 6.1 s (6x 7.6)        |
| ...white screen (FCP) in that case                      | 14.3 s           | 4.5 s                 |
| Reopen, app unchanged (304), one bar -> Home            | 4.2 s (6x 6.5)   | 3.1 s (6x 4.5)        |
| Start-up script in a11y naming (CPU profile)            | 550-635 ms       | ~10 ms                |
| el.labels reads at start-up                             | 1226             | 0                     |
| Open, empty Records -> Home (fast net)                  | 4.1 s            | 2.8 s                 |
| Open with 22 MB Records -> Home                         | 4.8 s            | 3.6 s                 |
| Laid mark, 22 MB Records (avg of 3)                     | 2.4 s            | 1.7 s                 |
| Two laid marks 0.3 s apart, 22 MB Records               | 6.2 s            | 2.4 s                 |
| Archive-sized Blob copies per save                      | 1                | 0                     |
| jsPDF + AutoTable run at start-up                       | yes (160-240 ms) | no (on first PDF)     |
| Records search, 6 keystrokes (long tasks)               | 1.1 s            | 0.3 s                 |
| Cold first install, one bar (transfer-bound)            | 53-58 s          | 54-55 s (unchanged; decision 4) |
| Offline / lie-fi open                                   | copy shown, as before | copy shown, as before |

Summary: the weak-signal problem was not "every open waits 4 s": an unchanged app costs one quick 304 and lie-fi costs
the 4 s wait, as designed. The real hit was the first open after every release, where the worker's 4 s cap covered
only the headers and a one-bar phone then sat ~55 s on a trickling 2.4 MB page while a good copy was cached; patch 02
caps the whole page at 4 s and refreshes the copy in the background (about 9x faster). On the CPU side, start-up and
every screen that adds form fields spent most of their script time in the accessibility namer's `el.labels` calls
(patch 01); every save made a needless full copy of Records (patch 03); jsPDF ran on every start (patch 04). What's
left is structural: the 2.4 MB page (cold install ~50 s on one bar; decision 4: build step, ~-40 %), and Records
rewriting every photo on every laid mark (1-2 s per mark at 22 MB, several seconds at 70 MB, plus memory; decision 3:
photos as separate IndexedDB entries, ~3-4 days). Nothing was deployed, applied, committed or pushed; nothing in the
repo was edited. Perf rig servers: srv.js on 8884 (a second instance on 8894 was used only for profiling and is
stopped).
