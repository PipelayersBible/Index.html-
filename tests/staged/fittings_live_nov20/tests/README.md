# fittings_live tests

Serve the patched page as `cur.html` with the page before these patches beside it as `base.html` (the "before" pictures),
then, one at a time:

    PB_URL=http://127.0.0.1:10050/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_fl1_today_fittings.js   # light
    DARK=1 PB_URL=... node t_fl1_today_fittings.js                                                                 # dark
    PB_URL=... node t_fl2_phone_status.js

- `t_fl1_today_fittings.js` (office, 1440 and 1280): uses officeview's fake day (`../../officeview_nov20/tests/lib.js`)
  plus fittings on the runs. Pictures go to PB_OUT, or `../shots`. Judge by verdict, not golden (same reason as the
  officeview tests: the fake day's clock).
- `t_fl2_phone_status.js` (phone): a locked run (`../../hunt_nov19/tests/hlib.js`), five fittings put on it, rows marked
  laid; reads what the phone hands to `pb_prod_run_status_put`.
- "No change on phones" is officeview's own `t_ov3_phone_field.js`, run against this page with the r17.11 candidate as
  `base.html`.
- SQL: `../sql/02_test.sql` (see NOTES.md).
