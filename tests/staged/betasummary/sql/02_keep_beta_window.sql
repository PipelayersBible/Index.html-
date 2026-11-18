-- Applied Nov 18 2026 (billing_keep_beta_window_nov18), plus beta_summary_empty_company_fix_nov18 (both edits are folded into 01_beta_summary.sql).
alter table pb_billing.accounts add column if not exists beta_ended_at timestamptz;
create or replace function pb_billing.accounts_beta_window() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.beta_ended_at is null then
    select case when c.plan = 'trial' then least(coalesce(c.trial_ends_at, now()), now()) end into new.beta_ended_at
      from public.companies c where c.id = new.company_id;
  end if;
  return new;
end $$;
revoke all on function pb_billing.accounts_beta_window() from public, anon, authenticated;
drop trigger if exists accounts_beta_window on pb_billing.accounts;
create trigger accounts_beta_window before insert on pb_billing.accounts for each row execute function pb_billing.accounts_beta_window();
