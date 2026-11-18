import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 01: the same image attached at two points (a junction stake picked twice) is printed once, but the run's
# photoCount counts both. The PDF then said "only 6 are on this phone ... a missing one stays on the phone that took it"
# for photos that ARE on the phone. Missing = photoCount minus the photo references the record holds, not minus unique images.
rep("""  function pbRptRunInto0(R, e) {
""", """  function pbRptPhotoRefs(e) { // audit pdfs 01: photo references the record holds (an image attached at two points counts twice)
    let n = 0; (e.intervalRows || []).forEach(r => { n += (r.photos || []).filter(u => !!pbRptPhotoUrl(u)).length; }); (e.fieldNotes || []).forEach(x => { n += (x.photos || []).filter(u => !!pbRptPhotoUrl(u)).length; }); return n;
  }
  function pbRptRunInto0(R, e) {
""")
rep("""['Photos', String(R.rec.photos.length) + ((Number(e.photoCount) || 0) > R.rec.photos.length ? ' of ' + Number(e.photoCount) : '')]];""",
    """['Photos', ((nr, nw) => nw > nr ? R.rec.photos.length + ' of ' + nw : String(nr) + (nr > R.rec.photos.length ? ' (' + R.rec.photos.length + ' different)' : ''))(pbRptPhotoRefs(e), Number(e.photoCount) || 0)]];""")
rep("""    const want = Number(e.photoCount) || 0, have = R.rec.photos.length;
    for (let k = have; k < want; k++) R.photo(null, { shows: 'not recorded', belongs: 'This run (the record counts ' + want + ' photos)' }, 'The run records ' + want + ' photos but only ' + have + ' are on this phone.""",
    """    const want = Number(e.photoCount) || 0, refs = pbRptPhotoRefs(e), have = R.rec.photos.length;
    for (let k = 0; k < want - refs; k++) R.photo(null, { shows: 'not recorded', belongs: 'This run (the record counts ' + want + ' photos)' }, 'The run records ' + want + ' photos but only ' + refs + ' are on this phone.""")
open(out, 'w', encoding='utf-8').write(s)
