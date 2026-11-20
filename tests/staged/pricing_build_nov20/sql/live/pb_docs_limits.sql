-- Live text read Nov 20 2026 (the live copy has Windows line ends; the numbers are what matter). To undo, run this.
CREATE OR REPLACE FUNCTION pb_docs.limits(p_kind text)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  -- r16.24: company spec books (the Greenbook runs about 700 pages, 2.3 M characters): 1,500 pages and 6 M characters a file, 1 GB in all
  select case when p_kind = 'individual' then '{"bytes_total": 52428800, "file_bytes": 26214400, "file_pages": 200, "ai_pages_month": 100, "uploads_day": 10, "shares_day_owner": 3, "shares_day_user": 3, "chars_doc_max": 1000000, "share_max_pages": 120, "check_usd_month": 5}'::jsonb
              else '{"bytes_total": 1073741824, "file_bytes": 52428800, "file_pages": 1500, "ai_pages_month": 1500, "uploads_day": 30, "shares_day_owner": 20, "shares_day_user": 10, "chars_doc_max": 6000000, "share_max_pages": 120, "check_usd_month": 20}'::jsonb end
$function$;
