#!/usr/bin/env python3
# runsetup 04: "Same pipe as the last run on this job" — one button under Pipe size on a new run.
# Shown only while the pipe size is not picked yet, the form has a job number, and this phone has a locked run with the
# same job number. A tap runs the SAME copy "Reuse Pipe Settings" already does for that run (pbApplyDuplicateRun: rod
# unit, pipe size, type, wall, laying length, bedding, trench width) and shows its same "Settings Applied" message.
# Nothing is filled without the tap. No new copy logic, no change to grade math or to what a run saves.
# Usage: python3 04_same_pipe_chip.py in.html out.html
import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)

rep("""  window.pbOpenCutsheetImport = function() {
    pbGoto('cutsheetImport');
  };""", """  window.pbOpenCutsheetImport = function() {
    pbGoto('cutsheetImport');
  };
  // runsetup 04: one tap for "the same pipe as the last run on this job" (the Reuse Pipe Settings copy, for that run)
  function pbSamePipeFind() {
    const jn = String((document.getElementById('saJobNumber') || {}).value || '').trim().toLowerCase(); if (!jn) return null;
    const idSel = document.getElementById('runIdSel'); if (!idSel || idSel.value !== '' || String(document.getElementById('runWT').value || '').trim() !== '') return null;
    if (!pbFormFresh || window._pbResumingFromEntryId) return null;
    const e = runArchive.find(x => x && x.kind === 'run' && String(x.jobNumber || '').trim().toLowerCase() === jn && x.summary && x.summary.pipeInfo && x.summary.pipeInfo[0] && x.summary.pipeInfo[0].idIn != null);
    return e || null;
  }
  function pbSamePipeRender() {
    const sec = document.getElementById('runPipeSection'), body = sec && sec.querySelector('.pb-body'); if (!body) return;
    let b = document.getElementById('runSamePipeBtn'); const e = pbSamePipeFind();
    if (!e) { if (b && !b.hidden) b.hidden = true; return; }
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'runSamePipeBtn'; b.className = 'pb-samepipe';
      b.addEventListener('click', () => { const x = pbSamePipeFind(); if (!x) { b.hidden = true; return; } const sel = document.getElementById('duplicateRunSel'); sel.innerHTML = '<option value="' + escapeHtml(String(x.id)) + '"></option>'; sel.value = String(x.id); sel.disabled = false; window.pbApplyDuplicateRun(); sel.innerHTML = ''; b.hidden = true; }); }
    if (b.parentNode !== body) body.appendChild(b);
    const p = e.summary.pipeInfo[0], ty = typeof e.pipeType === 'string' && e.pipeType ? e.pipeType : (typeof e.pipeTypeAuto === 'string' && e.pipeTypeAuto ? e.pipeTypeAuto : (typeof e.statsType === 'string' ? e.statsType : ''));
    const t = 'Same as the last run on this job: ' + String(p.idIn).replace(/\\.0+$/, '') + '\\u2033' + (ty ? ' ' + ty : '');
    if (b.textContent !== t) b.textContent = t;
    if (b.hidden) b.hidden = false;
  }
  setInterval(() => { try { if (pbCurrentScreen === 'input') pbSamePipeRender(); } catch (e) {} }, 1200);
  (window.pbScreenHooks = Array.isArray(window.pbScreenHooks) ? window.pbScreenHooks : []).push((name) => { if (name === 'input') setTimeout(() => { try { pbSamePipeRender(); } catch (e) {} }, 300); });
  ['input', 'change'].forEach(t => document.addEventListener(t, (ev) => { if (pbCurrentScreen === 'input' && ev.target && (ev.target.id === 'runIdSel' || ev.target.id === 'saJobNumber' || ev.target.id === 'runWT')) setTimeout(() => { try { pbSamePipeRender(); } catch (e) {} }, 50); }, true));""")
rep("""#pbApp#pbApp #screen-input #pbRfWhoLine { margin-top: 0; margin-bottom: 0; }""", """#pbApp#pbApp #screen-input #pbRfWhoLine { margin-top: 0; margin-bottom: 0; }
/* runsetup 04: same pipe as the last run on this job */
#pbApp#pbApp #screen-input .pb-samepipe { display: block; width: calc(100% - 32px); margin: 2px 16px 12px; min-height: 48px; padding: 8px 14px; border-radius: 12px; border: 1.5px solid var(--pb-text-3); background: var(--pb-surface); color: var(--pb-text); font: inherit; font-size: 15px; font-weight: 600; text-align: left; line-height: 1.3; }
#pbApp#pbApp #screen-input .pb-samepipe[hidden] { display: none; }""")
open(out, 'w', encoding='utf-8').write(s)
print('04_same_pipe_chip ok')
