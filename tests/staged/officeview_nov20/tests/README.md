# officeview tests

Serve the patched page as `cur.html` (and the unpatched r17.11 candidate next to it as `base.html` for the before/after
checks in t_ov3), then, one at a time:

    PB_URL=http://127.0.0.1:9700/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_ov1_today.js
    PB_URL=... node t_ov2_records.js
    PB_URL=... node t_ov3_phone_field.js      # ~3 min: 11 page loads

- `lib.js`: the rig (tests/rig boot + co + mgr), the overflow check, and ONE fake company day (`DAY`): two crews
  working, one foreman with nothing sent, an open permit with 2 inside, 2 field tickets, a signed daily with 3 fittings,
  a delay, plus older records for Records. The comment above `DAY` lists the numbers the tests expect.
- The page clock is set to today 2:30 PM (PB_FAKE_NOW, unless the runner already set one), so the fake day's times fall
  on today at any hour. If these are added to run_all.sh, judge them by verdict (not golden): a fixed golden clock early
  in the morning would push some of the fake day's records onto yesterday.
- Screenshots go to PB_OUT, or to ../shots when it is not set.
