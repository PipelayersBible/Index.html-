# lib_kb.py - shared helper for every Ask library content file (library_arch_nov20, 2026-11-20).
# Rules it enforces: LIBRARY_RULES.md in this folder. Nothing here talks to the server; it only checks chunks and writes files.
#
# Use (from your own folder):
#     import sys; sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
#     from lib_kb import Batch
#     B = Batch('mutcd_part6', collection='mutcd')          # name of your batch, the collection it belongs to
#     B.add(id='mutcd-6c-taper-1', state='US', title='Taper lengths for lane closures (merging, shifting, shoulder)',
#           topic='Traffic control: tapers and buffer spaces', text='...', source='MUTCD 11th Edition (Dec 2023), Section 6B.08, Table 6B-3',
#           tier='core', url='https://mutcd.fhwa.dot.gov/...', checked='2026-11-20', edition='11th Edition, December 2023', effective='2024-01-18',
#           confidence='high', kind='summary', license='gov-us')
#     B.write()        # -> <name>.jsonl (the source of truth), <name>_report.txt, and SQL that is NOT applied:
#                      #    sql/<name>_core_NN.sql + _precheck.sql (tier core -> pb_ai.kb_chunks), sql/<name>_shelf_NN.sql (tier shelf -> pb_ai.kb_shelf)
# Check an existing file:   python3 lib_kb.py check my_chunks.jsonl
# Self-test:                python3 lib_kb.py selftest
import json, os, re, sys, datetime

VERSION = 'b3e91f6c47d2'          # active KB version on the server (pb_ai.kb_versions)
SQL_MAX = 900_000                 # one SQL file stays under ~0.9 MB (the SQL tool rejects ~2 MB)
TEXT_MIN, TEXT_MAX, TEXT_WARN = 200, 1800, 1300   # Ask cuts a chunk at 1,800 characters when it hands it to the model
TITLE_MAX, TOPIC_MAX, SOURCE_MAX = 120, 100, 300
QUOTE_MAX_WORDS = 40              # longest quote allowed from a copyrighted work (license='summary')

STATES = {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware",
 "DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas",
 "KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi",
 "MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York",
 "NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island",
 "SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington",
 "WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
# words the LIVE state filter also reads as "this is another state's chunk" (ask.ts otherStateOnly)
CUES = [(r'\b\d+VAC\d', 'VA'), (r'\bTCEQ\b|\bTAC\b', 'TX'), (r'\bNYCRR\b', 'NY'), (r'\bF\.?A\.?C\.?\b', 'FL'), (r'\bWAC\b', 'WA'), (r'\bOAR\b', 'OR')]

# collection -> (id pattern, 'US' | 'ST' | 'ANY', what it is). <st> = two-letter code, lower case.
COLLECTIONS = {
 'dig':   (r'^dig-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',            'ST',  '811 / one-call: state law, the 811 center excavator handbook. (dig-<st> with no suffix is the existing one-per-state card: do not reuse)'),
 'osha':  (r'^osha-(19\d\d\.\d+[A-Za-z0-9().]*-[a-z]{1,2}|pl-[a-z0-9-]+-\d+|loi-[a-z0-9-]+-\d+)$', 'US', 'Federal OSHA: 29 CFR text (osha-1926.501(b)(1)-a), plain-language (osha-pl-<topic>-<n>), letters of interpretation / directives (osha-loi-...)'),
 'sp':    (r'^sp-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',             'ST',  'State safety program: state OSHA plan rules, public-sector plans, state-only safety laws'),
 'mutcd': (r'^mutcd-[0-9a-z]+-[a-z0-9-]+-\d+$',                 'US',  'Federal MUTCD (FHWA), by part/chapter: mutcd-6c-taper-1'),
 'tc':    (r'^tc-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',             'ST',  'State traffic control: state MUTCD or supplement, DOT work-zone standards, flagger rules'),
 'spec':  (r'^spec-(?P<st>[a-z]{2})-[a-z0-9]+-[a-z0-9-]+-\d+$', 'ST',  'Spec books: spec-<st>-<agency>-<topic>-<n> (agency = dot, or a city / district short name)'),
 'fed':   (r'^fed-[a-z0-9]+-[a-z0-9-]+-\d+$',                   'US',  'Other federal: fed-<agency>-<topic>-<n> (epa, phmsa, fmcsa, fhwa, dol, niosh, msha, usace)'),
 'env':   (r'^env-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',            'ST',  'State stormwater / erosion control / dewatering discharge permits'),
 'lic':   (r'^lic-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',            'ST',  'State contractor licensing, operator certification, CDL differences'),
 'row':   (r'^row-(?P<st>[a-z]{2})-[a-z0-9-]+-\d+$',            'ST',  'State DOT right-of-way / utility accommodation / encroachment permit rules'),
 'std':   (r'^std-[a-z0-9]+-[a-z0-9-]+-\d+$',                   'US',  'Consensus standards, OUR SUMMARY ONLY: std-<org>-<topic>-<n> (awwa, astm, asce, aashto, cga, nassco, tenstates)'),
 'mfr':   (r'^mfr-[a-z0-9]+-[a-z0-9-]+-\d+$',                   'US',  'Manufacturer / trade association guides, OUR SUMMARY ONLY: mfr-<maker>-<topic>-<n>'),
}
KINDS = ('verbatim', 'summary')
LICENSES = ('gov-us', 'gov-state', 'gov-local', 'summary')   # summary = our own words about a copyrighted work, facts + citation only
CONF = ('high', 'medium', 'low')
TIERS = ('core', 'shelf')   # core = short answer card, loaded in every Ask worker (small budget); shelf = the deep library, searched on the server
CORE_PER_STATE = 40         # core chunks one state may have across ALL collections (see LIBRARY_RULES.md section 1)
CORE_SPLIT = {'dig': 6, 'sp': 10, 'tc': 8, 'spec': 10, 'env': 2, 'lic': 2, 'row': 2}          # per state, per collection
CORE_US = {'osha': 500, 'mutcd': 200, 'fed': 150, 'std': 100, 'mfr': 50}                     # nationwide collections, total
REQUIRED = ('id', 'state', 'tier', 'title', 'topic', 'text', 'source', 'url', 'checked', 'confidence', 'kind', 'license')
OPTIONAL = ('edition', 'effective', 'supersedes', 'unconfirmed', 'note')
COPYRIGHT_COLLECTIONS = ('std', 'mfr')
UNCONFIRMED_RX = re.compile(r'not confirmed|unconfirmed|could not (be )?confirm|not verified|not checked', re.I)
DATE_RX = re.compile(r'^20\d\d-\d\d-\d\d$')


def state_names_in(s, own=()):
    """codes of states NAMED in s (full names, case-sensitive like the live filter), other than `own`"""
    out = set()
    for code, name in STATES.items():
        if code in own: continue
        rx = r'(?<!West )\bVirginia\b' if code == 'VA' else r'\b' + re.escape(name) + r'\b'
        if re.search(rx, s): out.add(code)
    for rx, code in CUES:
        if code not in own and re.search(rx, s): out.add(code)
    return sorted(out)


def lib_of(c):
    """which server library the chunk goes in. 'osha' is labelled OSHA VERBATIM to the model, so only exact 29 CFR text goes there."""
    return 'osha' if c['id'].startswith('osha-19') and c.get('kind') == 'verbatim' else 'field'


def check_chunk(c, collection=None):
    """-> (errors, warnings) for one chunk dict"""
    E, W = [], []
    for k in REQUIRED:
        if not isinstance(c.get(k), str) or not c[k].strip(): E.append(f'missing or empty "{k}"')
    for k in c:
        if k not in REQUIRED + OPTIONAL: E.append(f'unknown field "{k}" (allowed: {", ".join(REQUIRED + OPTIONAL)})')
    if E: return E, W
    cid, st, title, topic, text, source = c['id'], c['state'], c['title'], c['topic'], c['text'], c['source']
    # ---- id / collection
    coll = cid.split('-')[0]
    if coll not in COLLECTIONS: E.append(f'id prefix "{coll}-" is not a library collection ({", ".join(COLLECTIONS)})'); return E, W
    if collection and coll != collection: E.append(f'id is in collection "{coll}", this batch is "{collection}"')
    rx, scope, _ = COLLECTIONS[coll]
    m = re.match(rx, cid)
    if not m: E.append(f'id does not match the {coll} pattern {rx}')
    if len(cid) > 80: E.append('id longer than 80 characters')
    # ---- state
    codes = st.split(',')
    if st != 'US' and (any(x not in STATES for x in codes) or len(codes) > 4 or len(set(codes)) != len(codes)):
        E.append('state must be "US" or a two-letter code ("TX", "DC") or up to four joined by commas ("KS,MO")')
        return E, W
    own = [] if st == 'US' else codes
    if scope == 'ST' and st == 'US': E.append(f'{coll}- chunks belong to a state: state cannot be "US"')
    if scope == 'US' and st != 'US': E.append(f'{coll}- chunks are federal / nationwide: state must be "US"')
    if m and 'st' in m.groupdict() and own and m.group('st').upper() != own[0]: E.append(f'id says {m.group("st").upper()}, state field says {own[0]}')
    # ---- title / topic (state name only in the state's own chunks)
    if len(title) > TITLE_MAX: E.append(f'title over {TITLE_MAX} characters')
    if len(topic) > TOPIC_MAX: E.append(f'topic over {TOPIC_MAX} characters')
    if state_names_in(topic): E.append('topic names a state: topics name no state (the same topic is shared by all states)')
    if topic.strip().lower() == 'first aid': E.append('topic "first aid" is reserved (Ask ranks it down unless the question is about an injury)')
    if own:
        if not any(title.startswith(STATES[x]) for x in own): E.append(f'a state chunk\'s title starts with the state\'s full name ("{STATES[own[0]]} ...")')
        if not any(STATES[x] in text[:300] for x in own): E.append('a state chunk names its state in the first sentence of the text')
        other = state_names_in(f'{title} {source} {text[:300]}', own)
        if other: E.append(f'title / source / first 300 characters name another state ({", ".join(other)}): the live Ask build would hide this chunk in its own state')
    else:
        if state_names_in(title): E.append(f'a US chunk\'s title names no state (found {", ".join(state_names_in(title))})')
        other = state_names_in(f'{source} {text[:300]}')
        if other: E.append(f'a US chunk names no state in its source or first 300 characters (found {", ".join(other)}): the live Ask build would hide it in the other states')
    # ---- text
    n = len(text)
    if n < TEXT_MIN: E.append(f'text is {n} characters, under {TEXT_MIN}')
    if n > TEXT_MAX: E.append(f'text is {n} characters, over {TEXT_MAX} (Ask cuts it there): split it')
    elif n > TEXT_WARN: W.append(f'text is {n} characters; aim for 500 to 1,200')
    if re.search(r'[‘’“”–—]', title + topic + text + source): E.append('curly quotes or long dashes: use plain \' " -')
    if '$kb$' in json.dumps(c): E.append('contains "$kb$"')
    if re.search(r'<[a-z/][^>]*>|\|\s*---', text): W.append('looks like HTML or a markdown table: plain sentences only')
    # ---- source, url, dates
    if len(source) > SOURCE_MAX: E.append(f'source over {SOURCE_MAX} characters')
    if not re.match(r'^https://[^\s]+\.[^\s]+$', c['url']): E.append('url must be one https:// link to the page or PDF that was read')
    if not DATE_RX.match(c['checked']): E.append('checked must be the date you read the source, YYYY-MM-DD')
    elif c['checked'] > datetime.date.today().isoformat(): E.append('checked is in the future')
    if c.get('effective') and not DATE_RX.match(c['effective']): E.append('effective must be YYYY-MM-DD (leave it out if the source prints none)')
    if not c.get('edition') and not c.get('effective'): E.append('give "edition" (e.g. "11th Edition, December 2023", "2024 Standard Specifications") or "effective" (date): at least one')
    # ---- confidence, kind, license
    if c['confidence'] not in CONF: E.append(f'confidence must be one of {CONF}')
    if c['kind'] not in KINDS: E.append(f'kind must be one of {KINDS}')
    if c['license'] not in LICENSES: E.append(f'license must be one of {LICENSES}')
    if c['tier'] not in TIERS: E.append(f'tier must be one of {TIERS}')
    if c['tier'] == 'core' and c['kind'] == 'verbatim' and coll != 'osha': W.append('verbatim text normally goes on the shelf; core is for short plain-language answer cards')
    if c['tier'] == 'core' and n > 1200: E.append(f'a core chunk is an answer card: at most 1,200 characters (this is {n})')
    if coll in COPYRIGHT_COLLECTIONS and (c['license'] != 'summary' or c['kind'] != 'summary'):
        E.append(f'{coll}- is a copyrighted source: kind and license must both be "summary" (our own words, facts and citation)')
    if c['license'] == 'summary':
        if c['kind'] == 'verbatim': E.append('license "summary" cannot be kind "verbatim"')
        for q in re.findall(r'"([^"]{20,})"', text):
            if len(q.split()) > QUOTE_MAX_WORDS: E.append(f'a quote of {len(q.split())} words from a copyrighted work (limit {QUOTE_MAX_WORDS})')
        if sum(len(q.split()) for q in re.findall(r'"([^"]{20,})"', text)) > 0.25 * len(text.split()): E.append('more than a quarter of this summary is quotation')
    if c['kind'] == 'verbatim' and c['confidence'] != 'high': E.append('verbatim text is copied from the official source, so confidence is "high" (if you could not read the official text, it is not verbatim)')
    unc = bool(c.get('unconfirmed'))
    if c['confidence'] == 'low' and not UNCONFIRMED_RX.search(text): E.append('confidence "low" means something is not confirmed: the text must say so in words ("not confirmed ...")')
    if unc and not UNCONFIRMED_RX.search(text): E.append('"unconfirmed" is set but the text does not say what is not confirmed')
    if unc and c['confidence'] == 'high': E.append('"unconfirmed" is set, so confidence cannot be "high"')
    if c.get('supersedes') is not None and (not isinstance(c['supersedes'], str) or not c['supersedes'].strip()):
        E.append('supersedes is ONE existing chunk id (the old row is replaced in place; rows are never deleted)')
    # ---- numbers need a citation
    if re.search(r'\d', text) and not re.search(r'\d', source) and c['kind'] == 'summary':
        W.append('the text has numbers but the source line has no section / table / page number: cite where each number comes from')
    return E, W


class Batch:
    def __init__(self, name, collection=None, out_dir=None, version=VERSION):
        assert re.match(r'^[a-z0-9_]+$', name), 'batch name: lower-case letters, digits, _'
        assert collection is None or collection in COLLECTIONS
        self.name, self.collection, self.version, self.chunks = name, collection, version, []
        self.dir = out_dir or os.path.dirname(os.path.abspath(sys.argv[0])) or '.'

    def add(self, **c):
        self.chunks.append({k: (v.strip() if isinstance(v, str) else v) for k, v in c.items() if v not in (None, '')})

    def check(self, existing_ids=()):
        """-> (errors, warnings) as lists of 'id: message'"""
        E, W, seen, titles = [], [], set(existing_ids), {}
        for i, c in enumerate(self.chunks):
            cid = c.get('id', f'#{i}')
            e, w = check_chunk(c, self.collection)
            if cid in seen and c.get('supersedes') != cid: e.append('duplicate id (in this batch or already in the library)')
            seen.add(cid)
            titles.setdefault(c.get('title'), []).append(cid)
            E += [f'{cid}: {x}' for x in e]; W += [f'{cid}: {x}' for x in w]
        core = {}
        for c in self.chunks:
            if c.get('tier') == 'core' and isinstance(c.get('id'), str) and isinstance(c.get('state'), str):
                k = (c['id'].split('-')[0], c['state']); core[k] = core.get(k, 0) + 1
        for (coll, st), k in sorted(core.items()):
            cap = CORE_US.get(coll) if st == 'US' else CORE_SPLIT.get(coll)
            if cap is not None and k > cap: E.append(f'{coll}/{st}: {k} core chunks, the budget is {cap}: move the detail to tier "shelf"')
        for t, ids in titles.items():
            if len(ids) > 2: W.append(f'{ids[0]}: {len(ids)} chunks share the title "{t}" (Ask shows at most 2 per title): make each title say what that chunk covers')
        return E, W

    def write(self, existing_ids=(), strict=True):
        E, W = self.check(existing_ids)
        rep = [f'batch {self.name}: {len(self.chunks)} chunks, {len(E)} errors, {len(W)} warnings', *('ERROR ' + x for x in E), *('warn  ' + x for x in W)]
        os.makedirs(os.path.join(self.dir, 'sql'), exist_ok=True)
        open(os.path.join(self.dir, f'{self.name}_report.txt'), 'w').write('\n'.join(rep) + '\n')
        print('\n'.join(rep[:1] + rep[1:41]))
        if E and strict: raise SystemExit(f'{len(E)} errors: nothing written. Fix them (see {self.name}_report.txt).')
        with open(os.path.join(self.dir, f'{self.name}.jsonl'), 'w') as f:
            for c in self.chunks: f.write(json.dumps(c, ensure_ascii=False) + '\n')
        files = write_sql([c for c in self.chunks if c['tier'] == 'core'], self.name + '_core', os.path.join(self.dir, 'sql'), self.version)
        shelf = [c for c in self.chunks if c['tier'] == 'shelf']
        if shelf: files += write_sql(shelf, self.name + '_shelf', os.path.join(self.dir, 'sql'), self.version, table='pb_ai.kb_shelf')
        print('wrote', f'{self.name}.jsonl', *files)
        return files


def _q(s):
    assert '$kb$' not in s
    return '$kb$' + s + '$kb$'


def write_sql(chunks, name, sql_dir, version=VERSION, table='pb_ai.kb_chunks'):
    """Guarded SQL, NOT applied by this tool. Each file is one transaction and can be run twice safely:
       new chunks go in at the next ord numbers only if their id is not there yet; a chunk with `supersedes` replaces that row in place.
       table = pb_ai.kb_chunks (core: what every Ask worker loads) or pb_ai.kb_shelf (the deep library; the table is created by
       sql/PROPOSED_kb_shelf.sql and does not exist on the server yet)."""
    if table != 'pb_ai.kb_chunks': return _write_sql_shelf(chunks, name, sql_dir, table)
    new = [c for c in chunks if not c.get('supersedes')]
    rep = [c for c in chunks if c.get('supersedes')]
    parts, cur, size = [], [], 0
    for c in new:
        row = json.dumps({'lib': lib_of(c), 'chunk': c}, ensure_ascii=False)
        if cur and size + len(row) > SQL_MAX: parts.append(cur); cur, size = [], 0
        cur.append(row); size += len(row) + 2
    if cur or not parts: parts.append(cur)
    tail = f"""
-- the version's row count (the Ask loader refuses a library whose rows don't match kb_versions.n)
update pb_ai.kb_versions v
   set n = c.n, counts = c.counts
  from (select sum(k)::int as n, jsonb_object_agg(lib, k) as counts
          from (select lib, count(*)::int as k from pb_ai.kb_chunks where version = '{version}' group by lib) x) c
 where v.version = '{version}';
-- drop the saved search index so workers rebuild it from the rows
delete from pb_ai.kb_index_parts where version = '{version}';
delete from pb_ai.kb_index where version = '{version}';
-- checks: ords must stay 0..n-1 with no gaps, ids unique
do $chk$
declare n int; mx int; d int;
begin
  select count(*), max(ord), count(distinct chunk->>'id') into n, mx, d from pb_ai.kb_chunks where version = '{version}';
  if mx <> n - 1 then raise exception 'FAIL ord gap: % rows, max ord %', n, mx; end if;
  if d <> n then raise exception 'FAIL duplicate chunk id: % ids for % rows', d, n; end if;
  if (select v.n from pb_ai.kb_versions v where v.version = '{version}') <> n then raise exception 'FAIL kb_versions.n'; end if;
end $chk$;
commit;
"""
    files = []
    for i, rows in enumerate(parts):
        fn = f'{name}_{i:02d}.sql'
        body = [f"-- {fn} ({datetime.date.today().isoformat()}): Ask library batch \"{name}\", part {i + 1} of {len(parts)}. NOT APPLIED. Generated by lib_kb.py.",
                f"-- Adds {len(rows)} chunks" + (f" and replaces {len(rep)} in place" if i == 0 and rep else '') + ". Safe to run twice (second run adds 0).", "begin;",
                f"lock table pb_ai.kb_chunks in share row exclusive mode;"]
        if rows:
            body.append(f"""insert into pb_ai.kb_chunks (version, ord, lib, chunk)
select '{version}', m.mx + row_number() over (order by t.i), t.e->>'lib', t.e->'chunk'
  from jsonb_array_elements({_q('[' + ',\n'.join(rows) + ']')}::jsonb) with ordinality t(e, i),
       (select max(ord) as mx from pb_ai.kb_chunks where version = '{version}') m
 where not exists (select 1 from pb_ai.kb_chunks k where k.version = '{version}' and k.chunk->>'id' = t.e->'chunk'->>'id');""")
        if i == 0:
            for c in rep:
                body.append(f"""-- {c['id']} replaces {c['supersedes']} (same row, same ord)
update pb_ai.kb_chunks set lib = '{lib_of(c)}', chunk = {_q(json.dumps(c, ensure_ascii=False))}::jsonb
 where version = '{version}' and chunk->>'id' = {_q(c['supersedes'])}
   and ({_q(c['id'])} = {_q(c['supersedes'])} or not exists (select 1 from pb_ai.kb_chunks k where k.version = '{version}' and k.chunk->>'id' = {_q(c['id'])}));""")
        body.append(tail)
        open(os.path.join(sql_dir, fn), 'w').write('\n'.join(body))
        files.append('sql/' + fn)
    ids = ', '.join("'" + c['id'].replace("'", "''") + "'" for c in chunks)
    sup = ', '.join("'" + c['supersedes'].replace("'", "''") + "'" for c in rep) or "''"
    open(os.path.join(sql_dir, f'{name}_precheck.sql'), 'w').write(
        f"-- {name}_precheck.sql: SELECT only. Expect already_there = 0 (first run), to_replace_found = {len(rep)}, and rows = max_ord + 1.\n"
        f"select (select count(*) from pb_ai.kb_chunks where version = '{version}' and chunk->>'id' in ({ids})) as already_there,\n"
        f"       (select count(*) from pb_ai.kb_chunks where version = '{version}' and chunk->>'id' in ({sup})) as to_replace_found,\n"
        f"       (select count(*) from pb_ai.kb_chunks where version = '{version}') as rows,\n"
        f"       (select max(ord) from pb_ai.kb_chunks where version = '{version}') as max_ord;\n")
    files.append(f'sql/{name}_precheck.sql')
    return files


def _write_sql_shelf(chunks, name, sql_dir, table):
    """shelf rows are keyed by chunk id (no ord numbers, no worker index): insert new ids, replace superseded ones in place"""
    parts, cur, size = [], [], 0
    for c in chunks:
        row = json.dumps(c, ensure_ascii=False)
        if cur and size + len(row) > SQL_MAX: parts.append(cur); cur, size = [], 0
        cur.append(row); size += len(row) + 2
    if cur or not parts: parts.append(cur)
    files = []
    for i, rows in enumerate(parts):
        fn = f'{name}_{i:02d}.sql'
        open(os.path.join(sql_dir, fn), 'w').write(f"""-- {fn} ({datetime.date.today().isoformat()}): Ask SHELF batch "{name}", part {i + 1} of {len(parts)}. NOT APPLIED. Generated by lib_kb.py.
-- Needs {table} (sql/PROPOSED_kb_shelf.sql in library_arch_nov20). Adds up to {len(rows)} chunks. Safe to run twice.
begin;
-- a chunk that supersedes another: the old id goes, the new one takes its place
delete from {table} s using jsonb_array_elements({_q('[' + ',\n'.join(rows) + ']')}::jsonb) e
 where e->>'supersedes' is not null and s.id = e->>'supersedes' and s.id <> e->>'id';
insert into {table} (id, chunk)
select e->>'id', e from jsonb_array_elements({_q('[' + ',\n'.join(rows) + ']')}::jsonb) e
on conflict (id) do update set chunk = excluded.chunk where {table}.chunk is distinct from excluded.chunk;
select count(*) as shelf_rows from {table};
commit;
""")
        files.append('sql/' + fn)
    return files


# ---------------------------------------------------------------- eval cases (LIBRARY_RULES.md section 5)
CASE_KEYS = ('id', 'cat', 'q', 'where', 'level', 'must', 'mustnot', 'maxwords', 'lead', 'complex', 'chunks', 'state_strict', 'kind')
CASE_MAXWORDS = {'simple': 70, 'rule': 100, 'complex': 110, 'steps': 170}     # kind -> word limit


def check_case(c, chunk_ids=None):
    """one eval case -> list of errors. Layout: {"id":"lib-tx-dig-1","cat":"locate","q":"...","where":"Houston, TX","level":"pipelayer",
       "kind":"simple","must":[regex,...],"mustnot":[regex,...],"lead":[regex,...],"complex":false,"chunks":["dig-tx-handbook-1"],"state_strict":true}"""
    E = []
    for k in c:
        if k not in CASE_KEYS: E.append(f'unknown key "{k}"')
    for k in ('id', 'cat', 'q', 'where', 'kind'):
        if not isinstance(c.get(k), str) or not c[k].strip(): E.append(f'missing "{k}"')
    if E: return E
    if not re.match(r'^lib-[a-z0-9-]+-\d+$', c['id']): E.append('case id looks like lib-<st or us>-<collection>-<n>')
    if not re.match(r'^.+, [A-Z]{2}$', c['where']) or c['where'][-2:] not in STATES: E.append('"where" is the job\'s "City, ST"')
    if c['kind'] not in CASE_MAXWORDS: E.append(f'kind is one of {tuple(CASE_MAXWORDS)}')
    elif c.get('maxwords', CASE_MAXWORDS[c['kind']]) > CASE_MAXWORDS[c['kind']]: E.append(f'maxwords for a {c["kind"]} case is at most {CASE_MAXWORDS[c["kind"]]}')
    if c.get('level', 'pipelayer') not in ('individual', 'pipelayer', 'foreman', 'office'): E.append('level: individual / pipelayer / foreman / office')
    for k in ('must', 'mustnot', 'lead'):
        v = c.get(k, [])
        if not isinstance(v, list) or any(not isinstance(x, str) for x in v): E.append(f'{k} is a list of regex strings'); continue
        for x in v:
            try: re.compile(x)
            except re.error as e: E.append(f'{k}: bad regex {x!r}: {e}')
    if not c.get('must'): E.append('must: at least one regex for the fact a right answer has to contain (a number with its unit, a section number)')
    if not c.get('lead'): E.append('lead: the regex for the direct answer; it has to appear in the first 40 words')
    if (c.get('kind') == 'complex') != bool(c.get('complex')): E.append('kind "complex" <-> "complex": true (the answer must end with one short offer)')
    if not c.get('chunks'): E.append('chunks: the id(s) of the library chunk(s) that hold the answer (the free retrieval check needs them)')
    elif chunk_ids is not None:
        for x in c['chunks']:
            if x not in chunk_ids: E.append(f'chunks: {x} is not in the batch')
    return E


def load_jsonl(path):
    return [json.loads(l) for l in open(path) if l.strip()]


def _selftest():
    good = dict(id='tc-tx-flagger-1', state='TX', tier='core', title='Texas flagger rules: who can flag and what training counts',
                topic='Traffic control: flaggers', text='Texas follows the Texas MUTCD (TMUTCD) for flagging on public roads. ' + 'Flaggers are trained before they flag. ' * 6,
                source='Texas MUTCD 2011 Rev. 2, Section 6E.01', url='https://www.txdot.gov/example.pdf', checked='2026-11-20', edition='2011 Revision 2',
                confidence='high', kind='summary', license='gov-state')
    def errs(**kw):
        c = dict(good, **kw); return check_chunk({k: v for k, v in c.items() if v is not None})[0]
    assert errs() == [], errs()
    assert errs(state='US'), 'tc needs a state'
    assert errs(title='Flagger rules in Texas'), 'title must start with the state'
    assert errs(source='Texas MUTCD; compare California MUTCD'), 'other state in source'
    assert errs(id='tc-ok-flagger-1'), 'id / state mismatch'
    assert errs(confidence='sure') and errs(url='http://x.y') and errs(checked='Nov 20') and errs(edition=None)
    assert errs(text='short'), 'too short'
    assert errs(confidence='low'), 'low needs "not confirmed" in the text'
    assert errs(confidence='low', text=good['text'] + ' The card renewal period is not confirmed from the state source.') == []
    us = dict(good, id='mutcd-6c-taper-1', state='US', title='Taper length for a lane closure', source='MUTCD 11th Edition, Section 6B.08',
              text='A merging taper is at least L long, where L = W x S for 45 mph or more and W x S x S / 60 for 40 mph or less. ' * 3, license='gov-us')
    assert check_chunk(us)[0] == [], check_chunk(us)[0]
    assert check_chunk(dict(us, title='Taper length (Ohio example)'))[0], 'US title names a state'
    assert check_chunk(dict(us, id='std-awwa-c600-1', license='gov-us'))[0], 'copyrighted collection must be summary'
    assert check_chunk(dict(us, id='std-awwa-c600-1', license='summary'))[0] == []
    long_q = dict(us, id='std-awwa-c600-2', license='summary', text=us['text'] + ' "' + 'word ' * 45 + '"')
    assert check_chunk(long_q)[0], 'long quote from copyrighted work'
    assert state_names_in('West Virginia one-call') == ['WV'] and state_names_in('FHWA, Washington, DC') == ['WA']   # the live filter reads it as Washington state: leave the city out
    assert lib_of(dict(id='osha-1926.501(b)(1)-a', kind='verbatim')) == 'osha' and lib_of(dict(id='osha-pl-fall-1', kind='summary')) == 'field'
    case = dict(id='lib-tx-dig-1', cat='locate', q='How long is my 811 ticket good for?', where='Houston, TX', kind='simple', must=['14 working days'],
                lead=['14 working days'], mustnot=['28 days'], chunks=['dig-tx-handbook-1'], state_strict=True)
    assert check_case(case) == [], check_case(case)
    assert check_case(dict(case, maxwords=200)) and check_case(dict(case, lead=[])) and check_case(dict(case, where='Houston')) and check_case(dict(case, kind='complex'))
    import tempfile
    d = tempfile.mkdtemp()
    b = Batch('selftest', out_dir=d); b.add(**good); b.add(**us); b.add(**dict(good, id='tc-tx-flagger-2', supersedes='tc-2'))
    b.add(**dict(us, id='mutcd-6c-taper-2', tier='shelf', kind='verbatim', title='Taper length text'))
    assert check_chunk(dict(good, tier='big'))[0] and check_chunk(dict(good, text=good['text'] + ' More detail here.' * 60))[0]
    many = Batch('many', out_dir=d)
    for k in range(9): many.add(**dict(good, id=f'tc-tx-flagger-{k}', title=f'Texas flagger rules part {k}'))
    assert any('budget' in x for x in many.check()[0]), 'core budget'
    files = b.write()
    assert os.path.exists(os.path.join(d, 'sql', 'selftest_shelf_00.sql'))
    s = open(os.path.join(d, 'sql', 'selftest_core_00.sql')).read()
    assert s.count('insert into pb_ai.kb_chunks') == 1 and s.count('update pb_ai.kb_chunks set lib') == 1 and 'commit;' in s
    print('selftest OK', files)


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'selftest': _selftest()
    elif len(sys.argv) >= 4 and sys.argv[1] == 'sql':      # python3 lib_kb.py sql chunks.jsonl name  -> regenerate the SQL from a .jsonl (the .jsonl is the source of truth)
        b = Batch(sys.argv[3], out_dir=os.path.dirname(os.path.abspath(sys.argv[2]))); b.chunks = load_jsonl(sys.argv[2]); b.write()
    elif len(sys.argv) >= 3 and sys.argv[1] == 'cases':    # python3 lib_kb.py cases cases.jsonl [chunks.jsonl]
        ids = {c['id'] for c in load_jsonl(sys.argv[3])} if len(sys.argv) >= 4 else None
        cs = load_jsonl(sys.argv[2]); bad = 0; seen = set()
        for c in cs:
            e = check_case(c, ids) + (['duplicate case id'] if c.get('id') in seen else []); seen.add(c.get('id'))
            for x in e: print('ERROR', c.get('id'), x); bad += 1
        print(f'{len(cs)} cases, {bad} errors'); sys.exit(1 if bad else 0)
    elif len(sys.argv) >= 3 and sys.argv[1] == 'check':
        b = Batch('check', out_dir='.'); b.chunks = load_jsonl(sys.argv[2])
        ex = set()
        if len(sys.argv) >= 4:   # optional: a local copy of the live library {app:[...],field:[...],osha:[...]} to catch id clashes
            ex = {c['id'] for l in json.load(open(sys.argv[3])).values() for c in l}
        E, W = b.check(ex)
        print(f'{len(b.chunks)} chunks, {len(E)} errors, {len(W)} warnings'); [print('ERROR', x) for x in E]; [print('warn ', x) for x in W]
        sys.exit(1 if E else 0)
    else: print(__doc__ or 'usage: python3 lib_kb.py selftest | check file.jsonl [kb_live.json]')
