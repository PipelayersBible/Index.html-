#!/usr/bin/env python3
# Checks the website draft says the same numbers as the staged settings and the app patch, and avoids the "not to say" words.
import re, os, sys
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(H)
w = open(f'{R}/website/pricing_section.md').read(); body = w.split('## Not to say')[0]
sql = open(f'{R}/sql/01_pricing_limits.sql').read(); app = open(f'{R}/patches/01_pricing_app.py').read()
fails = 0
def ok(c, m):
    global fails; print(('PASS ' if c else 'FAIL ') + m); fails += 0 if c else 1
ind = int(re.search(r"\('individual_cents', '(\d+)'", sql).group(1)); indy = int(re.search(r"\('individual_year_cents', '(\d+)'", sql).group(1)); sheet = int(re.search(r"\('plan_sheet_cents', '(\d+)'", sql).group(1))
ok(ind == 1500 and indy == 14400 and f'Individual plan — ${ind // 100} a month' in body and f'${indy // 100}, which is ${indy // 1200} a month' in body
   and f'Individual plan ${ind // 100} a month, or ${indy // 100} a year' in body and f'${ind // 100} a month, or ${indy // 100} for a year (${indy // 1200} a month)' in body, 'individual price = the staged settings ($15 a month, $144 a year = $12 a month) in the section, the strip and the FAQ')
ok(sheet == 100 and body.count(f'${sheet // 100} a sheet') >= 2 and 'charged once when the sheet is read' in body and 'normal Ask requests' in body, 'plan reading: $1 a sheet, charged once, questions are Ask requests')
ok(f"n(p.individual_cents, {ind})" in app and f"n(p.individual_year_cents, {indy})" in app and f"n(p.plan_sheet_cents, {sheet})" in app
   and f'<span data-pbp="ind">${ind // 100}</span>' in app and f'<span data-pbp="indyear">${indy // 100}</span>' in app and f'<span data-pbp="sheet">${sheet // 100}</span>' in app, 'the app patch has the same built-in numbers')
ok('Company plan — $99 a month' in body and '$12 a month for each extra person' in body and '5 people' in body, 'company price: $99, 5 people, $12 each extra')
ok('12 months for the price of 10' in body and '$990' in body and '$120 for each extra person' in body, 'company yearly = 10 months, with the dollar figures')
ok(99 + 12 * 1 == 111 and '6 people: $111' in body and f'12 people: ${99 + 12 * 7}' in body and f'25 people: ${99 + 12 * 20}' in body, 'the examples add up (111 / 183 / 339)')
ok('plus applicable tax' in body and 'The company account is free' in body and 'no free plan' in body.lower(), 'tax, free company account, no free plan')
ok('locked for 12 months' in body, 'founder lock')
ok(not re.search(r'unlimited|free forever|contact us for pricing|taxes included', body, re.I), 'none of the "not to say" words in the copy')
m = re.search(r'"member":\s*\{"day": (\d+)', sql); i = re.search(r'"individual": \{"day": (\d+), "month": (\d+)', sql); c = re.search(r'"month_per_person": (\d+)', sql)
ok(f'{m.group(1)} a day' in body and f'{i.group(1)} a day, {i.group(2)} a month' in body and f'shares {c.group(1)} a month' in body, 'the limits quoted = plan_limits()')
ok(f'A person on a company plan: {m.group(1)} a day' in app and f'{i.group(1)} a day, {i.group(2)} a month' in app and f'shares {c.group(1)} a month' in app, 'the app\'s Settings text quotes the same limits')
print('t_website_text: ' + ('%d FAIL' % fails if fails else 'all pass')); sys.exit(1 if fails else 0)
