# records_nov22 A9: deleting a crew run (office / foreman) needs a reason. The app sent p_reason: null every time, so the
# server's removed_reason, the run's event and the voided production entries never said why. The reason box sits in the
# Delete Run question; Delete Run with it empty says so and keeps the question open. (Server side: sql/a9_run_remove_reason.sql
# refuses an empty reason. Apply it AFTER this app build is live, or older phones can't delete at all.)
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("""  window.pbRrDelete = function() {
    const uid = pbArchiveOwnerUid, O = pbRoFor(uid), x = O.open; if (!x || !x.id) return;
    pbShowModal(""", """  let pbRrDelWhy = { id: null, text: '', err: '' }; /* records_nov22 A9 */
  window.pbRrDelete = function(again) {
    const uid = pbArchiveOwnerUid, O = pbRoFor(uid), x = O.open; if (!x || !x.id) return;
    if (again !== true || pbRrDelWhy.id !== x.id) pbRrDelWhy = { id: x.id, text: '', err: '' };
    pbShowModal(""")
p.rep("""      { label: 'Delete Run', danger: true, onClick: async () => {
        const r = await pbPermitRpc('pb_prod_run_remove', { p_id: x.id, p_reason: null, p_expect_uid: uid }, 20000);""",
"""      { label: 'Delete Run', danger: true, onClick: async () => {
        const reason = String(pbRrDelWhy.text || '').trim().replace(/\\s+/g, ' ');
        if (reason.length < 3) { pbRrDelWhy.err = 'Say why it’s being deleted.'; window.pbRrDelete(true); return; }
        const r = await pbPermitRpc('pb_prod_run_remove', { p_id: x.id, p_reason: reason.slice(0, 300), p_expect_uid: uid }, 20000);""")
p.rep("""        } else pbAlert(navigator.onLine === false ? 'No signal. Nothing was deleted. Try again when you have signal.' : 'Couldn’t delete it. Nothing was changed.', 'Not Deleted');
      } }
    ], 'Delete Run');
  };""", """        } else pbAlert(navigator.onLine === false ? 'No signal. Nothing was deleted. Try again when you have signal.' : /pb:reason_required/.test(String((r && r.error && r.error.message) || '')) ? 'Say why it’s being deleted. Nothing was changed.' : 'Couldn’t delete it. Nothing was changed.', 'Not Deleted');
      } }
    ], 'Delete Run');
    try { /* records_nov22 A9: the reason box, inside the question */
      const btns = document.getElementById('pbModalButtons'), w = document.createElement('div');
      w.className = 'pb-modal-extra pb-field'; w.style.margin = '0 0 14px';
      w.innerHTML = '<label for="rrDelReason">Why is it being deleted?</label><textarea id="rrDelReason" rows="2" maxlength="300" placeholder="e.g. Test run, entered twice" style="width:100%;box-sizing:border-box"></textarea>' + (pbRrDelWhy.err ? '<p class="pb-warn" role="alert" id="rrDelReasonErr">' + escapeHtml(pbRrDelWhy.err) + '</p>' : '');
      btns.parentNode.insertBefore(w, btns);
      const ta = w.querySelector('textarea'); ta.value = pbRrDelWhy.text; ta.oninput = () => { pbRrDelWhy.text = ta.value; };
      if (pbRrDelWhy.err) ta.focus();
    } catch (e) {}
  };""")
p.save()
