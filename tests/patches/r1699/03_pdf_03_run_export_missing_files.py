import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# audit pdfs 03: run Export for Records. A sealed original or photo whose download failed was skipped silently, yet the
# certificate counted every listed seal ("consist of 1 run report, N photographs and 2 sealed PDF files" / "earlier sealed PDFs are
# included in this export") and the manifest listed it. A failed seals list gave "0 sealed PDF files" as if there were none.
# Now the counts are the files really in the ZIP, and the manifest and certificate say what is missing and why.
rep("""      for (const ph of plist) { try { const { data } = await sbClient.storage.from('run-photos').download(ph.path); if (data) add('photos/' + ph.sha + '.jpg', await data.arrayBuffer()); } catch (y) {} }""",
    """      let photoMiss = 0; /* audit pdfs 03 */
      for (const ph of plist) { let ok = false; try { const { data } = await sbClient.storage.from('run-photos').download(ph.path); if (data) { add('photos/' + ph.sha + '.jpg', await data.arrayBuffer()); ok = true; } } catch (y) {} if (!ok) photoMiss++; }""")
rep("""      let seals = []; try { const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: x.id }, 20000); seals = (r.data && r.data.seals) || []; } catch (y) {}
      for (const sl of seals) { try { const { data } = await sbClient.storage.from('run-seals').download(sl.path); if (data) add('sealed/sealed-v' + sl.version + '.pdf', await data.arrayBuffer()); } catch (y) {}""",
    """      let seals = [], sealsErr = false; const sealMiss = []; try { const r = await pbPermitRpc('pb_run_seals_list', { p_run_id: x.id }, 20000); if (!r || r.error || !r.data) sealsErr = true; seals = (r && r.data && r.data.seals) || []; } catch (y) { sealsErr = true; } /* audit pdfs 03 */
      for (const sl of seals) { let ok = false; try { const { data } = await sbClient.storage.from('run-seals').download(sl.path); if (data) { add('sealed/sealed-v' + sl.version + '.pdf', await data.arrayBuffer()); ok = true; } } catch (y) {} if (!ok) sealMiss.push(sl.version);""")
rep("""        'Sealed originals: ' + seals.length + (seals.length ? ' (' + seals.map(""", """        (sealsErr ? 'Sealed originals: THE LIST OF SEALED ORIGINALS COULD NOT BE READ FROM THE SERVER, so any sealed originals of this run are NOT in this export. Export again with signal.' : '') + (sealMiss.length ? 'NOT IN THIS EXPORT: sealed original ' + sealMiss.map(v => 'v' + v).join(', ') + ' (listed on the server; the download failed). ' : '') + (photoMiss ? 'NOT IN THIS EXPORT: ' + photoMiss + ' of ' + plist.length + ' photo(s) the company copy lists (the download failed). ' : '') + 'Sealed originals: ' + seals.length + (seals.length ? ' (' + seals.map(""")
rep("""      const counts = { photos: files.filter(f => /^photos\\//.test(f.name)).length, sealed: seals.length };""",
    """      const counts = { photos: files.filter(f => /^photos\\//.test(f.name)).length, sealed: files.filter(f => /^sealed\\/.*\\.pdf$/.test(f.name)).length }; /* audit pdfs 03: files really in the export */
      const missTxt = (sealsErr ? ' The list of sealed PDF files could not be read from the Service when this export was made, so any sealed PDF files of this run are not included.' : '') + (sealMiss.length ? ' The Service lists ' + seals.length + ' sealed PDF file(s) for this run; ' + sealMiss.length + ' could not be downloaded and ' + (sealMiss.length === 1 ? 'is' : 'are') + ' not included.' : '') + (photoMiss ? ' The Company\\u2019s copy lists ' + plist.length + ' photograph(s); ' + photoMiss + ' could not be downloaded and ' + (photoMiss === 1 ? 'is' : 'are') + ' not included.' : '');""")
rep("""' photographs and ' + counts.sealed + ' sealed PDF files.',""", """' photographs and ' + counts.sealed + ' sealed PDF files.' + missTxt,""")
rep("""        '9. Where a Record was changed after it was first made, the Service keeps each earlier version with the server time at which it was received; earlier sealed PDFs are included in this export.',""",
    """        '9. Where a Record was changed after it was first made, the Service keeps each earlier version with the server time at which it was received; ' + (sealsErr || sealMiss.length ? 'the sealed PDFs included in this export are listed in the manifest.' : 'earlier sealed PDFs are included in this export.'),""")
open(out, 'w', encoding='utf-8').write(s)
