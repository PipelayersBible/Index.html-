-- records_nov22 Phase B, 01: helper schema pb_stage (needed by 02 B3; 03-05 don't call it but 03 checks 02 is in).
-- Plain SQL, valid as-is or pasted inside a DO block (no top-level SELECT, no begin/commit). Safe to run many times.
-- pb_stage.guard(tag, function, md5): refuses (so the whole migration rolls back) when the live text of a function we
--   replace is not the one read on Nov 22 2026; when it matches, the live text is saved in pb_stage.fn_backup first, so
--   the undo puts back the exact text that was live (pb_stage.restore(tag)). Second run of a migration: the backup row
--   is there, so it goes through again.
-- pb_stage.patch_fn(function, old, new [, tag]): replaces ONE exact piece of a live function and recreates it; refuses
--   when the piece is there 0 or 2+ times. With a tag, saves the live text for restore first.
-- pb_stage.count_in_fn(function, piece): read-only count of the same thing.
-- Nothing here is reachable from the API (schema and functions closed to anon/authenticated).
create schema if not exists pb_stage;
revoke all on schema pb_stage from public;
revoke all on schema pb_stage from anon, authenticated;
create table if not exists pb_stage.fn_backup (
  tag      text not null,
  sig      text not null,
  def      text not null,
  md5      text not null,
  saved_at timestamptz not null default now(),
  primary key (tag, sig)
);
alter table pb_stage.fn_backup enable row level security;
revoke all on table pb_stage.fn_backup from public;
revoke all on table pb_stage.fn_backup from anon, authenticated;

create or replace function pb_stage.guard(p_tag text, p_sig text, p_md5 text) returns void
language plpgsql set search_path to '' as $f$
declare v_def text; v_md5 text;
begin
  v_def := pg_get_functiondef(p_sig::regprocedure);
  v_md5 := md5(v_def);
  if v_md5 = p_md5 then
    insert into pb_stage.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  if exists (select 1 from pb_stage.fn_backup b where b.tag = p_tag and b.sig = p_sig) then return; end if; -- this migration ran before
  -- throwaway local test database only (its stand-in functions are not the live text)
  if current_setting('pb_stage.guard', true) = 'skip-local-test' then
    insert into pb_stage.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  raise exception 'pb_stage: % changed on live since Nov 22 2026 (md5 %, expected %). Nothing was applied. Re-read it and rebase this migration.', p_sig, v_md5, p_md5;
end $f$;

create or replace function pb_stage.restore(p_tag text) returns integer
language plpgsql set search_path to '' as $f$
declare r record; n integer := 0;
begin
  for r in select b.sig, b.def from pb_stage.fn_backup b where b.tag = p_tag order by b.sig loop
    execute r.def; n := n + 1;
  end loop;
  delete from pb_stage.fn_backup where tag = p_tag;
  return n;
end $f$;

create or replace function pb_stage.count_in_fn(p_fn regprocedure, p_old text) returns integer
language sql stable set search_path to '' as $f$
  select (length(pg_get_functiondef(p_fn)) - length(replace(pg_get_functiondef(p_fn), p_old, ''))) / greatest(length(p_old), 1)
$f$;

create or replace function pb_stage.patch_fn(p_fn regprocedure, p_old text, p_new text, p_tag text default null) returns void
language plpgsql set search_path to '' as $f$
declare d text := pg_get_functiondef(p_fn); n integer;
begin
  if coalesce(p_old, '') = '' then raise exception 'patch_fn %: empty piece', p_fn; end if;
  n := (length(d) - length(replace(d, p_old, ''))) / length(p_old);
  if n <> 1 then raise exception 'patch_fn %: expected the piece once, found % times: %', p_fn, n, left(p_old, 80); end if;
  if p_tag is not null then
    insert into pb_stage.fn_backup (tag, sig, def, md5) values (p_tag, p_fn::text, d, md5(d)) on conflict (tag, sig) do nothing;
  end if;
  execute replace(d, p_old, p_new);
end $f$;

revoke all on function pb_stage.guard(text, text, text) from public;
revoke all on function pb_stage.guard(text, text, text) from anon, authenticated;
revoke all on function pb_stage.restore(text) from public;
revoke all on function pb_stage.restore(text) from anon, authenticated;
revoke all on function pb_stage.count_in_fn(regprocedure, text) from public;
revoke all on function pb_stage.count_in_fn(regprocedure, text) from anon, authenticated;
revoke all on function pb_stage.patch_fn(regprocedure, text, text, text) from public;
revoke all on function pb_stage.patch_fn(regprocedure, text, text, text) from anon, authenticated;
