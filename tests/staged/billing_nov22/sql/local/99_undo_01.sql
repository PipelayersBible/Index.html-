-- billing_nov22 undo of 01. Plain SQL, DO-block safe, safe to run twice.
-- Puts back the exact live texts saved by 01 (pb_stage.restore), then removes what 01 added.
-- Note: the new columns are dropped, so an Invoice Sent snapshot, seats bought and a Switch at Renewal are lost; accounts
-- made while 01 was in keep paid_through = their start until Paid (the old code then calls them past due at once).
do $u$ begin
  if to_regprocedure('pb_stage.restore(text)') is not null then perform pb_stage.restore('billing_nov22'); end if;
end $u$;
drop function if exists public.pb_owner_billing_invoice_sent(uuid, date, integer, date);
drop function if exists public.pb_owner_billing_restart(uuid, integer, integer, text);
drop function if exists public.pb_owner_billing_edit(uuid, jsonb);
drop function if exists public.pb_owner_billing_next_interval(uuid, text);
drop function if exists pb_billing.owner_plan_json(uuid);
drop function if exists pb_billing.crew_seats_json(uuid);
drop function if exists pb_billing.pool_people(uuid);
drop function if exists pb_billing.catchup_months(date, date);
drop function if exists pb_billing.ind_due_on(pb_billing.individual_accounts);
drop function if exists pb_billing.lock_on(pb_billing.accounts);
drop function if exists pb_billing.due_on(pb_billing.accounts);
drop function if exists pb_billing.day_start(date);
drop function if exists pb_billing.today();
drop function if exists pb_billing.tz();
alter table pb_billing.accounts drop constraint if exists accounts_seats_min_check, drop constraint if exists accounts_next_interval_check,
  drop constraint if exists accounts_invoice_interval_check;
alter table pb_billing.accounts drop column if exists seats_min, drop column if exists next_interval, drop column if exists invoice_from,
  drop column if exists invoice_sent_on, drop column if exists invoice_due, drop column if exists invoice_seats, drop column if exists invoice_cents,
  drop column if exists invoice_interval;
alter table pb_billing.individual_accounts drop column if exists due_on;
delete from pb_billing.settings where key in ('billing_tz', 'due_offset_days', 'catchup_part_month');
