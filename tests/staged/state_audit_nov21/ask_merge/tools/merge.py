# merge.py (state audit Nov 21): one Ask library load from the four state-audit card batches + in-place fixes of live chunks.
#   python3 tools/merge.py            -> merged_core.jsonl, merged_shelf.jsonl, edits.jsonl, cases.jsonl, merged_report.txt (in ask_merge/)
# Inputs are read, never changed. Live rows = work/live_rows.jsonl (local copy, md5 = server's 347ae4d8..., read Nov 20 21:00 PT).
import json, os, re, sys, collections
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))            # ask_merge/
A = os.path.dirname(H)                                                       # state_audit_nov21/
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
import lib_kb

BATCHES = ['survey/lib_survey.jsonl', 'safety/lib/lib_safety_fed.jsonl', 'safety/lib/lib_safety_states.jsonl',
           'specs_permits/lib/sa_locatable.jsonl', '811/lib/audit811_dig.jsonl']
CASES = ['survey/cases.jsonl', 'safety/lib/cases.jsonl', 'specs_permits/lib/cases.jsonl', '811/lib/cases_audit811.jsonl']

live = [json.loads(l) for l in open(os.path.join(H, 'work/live_rows.jsonl'))]
by_id = {r['c']['id']: r for r in live}
assert len(live) == 3236 and len(by_id) == 3236

# ---------------------------------------------------------------- 1. new cards (lib_kb format), notes moved to the report
new, notes = [], []
for f in BATCHES:
    for c in lib_kb.load_jsonl(os.path.join(A, f)):
        if c.get('note'): notes.append(f"{c['id']}: {c.pop('note')}")
        new.append(c)
# retrieval fix found by the free check (lib-ok-dig-3 lost dig-ok-overview-1 to this card): the 811 card's last sentence (ticket expiry,
# already in dig-ok-overview-1) and the "Excavator Guide" words in the text made it win "how close can I dig with the excavator" questions.
for c in new:
    if c['id'] == 'dig-ok-wait-1':
        t = c['text']
        for a_, b_ in ((", as the OKIE811 Excavator Guide prints the law", ""),
                       (" A notice expires 14 calendar days from the excavation start date; to keep going, Extend (or Re-Mark if marks are gone) at least 4 business days before it expires.", "")):
            assert t.count(a_) == 1; t = t.replace(a_, b_)
        c['text'] = t
B = lib_kb.Batch('sa21_merge', out_dir=H); B.chunks = new
E, W = B.check(existing_ids=set(by_id))
# supersedes must point at a live row; new ids must not be live
for c in new:
    if c.get('supersedes'): assert c['supersedes'] in by_id, c['id']
    else: assert c['id'] not in by_id, c['id']

# ---------------------------------------------------------------- 2. in-place edits of live chunks (same id, same ord)
def edit(cid, **ch):
    old = by_id[cid]['c']; c = dict(old)
    for k, v in ch.items():
        if v is None: c.pop(k, None)
        elif callable(v): c[k] = v(old.get(k))
        else: c[k] = v
    assert c != old, cid
    return {'ord': by_id[cid]['o'], 'lib': by_id[cid]['lib'], 'old': old, 'new': c}

def rep(a, b):
    def f(t):
        assert t.count(a) == 1, (a[:60], t.count(a)); return t.replace(a, b)
    return f

EDITS = []
# 811: Oregon overview loses the "not confirmed" sentence (30 days now on Oregon 811's own page; 811 helper, FINDINGS line 63)
EDITS.append(edit('dig-or-overview-1',
    text=rep('Ticket life: the Center\'s 2026 Addendum says the rule was changed "from 45 days to 30 days," effective January 8, 2026. Older copies of the rule and the Center\'s own FAQ page still say 45 calendar days, so the current number is not confirmed. Until you check with Oregon 811, plan on 30 days. Past ticket life, call in a new locate request.',
             'Ticket life: 30 calendar days. The Center\'s 2026 Addendum says the rule was changed "from 45 days to 30 days," effective January 8, 2026, and Oregon 811\'s own homeowner page says marks should no longer be used after 30 days. Older copies of the rule still say 45. Past ticket life, call in a new locate request.'),
    source='OAR 952-001-0010, -0050, -0070, -0090 (Oregon Utility Notification Center); 2026 Addendum to the Oregon Standards Manual (Mar 12, 2026); Oregon 811 homeowners page (read Nov 20, 2026)',
    unconfirmed=None))
# Time records FINDINGS item 4: public works daily overtime (BOLI page read Nov 20; private-work statement kept)
EDITS.append(edit('emp-state-or-3',
    title='Oregon (OR) minimum wage and overtime, including daily overtime on public works (prevailing wage) jobs',
    text=rep("Overtime in Oregon: 1.5x over 40 hours a week; long workdays alone do not trigger overtime for construction. ",
             "Overtime in Oregon on private jobs: 1.5x over 40 hours a week; long workdays alone do not trigger overtime for construction. "
             "Public works (prevailing wage) jobs are different. BOLI says overtime is due after 8 hours a day Monday to Friday, even under 40 hours in the week; "
             "on an established schedule of four 10-hour days (Monday to Thursday or Tuesday to Friday), after 10 hours a day; and for all hours worked on Saturdays, Sundays "
             "and six legal holidays (New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas). Give workers the schedule in writing before work starts, "
             "or it is taken as five days. Paid travel and shop time tied to the public job counts toward the daily hours. Overtime rate: base rate x 1.5, plus the fringe. "
             "A union agreement with different overtime terms governs. "),
    source='U.S. DOL state minimum wage table (updated Nov 5, 2026); BOLI bulletin Apr 27, 2026; BOLI "Work schedules and overtime on prevailing wage projects" (read 2026-11-20); checked 2026-11-05',
    confidence='medium'))
EDITS.append(edit('emp-state-wa-3',
    title='Washington (WA) minimum wage and overtime, including daily overtime on public works jobs',
    text=rep("Overtime in Washington: 1.5x over 40 hours a week; long workdays alone do not trigger overtime. ",
             "Overtime in Washington on private jobs: 1.5x over 40 hours a week; long workdays alone do not trigger overtime. "
             "Public works jobs are different: on work for the state, a county or a city, done by contract or subcontract, 8 hours is a day's work and time over 8 hours in a day "
             "is paid at 1.5x (RCW 49.28.010). A 4-10 schedule avoids overtime for the first 2 hours over 8 only under a voluntary agreement written, signed and dated with each worker "
             "for that project (or a union agreement), kept 3 years; on it, no more than 10 hours a day except in an extraordinary emergency (WAC 296-127-022, RCW 49.28.065). "
             "Saturday, Sunday and holiday work still follows the prevailing wage overtime rules, and hours over 40 in a week are always overtime. "),
    source='U.S. DOL state minimum wage table (updated Nov 5, 2026); L&I news release 26-17 (Sep 30, 2026); RCW 49.28.010, 49.28.065; WAC 296-127-022 (read 2026-11-20)'))
# Survey FINDINGS 6: blue tops vary by region (the WSDOT example comes after the first 300 characters, no state name)
EDITS.append(edit('stake-read-30',
    text=rep("Common practice: pink, orange or fluorescent flagging on survey stakes; blue tops for finished grade hubs; red or other colors for other grades. ",
             "Common practice: pink, orange or fluorescent flagging on survey stakes, and colored tops on grade hubs, but what each top color means changes by agency and region. "
             "On many jobs a blue top is a finished grade hub; WSDOT, for one, calls subgrade hubs blue tops, base rock hubs red tops and top course hubs yellow tops. "
             "Confirm which grade a top color means before you trim to it. "),
    title='Color of stakes, flagging, grade hub tops and paint'))
# Survey FINDINGS 4: L/O is used both ways
EDITS.append(edit('sym-4',
    text=rep("L/O means line only: the stake is good for line, not for distance.",
             "L/O usually means line only: the stake is good for line, not for distance. Some surveyors write L/O for lath offset instead, so check the staking legend.")))
# Specs FINDINGS 9: the Virginia source line on the two general separation cards (see NOTES: the live build does not hide them by state)
SEP_SRC = ('Ten States Standards (Recommended Standards for Wastewater Facilities, 2014) 38.31, 38.32 for the common 10 ft / 18 in rule; '
           'the fallback details are one state\'s rule written on that approach: 12VAC5-590-1150, Separation of water mains and sanitary sewers')
EDITS.append(edit('separation-cover-marking-1', source=SEP_SRC))
EDITS.append(edit('separation-cover-marking-2', source=SEP_SRC))
# Safety: sp-ca-permit-341-1 confirms 8 CCR 341, so the live CA trench card stops saying 341 "was not re-read"
EDITS.append(edit('sp-ca-trench-1',
    text=rep("What California adds is a permit: 8 CCR 1539 sends excavation and trench permits to 8 CCR 341, and the app's state table (checked 2026-11-19) carries it as a Cal/OSHA permit for trenches or excavations 5 ft or deeper that a person enters, with emergency repair of underground facilities exempt. Section 341 itself was not re-read on 2026-11-20, so the permit details are not confirmed here beyond that.",
             "What California adds is a permit: 8 CCR 1539 sends excavation and trench permits to 8 CCR 341, which requires a Cal/OSHA permit before building a trench or excavation 5 ft or deeper into which any person is required to descend (341(d)(5)(A)); trenches for emergency repair of underground facilities are exempt (341(e))."),
    source='8 CCR 1541.1(a)(1), (e)(2)(A); 8 CCR 1539; 8 CCR 341(d)(5)(A), (e)',
    confidence='high', unconfirmed=None))

# the all-states table said "every other state follows weekly overtime only": true for private work, not for OR / WA public works (above)
EDITS.append(edit('emp-states-summary-2',
    text=rep("Every other state follows weekly overtime only (1.5x over 40).",
             "Every other state follows weekly overtime only (1.5x over 40) on private work. Public works (prevailing wage) jobs can have daily overtime under state law (Oregon and Washington: after 8 hours a day), so check the state's public works rules."),
    source='U.S. DOL state rest period table (Jan 2023); DOL minimum wage table notes; Nevada Labor Commissioner bulletin (June 2026); checked 2026-11-05; public works: BOLI prevailing wage overtime page, RCW 49.28.010 (read 2026-11-20)'))

# retrieval fix found by the free check (lib-sc-dig-4 "fine for digging without calling 811" lost dig-sc-tickets-1 to the new dig-sc-wait-1):
# the live card's text ends with the fine sentence, its title did not say so
EDITS.append(edit('dig-sc-tickets-1', title='South Carolina 811: ticket types, large projects, emergencies, complaints and fines'))

for e in EDITS:
    c = e['new']; t = c['text']
    assert 200 <= len(t) <= 1800, (c['id'], len(t))
    assert '$kb$' not in json.dumps(c) and not re.search(r'[‘’“”–—]', json.dumps(c, ensure_ascii=False))
    if c['id'] in ('stake-read-30', 'sym-4'):   # general chunks: no state name in title/source/first 300
        assert not lib_kb.state_names_in(f"{c['title']} {c['source']} {c['text'][:300]}"), c['id']
    if c['id'].startswith('separation-cover'): assert 'Virginia' not in c['source'], c['id']   # text unchanged (names its example state); the 12VAC citation stays
    if c['id'].startswith('emp-state-or'): assert not lib_kb.state_names_in(f"{c['title']} {c['source']} {c['text'][:300]}", ['OR'])
    if c['id'].startswith('emp-state-wa'): assert not lib_kb.state_names_in(f"{c['title']} {c['source']} {c['text'][:300]}", ['WA'])
    if c.get('tier') == 'core': assert len(t) <= 1200 or c['id'].startswith('emp'), (c['id'], len(t))
    if c.get('state'): assert not lib_kb.check_chunk(c)[0], (c['id'], lib_kb.check_chunk(c)[0])   # cards in the new format still pass lib_kb

# ---------------------------------------------------------------- 3. eval cases: rename ids that clash with existing cases
S = '/home/claude/index.html-/tests/staged'
existing = {json.loads(l)['id'] for l in open(f'{S}/library_load_nov20/out/cases.jsonl')} | {c['id'] for c in json.load(open(f'{S}/ask_state_nov20/tools/cases_all.json'))}
cases, renamed, ids_new = [], [], {c['id'] for c in new}
for f in CASES:
    for c in lib_kb.load_jsonl(os.path.join(A, f)):
        if c['id'] in existing:
            m = re.match(r'^lib-([a-z]+)-([a-z0-9]+(?:-[a-z0-9]+)*?)-(\d+)$', c['id'])
            nid = f'lib-{m.group(1)}-{m.group(2)}-sa-{m.group(3)}'
            assert nid not in existing; renamed.append(f"{c['id']} -> {nid}"); c['id'] = nid
        assert not lib_kb.check_case(c, ids_new), (c['id'], lib_kb.check_case(c, ids_new))
        cases.append(c)
assert len({c['id'] for c in cases}) == len(cases)

# ---------------------------------------------------------------- outputs
core = [c for c in new if c['tier'] == 'core']; shelf = [c for c in new if c['tier'] == 'shelf']
w = lambda fn, rows: open(os.path.join(H, fn), 'w').write(''.join(json.dumps(r, ensure_ascii=False) + '\n' for r in rows))
w('merged_core.jsonl', core); w('merged_shelf.jsonl', shelf); w('edits.jsonl', EDITS); w('cases.jsonl', cases)
rep_lines = [f'lib_kb check of the {len(new)} new cards (against the {len(by_id)} live ids): {len(E)} errors, {len(W)} warnings',
             *('ERROR ' + x for x in E), *('warn  ' + x for x in W),
             f'core {len(core)} ({sum(1 for c in core if c.get("supersedes"))} replace in place: ' + ', '.join(f"{c['id']} <- {c['supersedes']}" for c in core if c.get('supersedes')) + f'), shelf {len(shelf)}',
             f'in-place edits of live chunks: {len(EDITS)}: ' + ', '.join(f"{e['new']['id']}@{e['ord']}" for e in EDITS),
             f'eval cases {len(cases)}; renamed (clashed with existing case ids): {len(renamed)}', *('  ' + r for r in renamed),
             'lead notes moved out of the chunks:', *('  ' + n for n in notes)]
open(os.path.join(H, 'merged_report.txt'), 'w').write('\n'.join(rep_lines) + '\n'); print('\n'.join(rep_lines))
if E: sys.exit(1)
