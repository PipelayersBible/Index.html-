-- firstweek_web_nov22 — DECISION, NOT APPLIED. Join links last 72 hours instead of 24.
-- Apply only if Tommy picks 72 h, together with app patch 05b (PB_OB_LINK_HOURS = 72). Nothing else changes:
-- a link still works once, the 30-links-a-day and 10-waiting limits stay. Side effect: an unused link now counts toward
-- the 10 waiting links (and the trial seat count) for 3 days instead of 1; Cancel on the link list still frees it at once.
-- Copied from live pb_onboard.make_link (read Nov 21 2026); the ONLY change is the v_exp interval.
CREATE OR REPLACE FUNCTION pb_onboard.make_link(p_company uuid, p_uid uuid, p_role text, p_label text, p_pair uuid, p_replaces uuid, p_freed integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_tok text; v_code text; v_id uuid; v_exp timestamptz := now() + interval '72 hours'; why text;
begin
  perform pg_advisory_xact_lock(hashtextextended('pb_onboard_make:' || p_company::text, 0));
  if pb_onboard.live_links(p_company) >= 10 then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, 'pb:too_many_links', null);
    return jsonb_build_object('ok', false, 'code', 'pb:too_many_links');
  end if;
  if (select count(*) from pb_onboard.links l where l.company_id = p_company and l.kind = 'join' and l.created_at > now() - interval '24 hours') >= 30 then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, 'pb:link_limit', null);
    return jsonb_build_object('ok', false, 'code', 'pb:link_limit');
  end if;
  why := pb_onboard.room(p_company, coalesce(p_freed, 0), null);
  if why is not null then
    perform pb_onboard.log(p_company, p_uid, 'refused', null, null, why, null);
    return jsonb_build_object('ok', false, 'code', why);
  end if;
  v_tok := pb_onboard.new_token(); v_code := pb_onboard.new_code();
  insert into pb_onboard.links (kind, company_id, role, label, pair_foreman, replaces_user, token_hash, code, created_by, expires_at)
    values ('join', p_company, p_role, p_label, case when p_role = 'pipelayer' then p_pair end, p_replaces, pb_onboard.hash(v_tok), v_code, p_uid, v_exp) returning id into v_id;
  perform pb_onboard.log(p_company, p_uid, 'made', v_id, null, null, jsonb_build_object('role', p_role, 'label', p_label, 'pair', p_pair, 'replaces', p_replaces));
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_tok, 'code', v_code, 'expires_at', v_exp, 'role', p_role, 'label', p_label,
    'company_name', (select c.name from public.companies c where c.id = p_company),
    'pair_name', case when p_role = 'pipelayer' and p_pair is not null then pb_crew.display_name(p_company, p_pair) end);
end $function$;
-- Undo: the same statement with interval '24 hours'.
