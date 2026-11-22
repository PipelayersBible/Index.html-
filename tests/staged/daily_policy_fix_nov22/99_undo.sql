drop policy if exists daily_reports_add on pb_daily.reports;
create policy daily_reports_add on pb_daily.reports for insert to authenticated
  with check ((foreman_uid = auth.uid()) and (pb_daily.is_foreman(company_id) or (pb_daily.is_manager(company_id)
    and (for_foreman is not null) and pb_prod.is_foreman_of(for_foreman, company_id))));
drop function if exists pb_daily.office_fill_for(uuid, uuid);
