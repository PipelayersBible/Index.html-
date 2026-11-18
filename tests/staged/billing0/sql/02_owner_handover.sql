-- Hand Over (billing Phase 0). NOT APPLIED. Apply after 01.
-- Tommy's Nov 17 decision: a superintendent who ran the beta as the company's owner hands the company to the real owner
-- before it pays; the super stays on as Superintendent (or Project manager). It is not an email change: the company login
-- (companies.owner_user_id) moves to another person's own account.
--
-- Rules
--   * The new owner must already be a member of THIS company (invite them in Crew first). That keeps the beta seat count
--     the same (one member row out, one in) and proves they accepted this company.
--   * company_members.user_id is UNIQUE and an owner has no member row: the new owner's row is removed, and the old owner
--     gets a member row with role 'pm' and the chosen title.
--   * Removing that row fires pb_billing.on_member_removed, which would show the NEW OWNER "you're no longer part of X".
--     Cleared here. It also fires pb_reports.rotate_key_on_leave (the company report key rotates, as when anyone leaves;
--     phones fetch the new one) and pb_crew.pm_role_sync / pb_prod.rr_moved_trg (if the new owner was a PM or foreman,
--     their job-PM rows end / a "runs moved" push goes out). The owner sees everything anyway.
--   * The new owner must sign in with two-step (r16.85) before owner tools work for them, if they have it turned on.
create or replace function public.pb_owner_company_handover(p_company uuid, p_new_owner uuid, p_old_owner_title text default 'superintendent')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_old uuid; v_name text; v_role text; v_old_email text; v_new_email text;
begin
  if not pb_support.admin_ok(auth.uid(), auth.jwt()->>'aal') then raise exception 'pb:not_allowed'; end if;
  if p_old_owner_title is null or p_old_owner_title not in ('superintendent', 'project_manager') then return jsonb_build_object('ok', false, 'code', 'pb:bad_title'); end if;
  select c.owner_user_id, c.name into v_old, v_name from public.companies c where c.id = p_company and c.status = 'active' for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_found'); end if;
  if p_new_owner is null or v_old = p_new_owner then return jsonb_build_object('ok', false, 'code', 'pb:same_owner', 'message', 'That person already owns the company.'); end if;
  select m.role into v_role from public.company_members m where m.company_id = p_company and m.user_id = p_new_owner for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_member', 'message', 'Invite them to the company in Crew first, then hand it over once they have joined.'); end if;
  if exists (select 1 from public.companies c where c.owner_user_id = p_new_owner and c.id <> p_company and c.status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'pb:owns_other', 'message', 'That person already owns another company.');
  end if;
  if v_old is not null and exists (select 1 from public.company_members m where m.user_id = v_old) then
    return jsonb_build_object('ok', false, 'code', 'pb:old_owner_member', 'message', 'The current owner is also listed as a member somewhere. Nothing was changed.');
  end if;
  delete from public.company_members where company_id = p_company and user_id = p_new_owner;
  delete from pb_billing.left_company where user_id = p_new_owner and company_id = p_company;  -- undo the trigger's offer
  update public.companies set owner_user_id = p_new_owner, updated_at = now() where id = p_company;
  if v_old is not null then
    insert into public.company_members (company_id, user_id, role, title) values (p_company, v_old, 'pm', p_old_owner_title);
  end if;
  select u.email::text into v_old_email from auth.users u where u.id = v_old;
  select u.email::text into v_new_email from auth.users u where u.id = p_new_owner;
  insert into pb_billing.events (company_id, user_id, kind, detail, actor) values (p_company, p_new_owner, 'handover',
    jsonb_build_object('from', v_old, 'to', p_new_owner, 'new_owner_was', v_role, 'old_owner_title', p_old_owner_title), auth.uid());
  perform pb_audit.admin_note('company_handover', p_company, p_new_owner, jsonb_build_object('from', v_old, 'new_owner_was', v_role, 'old_owner_title', p_old_owner_title));
  return jsonb_build_object('ok', true, 'company', v_name, 'from', v_old, 'from_email', v_old_email, 'to', p_new_owner, 'to_email', v_new_email,
    'new_owner_was', v_role, 'old_owner_title', p_old_owner_title);
end $$;
revoke all on function public.pb_owner_company_handover(uuid, uuid, text) from public, anon;
grant execute on function public.pb_owner_company_handover(uuid, uuid, text) to authenticated;
