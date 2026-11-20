#!/usr/bin/env python3
# lib_specs_nov20: spec books and installation standards. Run: python3 build.py
# Reads data/b*.py (one add(...) per chunk, written as each source was read on 2026-11-20), applies the LIBRARY_RULES.md
# format with lib_kb.Batch, and writes specs.jsonl, specs_report.txt and sql/ (staged, never applied).
import sys, os, re, glob, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../library_arch_nov20'))
from lib_kb import Batch
RAW = []
def add(id, state, title, text, src, url, edition, conf='high'):
    RAW.append(dict(id=id, state=state, title=title, text=text, source=src, url=url, edition=edition, confidence=conf))
for f in sorted(glob.glob(os.path.join(HERE, 'data', 'b*.py'))):
    exec(open(f).read(), {'add': add})

RENAME = {  # ids written before the rules existed -> spec-<st>-<agency>-<topic>-<n>, std-<org>-..., mfr-<maker>-...
 'spec-tx-fortworth-1': 'spec-tx-fortworth-trench-1', 'spec-tx-separation-1': 'spec-tx-tceq-separation-1',
 'spec-fl-separation-1': 'spec-fl-dep-separation-1', 'spec-mt-water-1': 'spec-mt-deq-water-1',
 'std-10ss-sewer-1': 'std-tenstates-sewer-1', 'std-10ss-sewer-2': 'std-tenstates-sewertest-1', 'std-10ss-sep-1': 'std-tenstates-separation-1',
 'std-10ss-slope-1': 'std-tenstates-slope-1', 'std-c12-clay-1': 'std-astm-c12clay-1' }
def newid(i):
    if i in RENAME: return RENAME[i]
    m = re.match(r'^spec-([a-z]{2})-([a-z0-9]+)-(\d+)$', i)
    return f'spec-{m.group(1)}-dot-{m.group(2)}-{m.group(3)}' if m else i
TOPICS = [  # first match on the NEW id
 (r'separation', 'Water and sewer separation distances'),
 (r'edition', 'Spec books: which edition applies'),
 (r'-deq-water|spec-wa-dot-water', 'Spec books: water main installation, pressure test and disinfection'),
 (r'test|inspect', 'Spec books: pipe testing and inspection (air, water, mandrel, video)'),
 (r'bore', 'Spec books: jacking, boring and tunneling'),
 (r'structures', 'Spec books: manholes, inlets and catch basins'),
 (r'trench|backfill', 'Spec books: trench, bedding, backfill and compaction'),
 (r'spec-.*-(pipe|plastic|drainage|culvert)', 'Spec books: culvert and storm drain pipe installation'),
 (r'std-tenstates-(sewer|slope)', 'Sewer design standards: slopes, manholes, sizes'),
 (r'mfr-dipra-thrust', 'Thrust blocks and restrained joints'),
 (r'mfr-dipra-test', 'Water main pressure test, flushing and disinfection'),
 (r'mfr-ads-cover', 'Pipe cover: minimum and maximum burial depth'),
 (r'^(mfr|std)-', 'Pipe installation guides by material') ]
def topic(i):
    for rx, t in TOPICS:
        if re.search(rx, i): return t
    raise SystemExit('no topic for ' + i)
EDIT = {  # exact-once text fixes made when the rules arrived
 'std-tenstates-slope-1': [("0.40; 10 inch 0.28; 12 inch 0.22; 15 inch 0.15; 18 inch 0.12; 21 inch 0.10; 24 inch 0.08; 27 inch 0.067; 30 inch 0.058; 33 inch 0.052; 36 inch 0.046; 39 inch 0.041; 42 inch 0.037.",
                            "0.40; 10 inch 0.28; 12 inch 0.22; 15 inch 0.15; 18 inch 0.12; 21 inch 0.10; 24 inch 0.08 (the book's table goes on to 42 inch).")],
 'spec-fl-dot-edition-1': [("were not read for this library (the files would not open here)", "are not confirmed in this library (the files would not open here)")],
 'spec-in-dot-pipe-1': [("which was not read here.", "which was not read here, so those numbers are not confirmed.")],
 'spec-ga-dot-pipe-1': [("Lift thickness and compaction percent were not in this section; see Section 207.", "Lift thickness and compaction percent are not confirmed here (they are not in Section 550); see Section 207.")],
}

EDIT.update({
 'spec-wa-dot-sewertest-1': [(" TV inspection can be required by the Engineer before final acceptance (H).", " The Engineer can require TV inspection (H).")],
 'spec-ca-dot-backfill-1': [(" Controlled low-strength material beside pipe: 6 inches clear each side for pipe 42 inches and smaller or 20 feet or less of cover, 1 foot for bigger or deeper (19-3.03I).", ""),
                            (" City and district jobs usually follow the Greenbook or the agency's own book instead.", "")],
 'std-tenstates-separation-1': [(" No water pipe may pass through or touch any part of a sewer manhole (38.1). State rules vary, so check the state health or environmental agency's separation rule for the job.", " State rules vary: check the state's own separation rule.")],
 'spec-tx-tceq-separation-1': [(" Gravity sewers are at least 6 inches in diameter and designed for at least 2 feet per second (217.53).", ""),
                               (" Cement-stabilized sand under 217.53 has at least 160 lb of cement per cubic yard; under 290.44 at least 10 percent cement (2.5 bags per yard).", "")],
 'spec-fl-dep-separation-1': [(" Hydrant drains keep the same distances.", "")],
 'spec-az-dot-pipe-1': [(" Catch basins (503) and manholes (505) are backfilled in level 8-inch layers.", "")],
 'spec-tx-fortworth-trench-1': [(" Other Dallas-Fort Worth cities use the NCTCOG standard specifications with their own amendments.", " Other cities in the area use the NCTCOG specifications.")],
 'mfr-dipra-test-1': [(" The water agency's spec sets the real numbers, and many are stricter.", " The water agency's spec governs.")],
 'spec-mt-deq-water-1': [(" Unprotected cross-connections are not allowed (8.10.1).", ""), (" Hydrants (8.4): lead at least 6 inches with an auxiliary valve;", " Hydrants (8.4): 6-inch lead;")],
})
EDIT['spec-ga-dot-pipe-1'] += [(" Joints: concrete pipe with socket ends upstream and rubber gaskets; metal pipe with outside laps upstream and coupling bands with two or more bolts; thermoplastic joints at least silt tight (550.3.05.C).", " Thermoplastic joints are at least silt tight (550.3.05.C)."),
                               (" A hand-pulled mandrel (GDT 136) can be used to confirm.", "")]

EDIT['spec-wa-dot-sewertest-1'] += [("Finish cleaning and testing within 15 working days after backfilling.", "Clean and test within 15 working days after backfilling.")]
EDIT['std-tenstates-separation-1'] += [("; center a length so the sewer joints are as far as possible from the water main joints; where a water main passes under a sewer, the sewer needs structural support.", "; keep sewer joints as far as possible from water main joints.")]
EDIT['spec-ga-dot-pipe-1'] += [(" (trench width and cover are on those drawings, not in the text)", "")]
EDIT['spec-fl-dep-separation-1'] += [(" such as pressure-rated sewer pipe, restrained joints, a watertight casing or 4 inches of concrete encasement", " such as pressure-rated sewer pipe, a casing or concrete encasement")]
TITLE = {'spec-tx-fortworth-trench-1': 'Texas, Fort Worth utility trench spec: embedment, 12-inch lifts, 95 and 98 percent, test frequency (33 05 10)'}
SUPERSEDES = {'spec-wa-dot-trench-1': 'wa-1', 'spec-wa-dot-water-1': 'wa-2', 'spec-wa-dot-sewertest-1': 'wa-3', 'std-tenstates-slope-1': 'ten-1'}
UNCONF = {'spec-ca-dot-drainage-1', 'spec-fl-dot-edition-1', 'spec-in-dot-pipe-1', 'spec-ga-dot-pipe-1', 'spec-oh-dot-pipe-1', 'spec-nv-dot-edition-1', 'spec-ut-dot-edition-1'}
LOCAL = {'spec-tx-fortworth-trench-1'}
B = Batch('specs', out_dir=HERE)
for c in RAW:
    i = newid(c['id']); text = c['text']; src = c['source']
    for old, new in EDIT.get(i, []):
        assert text.count(old) == 1, (i, old[:40]); text = text.replace(old, new)
    src = src.replace('Great Lakes-Upper Mississippi River Board', 'GLUMRB')
    coll = i.split('-')[0]
    d = dict(id=i, state=c['state'], tier='core' if len(text) <= 1200 else 'shelf', title=TITLE.get(i, c['title']), topic=topic(i), text=text,
             source=src, url=c['url'], checked='2026-11-20', edition=c['edition'], confidence=c['confidence'], kind='summary',
             license='summary' if coll in ('std', 'mfr') else ('gov-local' if i in LOCAL else 'gov-state'))
    if i in SUPERSEDES: d['supersedes'] = SUPERSEDES[i]
    if i in UNCONF: d['unconfirmed'] = 'yes'
    B.add(**d)
if __name__ == '__main__':
    live = os.path.join(HERE, '../ask_state_nov20/work/kb_live2.json')
    ex = {c['id'] for l in json.load(open(live)).values() for c in l} - set(SUPERSEDES.values())
    B.write(existing_ids=ex)
    print(len(B.chunks), 'chunks;', sum(c['tier'] == 'core' for c in B.chunks), 'core')
