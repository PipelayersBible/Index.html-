-- security_nov22 03 (review finding 3, MEDIUM): someone removed from a company loses control of what they uploaded to it.
-- Before: the uploader test was "provenance.user_id = me" / "sets.created_by = me" with no look at the company, so after
-- removal the person could still remove, re-scope (incl. to the shared library), re-tag, resume and re-text the company's
-- documents, remove the company's plan sets, and keep uploading files into a plan set still 'uploading'.
-- After: the uploader side of each check also needs the item's company to still be theirs (pb_prod.my_company, or the
-- company they manage). Items with no company (an individual's own) are unchanged. The office side is unchanged.
--   pb_docs.can_manage(doc)       used by pb_docs_set_jobs / set_area / resume, public.pb_docs_can_manage (the docs edge
--                                 function asks it with the caller's token), pb_docs.label, pb_docs_mine
--   public.pb_docs_remove         had its own copy of the old test: now calls pb_docs.can_manage
--   public.pb_docs_set_scope      its own test: uploader side now needs the company
--   public.pb_docs_put_pages      uploader only: now needs the company
--   public.pb_plans_remove        created_by side now needs the company
--   pb_plans.can_upload_to(name)  (storage upload policy for plan sheets) now needs the company
-- New: pb_docs.still_in(company, user). Run as postgres, in one transaction (the whole file). Safe to run twice.
-- Undo: undo/99_undo_03.sql.

select pb_sec.guard('nov22_03', 'pb_docs.can_manage(uuid)', '329db9059772346be0eea6db683cfc6a');
select pb_sec.guard('nov22_03', 'public.pb_docs_remove(uuid)', 'f6c2ddfca7ace66c596408daa60a6ccf');
select pb_sec.guard('nov22_03', 'public.pb_docs_set_scope(uuid,text)', 'eb2ae90cbfa100b0260a7540de6d6e55');
select pb_sec.guard('nov22_03', 'public.pb_docs_put_pages(uuid,jsonb)', '16519bf38a307b292fad8d859fcf121f');
select pb_sec.guard('nov22_03', 'public.pb_plans_remove(uuid)', 'bf385c93f29fd0a717527ae82873cba3');
select pb_sec.guard('nov22_03', 'pb_plans.can_upload_to(text)', '41155e884364ceb0101a9a3028abffec');

-- true when an item filed under p_company is still the user's to manage as its uploader: no company (their own item),
-- or the company they are a member of now, or the company they own / manage now
create or replace function pb_docs.still_in(p_company uuid, p_uid uuid) returns boolean
language sql stable security definer set search_path = '' as $f$
  select p_uid is not null and (p_company is null
    or p_company is not distinct from pb_prod.my_company(p_uid)
    or p_company is not distinct from pb_prod.managed_company(p_uid))
$f$;
revoke all on function pb_docs.still_in(uuid, uuid) from public;
revoke all on function pb_docs.still_in(uuid, uuid) from anon, authenticated;

CREATE OR REPLACE FUNCTION pb_docs.can_manage(p_doc uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_docs.provenance p where p.doc_id = p_doc
    and ((p.user_id = auth.uid() and pb_docs.still_in(p.company_id, auth.uid()))   -- security_nov22 03: uploader still in the company
      or (p.company_id is not null and p.company_id = pb_prod.managed_company(auth.uid()))))
$function$;

CREATE OR REPLACE FUNCTION public.pb_docs_remove(p_doc uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- security_nov22 03: the one shared test (it was a copy of the old one here)
  if not pb_docs.can_manage(p_doc) then
    return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  perform pb_docs.purge(p_doc);
  return jsonb_build_object('ok', true);
end $function$;

CREATE OR REPLACE FUNCTION public.pb_docs_set_scope(p_doc uuid, p_scope text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v pb_docs.provenance; d pb_docs.documents; v_key text; v_ok text;
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  -- second review SR8: only the uploader, or the office of the uploader's company.
  -- security_nov22 03: the uploader only while still in that company.
  select * into v from pb_docs.provenance p where p.doc_id = p_doc
    and ((p.user_id = auth.uid() and pb_docs.still_in(p.company_id, auth.uid()))
      or (p.company_id is not null and p.company_id = pb_prod.managed_company(auth.uid())));
  if not found then return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  v_key := pb_docs.owner_key(v.company_id, v.user_id);
  perform pb_docs.lock(v_key);
  select * into d from pb_docs.documents where id = p_doc for update;
  if d.state <> 'live' then return jsonb_build_object('ok', false, 'code', 'pb:not_ready'); end if;
  if p_scope = 'private' then
    perform pb_docs.apply_scope(p_doc, 'private');
    update pb_docs.provenance set user_choice = 'private' where doc_id = p_doc;
    return jsonb_build_object('ok', true, 'scope', 'private');
  elsif p_scope = 'shared' then
    if d.scope = 'shared' then return jsonb_build_object('ok', true, 'scope', 'shared'); end if;
    perform pb_docs.lock_sha(d.sha256);
    if not d.shareable or d.public_title is null then return jsonb_build_object('ok', false, 'code', 'pb:not_public', 'message', 'Only public codes, specs and data sheets the app could check against the publisher can be shared.'); end if;
    if exists (select 1 from pb_docs.documents x where x.sha256 = d.sha256 and x.scope = 'shared' and x.state <> 'removed' and x.id <> d.id) then
      return jsonb_build_object('ok', false, 'code', 'pb:already_shared', 'message', 'This document is already in the shared library.'); end if;
    v_ok := pb_docs.take_share(v_key, auth.uid(), p_doc, 'switch');
    if v_ok = 'blocked' then return jsonb_build_object('ok', false, 'code', 'pb:share_blocked', 'message', 'Sharing is paused for your company. Contact support.'); end if;
    if v_ok = 'rate' then return jsonb_build_object('ok', false, 'code', 'pb:rate', 'message', 'That''s today''s sharing limit. Try again tomorrow.'); end if;
    perform pb_docs.apply_scope(p_doc, 'shared');
    update pb_docs.provenance set user_choice = 'shared' where doc_id = p_doc;
    return jsonb_build_object('ok', true, 'scope', 'shared');
  end if;
  return jsonb_build_object('ok', false, 'code', 'pb:bad_scope');
end $function$;

CREATE OR REPLACE FUNCTION public.pb_docs_put_pages(p_doc uuid, p_pages jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_n integer := 0; p jsonb; d pb_docs.documents; v_company uuid; v_chars bigint; v_new bigint; v_max integer;
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  -- security_nov22 03: the uploader only while still in the document's company
  select d2.* into d from pb_docs.documents d2 join pb_docs.provenance pv on pv.doc_id = d2.id
    where d2.id = p_doc and pv.user_id = auth.uid() and pb_docs.still_in(pv.company_id, auth.uid()) and d2.state = 'uploading' for update of d2;
  if d.id is null then return jsonb_build_object('ok', false, 'code', 'pb:not_yours'); end if;
  if jsonb_typeof(p_pages) <> 'array' or jsonb_array_length(p_pages) > 100 then return jsonb_build_object('ok', false, 'code', 'pb:bad_pages'); end if;
  select company_id into v_company from pb_docs.provenance where doc_id = p_doc;
  v_max := coalesce(d.pages, 1);
  if exists (select 1 from jsonb_array_elements(p_pages) x where jsonb_typeof(x->'n') <> 'number' or (x->>'n')::numeric <> floor((x->>'n')::numeric) or (x->>'n')::int not between 1 and v_max) then
    return jsonb_build_object('ok', false, 'code', 'pb:bad_page_number', 'max', v_max); end if;
  select coalesce(sum(length(g.text)), 0) into v_chars from pb_docs.pages g where g.doc_id = p_doc and g.n not in (select (x->>'n')::int from jsonb_array_elements(p_pages) x);
  select coalesce(sum(least(length(coalesce(x->>'text', '')), 40000)), 0) into v_new from jsonb_array_elements(p_pages) x;
  if v_chars + v_new > pb_docs.chars_cap(d.bytes, pb_docs.limits_for(v_company)) then return jsonb_build_object('ok', false, 'code', 'pb:too_much_text'); end if;
  if pb_docs.stored_bytes(pb_docs.owner_key(v_company, auth.uid())) + v_new > (pb_docs.limits_for(v_company)->>'bytes_total')::bigint then return jsonb_build_object('ok', false, 'code', 'pb:storage_full'); end if;
  for p in select * from jsonb_array_elements(p_pages) loop
    insert into pb_docs.pages (doc_id, n, text, source) values (p_doc, (p->>'n')::int, left(coalesce(p->>'text', ''), 40000), 'pdf_text')
      on conflict (doc_id, n) do update set text = excluded.text, source = 'pdf_text';
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'pages', v_n);
end $function$;

CREATE OR REPLACE FUNCTION public.pb_plans_remove(p_set uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_s pb_plans.sets; c record; v_found boolean;
begin
  if auth.uid() is null then raise exception 'pb:signed_out'; end if;
  select * into v_s from pb_plans.sets where id = p_set;
  v_found := found;
  select * into c from pb_ai.ctx();
  -- security_nov22 03: the person who added it only while still in the set's company
  if not v_found or not coalesce((v_s.created_by = auth.uid() and pb_docs.still_in(v_s.company_id, auth.uid()))
        or (c.level = 'office' and c.company_id is not null and v_s.company_id is not null and c.company_id = v_s.company_id), false) then
    return jsonb_build_object('ok', false, 'code', 'pb:not_yours', 'message', 'Only the person who added it or the office can remove it.');
  end if;
  update pb_plans.sets set state = 'removed', removed_at = now() where id = p_set;
  return jsonb_build_object('ok', true);
end $function$;

CREATE OR REPLACE FUNCTION pb_plans.can_upload_to(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (select 1 from pb_plans.sets s where s.id::text = split_part(p_name, '/', 1) and s.created_by = auth.uid() and s.state = 'uploading'
    and pb_docs.still_in(s.company_id, auth.uid()))  -- security_nov22 03
$function$;
