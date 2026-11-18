# notify-report (v9, Nov 17 2026) and feedback-notify (v7, Nov 17 2026)

Both now answer only calls that carry the cron secret header `x-pb-push-secret` (vault `push_cron_secret`), like
push-send, pb-backup, pb-offsite and pb-seal-check. Before the header check, anyone with the project URL could make owed
emails go out early (no data was ever returned).

Change in each function's index.ts, right after the POST check and before anything else:

```ts
function same(a: string, b: string) { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
// in Deno.serve, after `if (req.method !== 'POST') return empty();`
const given = req.headers.get('x-pb-push-secret') || '';
if (given.length < 16 || given.length > 200) return empty();
const s = await rpc('pb_push_svc_cron_secret', {});
if (!s.ok || typeof s.data !== 'string' || !same(given, s.data)) return empty();
```

notify-report's logic.ts is unchanged from v8. The full deployed source can be read with the Supabase
`get_edge_function` tool (slugs `notify-report`, `feedback-notify`).

Server side (migration `notify_kicks_send_secret_nov17`): `pb_reports.kick()` and `pb_billing.feedback_kick()` now read
`push_cron_secret` from the vault and send it in the header (same pattern as `pb_backup.offsite_kick`).

Verified Nov 17: `pb_reports.kick()` call ran ("notify-report: rounds 0 …" in the function log); a call without the
header returned 204 and did nothing.
