// Which tests run_all.sh runs, against which page, and what is known about them.
//
// A suite is a folder (relative to tests/) plus the test files in it. `variant` picks the page the tests load:
//   plain  the build as it ships (cur.html / index.html at the server root)
//   hook   the build plus the one-line test hooks the audit tests read app internals through
//          (window.__ev, window.__dbg, window.__dEval; see runner/hooks.js). Served as cur.html and curT.html under /hk/;
//          index.html there stays the plain build.
// A test is a file name, or {file, args, id, timeout} for a test that takes arguments.
//
// SKIP: tests that are not run, with the reason. XFAIL: tests that fail on the live build because of an app bug that is
// still open (the test is right); they are reported as "xfail" and do not fail the run. If one starts passing it is
// reported as XPASS so it can be moved out of the list.
'use strict';
const T = (dir, names) => names.map((n) => (typeof n === 'string' ? dir + '/' + n : Object.assign({}, n, { file: dir + '/' + n.file })));

const suites = [
  { name: 'main', variant: 'plain', tests: T('.', ['t90_batch.js', 't91_onetap.js', 't95_beta.js',
    't101_runphotos.js', 't102_seal.js', 't103_aireads.js', 't104_permitack.js', 't105_terms.js', 't106_cavestate.js', 't107_mfa.js',
    't108_export.js', 't109_crewnotice.js', 't110_clockpdf.js', 't111_exportdaily.js', 't112_exportpermit.js', 't113_adminlog.js',
    't114_mfacrew.js', 't115_checkshot.js', 't116_quickwork.js', 't117_break.js', 't118_trueod.js', 't119_secondshot.js',
    't120_csrecord.js', 't121_feedbackall.js', 't122_lowslope.js', 't123_newrunshort.js', 't124_crewview.js', 't126_noticeack.js', 't127_billing0.js', 't128_betaresults.js', 't129_taplink.js', 't130_onboard.js', 't131_trench20.js']) },
  { name: 'r1706_plain', variant: 'plain', tests: T('r1706/staterules/tests', ['t130_staterules.js']).concat(T('r1706/office3/tests', ['t_o3_31_board.js', 't_o3_32_jobinfo_pms.js', 't_o3_34_36_office.js', 't_o3_35_leave_handover.js'])) },
  { name: 'r1706_hook', variant: 'hook', tests: T('r1706/office3/tests', ['t_o3_30_31_permit.js', 't_o3_37_38_39_records.js']).concat(T('r1706/daily3/tests', ['t01_crew_default.js', 't02_night_shift.js', 't03_safety_daily.js', 't04_safety_search.js', 't05_customer_signature.js', 't06_last_run_crew.js'])) },
  { name: 'py', variant: 'plain', tests: T('.', ['permit_active_screen.py']) },
  { name: 'main_older', variant: 'plain', tests: T('.', ['t88.js', 't89_photostamp.js', 't92_backnow.js', 't93_livecam.js', 't94_parallel.js',
    't98_betaend.js', 't99_removed.js', 't100_runpdf.js']) },
  { name: 'beta', variant: 'hook', tests: T('bughunt_nov17/beta', ['t_b01_expiredlink.js', 't_b02_betaseats.js', 't_b03_aiended.js', 't_b04_ownerended.js', 't_b05_cvnofm.js']) },
  { name: 'critic', variant: 'hook', tests: T('bughunt_nov17/critic', ['t_c01.js', 'w1.js', 'w2.js', 'w3.js', 'w4.js', 'w5.js']) },
  { name: 'cs2', variant: 'hook', tests: T('bughunt_nov17/cs2', ['a1.js', 'b1.js', 'e1.js', 'fb.js', 'k1.js', 'l1.js', 'l2.js', 'o1.js', 'r1.js', 's1.js', 'v2.js', 'w1.js']) },
  { name: 'daily2', variant: 'hook', tests: T('bughunt_nov17/daily2', ['t01_twojobs.js', 't02_nightshift.js', 't03_undo_remove.js', 't04_changed_after_sign.js']) },
  { name: 'grade', variant: 'hook', tests: T('bughunt_nov17/grade', ['g1.js', 'g2.js', 'g3.js', 'g4.js', 'g5.js', 'g6.js', 'g7.js', 'repo_t115_checkshot.js', 'repo_t117_break.js',
    't01_pdf_inverts.js', 't02_pdf_stations.js', 't03_ai_changed.js', 't04_laidstats.js', 't05_csparse.js', 't06_laidlog.js', 't07_resume_volume.js', 't07b_volume_control.js']) },
  { name: 'grade2', variant: 'hook', tests: T('bughunt_nov17/grade2', ['tests/t01_run2_stations.js', 'tests/t02_reducer_samesta.js', 'tests/t03_step_volume.js', 'tests/t04_step_exact.js', 'tests/t_g40_reload_exact.js', 'tests/t_g41_prefix_stations.js', 'tests/t_g42_short_elev_job.js', 'tests/t_g43_shots_reload.js',
    'tests/cutsheet.js', 'tests/edge.js',
    { file: 'ref/run.js', args: ['0', '24', 'cur.html', '1'], id: 'bughunt_nov17/grade2/ref/run.js[0-24]', timeout: 900 },
    { file: 'ref/run_flip.js', args: ['0', '12', 'cur.html', '1'], id: 'bughunt_nov17/grade2/ref/run_flip.js[0-12]', timeout: 900 },
    { file: 'ref/run_lock.js', args: ['0', '8', 'cur.html', '1'], id: 'bughunt_nov17/grade2/ref/run_lock.js[0-8]', timeout: 900 },
    { file: 'ref/run_resume.js', args: ['0', '8', 'cur.html', '1'], id: 'bughunt_nov17/grade2/ref/run_resume.js[0-8]', timeout: 900 }]) },
  { name: 'new', variant: 'hook', tests: T('bughunt_nov17/new', ['a1.js', 'a2.js', 'a3.js', 'a4.js', 'a5.js', 'a6.js', 'a7.js', 'a8.js', 'a9.js', 'a10.js', 'a11.js', 'a12.js',
    'f01_fitresume.js', 'f02_export.js', 'f03_csinput.js', 'f05_mgrsettings.js', 'f06_breakend.js', 'r_t113_adminlog.js', 'r_t114_mfacrew.js', 'r_t116_quickwork.js']) },
  { name: 'office', variant: 'hook', tests: T('bughunt_nov17/office', ['a1_ask.js', 'a2_retry.js', 'a3_stake.js', 'a4_stake_limit.js', 'b1_beta.js', 'b2_beta_stale.js', 'b3_owner.js',
    'b4_owner_modal.js', 'b5_feedback_modal.js', 'b6_shot.js', 'b7_owner_null.js', 'c1_crew.js', 'd1_betaend_daily.js', 'd2_betaend_migrate.js', 'm1_mat.js', 'n1_notif.js',
    'p1_plans.js', 'p2_viewer.js', 'p3_viewer_offline.js', 's1_smoke.js', 't1_ticket.js', 'x1_access.js']) },
  { name: 'office2', variant: 'hook', tests: T('bughunt_nov17/office2', ['t01_jobinfo_two_mgrs.js', 't01b_jobinfo_clash.js', 't02_pms_two_mgrs.js', 't03_rr_photos_note.js', 't04_stale_today.js']) },
  { name: 'offline', variant: 'hook', tests: T('bughunt_nov17/offline/rig', ['t00_smoke.js', 't00b.js', 't01_kill.js', 't02_day.js', 't03_burst.js', 't04_cv.js', 't05_offhide.js', 't06_twotabs.js',
    't07_sw.js', 't08_size.js', 't09_bigweek.js', 't10_quota.js', 't11_clock.js', 't12_killend.js',
    { file: 't12_killend.js', args: ['1500'], id: 'bughunt_nov17/offline/rig/t12_killend.js[1.5s]' }, 't13_queues.js', 't14_lsclear.js']) },
  { name: 'pdfs', variant: 'hook', tests: T('bughunt_nov17/pdfs', ['t01_dup_photo.js', 't02_hi_source.js', 't03_export_missing_seal.js', 't04_permit_retention.js', 't05_daily_volume_scope.js',
    't06_note_station.js', 't07_depth_words.js', 't08_permit_verify_note.js', 't09_foreman_prefill.js', 't10_ai_after_lock.js', 't11_resumed_volume.js', 't12_daily_permit_closed.js']) },
  { name: 'safety', variant: 'hook', tests: T('bughunt_nov17/safety', ['d1.js', 'd2.js', 'd3.js', 'd4.js', 'p1.js', 'p2.js', 'p2t.js', 'p3.js', 'p4.js', 'p5.js', 'p6.js', 'p7.js', 'v1.js']) },
  { name: 'sync', variant: 'hook', tests: T('bughunt_nov17/sync', ['repo_t102.js', 'repo_t105.js', 't01_photos_retry.js', 't02_terms_permit.js', 't03_roles.js', 't04_restore_seal.js',
    't05_restore_photos.js', 't06_hash.js']) },
  { name: 'tonight', variant: 'hook', tests: T('bughunt_nov17/tonight', ['t_2nd_label.js', 't_cs_wording.js', 't_lenker2nd.js', 't_lowslope_txt.js', 't_no2nd_stale.js', 't_oldrec.js',
    't_refpage.js', 't_xing_od.js']) },
  // listed so the summary shows them; every one is in SKIP below
  { name: 'perf', variant: 'plain', tests: T('bughunt_nov17/perf', ['a11y_same.js', 'inapp.js', 'jsb.js', 'jsb2.js', 'lbl.js', 'loads.js', 'loads2.js', 'nr.js', 'prof.js',
    'smoke.js', 't_jspdf.js', 't_saveblob.js', 't_sw_budget.js']) },
];
const PERF = 'performance measurement from the Nov 17 perf audit, not a pass/fail regression: needs its own throttling '
  + 'server (perf/srv.js: gzip, HTTPS, network shaping on port 8884) and per-variant folders under /tmp/claude-0/audit/perf; '
  + 'timings depend on the machine. Run by hand as perf/FINDINGS.md says.';

// Not run, with the reason (key = test id, i.e. path relative to tests/).
const SKIP = {
  'bughunt_nov17/new/a10.js': 'obsolete scenario: it changes the start rod reading through Edit Run Data on a run with laid pipe; '
    + 'the app now refuses that on purpose ("Run Already Started ... its stake numbers can\'t be changed", only a distance or '
    + 'hub station can be fixed), so the flow it drives no longer exists. The fitting-count finding it explored is covered by f01_fitresume.js.',
};
SKIP['bughunt_nov17/offline/rig/t12_killend.js'] = 'race by design: it kills the page 0 ms after tapping Break / End Run, so whether '
  + 'the tap was saved depends on which wins; seen both ways on r17.01 (break kept in one run, lost in the next; NOTES.md). '
  + 'The same flow with the page killed 1.5 s after each tap runs as t12_killend.js[1.5s].';
for (const t of suites.find((s) => s.name === 'perf').tests) SKIP[t] = PERF;

// Run, but known to fail on the live build because of an open app bug (key = test id, value = the bug).
const XFAIL = {
};

// How a test is judged. Default: 'verdict' if the test (or a ./lib it requires) prints PASS/FAIL lines or sets an exit code,
// else 'golden' (its normalized output must match tests/expect/<id>.txt). Override here.
const JUDGE = {
  'bughunt_nov17/grade2/tests/t_g40_reload_exact.js': 'verdict',
  'bughunt_nov17/grade2/tests/t_g41_prefix_stations.js': 'verdict',
  'bughunt_nov17/grade2/tests/t_g42_short_elev_job.js': 'verdict',
  'bughunt_nov17/grade2/tests/t_g43_shots_reload.js': 'verdict',
};

// Extra normalization for golden tests whose output carries values that legitimately change between runs
// (key = test id; replace: [[regex, token]], drop: [regex]).
const ms = (re) => [re, (m, k) => k + 'N']; // keep the label, drop a measured number
const NORMALIZE = {
  // the order of the start-up RPC calls is a race; compare the set
  'bughunt_nov17/sync/t03_roles.js': { replace: [[/^(rpcs: )(.*)$/gm, (m, a, b) => a + b.split(' ').sort().join(' ')]] },
  // break / run lengths come from real waits around a backdated start: 29 or 30 min depending on the seconds
  'bughunt_nov17/new/a12.js': { replace: [[/\b(29|30) min\b/g, '~30 min'], [/\b1h (29|30)m\b/g, '1h ~30m']] },
  // laid-pace stats in ms measured from real time: compare them to the second
  'bughunt_nov17/new/a4.js': { replace: [[/"(avg|ms|cur)":(\d+(?:\.\d+)?)/g, (m, k, v) => '"' + k + '":~' + Math.round(v / 1000) + 's']] },
  // the order the dashboard fires its RPCs in is a race; the set is what matters
  'bughunt_nov17/office/s1_smoke.js': { replace: [[/^rpcs: (.*)$/gm, (m, l) => 'rpcs: ' + l.split(' ').sort().join(' ')]] },
  // seconds-since-start stamps on each fake-server call
  'bughunt_nov17/offline/rig/t02_day.js': { replace: [[/@\d+\.\d/g, '@N']] },
  // sizes of stamped photos and timings
  'bughunt_nov17/offline/rig/t08_size.js': { replace: [ms(/("(?:runChars|imgChars|lsChars|usage)":)\d+/g), ms(/(mark\+save ms \(incl\. UI waits ~1000\): )\d+/g)] },
  'bughunt_nov17/offline/rig/t09_bigweek.js': { replace: [ms(/(archive chars )\d+/g), [/\{"n":\d+,"max":\d+,"sum":\d+\}/g, '{LONGTASKS}'], ms(/(pbRrSend pass ms: )\d+/g)] },
  // ms timings of the parallel AI reads
  't94_parallel.js': { replace: [[/@\d+/g, '@N']] },
  'bughunt_nov17/cs2/l1.js': { replace: [ms(/(\bms )\d+/g)] },
  // length of the PDF's text: dates and times in it change its length
  'bughunt_nov17/grade/g2.js': { replace: [ms(/(pdf chars )\d+/g)] },
};

// Golden tests run with the page clock started at FAKE_NOW (Pacific time; it runs on in real time from there, see
// rig/env.js), because several print values computed from fixed fixture dates ("3 active this week", "23 days left").
// The expected outputs in tests/expect were recorded that way. REAL_CLOCK: golden tests that must see the real clock.
const FAKE_NOW = '2026-11-18T09:30:00';
const REAL_CLOCK = {
  // works out a beta's end time in node (real clock) and compares it with what the page shows (page clock)
  'bughunt_nov17/office/b1_beta.js': 'compares node-side times with the page',
  't98_betaend.js': 'sets the beta end from the node clock (now - 1 day) and prints the days of grace left',
};

module.exports = { suites, SKIP, XFAIL, JUDGE, NORMALIZE, FAKE_NOW, REAL_CLOCK };
