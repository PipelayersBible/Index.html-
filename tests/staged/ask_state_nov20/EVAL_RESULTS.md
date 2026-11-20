# Ask state-aware build: eval on ai-next (Nov 20 2026) — IN PROGRESS

- Unpatched local source builds byte-for-byte to live `b4ad91749f6f` (sha256 equal, with stamp 1117-0225).
- Patched source: Deno 36 passed, 0 failed.
- Build 1 `f452a27f6053` (stamp 1120-1624, repo commit c1dc549): run `1120-1625-ai-next-2243`, 36 nw+sa cases: 35 pass, sa10 fail (no "Kentucky"). $2.05.
- Tuned state.ts (plan-state line), build 2 `66c743680d2f65c948aedbf677a089bc9182a7152bfc2f648e02efb03b9de338`
  (stamp 1120-1631, repo commit 7e19b1f) is what is on slot `next` now. sa10 re-run `1120-1631-ai-next-4c2f`: pass, $0.01.
- `live` untouched (b4ad91749f6f). KB fix not applied. No edge function deployed. 10 eval cases sa1-sa10 inserted.
- Rest of the full set running: `1120-1632-ai-next-00cf`.
