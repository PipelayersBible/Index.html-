# p2_not_emergency_link.py <in.html> <out.html> (emergency_nov22, Ask everyday review P2 C): a small "Not an emergency? Send to Ask"
# link under the newest instant emergency script. One tap sends the same question to Ask the normal way, with not_emergency: true
# so the server (staged build) skips its own emergency check too. A server without the flag answers with the script again
# (safe). The emergency card and its red EMERGENCY button stay. Retry of that question keeps the flag.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep("#pbApp .pb-ai-em { margin: 0 0 12px 0; }\n",
      "#pbApp .pb-ai-em { margin: 0 0 12px 0; }\n#pbApp .pb-ai-notem { margin: 6px 0 0 0; }\n#pbApp .pb-ai-notem .pb-btn { padding-left: 0; text-decoration: underline; text-underline-offset: 2px; }\n")
# the link: newest card only (after Ask answers, the emergency card is no longer the newest and the link goes)
p.rep("""      + (h.local ? '<div class="pb-alert danger pb-ai-local"><strong>' + (h.kind === 'emergency' ? 'Emergency' : 'Not an AI question') + '</strong><span class="pb-ai-a">' + escapeHtml(h.body) + '</span></div>' : '<div class="pb-ai-a">' + pbAiBodyHtml(h) + '</div>')\n""",
      """      + (h.local ? '<div class="pb-alert danger pb-ai-local"><strong>' + (h.kind === 'emergency' ? 'Emergency' : 'Not an AI question') + '</strong><span class="pb-ai-a">' + escapeHtml(h.body) + '</span></div>' : '<div class="pb-ai-a">' + pbAiBodyHtml(h) + '</div>')
      + (h.local && h.kind === 'emergency' && i === 0 && h.tid === pbAiAskThread.tid ? '<p class="pb-ai-notem"><button type="button" class="pb-btn small tertiary" onclick="pbAiAskNotEm(' + i + ')">Not an emergency? Send to Ask</button></p>' : '') // emergency_nov22: a false alarm costs one tap\n""")
p.rep("""    const h = pbAiAskHistory[i]; if (!h || !h.failed || pbAiAskBusy || h.tid !== pbAiAskThread.tid) return;
    window.pbAiAsk(h.q, h);
  };
""", """    const h = pbAiAskHistory[i]; if (!h || !h.failed || pbAiAskBusy || h.tid !== pbAiAskThread.tid) return;
    window.pbAiAsk(h.q, h, h.notEm ? { notEm: true } : undefined);
  };
  // emergency_nov22: "Not an emergency? Send to Ask" under the instant emergency script: the same question, sent the normal way
  window.pbAiAskNotEm = function(i) {
    const h = pbAiAskHistory[i]; if (!h || h.kind !== 'emergency' || pbAiAskBusy) return;
    window.pbAiAsk(h.q, null, { notEm: true });
  };
""")
p.rep("""  window.pbAiAsk = function(retryQ, retryEntry) { // r15.99: retryQ / retryEntry from Retry
""", """  window.pbAiAsk = function(retryQ, retryEntry, sendOpts) { // r15.99: retryQ / retryEntry from Retry
    const notEm = !!(sendOpts && sendOpts.notEm); // emergency_nov22: "Not an emergency? Send to Ask" was tapped
""")
p.rep("""    const local = pbAiAskLocal(q); // SF5: never sent; no plan, privacy or daily count involved
""", """    const local = notEm ? null : pbAiAskLocal(q); // SF5: never sent; no plan, privacy or daily count involved
""")
p.rep("""v1 = () => pbAiRequest('teacher', { text: pbAiAskMessage(q, ex) }, opts);""",
      """v1 = () => pbAiRequest('teacher', Object.assign({ text: pbAiAskMessage(q, ex) }, notEm ? { not_emergency: true } : {}), opts);""")
p.rep("""            live = { q, v: 2, body: '', streaming: true, safety: PB_AI_SAFETY_RX.test(q), sources: [], more: [], truncated: false };""",
      """            live = { q, v: 2, body: '', streaming: true, safety: PB_AI_SAFETY_RX.test(q), sources: [], more: [], truncated: false, notEm };""")
p.rep("""await pbAiRequest('teacher', Object.assign({ text: pbAiAskMessage(q, ex) }, pbAiAskPayload(q, ex, imgs)), opts2);""",
      """await pbAiRequest('teacher', Object.assign({ text: pbAiAskMessage(q, ex) }, pbAiAskPayload(q, ex, imgs), notEm ? { not_emergency: true } : {}), opts2);""")
p.save()
