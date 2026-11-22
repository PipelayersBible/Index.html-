const PB_AI_EMERGENCY_RX = [
    /\b(passed out|pass(ing)? out|unconscious|not responding|unresponsive|not breathing|stopped breathing|man down|keeled over|overcome by)\b/,
    /\b(isnt|is not|not|wont|will not|stopped|cant get him to|cant get her to)\s+(answering|answer|responding|respond|talking|moving)\b/,
    /\b(cant|cannot|can not|couldnt)\s+(reach|raise|hear|see|wake)\s+(him|her|them|my|the|our)\b/,
    /\bno (answer|response) from\b/,
    /\b(someone|somebody|he|she|they|guy|man|worker|buddy|partner|entrant|laborer|operator|pipelayer|crew ?member|my \w+)\b.{0,25}\b(is down|are down|went down|fell (in|down)|collapsed|buried|trapped|pinned)\b/,
    /\b(cave[- ]?in|trench|wall|side|bank|hole|ditch)\b.{0,20}\b(just )?(collapsed|caved|came down|fell in|gave way)\b/,
    /\b(gas )?(alarm|monitor|meter|detector|sniffer)\b.{0,20}\b(going off|is going|went off|alarming|beeping|screaming)\b/,
    /\bgas alarm\b/,
  ],
  PB_AI_GAS_NUM = String
    .raw`(\d+(\.\d+)?\s*(%|ppm)|\b(o2|oxygen|lel|h2s|co|carbon monoxide)\b\s*(is|at|of|reads?|reading|=|:)?\s*\d|\d+(\.\d+)?\s*(o2|oxygen|lel|h2s|co)\b|\breadings?\b[^?]{0,30}\d)`,
  PB_AI_GONOGO_RX = [
    /\b(can|could|may|should|do|shall)\s+(i|we|he|she|they|you|my crew|the crew|my guys|the guys|our crew)\s+(go|get|climb|step)?\s*(in|into|inside|down|enter)\b/,
    /\b(can|could|may|should)\s+(my|our|the|his|her|their|this|that)\s+\w+(\s+\w+)?\s+(go|get|climb|step)?\s*(in|into|inside|down|enter)\b/,
    /\b(can|could|may|should)\s+(i|we|he|she|they|my crew|the crew)\s+(start|begin|keep)\s+(the\s+)?(entry|entering|work(ing)? in)\b/,
    /\b(safe|ok|okay|good|fine|alright|clear|cleared)\b.{0,25}\b(enter|entry|go in|get in|go down|climb in|work in|be in)\b/,
    /\b(enter|entry|go in|get in|go down)\b.{0,25}\b(safe|ok|okay|allowed|good to go|fine)\b/,
    /\b(sign|issue|approve|open|authorize|authorise|close)\b.{0,20}\bpermit\b/,
    /\b(is|are|was)\b.{0,30}\b(trench|excavation|hole|ditch|space|manhole|vault|tank|pit|box|bank|wall)\b.{0,30}\b(safe|ok|okay|good|stable|fine|solid)\b/,
    /\b(is|are)\s+(it|this|that|we|they|everything|the air|the space|the hole)\s+(safe|clear|safe enough)\b/,
    /\b(do|does|would|will|should)\s+(i|we|you|they|it|my|our|this|that|the)\b.{0,30}\b(need|require|have to have|got to have)\b.{0,20}\b(shor\w*|a (trench )?box|shield|slop\w*|bench\w*|protective system|protection)\b/,
    /\b(ok|okay|fine|safe|alright|good|legal|allowed)\b.{0,20}\bwithout (a |any |the )?(trench )?(box|shoring|shield|sloping|benching|protection|protective system)\b/,
    /\bwithout (a |any |the )?(trench )?(box|shoring|shield|protection)\b.{0,20}\b(ok|okay|fine|safe|alright|allowed)\b/,
    /\b(skip|bypass|ignore|disable|silence|turn off|forget|go without|do without|work without|enter without)\s+(the |an |a |our |any )?(attendant|air test\w*|gas test\w*|test(ing)?|permit|monitor\w*|meter|sniffer|alarm|blower|ventilation|fan|harness|tripod|retrieval\w*|rescue plan)\b/,
    /\bwithout (an |the |a )?(attendant|permit|air test\w*|gas monitor|monitor|meter)\b.*\?/,
    /\b(keep|continue|still)\s+(digging|working|going|in there)\b.*\?/,
    new RegExp(
      "^(?=.*" + PB_AI_GAS_NUM +
        ")(?=.*\\b(good|ok|okay|acceptable|within (the )?limits?|in range|fine|safe|normal|alright|passing|pass)\\b)",
    ),
    /\b(good to go|go or no[- ]?go|no[- ]?go)\b/,
  ],
  PB_AI_GAS_RX = new RegExp(PB_AI_GAS_NUM),
  PB_AI_ENTER_RX = /\b(enter|entry|go in|get in|go down|climb in|work in)\b/,
  PB_AI_SAFETY_RX =
    /\b(trench\w*|shor(e|ing)|excavat\w*|cave[- ]?ins?|confined|permits?|entr(y|ant|ants)|attendants?|atmospher\w*|lel|h2s|oxygen|o2|gas(es)?|ventilat\w*|rescue|competent person|osha|protective system|benching|trench box|shield|1926|1910)\b/i;
function localAnswer(q) {
  const t = String(q).toLowerCase().replace(/[’']/g, "");
  return PB_AI_EMERGENCY_RX.some((r) => r.test(t))
    ? {
      kind: "emergency",
      text: `If someone is down, not responding, trapped, or a gas alarm is going off:
- Get out yourself and keep everyone else out.
- Do NOT go in after them unless you are a trained, equipped rescuer. Untrained rescuers are often the next victims.
- Call 911 or your emergency number now, then tell your supervisor / entry supervisor.
- If a permit is open, use EMERGENCY so the entry team and the permit record know.`,
    }
    : PB_AI_GONOGO_RX.some((r) => r.test(t)) || PB_AI_GAS_RX.test(t) && PB_AI_ENTER_RX.test(t)
    ? {
      kind: "gonogo",
      text:
        `The app’s AI never decides whether a space or trench is safe to enter. Stop and ask your entry supervisor / competent person.

The pages below explain the rules, but they don’t decide for your site.`,
    }
    : null;
}
function v1Question(text) {
  const m = String(text || "").match(/^QUESTION:\s*(.*)$/m);
  return m ? m[1] : String(text || "").split(/\n\s*\n/)[0];
}
export {
  localAnswer,
  PB_AI_EMERGENCY_RX,
  PB_AI_ENTER_RX,
  PB_AI_GAS_NUM,
  PB_AI_GAS_RX,
  PB_AI_GONOGO_RX,
  PB_AI_SAFETY_RX,
  v1Question,
};
