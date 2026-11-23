#!/usr/bin/env python3
# replica.sql = replica_tables.sql + the live function texts (live_defs.json, verbatim) + replica_after.sql
import json, os
L = os.path.dirname(os.path.abspath(__file__))
j = json.load(open(L + '/live_defs.json', encoding='utf-8'))
md5s = '\n'.join("  ('%s', '%s')," % tuple(x.rsplit(' ', 1)) for x in j['md5s'].split('\n')).rstrip(',')
out = (open(L + '/replica_tables.sql').read() + '\n-- ==== live function texts (' + j['read'] + ') ====\n' + j['defs'] + '\n'
       + open(L + '/replica_after.sql').read()
       + '\ncreate schema zz; create table zz.live_md5 (sig text primary key, md5 text);\ninsert into zz.live_md5 values\n' + md5s + ';\n')
open(L + '/replica.sql', 'w', encoding='utf-8', newline='').write(out)
print('replica.sql written')
