-- records_nov22: helper used by the staged migrations. Replaces ONE exact piece of a live function's text and recreates
-- it (the SQL twin of the app patches' exact-once rep()). Refuses when the piece is found 0 or 2+ times, so a function
-- changed since staging is never half-patched. Lives in its own schema; drop it after the migrations if wanted.
create schema if not exists pb_stage;
revoke all on schema pb_stage from public;
create or replace function pb_stage.patch_fn(p_fn regprocedure, p_old text, p_new text) returns void language plpgsql as $f$
declare d text := pg_get_functiondef(p_fn); n integer;
begin
  n := (length(d) - length(replace(d, p_old, ''))) / greatest(length(p_old), 1);
  if n <> 1 then raise exception 'patch_fn %: expected the piece once, found % times: %', p_fn, n, left(p_old, 80); end if;
  execute replace(d, p_old, p_new);
end $f$;
-- read-only check of the same thing (no change): how many times each piece is in the live function
create or replace function pb_stage.count_in_fn(p_fn regprocedure, p_old text) returns integer language sql stable as $f$
  select (length(pg_get_functiondef(p_fn)) - length(replace(pg_get_functiondef(p_fn), p_old, ''))) / greatest(length(p_old), 1)
$f$;
