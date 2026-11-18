import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 11: a resumed session's record carries the WHOLE run's bedding and backfill (r16.89 grade 07), while the earlier
# session's record keeps its volume to the stop point. The resumed session's PDF printed "121.3 cu yd (calculated estimate)"
# with no scope beside the earlier record's "79.9 cu yd (to the stop point, 200.0 of 301.0 ft)": two records of one run
# whose volumes add up to 201 cu yd. Say the resumed figure is the whole run and already includes the earlier part.
rep("""    return (entry.volumeToStationFt !== null && entry.volumeToStationFt !== undefined && entry.incomplete) ? ' (to the stop point, ' + entry.volumeToStationFt.toFixed(1) + ' of ' + entry.distance.toFixed(1) + ' ft)' : '';""",
    """    return (entry.volumeToStationFt !== null && entry.volumeToStationFt !== undefined && entry.incomplete) ? ' (to the stop point, ' + entry.volumeToStationFt.toFixed(1) + ' of ' + entry.distance.toFixed(1) + ' ft)'
      : (entry.resumedFromId !== null && entry.resumedFromId !== undefined ? ' (whole run, all sessions: it already includes the part an earlier session\\u2019s record counts, so the two are not added)' : ''); /* audit pdfs 11 */""")
open(out, 'w', encoding='utf-8').write(s)
