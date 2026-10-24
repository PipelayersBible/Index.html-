-- The Pipelayer's Bible r15.34 · feat_office34 / 33 (Oct 24 2026, overnight office sweep):
-- the company OWNER's Field tickets reach the company.
--
-- pb_tickets.my_company(p_uid) read public.company_members only. The owner's account has no member row (it is the
-- company through companies.owner_user_id), so pb_ticket_save raised pb:not_company_member for every ticket the office
-- typed: the app said "Saved on this phone · Not synced: tickets need a company account", and the ticket never reached
-- Company tickets, the job's ticket totals or the materials' delivery-ticket lines (night/office/s01_owner_ticket.sql).
--
-- Now: a member row first (as before, newest membership), else a company this account owns — the owner rule
-- pb_prod.managed_company already applies. Callers (checked on the mirror): public.pb_ticket_save and
-- public.pb_ticket_cost_codes only — the owner's cost-code list becomes the company's too. Signature, security and
-- search_path unchanged. Re-running this file is safe.
--
-- App side: feat_office34's T3app replacements (no New Ticket for the company account, "typed on the crews' phones"
-- wording) were a stopgap for this bug and are left out of the app's patch now that this file is live.
create or replace function pb_tickets.my_company(p_uid uuid)
 returns uuid
 language sql
 stable security definer
 set search_path to ''
as $function$
  select x.company_id from (
    select m.company_id, 1 as pri, m.created_at as at from public.company_members m join public.companies c on c.id = m.company_id
      where m.user_id = p_uid and c.status = 'active'
    union all
    select c.id, 2 as pri, c.created_at as at from public.companies c
      where c.owner_user_id = p_uid and c.status = 'active'
  ) x
  order by x.pri, x.at desc nulls last
  limit 1
$function$;
