select rtrim(pg_get_functiondef(p.oid), E'\n') || ';' || E'\n'
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname, p.proname) in (('public','ai_try_consume'),('public','ai_cost_add'),('public','ai_refund'),('public','pb_storage_put_ok'),('pb_billing','individual_limits'),('pb_plans','limits'),('pb_billing','has_individual'))
order by n.nspname, p.proname;
