// EXCERPT of the live weather-alerts/logic.ts (version 6, read Nov 20 with get_edge_function), for testing the patch
// only: the lines the patch touches, copied exactly, around a cut-down runOnce (the per-run forecast work is left out;
// with no runs due, or a refused pb_wx_due, the live function runs exactly these lines). NOT for deploying.
export type Deps = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ ok: boolean; status: number; data: any }>;
  get: (url: string) => Promise<{ status: number; json: any }>;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log?: (...a: unknown[]) => void;
};
export type Counts = { runs: number; jobs: number; locations: number; fetched: number; failed: number; flagged: number; pushes: number; sent: number; dropped: number };
export async function runOnce(deps: Deps): Promise<Counts> {
  const c: Counts = { runs: 0, jobs: 0, locations: 0, fetched: 0, failed: 0, flagged: 0, pushes: 0, sent: 0, dropped: 0 };
  const t0 = deps.now();
  const due = await deps.rpc('pb_wx_due', { p_now: new Date(t0).toISOString() });
  const runs = due.ok && due.data && due.data.ok && Array.isArray(due.data.runs) ? due.data.runs : [];
  for (const run of runs) {
    c.runs++;
    const kind = run.kind === 'week' ? 'week' : 'eve', local = String(run.local_date || '');
    const outlooks: any[] = [], pushes: any[] = [], jobs = 0, failed = 0, budget = false, partial = false;
    const fin = await deps.rpc('pb_wx_finish', { p_company: run.company_id, p_kind: kind, p_local_date: local,
      p_data: { outlooks, pushes, jobs, failed, complete: failed === 0 && !budget && !partial } });
    if (fin.ok && fin.data && fin.data.ok) { c.sent += Number(fin.data.sent) || 0; c.dropped += Number(fin.data.dropped) || 0; }
  }
  return c;
}
