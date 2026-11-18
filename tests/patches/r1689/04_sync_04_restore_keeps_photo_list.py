import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (sync 04): a run restored from the account keeps the company copy's photo list (the photos are already in
# run-photos), so an edit on the new phone doesn't send a copy that says the run has no photos.
rep("""      if (typeof po.laidFt === 'number') o.restoredLaidFt = po.laidFt;""",
"""      if (typeof po.laidFt === 'number') o.restoredLaidFt = po.laidFt;
      if (Array.isArray(po.photos) && po.photos.length) o.restoredPhotoRefs = po.photos.slice(0, 200).map(x => Object.assign({}, x, { r: 1 })); /* already uploaded by the phone that took them */
      if (typeof po.photosLeftOut === 'number' && po.photosLeftOut > 0) o.restoredPhotosLeft = po.photosLeftOut;""")
rep("""    if (refs.length && owner && owner !== 'shared') rec.pbOffice.photos = refs.slice(0, 200); /* r16.75: the photos themselves go to run-photos */""",
"""    if (refs.length && owner && owner !== 'shared') rec.pbOffice.photos = refs.slice(0, 200); /* r16.75: the photos themselves go to run-photos */
    if (e.restoredFromCloud) { /* the photo list the company copy had when it was restored */
      if (Array.isArray(e.restoredPhotoRefs) && e.restoredPhotoRefs.length) rec.pbOffice.photos = e.restoredPhotoRefs.concat(rec.pbOffice.photos || []).slice(0, 200);
      if (typeof e.restoredPhotosLeft === 'number') rec.pbOffice.photosLeftOut = left + e.restoredPhotosLeft;
    }
    delete rec.restoredPhotoRefs; delete rec.restoredPhotosLeft;""")
open(out, 'w', encoding='utf-8').write(s)
