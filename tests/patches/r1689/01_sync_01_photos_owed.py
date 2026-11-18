import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (sync 01): a run's photos past the first 20, or one whose upload failed, were never tried again, because the
# run was already marked sent. Each pass now also finishes the photos still owed for runs the company already has.
# A failed upload waits 5 minutes before the next try (not every 5 seconds).
rep("""        if (!error || /exists|duplicate/i.test(String(error.message || error.error || ''))) done[ph.path] = Date.now();
        else { more = true; break; }
      } catch (x) { more = true; break; }""",
"""        if (!error || /exists|duplicate/i.test(String(error.message || error.error || ''))) done[ph.path] = Date.now();
        else { more = true; pbRr.photoFailAt = Date.now(); break; }
      } catch (x) { more = true; pbRr.photoFailAt = Date.now(); break; }""")
rep("""      if (sent[String(e.id)] !== h || ask) { pbRr.asked[String(e.id)] = Date.now(); todo.push({ id: String(e.id), rec, h, e }); }
      if (todo.length >= PB_RR_MAX_PER_PASS) break;
    }
    if (!todo.length) return;""",
"""      if (sent[String(e.id)] !== h || ask) { pbRr.asked[String(e.id)] = Date.now(); todo.push({ id: String(e.id), rec, h, e }); }
      else if (rec.pbOffice && Array.isArray(rec.pbOffice.photos) && rec.pbOffice.photos.length && !e.reportRefused) held.push({ id: String(e.id), rec, h, e });
      if (todo.length >= PB_RR_MAX_PER_PASS) break;
    }
    let owed = []; /* photos still owed for runs the company already has */
    if (held.length && !(pbRr.photoFailAt && Date.now() - pbRr.photoFailAt < 5 * 60000)) {
      let done = {}; try { done = JSON.parse((await pbGetFor(uid, 'rrPhotosUp')) || '{}') || {}; } catch (x) { done = {}; }
      if (pbRr.uid !== uid || pbRr.busy) return;
      owed = held.filter(t => t.rec.pbOffice.photos.some(ph => !done[ph.path] && !ph.r)); /* r: carried over from a restore (patch 04), not on this phone */
    }
    if (!todo.length && !owed.length) return;""")
rep("""    const todo = [];
    for (const e of runs) {
      let rec; try { rec = pbRrOfficeCopy(e); } catch (x) { continue; }
      const h = pbHashText(JSON.stringify([rec, acc.companyId]));
      const ask =""", """    const todo = [], held = [];
    for (const e of runs) {
      let rec; try { rec = pbRrOfficeCopy(e); } catch (x) { continue; }
      const h = pbHashText(JSON.stringify([rec, acc.companyId]));
      const ask =""")
rep("""      const keys = Object.keys(sent); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete sent[k]);
      if (pbRr.uid === uid) await pbSetFor(uid, 'rrSent', JSON.stringify(sent));""",
"""      for (const t of owed) {
        if (pbRr.uid !== uid || !sbUser || sbUser.id !== uid || pbArchiveOwnerUid !== uid || navigator.onLine === false || Date.now() < pbRr.pauseUntil) break;
        let m = true; try { m = await pbRrPhotosUp(uid, t); } catch (x) { console.error('Run photo upload:', x); pbRr.photoFailAt = Date.now(); }
        if (m) { again = true; break; }
      }
      const keys = Object.keys(sent); if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete sent[k]);
      if (pbRr.uid === uid) await pbSetFor(uid, 'rrSent', JSON.stringify(sent));""")
open(out, 'w', encoding='utf-8').write(s)
