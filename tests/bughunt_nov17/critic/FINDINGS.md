# Critic findings (real bugs met while walking the app; the critique itself is in CRITIQUE.md)

## Pre-lock review says "No warnings — data looks clean." for a stake that is a full foot wrong  [severity: medium]
Where: review screen render, line 22654 (`<div class="pb-clean">No warnings — data looks clean.</div>`)
Repro: t/t_c01.js. New Run, 8", start stake read by AI (103.40, C-3.61, rod 4.36), end stake read by AI as C-2.83 at "high" confidence when the stake says C-3.83. Review & Calculate.
Why it's wrong: the end invert is 1.00 ft high (101.43 instead of 100.43) and the slope is 0.54% instead of 0.21%; both are believable, so no check fires and the screen states the data "looks clean". The app cannot know that, and on a grade screen the wording invites the foreman to skip the comparison. (The only other gate is one tap on "I Checked Them".)
Fix: patches/01_review_clean_wording.py (tested: yes, t/t_c01.js fails on cur.html, passes on fixed.html; node --check passes). Wording only; the real fix (ask for a rod shot on a second stake when values came from AI) is in CRITIQUE.md section 3.

## DONE
One confirmed finding with a tested wording patch: the pre-lock review calls a run "clean" when an AI-read cut is a full foot wrong (no check can catch it without a second rod shot). The critic's main output is CRITIQUE.md in this folder; the larger problems found there are design and business issues (no independent check on AI stake values, no low-slope check, the live grade sheet living on one phone, no storage.persist() call, about 100 production releases in four days, 86 screens for a one-person beta), not single-line bugs, so they are argued there and not patched here. Nothing under the repo was changed; the server on port 8865 served only this folder's copy.
