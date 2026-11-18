Browser test rig (Playwright, no real sign-in or network), copied from /home/claude/rig on Nov 18 2026 so the repo's tests
no longer depend on it. tests/run_all.sh serves the build and sets the env vars in env.js; see ../README_RUN.md.

- boot.js: boot(url, {init, wait}) -> {b, p}. Fakes supabase-js with fakesb.js, answers *.supabase.co with null.
- env.js: PB_URL / PB_ROOT / PB_BASE / PB_OUT / notice version / fixtures folder / the optional page clock (PB_FAKE_NOW).
- co.js: a signed-in foreman with a company (init script). mgr.js: owner/manager (use co + mgr). co2, co3, co_fm, co_pl:
  variants (crew jobs, crew reports, a foreman with a crew, a pipelayer with a foreman).
- fakesb.js: stand-in for supabase-js; window.__rpcOverride.<rpc> = (args) => result stubs one RPC.
- flow.js: F(p) helpers (fill, select, click by text, modal text/buttons, H.img('p12') stake photos from ../fixtures/evimg).
- mkrun.js, resume.js: build a locked run / end short and resume. pm.js, pm_plans.js: plan-reading stubs. dash.json: a company dashboard.
- legacy/: the older rig (Nov 9-era fake Supabase) and its walk scripts t*.js / w*.js, kept as they were (not run by run_all.sh).
