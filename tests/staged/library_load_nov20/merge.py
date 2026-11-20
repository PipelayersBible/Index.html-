# merge.py (library_load_nov20, 2026-11-20): one validated library set from all staged collections.
#   python3 merge.py        -> out/core.jsonl, out/shelf.jsonl, out/held.jsonl, out/edits.jsonl, out/cases.jsonl, out/MERGE_REPORT.txt
# Nothing here talks to the server. Rules: ../library_arch_nov20/LIBRARY_RULES.md (lib_kb.py checks every new chunk).
# Local fixes found by the free retrieval check and by eval rounds live in fixes.py (titles in crew language, case fixes).
import json, os, re, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(S, 'library_arch_nov20')); import lib_kb
sys.path.insert(0, HERE)
try: import fixes
except ImportError: fixes = None
L = lambda f: [json.loads(l) for l in open(os.path.join(S, f)) if l.strip()]
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
rep = []; say = lambda *a: rep.append(' '.join(str(x) for x in a))

# ---- the live library (local copy, byte-checked against the server on Nov 20) + the staged state fix (applies to the next-only copy)
kb_live = json.load(open(os.path.join(S, 'ask_state_nov20/work/kb_after.json')))   # live since the lead applied 01_ask_kb_state_fix.sql (server md5 checked 17:21 UTC)
kb_fix = json.load(open(os.path.join(S, 'ask_state_nov20/work/kb_after.json')))
LIVE = {c['id']: dict(c, _lib=lib) for lib, v in kb_live.items() for c in v}
BASE = {c['id']: dict(c, _lib=lib) for lib, v in kb_fix.items() for c in v}

FILES = ['lib_811_nov20/lib_811_dig.jsonl', 'lib_811_nov20/lib_811_fed.jsonl', 'lib_osha_nov20/lib_osha_fed.jsonl', 'lib_osha_nov20/lib_osha_sp.jsonl',
         'lib_traffic_nov20/traffic_mutcd.jsonl', 'lib_traffic_nov20/v2/traffic_tc.jsonl', 'lib_specs_nov20/specs.jsonl', 'lib_more_nov20/lib_more.jsonl']
NEW = collections.OrderedDict()
for f in FILES:
    for c in L(f):
        assert c['id'] not in NEW and c['id'] not in LIVE, c['id']
        c['_from'] = f.split('/')[0]; NEW[c['id']] = c
say(f'staged chunks read: {len(NEW)} from {len(FILES)} files')

# ---- 0. slips reported by the lead: Indiana's 811 overview was written as shelf; it is the state's answer card (it replaces dig-in)
assert NEW['dig-in-overview-1']['tier'] == 'shelf'; NEW['dig-in-overview-1']['tier'] = 'core'
_t = NEW['dig-in-overview-1']['text']; _x = ' A Joint Meet is not a ticket to dig on.'; assert _t.count(_x) == 1   # 1,222 characters: one sentence out to fit the 1,200 card limit
NEW['dig-in-overview-1']['text'] = _t.replace(_x, '')
# ---- 1. held: low-confidence placeholders the lead said to hold (they only say "not read yet")
HOLD = {'sp-ia-who-1': 'Iowa plan not read', 'sp-vt-who-1': 'Vermont plan not read', 'sp-wy-who-1': 'Wyoming plan not read',
        'sp-in-who-1': 'Indiana excavation standard not found', 'sp-mi-confined-1': 'MIOSHA Part 35 not opened',
        'sp-ca-program-1': 'Cal/OSHA 1509 / 3203 not read', 'sp-wa-fall-1': 'WAC 296-880 sections not read'}
held = [NEW.pop(i) for i in HOLD]
for c in held: c['note'] = 'HELD: ' + HOLD[c['id']]

# ---- 2. supersedes (one card per subject; the old row is replaced in place, never deleted)
SUP = {'sp-mi-trench-1': 'plan-mi-trench-1', 'sp-or-confined-1': 'plan-or-confined-1', 'sp-wa-confined-1': 'plan-wa-confined-1',
       'mutcd-6b-signspacing-1': 'traffic-control-4'}      # traffic-control-4 (ord 1984) had made-up mph bands and the table numbering backwards
for new, old in SUP.items():
    assert old in LIVE and not NEW[new].get('supersedes'); NEW[new]['supersedes'] = old
for c in NEW.values():
    if c.get('supersedes'): assert c['supersedes'] in LIVE, c['id']

# ---- 3. Washington sloping table (ask_followups_nov20). plan-wa-trench-1 is dropped: sp-wa-trench-1, -plan-1 and -other-1 say the same
#         from the same sections. plan-wa-trench-2 (Table N-1, no short-term Type A slope) is kept as an sp- card, trimmed to card length.
fw = {c['id']: c for c in L('ask_followups_nov20/sql/kb_followups.jsonl')}
t2 = fw['plan-wa-trench-2']['text']
cut = [' The Type A, B and C angles themselves are the same as federal.', ' And remember that Washington requires protection from 4 ft, not 5 ft.',
       ' When the slope shows signs of distress, cut it back at least 1/2 horizontal to 1 vertical flatter than the maximum allowable slope.',
       '; this is a plain-language summary and the WAC text governs']
for x in cut: assert t2.count(x) == 1, x; t2 = t2.replace(x, '')
t2 = t2.replace("Washington's sloping table is Table N-1 in WAC 296-155-66403 (Part N, Appendix B).", "Washington's trench sloping table is Table N-1 in WAC 296-155-66403 (Part N, Appendix B).")
NEW['sp-wa-trench-slope-1'] = dict(id='sp-wa-trench-slope-1', state='WA', tier='core',
    title='Washington trench sloping by soil type (Table N-1): no steeper short-term slope in Type A', topic='State safety program: trench and excavation',
    text=t2, source='WAC 296-155-66403 Table N-1 and notes (WSR 16-09-085); 29 CFR 1926 Subpart P Appendix B, Table B-1 note 2',
    url=fw['plan-wa-trench-2']['url'], checked='2026-11-20', edition='WAC 296-155-66403 as filed WSR 16-09-085', confidence='high', kind='summary', license='gov-state', _from='ask_followups_nov20')
sp_topic = collections.Counter(c['topic'] for c in NEW.values() if c['id'].startswith('sp-') and 'trench' in c['id']).most_common(1)[0][0]
NEW['sp-wa-trench-slope-1']['topic'] = sp_topic

# ---- 4. the old dig-<st> card's trench line. Every dig-<st>-overview-1 replaces dig-<st>; the old card also carried a trench line
#         from the app's state table. Where an sp- chunk covers that state's trench rule it is not needed. Elsewhere it is kept:
#         (a) 24 states under federal OSHA with no sp- chunk: one small sp-<st>-trench-1 card (federal 5 ft; osha.gov/stateplans re-read Nov 20);
#         (b) IA, IN, VT, WY (state plans whose sp- placeholder is held): the old "not checked" line lives on in plan-trench-depth-1.
cover = {c['state'] for c in NEW.values() if c['id'].startswith('sp-') and re.search(r'trench|excavat', c['title'] + c['text'], re.I)}
FED_ONLY, PLAN_HELD = [], []
for i, c in LIVE.items():
    m = re.match(r'^dig-([a-z]{2})$', i)
    if not m: continue
    st = m.group(1).upper(); ov = NEW[f'dig-{m.group(1)}-overview-1']; assert ov['supersedes'] == i
    line = re.search(r'Trench protection: (.*?) Rules change\.', c['text']).group(1)
    if st in cover: continue
    name = lib_kb.STATES[st]; the = 'The District of Columbia' if st == 'DC' else name
    if line.startswith('Federal OSHA'):
        FED_ONLY.append(st)
        NEW[f'sp-{st.lower()}-trench-1'] = dict(id=f'sp-{st.lower()}-trench-1', state=st, tier='core',
            title=f'{name} trench protection depth: the federal OSHA rule, 5 feet (trench box, shoring, sloping)', topic=sp_topic,
            text=f'{the} has no state OSHA plan that covers private employers, so federal OSHA covers private construction crews there (OSHA list of State Plans). '
                 'Trench protection: a protective system (sloping, benching, shoring, or a trench box / shield) is required in an excavation 5 ft or deeper unless it is '
                 'entirely in stable rock, and in a shallower one when the competent person sees signs of a possible cave-in (29 CFR 1926.652(a)(1)). '
                 f'There is no separate {name} trench depth rule for private crews in the library; the competent person decides what protection the trench gets.',
            source='29 CFR 1926.652(a)(1); OSHA State Plans list (osha.gov/stateplans); app state table checked 2026-11-19',
            url='https://www.osha.gov/stateplans', checked='2026-11-20', edition='29 CFR 1926 Subpart P as in force 2026-11-20', confidence='medium', kind='summary', license='gov-us', _from='library_load_nov20')
    else:
        assert line.startswith('State OSHA plan'), (st, line); PLAN_HELD.append(st)
        # not appended (two overviews would pass the 1,200-character card limit): the same words are in the general card plan-trench-depth-1,
        # which names these four plans as not yet checked and gives federal 5 ft as the floor
say(f'old dig cards: trench line covered by sp- chunks in {len(cover)} states; federal-rule sp cards written for {len(FED_ONLY)} ({" ".join(sorted(FED_ONLY))}); left to the general card plan-trench-depth-1 (names them as not yet checked) in {" ".join(sorted(PLAN_HELD))}')

# ---- 5. in-place text edits of live chunks (same id, same row). rep() is exact-once.
EDITS = {}
def edit(cid, old, new, why):
    c = EDITS.get(cid) or {k: v for k, v in BASE[cid].items() if not k.startswith('_')}
    assert c['text'].count(old) == 1, (cid, old); c['text'] = c['text'].replace(old, new); EDITS[cid] = c; say(f'edit {cid}: {why}')
edit('quick-reference-6', 'Advance sign spacing: urban 30 mph or less 100 ft each; urban 35 to 45 mph 350 ft; rural 500 ft; freeway 1,000, 1,500, 2,640 ft.',
     'Advance sign spacing (national Table 6B-1; the road agency decides which streets are low or high speed, and some state manuals set it by mph): urban low speed 100 ft each; urban high speed 350 ft; rural 500 ft; freeway 1,000, 1,500, 2,640 ft.',
     'sign spacing had made-up mph bands (lib_traffic finding 3)')
edit('tc-2', 'urban low speed (25 mph or less) 100 ft each', 'urban low speed 100 ft each (the road agency sets the speed category; some state manuals set it by mph)', '"25 mph or less" is one state\'s row, not national text (lib_traffic finding 6)')
edit('test-3', 'two sets at least 24 hours apart, or per the agency', 'two sets that both pass, taken as the spec says (AWWA C651-14: a second set at least 16 hours after the first, or let the main sit 16 hours and take two sets 15 minutes apart; specs written on the 2005 edition say 24 hours apart), or per the agency',
     'bac-T rule was the 2005 edition (lib_more F2)')
edit('quick-reference-3', 'Flush at about 2.5 ft per second where possible (8 inch about 390 gpm).', 'Flush before chlorinating at 3.0 ft per second or more (AWWA C651-14 Sec. 4.4.2; the 2005 edition said 2.5 ft per second, which is about 390 gpm in 8 inch).',
     'flushing velocity was the 2005 edition (lib_more F3)')
edit('plan-trench-depth-1', 'Arizona, Nevada, New Mexico, Oregon and Utah adopt the federal excavation standard, so 5 ft. Not yet checked line by line: Alaska, Hawaii, Indiana, Iowa, Kentucky, Maryland, Minnesota, North Carolina, South Carolina, Tennessee, Vermont, Virginia and Wyoming; treat federal 5 ft as the floor there',
     'Arizona, Nevada, New Mexico, Oregon and Utah adopt the federal excavation standard, so 5 ft; Alaska, Kentucky, Minnesota and Tennessee adopt the federal rule and Hawaii, North Carolina and Virginia list no excavation rule of their own (from OSHA\'s and the agencies\' pages, not each state code read line by line), so 5 ft; South Carolina uses the federal text and adds training to the competent person definition. Not yet checked: Indiana, Iowa, Maryland (a state supplement to the federal rule exists and was not read), Vermont and Wyoming; treat federal 5 ft as the floor there',
     'names the plans lib_osha read (lib_osha app list item 11)')
# the staged ask_state KB fix (30 chunks: state tags, full source lines back): applied to the next-only copy, where the state-aware build reads it
for i in BASE:
    a = {k: v for k, v in LIVE[i].items() if not k.startswith('_')}; b = {k: v for k, v in BASE[i].items() if not k.startswith('_')}
    if a != b and i not in EDITS and not re.match(r'^dig-[a-z]{2}$', i): EDITS[i] = b
say(f'in-place edits of live chunks: {len(EDITS)} (5 content fixes + {len(EDITS) - 5} from ask_state_nov20/sql/01_ask_kb_state_fix.sql; the dig-<st> rows are replaced by the overviews instead)')

# ---- 6. local fixes (titles in crew language etc.), then validate with lib_kb and enforce the core budget
if fixes: fixes.apply(NEW, EDITS, BASE, say)
# ---- 6a. copyright (Tommy, Nov 20: 811 center handbooks, state DOT spec books and paid standards are SUMMARIES ONLY).
#          lib_kb applies its quote limits only to license "summary"; here they apply to every chunk outside the federal collections whose
#          source names a document that is not law (handbook, manual, guide, spec book, standard, supplement), whatever its license says.
NONLAW = re.compile(r'handbook|manual|guide|standard specifications|spec book|specifications|best practices|AWWA|ASTM|AASHTO|Greenbook|Ten States|DIPRA|association|excavator|MUTCD|supplement', re.I)
QUOTES_ARE_STATUTE = {'dig-ga-tickets-1': 'its quotes are O.C.G.A. 25-9 text (the url is the dig law itself); shelf tier'}
cp = []
for c in list(NEW.values()):
    coll = c['id'].split('-')[0]
    if coll in ('osha', 'fed', 'mutcd'): continue          # federal government works (17 U.S.C. 105)
    if c['kind'] != 'summary': cp.append(f"{c['id']}: kind {c['kind']}")
    if coll in ('sp',) and not NONLAW.search(c['source']): continue
    qs = [len(q.split()) for q in re.findall(r'"([^"]{20,})"', c['text'])]
    if NONLAW.search(c['source']) and c['id'] not in QUOTES_ARE_STATUTE and (max(qs, default=0) > lib_kb.QUOTE_MAX_WORDS or sum(qs) > 0.25 * len(c['text'].split())):
        cp.append(f"{c['id']}: quotes {max(qs)} words max, {sum(qs)} of {len(c['text'].split())} words")
say(f'copyright check (summaries only for handbooks, spec books, standards): {len(cp)} problems; every non-federal chunk is kind "summary"; 1 allowed exception: ' + '; '.join(f'{k} ({v})' for k, v in QUOTES_ARE_STATUTE.items()))
for x in cp: say('  COPYRIGHT', x)
assert not cp
B = lib_kb.Batch('merged', out_dir=OUT)
for c in NEW.values(): B.add(**{k: v for k, v in c.items() if not k.startswith('_')})
E, W = B.check(existing_ids=[i for i in LIVE])
E = [e for e in E if 'duplicate id' not in e or e.split(':')[0] not in LIVE]
budget = collections.Counter(); us = collections.Counter()
for c in NEW.values():
    if c['tier'] == 'core':
        if c['state'] == 'US': us[c['id'].split('-')[0]] += 1
        else: budget[c['state']] += 1
over = {s: n for s, n in budget.items() if n > lib_kb.CORE_PER_STATE}
core = [c for c in NEW.values() if c['tier'] == 'core']; shelf = [c for c in NEW.values() if c['tier'] == 'shelf']
n_new = sum(1 for c in core if not c.get('supersedes'))
say(f'lib_kb check: {len(E)} errors, {len(W)} warnings')
for e in E: say('  ERROR', e)
say(f'core: {len(core)} chunks ({n_new} new rows + {len(core) - n_new} replacing live rows in place); shelf: {len(shelf)}; held: {len(held)}')
say(f'core total after load: {len(LIVE)} live + {n_new} = {len(LIVE) + n_new} (cap 6,000)')
say('core per state (cap 40): max', max(budget.values()), 'in', max(budget, key=budget.get), '; over cap:', over or 'none')
say('core US by collection (caps ' + str(lib_kb.CORE_US) + '):', dict(us))
if E or over: print("\n".join(rep)); raise SystemExit(1)
assert len(LIVE) + n_new <= 6000
clean = lambda c: {k: v for k, v in c.items() if not k.startswith('_')}
def dump(name, rows):
    with open(os.path.join(OUT, name), 'w') as f:
        for c in rows: f.write(json.dumps(clean(c) if name != 'edits.jsonl' else c, ensure_ascii=False) + '\n')
dump('core.jsonl', core); dump('shelf.jsonl', shelf); dump('held.jsonl', held); dump('edits.jsonl', list(EDITS.values()))
json.dump({c['id']: c['_from'] for c in NEW.values()}, open(os.path.join(OUT, 'origin.json'), 'w'))

# ---- 7. eval cases: one pool, ids unique and not taken on live
TAKEN = set(open(os.path.join(HERE, 'live_eval_ids.txt')).read().split())
CF = [('lib_811_nov20/cases_811.jsonl', '811'), ('lib_osha_nov20/cases.jsonl', 'osha'), ('lib_traffic_nov20/v2/traffic_cases.jsonl', 'traffic'),
      ('lib_specs_nov20/cases.jsonl', 'specs'), ('lib_more_nov20/cases_existing.jsonl', 'more'), ('lib_more_nov20/cases_new.jsonl', 'more')]
REMAP = {'plan-wa-trench-1': 'sp-wa-trench-1', 'plan-wa-trench-2': 'sp-wa-trench-slope-1'}
for c in NEW.values():
    if c.get('supersedes'): REMAP[c['supersedes']] = c['id']
ALL = set(NEW) | (set(LIVE) - set(REMAP)); HELD = set(HOLD); SHELF = {c['id'] for c in shelf}
cases, seen, dropped = [], set(), []
for f, coll in CF:
    for c in L(f):
        if c['id'] in seen or c['id'] in TAKEN: old = c['id']; c['id'] = re.sub(r'-(\d+)$', lambda m: f'-{coll}-{m.group(1)}', old); say(f'case id {old} taken: renamed {c["id"]}')
        assert c['id'] not in seen and c['id'] not in TAKEN; seen.add(c['id'])
        c['chunks'] = [REMAP.get(x, x) for x in c.get('chunks', [])]
        if c['chunks'] and all(x in HELD for x in c['chunks']): dropped.append(c['id']); continue
        c['chunks'] = [x for x in c['chunks'] if x not in HELD]
        bad = [x for x in c['chunks'] if x not in ALL]; assert not bad, (c['id'], bad)
        e = lib_kb.check_case(c); assert not e, (c['id'], e)
        c['coll'] = coll; c['tier'] = 'shelf' if all(x in SHELF for x in c['chunks']) else 'core'
        cases.append(c)
# Washington follow-up cases (ask_followups_nov20), rewritten in the library case layout
fwc = json.load(open(os.path.join(S, 'ask_followups_nov20/tools/cases_wa.json')))
FW = {'fwa1': (['sp-wa-trench-1'], 'rule', 'Seattle, WA', ['4 ?(ft|feet|foot)']), 'fwa2': (['sp-wa-trench-plan-1'], 'rule', 'Tacoma, WA', ['written']),
      'fwa3': (['sp-wa-trench-slope-1'], 'rule', 'Spokane, WA', ['3/4|0\\.75|three.quarter']), 'fwa4': (['sp-wa-trench-plan-1'], 'rule', 'Everett, WA', ['on (the )?(job ?)?site|remain|stay|\\bno\\b']),
      'fwa5': (['osha-pl-exc-appb-1'], 'rule', 'Austin, TX', ['1/2|half'])}
for c in fwc:
    ch, kind, where, lead = FW[c['id']]; ch = [x for x in ch if x in ALL] or ch
    cases.append(dict(id='lib-wa-fup-' + c['id'][-1], cat='trench', q=c['q'], where=where, level=c['level'], kind=kind, must=c['must'], lead=lead, mustnot=[], chunks=ch,
                      state_strict=False, coll='osha', tier='core'))
if fixes: fixes.fix_cases(cases, ALL, say)
for c in cases:
    bad = [x for x in c['chunks'] if x not in ALL]; assert not bad, (c['id'], bad)
with open(os.path.join(OUT, 'cases.jsonl'), 'w') as f:
    for c in cases: f.write(json.dumps(c, ensure_ascii=False) + '\n')
by = collections.Counter((c['coll'], c['tier']) for c in cases)
say(f'cases: {len(cases)} ({dict(by)}); dropped {len(dropped)} whose only chunk is held: {" ".join(dropped)}')
open(os.path.join(OUT, 'MERGE_REPORT.txt'), 'w').write('\n'.join(rep) + '\n'); print('\n'.join(rep))
