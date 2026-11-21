# survey s3: the stake photo reader fills cut/fill only when the stake itself says which way: a C / F letter or the
# word CUT / FILL next to the number (or "O/G", "ON GRADE" for 0.00). A stake that shows only a sign ("-4.68",
# "+0.50") or only an arrow is shown to the crew empty, with what the AI thought, so they pick cut or fill themselves:
# the meaning of + and - differs between surveyors and agencies (e.g. NCDOT's Manual for Construction Layout uses +/- for
# offset-stake-above/below on slope and ditch stakes), and a wrong direction doubles the error.
# Also: a stake written in metres (a station like 1+000, or "m" with the value) is never filled as feet.
# python3 s3_stake_cut_fill_needs_letter.py in.html out.html  (applies alone on r17.13)
import sys
s = open(sys.argv[1], encoding='utf-8').read()
def rep(old, new):
    global s
    n = s.count(old); assert n == 1, (n, old[:90]); s = s.replace(old, new)

rep("""      && (cfWritten === null || Math.abs(cfWritten - cfFeet) < 0.002) && (!cfLetter || (cfLetter[1].toUpperCase() === 'C') === (dir === 'cut'));""",
"""      && (cfWritten === null || Math.abs(cfWritten - cfFeet) < 0.002) && (!cfLetter || (cfLetter[1].toUpperCase() === 'C') === (dir === 'cut'))
      && pbStakeAiCfSays(cf, dir, cfFeet, o); /* survey s3 */""")

rep("""  // The AI's JSON -> review values. A field counts only when the AI was sure ("high") AND what it copied from""",
"""  // survey s3: the stake's own writing must say cut or fill (C / F / CUT / FILL beside the number, or on-grade words for
  // 0.00). A sign or an arrow alone is never trusted, and nothing written in metres is filled as feet.
  function pbStakeAiCfSays(cf, dir, feet, o) {
    const aw = String((cf && cf.as_written) || '');
    const sta = String((o && o.station && o.station.value) || '');
    if (/\\d\\s*\\+\\s*\\d{3}(?!\\d)/.test(sta) || /\\d\\s*\\+\\s*\\d{3}(?!\\d)/.test(aw) || /\\d\\s*(?:m|mm|metres?|meters?)\\b/i.test(aw)) return false;
    if (feet === 0 && /\\b(?:O\\s*\\/\\s*G|ON\\s*GRADE|GRADE|GRD|C\\s*=\\s*F)\\b|^\\s*0?\\.00\\s*$/i.test(aw)) return true;
    const w = /(?:^|[^A-Z])(CUT|FILL)(?![A-Z])/i.exec(aw) || /(?:^|[^A-Z])([CF])(?=[\\s.\\-+=:]*\\d)/i.exec(aw);
    return !!w && (w[1].charAt(0).toUpperCase() === 'C') === (dir === 'cut');
  }
  // The AI's JSON -> review values. A field counts only when the AI was sure ("high") AND what it copied from""")

open(sys.argv[2], 'w', encoding='utf-8').write(s)
print('s3 ok')
