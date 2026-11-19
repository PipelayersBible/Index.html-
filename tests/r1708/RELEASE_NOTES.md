# r17.08 — Phone speed (live Nov 19, 2026, commit 5ecba41)

## What changed for crews
- **Opens at once.** The app opens from the phone's own copy, even with one bar or bad signal. The newest version downloads in the background. When it's ready, a "New version ready – Reload" line shows. Reload asks first if something typed isn't saved.
- **Laid marks save fast with lots of photos.** Photos are stored on their own, not inside Records. With 45 MB of Records, a laid mark froze the screen for 3.4 s; now it's 0.33 s.
- **Clear sent photos (optional).** Settings: "Offer to clear sent photos from this phone after" 30 / **60** / 90 days / Never. Records offers it; nothing is cleared without a tap. Only photos the company already has are offered, and a "Photo kept by your company" picture takes each one's place.
- **Smaller download.** 2.45 MB → 1.48 MB. The PDF tools (pdf.js, jsPDF) are separate files that are kept on the phone and work offline after the first use.
- **Storage warning** uses the phone's real storage figures (85 % used, or under 100 MB left).
- **"App didn't start" screen:** two buttons, Load the Newest Version and Open the Previous Version.

## Measured (loaded 2-core test box, 4x slower CPU, one bar)
| | before | after |
|---|---:|---:|
| Reopen → usable Home | 6.3–6.5 s | 1.8–2.1 s |
| Bad signal (bars, nothing answers) | 6.1–6.8 s | 1.5–1.7 s |
| First open after a release | 5.8–6.5 s | 1.4–1.8 s |
| Laid mark, 45.7 MB Records: frozen | 3.4 s | 0.33 s |

## Release process from now on
- The master source is `_src/index.html` (Jekyll skips `_` folders, so it isn't published: checked, 404 live).
- Patch and test `_src/index.html`; `tests/release_build.sh` writes the published `index.html` (minified, function names kept) and `pbx/`. `--hooks <dir>` makes the test build for `run_all.sh`.
- Publish `index.html` + `pbx/` + `sw.js` in one commit. Bump `PB_APP_BUILD` (in `_src/index.html`) and `PB_SW_BUILD` (sw.js) together: the Reload line compares them.

## Decisions taken (Tommy can change)
1. Clear-sent-photos default 60 days.
2. Build-then-push publishing (yes).
3. Urgent fixes reach a phone one open later unless Reload is tapped (no forced reload for now).
4. Minify without renaming (readable crash reports).
5. Golden updates approved: t07_sw, t09_bigweek, critic w3/w4 (+ NORMALIZE for pbx names and quota).

## Tests
- Full regression on the r17.08 build: 216 pass, 0 fail, 0 flaky, 15 skipped (of 231).
- speed2 photo tests p01–p09 (kill mid-move, storage full, two tabs, rollback, damage, outputs unchanged, clear rules, room warning): all pass. Worker tests s01, s02: pass.
- Live check: sw.js and the page say r17.08; pbx files serve 200; `_src/` is 404.

## Risks
- Rolling back below r17.08 after photos have moved shows them as missing pictures (data intact; back on the next forward release).
- The HTTPS test certificate in tests/r1708/speed2/tests expires Dec 18 2026.
