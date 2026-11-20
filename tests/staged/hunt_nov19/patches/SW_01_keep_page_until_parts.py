# hunt_nov19 SW 01 (sw.js, not the page): a new page is kept for the next open only once its lazily loaded parts are kept.
# pbLazyFetchFor() says whether every part the page names (pbx/..., the PDF tools) is on the phone, but its answer was
# ignored: when the page came down and the signal dropped before the parts did, the new page still replaced the kept
# copy. The next open with no signal then ran a page whose PDF tools weren't on the phone: no run report PDF, no permit
# PDF, no exports, until the app was open with signal again. Before r17.08 the PDF tools were inside the page.
# Now, when the phone already has a kept page (this build's cache or an older one that activate carries forward), a
# page whose parts didn't all arrive is not stored: the kept copy (whose parts are on the phone) stays, and the next
# check tries again. With nothing kept at all (first install) the page is stored as before: opening without PDFs
# beats not opening.
# Usage: python3 SW_01_keep_page_until_parts.py sw.js out_sw.js
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
# a helper: is there any kept app page on this phone (this build's cache or an older build's)?
p.rep("""// only the parts the kept page or the previous copy names stay
async function pbLazyTidy() {""", """// hunt_nov19: any kept app page on this phone (this build's cache, or an older build's that activate carries forward)
async function pbAnyKeptPage() {
  try {
    const key = pbShellKey(self.registration.scope);
    for (const n of await caches.keys()) { if (n.indexOf(PB_SHELL_PREFIX) !== 0) continue; if (await (await caches.open(n)).match(key)) return true; }
  } catch (e) {}
  return false;
}
// only the parts the kept page or the previous copy names stay
async function pbLazyTidy() {""")
# install
p.rep("if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(self.registration.scope, pbPageResp(res, buf, sha)); } } catch (e) {} })(),",
      "if ((await pbBadList()).indexOf(sha) >= 0) return; if (!(await pbLazyFetchFor(pbText(buf))) && (await pbAnyKeptPage())) return; /* hunt_nov19: its parts first */ await pbShellPut(self.registration.scope, pbPageResp(res, buf, sha)); } } catch (e) {} })(),")
# the network-first path's copy for the next open
p.rep("if ((await pbBadList()).indexOf(sha) >= 0) return; await pbLazyFetchFor(pbText(buf)); await pbShellPut(req.url, pbPageResp(copy, buf, sha)); pbLazyTidy(); } catch (e) {} })());",
      "if ((await pbBadList()).indexOf(sha) >= 0) return; if (!(await pbLazyFetchFor(pbText(buf))) && (await pbAnyKeptPage())) return; /* hunt_nov19: its parts first */ await pbShellPut(req.url, pbPageResp(copy, buf, sha)); pbLazyTidy(); } catch (e) {} })());")
# the background check behind the kept copy
p.rep("""      await pbLazyFetchFor(text);
      if (kept) await c.put(pbPrevKey(), kept);""", """      if (!(await pbLazyFetchFor(text)) && kept) return; // hunt_nov19: its parts didn't all arrive: the kept copy stays, the next check tries again
      if (kept) await c.put(pbPrevKey(), kept);""")
p.save()
