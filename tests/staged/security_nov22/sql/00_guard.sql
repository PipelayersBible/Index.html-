-- security_nov22: shared guard, included at the top of every migration here (01-04). Safe to run many times.
-- pb_sec.guard(tag, function, md5): refuses (and so rolls the whole migration back) when the live definition of a
-- function we replace is not the one read on Nov 21 2026. When it matches, the live definition is saved first in
-- pb_sec.fn_backup, so the undo files put back the exact text that was live (no copy typed by hand).
-- Running a migration a second time: the backup row is already there, so it goes through again.
create schema if not exists pb_sec;
revoke all on schema pb_sec from public;
revoke all on schema pb_sec from anon, authenticated;
create table if not exists pb_sec.fn_backup (
  tag      text not null,          -- which migration (nov22_01 ...)
  sig      text not null,          -- regprocedure text, e.g. public.pb_session_gate()
  def      text not null,          -- pg_get_functiondef() as it was live
  md5      text not null,
  saved_at timestamptz not null default now(),
  primary key (tag, sig)
);
alter table pb_sec.fn_backup enable row level security;
revoke all on table pb_sec.fn_backup from public;
revoke all on table pb_sec.fn_backup from anon, authenticated;

create or replace function pb_sec.guard(p_tag text, p_sig text, p_md5 text) returns void
language plpgsql set search_path = '' as $f$
declare v_def text; v_md5 text;
begin
  v_def := pg_get_functiondef(p_sig::regprocedure);
  v_md5 := md5(v_def);
  if v_md5 = p_md5 then
    insert into pb_sec.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  if exists (select 1 from pb_sec.fn_backup b where b.tag = p_tag and b.sig = p_sig) then return; end if; -- this migration ran before
  -- (throwaway local test database only: the stand-in functions there are not the live text)
  if current_setting('pb_sec.guard', true) = 'skip-local-test' then
    insert into pb_sec.fn_backup (tag, sig, def, md5) values (p_tag, p_sig, v_def, v_md5) on conflict (tag, sig) do nothing;
    return;
  end if;
  raise exception 'pb_sec: % changed on live since Nov 21 2026 (md5 % , expected %). Nothing was applied. Re-read it and rebase this migration.', p_sig, v_md5, p_md5;
end $f$;
revoke all on function pb_sec.guard(text, text, text) from public;
revoke all on function pb_sec.guard(text, text, text) from anon, authenticated;

-- undo helper: puts back every function a migration replaced, exactly as it was live
create or replace function pb_sec.restore(p_tag text) returns integer
language plpgsql set search_path = '' as $f$
declare r record; n integer := 0;
begin
  for r in select b.sig, b.def from pb_sec.fn_backup b where b.tag = p_tag order by b.sig loop
    execute r.def; n := n + 1;
  end loop;
  delete from pb_sec.fn_backup where tag = p_tag;
  return n;
end $f$;
revoke all on function pb_sec.restore(text) from public;
revoke all on function pb_sec.restore(text) from anon, authenticated;
