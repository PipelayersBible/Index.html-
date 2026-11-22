#!/bin/bash
# local_test.sh (ask_everyday_nov22): test sql/20, 21, 91 on a PRIVATE local Postgres 16 (own cluster /var/lib/postgresql/ae_pg, port 55493)
# loaded with the live library rows (ask_quality_nov22/work/after_rows.jsonl = live 3247 / f85b4d61, checked against the server).
set -e
H=/home/claude/index.html-/tests/staged/ask_everyday_nov22; D=/var/lib/postgresql/ae_pg; P=55493; V=b3e91f6c47d2; B=/usr/lib/postgresql/16/bin
Q="psql -h /tmp -p $P -U postgres -X -v ON_ERROR_STOP=1 -q"
ALL="select count(*), md5(string_agg(ord||':'||lib||':'||(chunk::text), '|' order by ord)) from pb_ai.kb_chunks where version='$V'"
if [ ! -d $D/data ]; then mkdir -p $D && chown postgres $D && su postgres -c "$B/initdb -D $D/data -A trust -U postgres >/dev/null"; fi
su postgres -c "$B/pg_ctl -D $D/data -o '-p $P -k /tmp -c listen_addresses=' -l $D/log -w start >/dev/null" || true
reset() {
$Q -c "drop schema if exists pb_ai cascade; create schema pb_ai;
create table pb_ai.kb_versions (version text primary key check (version ~ '^[0-9a-f]{12}\$'), built timestamptz, n int check (n > 0), counts jsonb, active boolean, loaded_at timestamptz);
create table pb_ai.kb_chunks (version text references pb_ai.kb_versions(version) on delete cascade, ord int check (ord >= 0), lib text check (lib = any (array['app','field','osha'])),
  chunk jsonb check (jsonb_typeof(chunk) = 'object' and chunk ? 'id' and chunk ? 'text'), primary key (version, ord));
create table pb_ai.kb_index (version text primary key references pb_ai.kb_versions(version) on delete cascade, n int, parts int, sha text, fmt int);
create table pb_ai.kb_index_parts (version text references pb_ai.kb_index(version) on delete cascade, part int, data text, primary key (version, part));
create table pb_ai.stage (r jsonb);
insert into pb_ai.kb_versions values ('$V', now(), 3247, '{}', true, now());
insert into pb_ai.kb_index values ('$V', 3247, 2, repeat('a',64), 1); insert into pb_ai.kb_index_parts values ('$V', 0, 'AAAA'), ('$V', 1, 'AAAA');" >/dev/null
python3 -c "
import json,sys
for l in open('/home/claude/index.html-/tests/staged/ask_quality_nov22/work/after_rows.jsonl'): sys.stdout.write(json.dumps(json.loads(l), ensure_ascii=False).replace('\\\\','\\\\\\\\')+'\n')" | $Q -c "copy pb_ai.stage(r) from stdin"
$Q -c "insert into pb_ai.kb_chunks select '$V', (r->>'o')::int, r->>'lib', r->'c' from pb_ai.stage; drop table pb_ai.stage;" >/dev/null
echo "reset: $($Q -Atc "$ALL") (want 3247|f85b4d61df8e54abe6bd391f7317cbd7)"
}
cd $H
echo "== pass 1 (find the post-load md5)"; python3 tools/mk_sql.py >/dev/null; reset; $Q -f sql/21_load.sql 2>&1 | grep -o 'NOTICE.*' | tail -1
PA=$($Q -Atc "$ALL"); echo "{\"post_all\": \"${PA#*|}\"}" > work/expected.json; cat work/expected.json
echo "== pass 2"; reset; python3 tools/mk_sql.py work/expected.json
echo "-- precheck before:"; $Q -A -F' ' -f sql/20_precheck.sql | tail -1
echo "-- load:"; $Q -f sql/21_load.sql 2>&1 | grep -o 'NOTICE.*\|ERROR.*'
echo "-- load again:"; $Q -f sql/21_load.sql 2>&1 | grep -o 'NOTICE.*\|ERROR.*'
echo "-- precheck after:"; $Q -A -F' ' -f sql/20_precheck.sql | tail -1
echo "kb_versions: $($Q -Atc "select n, counts from pb_ai.kb_versions"); index rows left: $($Q -Atc "select (select count(*) from pb_ai.kb_index)+(select count(*) from pb_ai.kb_index_parts)")"
$Q -Atc "select jsonb_build_object('o',ord,'lib',lib,'c',chunk) from pb_ai.kb_chunks where version='$V' order by ord" > work/loaded_rows.jsonl
python3 -c "
import json
a=[json.loads(l) for l in open('$H/work/after_rows.jsonl')]; b=[json.loads(l) for l in open('$H/work/loaded_rows.jsonl')]
print('loaded rows == work/after_rows.jsonl (what the free check used):', a==b, len(a), len(b))"
echo "-- rollback:"; $Q -f sql/91_rollback.sql 2>&1 | grep -o 'NOTICE.*\|ERROR.*'
echo "after rollback: $($Q -Atc "$ALL") (want 3247|f85b4d61df8e54abe6bd391f7317cbd7)"
echo "-- rollback again:"; $Q -f sql/91_rollback.sql 2>&1 | grep -o 'NOTICE.*\|ERROR.*'
echo "-- guard: a live row changed -> load refuses"
$Q -c "update pb_ai.kb_chunks set chunk = jsonb_set(chunk, '{title}', '\"x\"') where version='$V' and ord = 5"
$Q -f sql/21_load.sql 2>&1 | grep -o 'FAIL[^(]*' | head -1; echo "rows still: $($Q -Atc "select count(*) from pb_ai.kb_chunks")"
su postgres -c "$B/pg_ctl -D $D/data -w stop >/dev/null"; echo "cluster stopped"
