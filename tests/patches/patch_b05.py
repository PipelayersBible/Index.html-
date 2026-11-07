import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; n=s.count(a); assert n==1,(n,a[:70]); s=s.replace(a,b)
rep("""(prior.sent === true ? '; its report was already sent' : '') + '), or keep both if this is another run?' + (typeof window.pbR57LockToLine""",
"""(prior.sent === true ? '; its report was already sent' : '') + ')? To lay another run, end this one first.' + (typeof window.pbR57LockToLine""")
rep("""          { label: 'Cancel' },
          { label: 'Keep Both', onClick: () => again({}) },
          { label: 'Replace', primary: true, onClick: () => again({ replacePriorId: prior.id }) }
        ], 'Locked Once Already');
        return;
      }
    }""","""          { label: 'Cancel' },
          { label: 'Replace', primary: true, onClick: () => again({ replacePriorId: prior.id }) }
        ], 'Locked Once Already'); /* feat_r1612 (B05): no Keep Both: it left two open runs */
        return;
      }
      // feat_r1612 (B05): an edited form of a run that is still open, with work on it: locking would leave a second open run.
      if (prior && runArchive.includes(prior) && !prior.runEndTime && !prior.completed && !prior.incomplete) {
        pbShowModal(prior.startLabel + ' \\u2192 ' + prior.endLabel + ' is still open. Fix a distance or hub with Correct a Distance or Hub on its Results, or end it before locking another run.', [{ label: 'OK', primary: true }], 'Run Still Open');
        return;
      }
    }""")
open(out,'w',encoding='utf-8').write(s); print('ok')
