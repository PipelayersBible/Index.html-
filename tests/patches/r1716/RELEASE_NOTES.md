# r17.16 · Nov 23, 2026 (published Nov 22 night)

Tommy's Nov 22 decisions plus the staged review fixes. Built in `tests/staged/r1716_final/` (NOTES.md has every patch).

## App
- **New look** (variant Bx): long titles wrap to at most 2 lines; Station/Distance toggle fix. Start work stays where it was on Home.
- **Field Conditions fixes** (field_nov22, 8 patches).
- **Billing and trial end** (b1–b4): plan wording "Individual or Company", trial line, read-only after the trial, owner billing tools.
- **Emergency** (p1–p4): sewer-gas line now says "(often hydrogen sulfide, H2S)" in English and Spanish; "the bucket hit the line"
  answer; "Not an emergency? Send to Ask"; Spanish 911 interpreter line.
- **Decision 56:** foremen and pipelayers don't see the company price, the $1-a-sheet plan-reading price or the company AI
  allowance; they see "Company plan: your company pays for it." (display only; the server still sends prices).
- **Decision 21:** "Crew hours by day" (button, titles, CSV file name).
- **Decision 11:** join links work for 72 hours.
- **Decision 22:** Washington jobs offer only weekly toolbox talks; an existing every-2-weeks schedule switches on the next change.
- Decision 12: admin@pipelayersbible.com was already the only address; nothing changed.

## Server (applied Nov 22 night)
- billing_nov22 01 (test block 74 pass, 0 fail on live first). Undo: billing_nov22/sql/99_undo_01.sql.
- r1716_final 11: join links 72 hours (test block 13 pass, 0 fail on live first). Undo: r1716_final/sql/99_undo_11.sql.
- Ask build 7aba8d8e9560 on next, smoked (sewer smell EN/ES, gas, a cover question), then live. Rollback: cdddf51b34db.

## Tests
- Focused: field 39/39, design 32/32, records 25/25, billing 51/51, emergency UI 25/25, decisions 33/33, emergency cases all OK.
- Full regression: 208 pass, 14 fail, 15 skip. 13 are intended changes (expected outputs updated in this commit, 13/13 pass
  against the build); 1 is the f06_breakend time-of-day flake (fails the same on r17.15).
- Live index.html md5 6a5381a8fcb7caf4e2fb9c405df40057.

## Open
- Website FAQ still says join links last 24 hours: change to 72.
- Tommy to confirm: hiding the plan-reading price from crew; WA note wording.
