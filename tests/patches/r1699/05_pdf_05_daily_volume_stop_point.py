import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 05: daily report Materials. A run ended early keeps bedding/backfill only to the stop point (volumeToStationFt),
# but the daily printed it as "(whole run; this run has more than one session, and each session repeats the whole-run figure)"
# beside the resumed session's real whole-run figure, so 11.11 and 16.72 yd3 read as the same quantity told twice (and add up
# to 27.8 yd3 for a 16.7 yd3 run). The run item now carries its volume scope and the basis says it.
rep("""        bedding_yd3: pbDlyR(e.beddingVolumeYd3, 2), backfill_yd3: pbDlyR(e.volumeYd3, 2),""",
    """        bedding_yd3: pbDlyR(e.beddingVolumeYd3, 2), backfill_yd3: pbDlyR(e.volumeYd3, 2), ...(e.incomplete && typeof e.volumeToStationFt === 'number' && typeof e.distance === 'number' ? { vol_to_ft: pbDlyR(e.volumeToStationFt, 1), vol_of_ft: pbDlyR(e.distance, 1) } : {}), /* audit pdfs 05 */""")
rep("""      const whole = ' (whole run' + (r.multi_session ? '; this run has more than one session, and each session repeats the whole-run figure' : '') + ')';""",
    """      const whole = typeof r.vol_to_ft === 'number' ? ' (to the stop point only: ' + r.vol_to_ft + ' of ' + r.vol_of_ft + ' ft' + (r.multi_session ? '; a later session\\u2019s whole-run figure already includes this part, so the two are not added' : '') + ')' /* audit pdfs 05 */
        : ' (whole run' + (r.multi_session ? '; this run has more than one session, and each session repeats the whole-run figure' : '') + ')';""")
open(out, 'w', encoding='utf-8').write(s)
