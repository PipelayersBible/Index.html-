# r17.17 · Nov 23, 2026

- **Foremen on this job** (Tommy approved Nov 23): a card under "PMs & supers on this job" on the job page, plus a Foremen
  item in Edit Job. The company account and managers add; the company account, PMs and supers take anyone off; other managers
  only themselves. Only current foremen, up to 20 per job; a foreman who changes role or leaves comes off automatically.
  Loads with signal (holds emails, not kept on the phone). Built in tests/staged/foremen_job_nov23 (NOTES.md).
- Server: foremen_job_nov23 01 applied Nov 23 (test block on live first: 25 pass, 0 fail, app calls as role authenticated).
  Undo: tests/staged/foremen_job_nov23/sql/undo/99_undo_01.sql (keeps the saved lists).
- Tests: focused t_foremen 26/26 on the stamped build; full regression on the unstamped build 222 pass, 0 fail, 15 skip;
  smoke subset on the stamped build 12/12.
- Live index.html md5 cdd873b34f0df17019e0366903b220aa.
- Messaging (not live) now uses this list first for job chats.
