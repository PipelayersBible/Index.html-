-- after the live functions: triggers, policies and grants as live (Nov 23)
create trigger pm_audit_no_delete before delete on pb_pm.audit for each row execute function pb_pm.permanent();
create trigger pm_audit_no_truncate before truncate on pb_pm.audit for each statement execute function pb_pm.permanent();
create trigger pm_audit_permanent before update on pb_pm.audit for each row execute function pb_pm.permanent();
create trigger pm_job_pms_no_delete before delete on pb_pm.job_pms for each row execute function pb_pm.permanent();
create trigger pm_job_pms_no_truncate before truncate on pb_pm.job_pms for each statement execute function pb_pm.permanent();
create trigger company_members_pm_sync after insert or delete or update of role, company_id on public.company_members for each row execute function pb_crew.pm_role_sync();
create policy "Members can view their own company" on public.companies for select using ((owner_user_id = auth.uid()) or (id = public.user_company_id()) or (id in (select m.company_id from public.company_members m where m.user_id = auth.uid())));
create policy "Users can view members of their own company" on public.company_members for select using ((user_id = auth.uid()) or (company_id = public.user_company_id()));
-- function grants as live
grant execute on function public.pb_job_pms_get(text), public.pb_job_pms_set(text, uuid[], uuid, integer), pb_prod.tz_valid(text) to authenticated, service_role;
grant execute on function public.user_company_id() to anon, authenticated, service_role;
