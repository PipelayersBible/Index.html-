-- r15.34 owner paste (the MCP cannot run REVOKE): keep the new function off the anon role, as its siblings are.
revoke all on function public.pb_prod_job_info_set(text, text, text, date, uuid) from public, anon;
grant execute on function public.pb_prod_job_info_set(text, text, text, date, uuid) to authenticated, service_role;
