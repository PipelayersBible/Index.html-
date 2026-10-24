// Batch 27 CONSOLE: compatibility shim for the older batch tests (updated copies in ../updated). The company job screen now
// shows its sections under Overview / Waiting / Materials / Production tabs (and its header in the hero). Those tests were
// written for the single long job page, so this shim shows every section at once, as before; the tabs themselves are
// tested by tests/t_cx.js. Test-side only: an init script adds one stylesheet; the app is unchanged.
const SHOW_ALL = () => {
  const add = () => { if (document.getElementById('cxTestShowAll')) return; const st = document.createElement('style'); st.id = 'cxTestShowAll';
    st.textContent = '#pbApp #screen-prodJob #pjBody :is(#pjCxOverview, #pjPmSec, #pjDaily, #pjCxWait, #pjApprovalsSec, #pjCrewSec, #pjCovered, #pjMatSec, #pjTicketsSec, #pjProgress, #pjManualSec, #pjTableSec, #pjDaysSec, #pjRecentSec, #pjWhoSec, #pjSiteLogSec) { display: block !important; }'
      + ' #pbApp #screen-prodJob #pjHead { display: block !important; } #pbApp #screen-prodJob #pjProgress .pbp-barwrap { display: block !important; }';
    (document.head || document.documentElement).appendChild(st); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
};
module.exports = function (M) {
  const ch = M.chromium; if (ch.__cxShim) return; ch.__cxShim = true;
  const launch = ch.launch.bind(ch);
  ch.launch = async (...a) => { const b = await launch(...a); const nc = b.newContext.bind(b); b.newContext = async (...o) => { const c = await nc(...o); await c.addInitScript(SHOW_ALL); return c; }; return b; };
};
