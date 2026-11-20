# hunt_nov19 06: a photo missing from the phone's photo store was sent to the company as a line of text, uncounted.
# Since r17.08 photos are kept apart from Records; a photo the store has lost stays in the record as its reference
# ("pbph:1:<fingerprint>", 71 characters). The company copy of a run (pbRrOfficeCopy, sent for 21 days whenever the run
# changes) only recognised photos by "data:..." so it sent that reference as if it were text, with "photos left out: 0"
# and no photo list: the office saw a run with no photos and nothing saying any were missing.
# Now a missing photo's reference is never sent as text and is counted in photosLeftOut, like any photo that stayed
# on the phone. Nothing else changes (a healthy record has no such strings in memory).
# Usage: python3 06_office_copy_missing_photo.py in.html out.html
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("  function pbRrIsBinary(v) { return typeof v === 'string' && /^data:/.test(v) && v.length > 200; }",
      "  function pbRrIsBinary(v) { return typeof v === 'string' && /^data:/.test(v) && v.length > 200; }\n"
      "  function pbRrIsLost(v) { return typeof v === 'string' && v.length === 71 && /^pbph:1:[0-9a-f]{64}$/.test(v); } /* hunt_nov19 06: a photo the phone's photo store no longer has */")
p.rep("          if (pbRrIsBinary(x)) { left++; ref(path.concat(i), x); return; }\n",
      "          if (pbRrIsBinary(x)) { left++; ref(path.concat(i), x); return; }\n"
      "          if (pbRrIsLost(x)) { left++; return; } /* hunt_nov19 06: counted, never sent as text (an object holding one keeps its other fields: the field becomes null below) */\n")
p.rep("          if (pbRrIsBinary(x)) { left++; o[k] = null; ref(path.concat(k), x, { set: 1 }); return; }\n",
      "          if (pbRrIsBinary(x)) { left++; o[k] = null; ref(path.concat(k), x, { set: 1 }); return; }\n"
      "          if (pbRrIsLost(x)) { left++; o[k] = null; return; } /* hunt_nov19 06 */\n")
p.save()
