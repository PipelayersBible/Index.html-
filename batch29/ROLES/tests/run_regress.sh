#!/bin/bash
# usage: /home/claude/batch29/ROLES/tests/run_regress.sh   (each Playwright run takes /home/claude/pw.lock itself)
# Batch 29 ROLES regression: earlier batches' production / crew / claims / Results / END / laid tests on the base (site0)
# and on this batch (site). Same results on both = no regression; a difference is looked at one by one (NOTES.md).
# Waits for >= 2 GB free before each run. Logs in ROLES/logs/regress. LIST= and SITES= override.
D=/home/claude/batch29/ROLES; L=$D/logs/regress; mkdir -p $L; T=/home/claude; PORT=${PORT:-8852}
LIST=${LIST:-"$T/batch29/ROLES/tests/t_roles.js
$T/batch27/CONSOLE/updated/b12_t_crew.js $T/batch12/D2/tests/t_crew_layout.js $T/batch12/D2/tests/t_r2.js $T/batch12/D2/tests/t_r3.js $T/batch12/D2/tests/t_sync.js
$T/batch27/CONSOLE/updated/b11_t_dash.js $T/batch27/CONSOLE/updated/b11_t_s4.js $T/batch27/CONSOLE/updated/b12_t_dash.js $T/batch27/CONSOLE/updated/bh_t_cover_undo.js $T/batch27/CONSOLE/updated/t_b20_company_home.js
$T/batch11/D/tests/t_sync.js $T/batch11/D/tests/t_math.js $T/batch11/D/tests/t_b1.js
$T/batch14/F/tests/t_laid.js $T/batch14/F/tests/t_live.js $T/batch14/F/tests/t_board.js
$T/batch17/END/tests/t_ea_prod.js $T/batch17/END/tests/t_ea_nextday.js $T/batch17/END/tests/t_ea_paths.js
$T/batch22/NOTES/tests/t_notes_prod.js $T/batch22/NOTES/tests/t_notes_run.js
$T/batch23/DAILY/tests/t_daily.js $T/batch28/MANUAL/tests/t_manual.js
$T/bughunt_oct19/fix_app/tests/t_crew_role_control.js $T/bughunt_oct19/fix_app/tests/t_crew_queue_save_fail.js $T/bughunt_oct19/fix_app/tests/t_prod_company_refusal.js
$T/batch20/HOME/tests/t_b20_normal_home.js
$T/batch15/PDF/tests/t_pdf_reports.js $T/batch15/PDF/tests/t_cutfill_at_stakes.js $T/batch15/PDF/tests/t_cutfill_unit.js"}
SITES=${SITES:-"site0 site"}
cd /home/claude/test
for t in $LIST; do
  n=$(echo $t | sed "s#$T/##; s#/#_#g; s#\.js##")
  for SITE in $SITES; do
    while [ "$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)" -lt 2048 ]; do sleep 5; done
    PB_TEST_DIR=$D/$SITE PB_TEST_PORT=$PORT flock /home/claude/pw.lock timeout 900 ./run.sh $t 800 > $L/${SITE}__$n.log 2>&1; rc=$?
    echo "$SITE $n rc=$rc ok=$(grep -c '^OK' $L/${SITE}__$n.log) fail=$(grep -c 'FAIL \*\*\*' $L/${SITE}__$n.log)"
  done
done
echo ALL_DONE
