import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (safety 04): Close Out Permit closed the permit on one tap whenever nobody was checked in and the reason did
# not contradict the record. Closing can't be undone, so it is asked once. When a question was already answered on this
# tap (the closeout-reason check, or "still checked IN"), no second question is asked.
rep("""    } else {
      pbRunOnSession(() => pbProceedCloseOut(sid, '')); // closeout snapshots the session only after pending permit writes settle
    }
  };""",
    """    } else if (reasonConfirmed === true) {
      pbRunOnSession(() => pbProceedCloseOut(sid, '')); // closeout snapshots the session only after pending permit writes settle
    } else {
      /* hunt safety 04: one tap never closes a permit */
      pbConfirm('Close out this permit now?\\n\\nA closed permit can\\u2019t be reopened: its reminders stop and any further entry needs a new permit.', () => { if (confinedPermit && confinedPermit.sessionId === sid) pbRunOnSession(() => pbProceedCloseOut(sid, '')); }, 'Close Out Permit?', { no: 'Keep Permit Open', yes: 'Close Out Permit' });
    }
  };""")
open(out, 'w', encoding='utf-8').write(s)
