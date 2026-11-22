const A_METRIC =
    /\b(production|produc(e|ed|ing)|footage|lf|feet|ft|man[- ]?hours?|(crew|machine|equipment|labor|work) hours|hours( \w+){0,3} (worked|logged|lost|put in)|hours on (the|it|job)|delays?|standby|downtime|tickets?|yd3|yards|materials?|equipment|machines?|utili[sz]ation|idle|runs?|crews?|crew members?|foremen|foreman|pipelayers?|laid|cost codes?|inspections?|pipe|fittings?|wyes?|tees|bends?|joints?|sticks?|crossings?|run notes?|site log|notes?|document(s|ed|ing|ation)?|promot(e|ed|ion|ions)|leadership|foreman material|run a crew|send[- ]?backs?|sent back)\b/i,
  A_AGG =
    /\b(compare|comparison|versus|vs\.?|trend|average|avg|totals?|sum|rates?|per (day|week|month|man[- ]?hour|crew|job|foot)|how (many|much)|percent(age)?|behind|ahead|on track|forecast|projected?|variance|best|worst|slowest|fastest|rank|most|least|breakdown|by (week|month|day|job|crew|foreman|size|reason|cost code|supplier)|how long|longer|slower|quicker|ready|who should|consistent(ly)?|reliable|thorough|fair(ly)?)\b/i,
  A_OWN =
    /\b(our|we|we've|we're|us|my|company|jobs?\s+\d|\d{2,4}-\d{2,4}|this (week|month|quarter|year)|last (week|month|quarter|year)|(past|last) (\d+|two|three|four|few|couple( of)?) (days|weeks|months)|ytd|year to date|since)\b/i,
  A_HOWTO = /^\s*(how (do|can|should|would) (i|we|you)|what (is|are|does)\b.*\bmean|explain\b)/i,
  A_DOING = /\bhow('s| is| are)\b.*\b(doing|going|keeping up|holding up)\b/i,
  A_RANKED =
    /\b(compare|comparison|versus|vs\.?|rank(ing)?|best|worst|fastest|slowest|quickest|most|least|top)\b/i,
  A_PEOPLE = /\b(foremen|foreman|crews?|pipelayers?|operators?|guys)\b/i,
  A_FITTIME =
    /\b(longer|slower|quicker|faster|extra time|more time|slow (us|them|the crew)( down)?)\b/i,
  A_FITTING = /\b(fittings?|wyes?|tees|bends?|elbows?|reducers?|crossings?)\b/i,
  A_TIMEWORD = /\b(take|takes|taking|took|time|slow|slows)\b/i,
  A_RULE =
    /\b(good for|expir\w*|valid|ticket life|tolerance zone|hand[- ]?dig\w*|positive response|white[- ]?lin\w*|dig law|one[- ]?call law|811 (law|rules?)|wait\w* (before|to) dig|how (long|many days) (do|does|must|should|before) (i|we|you|they)\b.{0,30}\b(wait|call|dig)|(call|calling) (811|in (the |my |a )?locates?) (before|ahead)|before (i|we|you) (can )?dig|laws?|rules?|regulations?|shor(e|ing)|slop(e|ing)|benching|trench box|shield|confined|permits?|atmospher\w*|oxygen|lel|h2s|cave[- ]?ins?|competent person|osha|allowed|required|requirements?|legal(ly)?)\b/i;
const A_KNOW = /\b(need(ed|s)?|have to|has to|must|should|supposed to|can (i|we|you|they|my|our)|before (we|i|you) (can|have to|need)|minimum|maximum|max|min|spec\w*|standard|code|cover|bedding|bury|buried|depth|deep|how (deep|far|close|wide|thick|often|soon)|distance|spacing|psi|pressure|air test|test(ed|ing)? (at|for|before|after)|velocity|notify|report|keep (the|our|these|those|my)?\s*\w*\s*(records?|reports?|logs?|permits?|payroll)|retain|renew\w*|update (my|the|a) ticket|placards?|hazmat|epa|dot|swppp|best (way|bedding|backfill|practice|method)|sit in the sun|sun|uv|wait (before|after|for))\b/i,
  A_DATA = /\b(jobs?\s+\d|job\s+#|\d{2,4}-\d{2,4}|this (week|month|quarter|year)|last (week|month|quarter|year)|(past|last) (\d+|two|three|four|few|couple( of)?) (days|weeks|months)|ytd|year to date|so far|to date|since (monday|tuesday|wednesday|thursday|friday|the start|we started)|did (we|our|my|they|he|she)|have (we|our|they) (laid|done|put|used|logged|called|had)|we('ve| have) (laid|done|put|used|logged|called|had)|our (crews|foremen|pipelayers|production|footage|numbers|runs|delays|hours|downtime)|[A-Z][a-z]+'s (crew|guys)|per (day|week|month|man[- ]?hour|crew|foreman)|compare|comparison|versus|vs\.?|trend|rank(ing)?|on track|behind schedule)\b/i;
function isAnalysisQuestion(q) {
  if (A_HOWTO.test(q) || A_RULE.test(q)) return !1;
  if (A_KNOW.test(q) && !A_DATA.test(q)) return !1; // ask_quality_nov22: a rule / spec question, not the company's own numbers
  if (A_FITTING.test(q) && A_FITTIME.test(q) && A_TIMEWORD.test(q)) return !0;
  if (!A_METRIC.test(q)) return !1;
  const agg = A_AGG.test(q) || A_DOING.test(q),
    own = A_OWN.test(q) || A_RANKED.test(q) && A_PEOPLE.test(q) ||
      /\b[A-Z][a-z]+'s (crew|guys)\b/.test(q);
  return agg && own;
}
function routeAnalysis(q, earlierQs) {
  if (isAnalysisQuestion(q)) return !0;
  if (
    A_HOWTO.test(q) || A_RULE.test(q) ||
    /\b(what (is|are|does)|what's an?|how (do|can|should))\b/i.test(q)
  ) return !1;
  const prevQ = earlierQs[0] || "";
  return q.split(/\s+/).filter(Boolean).length <= 8 &&
    /^\s*(and|what about|how about|same|now|ok|okay|vs\.?|versus|compared?|by|for|just|only|then)\b/i
      .test(q) &&
    isAnalysisQuestion(prevQ);
}
export { isAnalysisQuestion, routeAnalysis };
