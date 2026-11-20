#!/usr/bin/env python3
# Builds undo_01_pricing_limits.sql: the in-place patches of 01_pricing_limits.sql turned around, plus the old text of
# every function it replaces (argv[1]: those texts dumped from the local base, md5-equal to live; ai_daily_limit and
# pb_docs.limits come from sql/live/, read from live on Nov 20).
import re, sys, os
S = os.path.dirname(os.path.abspath(__file__)); mig = open(f'{S}/01_pricing_limits.sql').read(); old = open(sys.argv[1]).read()
pat = re.compile(r"select pg_temp\.pb_patch\('([^']+)'::regprocedure,\n\s*\$o\$(.*?)\$o\$,\n\s*\$n\$(.*?)\$n\$\);", re.S)
P = pat.findall(mig); assert len(P) == mig.count('select pg_temp.pb_patch(') == 9, len(P)
live = lambda f: re.sub(r'^--.*\n', '', open(f'{S}/live/{f}').read().replace('\r', ''), count=1).rstrip().rstrip(';') + ';\n'
out = ["""-- UNDO for 01_pricing_limits.sql (pricing build, Nov 20 2026). Apply as ONE migration. Safe to run twice.
-- Puts back the old text of every function the pricing build replaced or patched, removes the three new settings and the
-- new functions. It KEEPS the three new tables (pb_billing.ai_pool, pb_billing.individual_accounts, pb_billing.limit_overrides):
-- nothing reads them once the functions are back, and they hold the month's AI totals and any individual billing records.
-- After this the limits are the ones from before Nov 20 (100 AI requests a day for a paid person, no dollar stop).
-- Built by sql/mk_undo.py; proven by sql/local/run_undo.sh (migration, then this, and every function has its old md5 again).

create or replace function pg_temp.pb_unpatch(p_fn regprocedure, p_added text, p_old text) returns void language plpgsql as $p$
declare d text := pg_get_functiondef(p_fn); n int;
begin
  n := (length(d) - length(replace(d, p_added, ''))) / length(p_added);
  if n = 0 then return; end if;  -- already undone (or never applied)
  if n <> 1 then raise exception 'pb_unpatch: expected the added text at most once in %, found % times', p_fn, n; end if;
  execute replace(d, p_added, p_old);
end $p$;

-- 1. The functions that were patched in place: each added piece of text is swapped back (last patch first).
"""]
for fn, o, n in reversed(P):
    assert '$a$' not in o + n and '$b$' not in o + n
    out.append(f"select pg_temp.pb_unpatch('{fn}'::regprocedure,\n  $a${n}$a$,\n  $b${o}$b$);\n")
out.append("\n-- 2. The functions that were replaced in full: the text that was live before (md5-checked against live on Nov 20).\n")
out.append(old.rstrip() + '\n')
out.append(live('ai_daily_limit.sql')); out.append(live('pb_docs_limits.sql'))
out.append("""CREATE OR REPLACE FUNCTION pb_docs.limits_for(p_company uuid)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select pb_docs.limits(case when p_company is null then 'individual' else 'company' end)
$function$;
alter function pb_docs.limits_for(uuid) security invoker;

-- 3. The new settings, and the old note.
delete from pb_billing.settings where key in ('individual_cents', 'individual_year_cents', 'plan_sheet_cents');
update pb_billing.settings set note = 'Plan reading add-on, per month. Not decided yet (null = price not set).'
  where key = 'plan_reading_cents' and note = 'Not used: plan reading is priced per sheet (plan_sheet_cents). Leave empty.';

-- 3b. public.ai_usage: the feature check as it was (six names). Strong plan look-up counts ('plans_strong') could not
--     exist before the pricing build, so any that were counted since are removed first.
delete from public.ai_usage where feature = 'plans_strong';
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature = any (array['cutsheet'::text, 'stake'::text, 'teacher'::text, 'ticket'::text, 'analysis'::text, 'gonogo_q'::text]));

-- 4. The new functions (nothing calls them once the old texts are back; the app falls back to its old messages).
drop function if exists public.pb_my_limits(text);
drop function if exists public.pb_plan_prices();
drop function if exists public.pb_owner_individual_paid(uuid, date, text);
drop function if exists pb_plans.limits_for(uuid);
drop function if exists pb_billing.storage_room(uuid, text, integer);
drop function if exists pb_billing.storage_gb(text, uuid);
drop function if exists pb_billing.ai_block(uuid, text, integer);
drop function if exists pb_billing.ai_who(uuid);
drop function if exists pb_billing.individuals_json();
drop function if exists pb_billing.individual_open(uuid, text);
drop function if exists pb_billing.paid_people(uuid);
drop function if exists pb_billing.limits_of(uuid);
drop function if exists pb_billing.plan_limits();
drop function if exists pb_billing.prices();
""")
open(f'{S}/undo_01_pricing_limits.sql', 'w').write(''.join(out)); print('undo built,', len(P), 'patches turned around')
