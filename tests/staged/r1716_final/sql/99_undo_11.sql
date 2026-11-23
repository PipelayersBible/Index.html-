-- r1716_final undo of 11_join_links_72h.apply.sql: puts back the exact live text of pb_onboard.make_link (24-hour links)
-- saved by pb_sec.guard when 11 ran. Run as postgres. Returns 1 (functions restored); 0 if 11 never ran.
select pb_sec.restore('nov23_11');
