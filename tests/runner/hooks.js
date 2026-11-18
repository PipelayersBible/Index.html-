// The test hooks the audit suites read app internals through. Each is one line inserted at a fixed anchor in the
// page's main script (the same lines the old mkcur_hook.sh / mkcur_dbg.py / mkT.py / new/t/instrument.py scripts added by hand).
// They only add a window function that evals inside the app's closure; nothing the app does changes.
'use strict';
const HOOKS = [
  { name: '__ev', anchor: '  function elevOutOfRange(val) {', where: 'before', line: '  window.__ev = function (__s) { return eval(__s); };\n' },
  { name: '__dbg', anchor: '  function numVal(id) {\n', where: 'before', line: '  window.__dbg = (s) => eval(s);\n' },
  { name: '__ra', anchor: '  window.__pbCsEntry = () => getCurrentArchiveEntry(); // tests\n', where: 'after',
    line: '  window.__ra = () => runArchive; window.__save = () => saveRunArchive(); window.__cur = (id) => { if (id !== undefined) currentRunArchiveId = id; return currentRunArchiveId; };\n' },
  { name: '__dEval', anchor: '  let runArchive = [];\n', where: 'after', line: '  window.__dEval = (x) => eval(x); // TEST HOOK ONLY\n' },
];
function addHooks(html) {
  const warnings = [];
  let s = html;
  for (const h of HOOKS) {
    const n = s.split(h.anchor).length - 1;
    if (n !== 1) { warnings.push(`hook ${h.name}: anchor found ${n} times, hook not added (tests that use window.${h.name} will fail)`); continue; }
    s = s.replace(h.anchor, h.where === 'before' ? h.line + h.anchor : h.anchor + h.line);
  }
  return { html: s, warnings };
}
// the crew-notice version the page asks for (co.js marks it as already seen)
function noticeVersion(html) {
  const m = html.match(/localStorage\.setItem\('pbCrewNotice:' \+ uid, '([^']+)'\)/);
  return m ? m[1] : null;
}
function buildStamp(html) {
  const m = html.match(/PB_APP_BUILD = '([^']+)'/);
  return m ? m[1] : null;
}
module.exports = { HOOKS, addHooks, noticeVersion, buildStamp };
