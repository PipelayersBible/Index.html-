# The two word choices Tommy is asking his crews about. ONE EDIT EACH, then `python3 build.py` (or `sh mk.sh`).
# In the strings files they are written [[att]] / [[Att]] / [[ATT]] / [[atts]] and [[grade]] / [[grades]] / [[Grade]].

WORD_ATTENDANT = 'asistente'    # 'asistente' (OSHA's Spanish fact sheets)  or  'vigilante' (many trainers, Cal/OSHA material)
WORD_GRADE = 'nivel'            # 'nivel'  or  'grade' (kept in English, the way many US crews say it: "está a grade")

# --- nothing to edit below ---
_PL = {'asistente': 'asistentes', 'vigilante': 'vigilantes', 'nivel': 'niveles', 'grade': 'grade'}
def tokens():
    a, g = WORD_ATTENDANT, WORD_GRADE
    return {'att': a, 'Att': a.capitalize(), 'ATT': a.upper(), 'atts': _PL[a], 'Atts': _PL[a].capitalize(),
            'grade': g, 'grades': _PL[g], 'Grade': g.capitalize(), 'Grades': _PL[g].capitalize(), 'GRADE': g.upper()}
