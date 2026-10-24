-- The Pipelayer's Bible r15.34 · feat_office34 / 34 (Oct 24 2026): Company tickets say WHO entered a ticket.
-- Same signature and return columns as before (so no re-create is needed): the crew's display name rides inside the
-- record as _by_name (pb_prod.member_name: display name, else the name on their production entries, else the e-mail's
-- local part, else 'A foreman'). The app prints "Entered by Frank Ortiz · Oct 23, 9:51 PM"; an older app ignores the key.
create or replace function public.pb_ticket_company_page2(p_job_number text default null, p_before_created timestamptz default null, p_before_id uuid default null, p_limit integer default 50)
 returns table(row_id uuid, user_id uuid, created_at timestamptz, has_photo boolean, version integer, updated_at timestamptz, record jsonb)
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_company uuid;
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  v_company := pb_reports.managed_company(auth.uid());
  if v_company is null then raise exception 'pb:not_company_account'; end if;
  return query
    select t.id, t.user_id, t.created_at, t.has_photo, t.version, t.updated_at, t.record || jsonb_build_object('_by_name', pb_prod.member_name(v_company, t.user_id)) from pb_tickets.tickets t
    where t.company_id = v_company and (p_job_number is null or pb_prod.job_key(t.job_number) = pb_prod.job_key(p_job_number))
      and (p_before_id is null or (t.created_at, t.id) < (p_before_created, p_before_id))
    order by t.created_at desc, t.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $function$;
grant execute on function public.pb_ticket_company_page2(text, timestamptz, uuid, integer) to authenticated, service_role;
notify pgrst, 'reload schema';
