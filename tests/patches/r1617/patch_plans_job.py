import sys
s = open(sys.argv[1]).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (s.count(a), a[:70]); s = s.replace(a, b)
# r16.17 (Tommy, Nov 10): Tools > Plans (every job) had no way to add a set; it now asks for the job number
rep('''      <div class="pb-btn-wrap" id="plansAddWrap" hidden style="padding-left:0;padding-right:0;"><button''',
    '''      <div class="pb-field" id="plansJobPick" hidden><label for="plansJobIn">Job number</label><input type="text" id="plansJobIn" maxlength="60" autocomplete="off" autocapitalize="characters" enterkeyhint="done"></div>
      <div class="pb-btn-wrap" id="plansAddWrap" hidden style="padding-left:0;padding-right:0;"><button''')
rep("    const add = pbPlansEl('plansAddWrap'); if (add) add.hidden = !pbPlans.job || !pbPlansCanAdd() || pbPlans.busy;\n",
    "    const add = pbPlansEl('plansAddWrap'); if (add) add.hidden = !pbPlansCanAdd() || pbPlans.busy;\n"
    "    const jp = pbPlansEl('plansJobPick'); if (jp) jp.hidden = !!pbPlans.job || !pbPlansCanAdd() || pbPlans.busy; // r16.17\n")
rep("  window.pbPlansPick = function() { if (pbPlans.busy) return; const f = pbPlansEl('plansFile'); if (f) { f.value = ''; f.click(); } };",
    "  window.pbPlansPick = function() {\n"
    "    if (pbPlans.busy) return;\n"
    "    if (!pbPlans.job) { // r16.17: from Tools > Plans, the set goes to the job typed here\n"
    "      const ji = pbPlansEl('plansJobIn'), v = ji ? String(ji.value || '').trim() : '';\n"
    "      if (!v) { pbPlansSay('Enter the job number first.'); if (ji) ji.focus(); return; }\n"
    "      pbPlans.job = v; pbPlans.sets = []; pbPlans.ready = null; pbPlansSay(''); pbPlansRender(); pbPlansLoad(true);\n"
    "    }\n"
    "    const f = pbPlansEl('plansFile'); if (f) { f.value = ''; f.click(); }\n"
    "  };")
open(sys.argv[2], 'w').write(s); print('ok')
