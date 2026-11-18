# Sync area findings (r16.88)

## Run photos past the first 20 (or any photo whose upload fails once) never reach the company  [severity: high]
Where: pbRrSend (line ~63408) + pbRrPhotosUp (line ~63064)
Repro: tests/t01_photos_retry.js (a locked run with 25 photos: 20 upload, the other 5 never do, however many passes run). Same path when signal drops mid-upload or one upload errors.
Why it's wrong: pbRrPhotosUp returns "more" and pbRrSend sets `again`, but it also marks the run sent (`sent[t.id] = t.h`). The next pass only looks at runs whose hash changed, so the run is never picked again and the remaining photos stay on the phone only, until the run happens to be edited. The office PDF then silently misses those photos (r16.75 promise: every photo goes to the company).
Fix: patches/01_photos_owed.py (tested: yes, tests/t01_photos_retry.js)

## The Terms sheet covers a live confined space permit (and its emergency panel)  [severity: medium]
Where: pbTermsCheck / pbTermsShow (line ~63299), run from every screen change and a 60 s timer
Repro: tests/t02_terms_permit.js (lock a permit, then the phone finds its Terms agreement isn't current: the full-screen sheet, z-index above everything, covers the active permit screen until someone ticks the box and taps I Agree, or logs out)
Why it's wrong: it happens to every phone at the first screen change after an app update that brings a new Terms version (or the r16.78 update itself, or after localStorage is cleared), including phones with a permit open and people inside. The attendant can't see readings, the timer or the EMERGENCY button until he deals with a legal form; "Log Out" is the other button. Lock This Phone already refuses while a permit is open for the same reason. (pbMfaCheck's sheet has the same shape after a reload; left alone because it is a login security gate, flagged for the owner.)
Fix: patches/02_terms_not_over_permit.py (tested: yes, tests/t02_terms_permit.js; repo t105_terms.js still passes)

## A reinstalled / second phone re-seals every restored run as a new "sealed original" (made from a copy with no photos)  [severity: medium]
Where: pbRrSealPass (line ~63127) + pbRunRestore / pbRrMarkSent (line ~63423)
Repro: tests/t04_restore_seal.js (restore one finished run from the account, run the seal pass: a new PDF is uploaded to run-seals and pb_run_seal_add is called, though nobody edited the run)
Why it's wrong: which runs are already sealed is remembered only on the phone (`<uid>:rrSeals`). After "Restore Runs From Your Account" (asked automatically on a new phone) every finished run of the last 21 days is marked sent, has no entry in rrSeals, and so is sealed again from the restored copy, which has no photos. The office then sees it as the newest version, first in the list, under "Made on the crew member's phone when the run was finished, and again after each edit": an edit that never happened, and a photo-less "original" ahead of the real one. Server pb_run_seal_add doesn't dedupe on seal_key (checked read-only), so nothing stops it.
Fix: patches/03_restore_no_reseal.py (tested: yes, tests/t04_restore_seal.js; an edit made on the new phone is still sealed as the next version)

## Editing a restored run on a new phone wipes the photo list from the company's copy  [severity: medium]
Where: pbRunRestore (line ~63499, `delete o.pbOffice`) + pbRrOfficeCopy (line ~63055)
Repro: tests/t05_restore_photos.js (the account's copy lists 2 photos; restore it, change the run's notes, the next pb_prod_run_record_put carries pbOffice.photos = none and photosLeftOut = 0)
Why it's wrong: the restored run has no photo data and the restore drops the office copy's photo list, so the first edit on the replacement phone (a note, a laid mark, a Send Back fix) uploads a new current version that says the run has no photos. The office PDF and photo count for that run lose every photo, although the files are still in run-photos. (Older versions are kept server-side, but the app shows the current one.)
Fix: patches/04_restore_keeps_photo_list.py (tested: yes, tests/t05_restore_photos.js). Patch 01's "photos owed" check skips these carried-over entries (marked r: 1), so apply 01 with it.

## Notes (checked, no bug filed)
- Role screens: as a pipelayer (rig co_pl.js) the URL hash never opens an office screen (tests/t06_hash.js: all land on Home). pbGoto from the console reaches empty shells only (tests/t03_roles.js); data comes from RPCs.
- Server side (read-only selects): run-photos / run-seals storage policies let only the owner insert under his own uid folder, and read is limited to the owner, the run's company managers (pb_prod.managed_company) and the pipelayer's current foreman (crew_links). pb_run_seals_list, pb_run_mine_page, pb_prod_run_clock, pb_prod_run_record_put all key on auth.uid(); none is executable by anon. pb_run_seal_add does not dedupe on seal_key (see finding 3).
- localStorage keys that are not per-account are display preferences only (theme, pbResCols, pbDocsArea, pbHereState ...). One to consider: 'pbAiPrivacyAck' ("Before You Use AI") is per phone, so a second account on the same phone never sees that notice. Not patched (owner's call).
- pbMfaCheck's code sheet can also cover a live permit after a reload; left alone because it is a login security gate.
- "Not sent" on Home / the Log Out sentence (pbUnsentGroups) doesn't count run records, run photos or sealed copies still waiting; by design nothing is shown to the crew about them, so not filed.
- sw.js: read through; network-first with a kept copy, old caches dropped only after the page is carried forward. Nothing found.

## DONE
Four confirmed bugs, each with a patch (patches/01..04, every one applies on its own to r16.88 and all four apply together; the patched copy is cur.html, syntax-checked) and a test that fails before and passes after (tests/t01, t02, t04, t05; URL=http://127.0.0.1:8864/orig.html runs a test against the unpatched build). Highest: run photos past the first 20, or any photo whose upload fails once, never reach the company because the run is already marked sent. Then: the Terms sheet covering a live confined space permit; restored runs being re-sealed as a new photo-less "original" on a reinstalled phone; and an edit on a restored run wiping the photo list from the company's copy. The repo's own t102_seal.js and t105_terms.js still pass on the patched copy. Not covered in depth: the production / daily report / ticket offline queues (only read, not driven in the rig) and a true two-account switch in the browser rig (the fake Supabase has one fixed user; checked by reading the key scheme instead).
