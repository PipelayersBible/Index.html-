#!/usr/bin/env python3
# locate_round3_nov20: "Renew by" on the ticket, the Nevada last-extension reminder and gap note, no start lines on a
# renewed ticket, and the state rows the Nov 20 round-3 research confirmed.
# Goes ON TOP of locate_form_nov20/p01_locate_state_rule.py + locate_research_nov20/p02_locate_ren_research.py.
#   python3 p03_locate_renew_by.py in.html out.html     (in = r17.11 candidate + p01 + p02)
# No server change. Georgia's third renewal is NOT touched (Tommy is calling Georgia 811).
import sys, json

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, 'expected once, found %d: %r' % (n, a[:90])
    s = s.replace(a, b)


# ---- 1. the state table: rows confirmed Nov 20 (sources in NOTES.md). The JSON is re-written byte for byte except these rows.
i = s.index('const PB_SR = ') + len('const PB_SR = ')
d, n = json.JSONDecoder().raw_decode(s[i:])
orig = s[i:i + n]
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
assert dump(d) == orig, 'the state table does not round-trip'
S = d['states']
DAY = '2026-11-20'


def row(code, src_add=(), **kw):
    r = S[code]
    for k, v in kw.items():
        assert k in r, k
        r[k] = v
    have = {x['url'] for x in r['sources']}
    r['sources'] = [{'what': w, 'url': u} for (w, u) in src_add if u not in have] + r['sources']
    r['checked'] = DAY


row('AR', [('Ark. Code 14-271-112 (text current to March 2024)', 'https://codes.findlaw.com/ar/title-14-local-government/ar-code-sect-14-271-112/')],
    notice={'n': 2, 'unit': 'wd', 'text': 'Call at least 2 and not more than 10 full working days before digging.'},
    start={'n': 10, 'unit': 'wd', 'text': 'Call no more than 10 working days before work starts.'},
    life={'n': 20, 'unit': 'wd', 'from': 'call', 'text': 'A notice is good for 20 working days from the day it was given.'},
    renew='Not done in 20 working days, or marks gone: give a new notice.',
    note='The law text we read is current to March 2024. We could not confirm Arkansas’s tolerance. Check Arkansas 811.')
row('LA', [('La. R.S. 40:1749.13 (notice)', 'https://legis.la.gov/legis/Law.aspx?d=169744'), ('La. R.S. 40:1749.14 (marks good 20 calendar days)', 'https://legis.la.gov/legis/Law.aspx?d=169745')],
    notice={'n': 3, 'unit': 'wd', 'text': 'Call at least 48 hours and not more than 120 hours ahead, not counting weekends and holidays. The 48 hours start at 7 AM the next working day.'},
    life={'n': 20, 'unit': 'cd', 'from': 'call', 'text': 'Marks are good while visible, but not more than 20 calendar days from the mark-by time. The app counts from the call-in day, so its date can be a little early.'},
    renew='Not done in 20 days, or marks gone: give a new notice.',
    note='We could not confirm Louisiana’s tolerance. Check Louisiana 811.')
row('MO', [('2025 SB 133, section 319.025 (21-day life, in force Aug 28, 2025)', 'https://senate.mo.gov/25info/pdf-bill/SCSfromResearch/SB133.pdf')],
    life={'n': 21, 'unit': 'cd', 'from': 'dig', 'text': 'A notice is good until 11:59 PM, 21 calendar days from the start date (law of Aug 28, 2025). The app counts from the first legal dig day.'},
    renew='Not started within 10 working days: ask for a relocate first. The law does not say how to go on past 21 days: ask Missouri 811.')
row('SD', [('ARSD 20:25:03:05.01 (marks valid 21 days; the One Call Board’s copy)', 'https://boardsandcommissions.sd.gov/bcuploads/Proposed%20Rule%20-%20Update%20Tickets.pdf')],
    life={'n': 21, 'unit': 'cd', 'from': 'dig', 'text': 'Marks are good while clearly visible, but not more than 21 calendar days from the start date on the ticket. The app counts from the first legal dig day.'},
    renew='A ticket can’t be updated more than 90 days after its first start date.',
    note=None)
row('WV', [('WV811 2026 slides (15 business days; extend 48 hours before)', 'https://gowv.com/wp-content/uploads/2026/04/2026_WV-811.pdf')],
    life={'n': 15, 'unit': 'wd', 'from': 'call', 'text': 'A ticket is good for no more than 15 business days.'},
    renew='Extend the ticket at least 48 hours before it expires.')
row('MS', [('Miss. Code 77-13-5 (renew 3 to 4 working days before; text current to Jan 2025)', 'https://codes.findlaw.com/ms/title-77-public-utilities-and-carriers/ms-code-sect-77-13-5/')],
    renew='Update at least 3 working days before it expires (the law’s window: 3 to 4 working days before).')
row('NV', [('NAC 455.165 (28 days, two extensions, then a new notification)', 'https://www.leg.state.nv.us/nac/NAC-455.html')],
    renew='Renew by the end of day 28 if work goes on and marks are still clear. Two renewals at most (84 days), then a new ticket: call it in at least 2 working days before the last renewal runs out. You can keep digging on the old ticket until it runs out.')
row('MD', renew='Repeat the notice before the 12 business days run out.')
row('MI', renew='Past 21 days, get a new ticket. Long jobs: ask MISS DIG 811 for a 180-day ticket.')
row('IA', renew='Past 25 days, request a new ticket.')
new = dump(d)
assert s.count(orig) == 1
s = s.replace(orig, new)

# ---- 2. Renew by: the last day to call so the renewal (or the new ticket) is good before the old one runs out
rep("""  window.__debugLocRen = { rule: pbLocRenRule, exp: pbLocRenExp, table: PB_LOC_REN }; /* tests */
""", """  /* locate_round3: how many working days before expiry the center or the law wants the renewal called in.
     PB_LOC_RB: named by the center/law, or going on means a new notice with the first-call wait (sources: NOTES.md).
     PB_LOC_RB0: the law says "by the end of the last day" / "prior to expiration": no call-ahead, no Renew-by line.
     Any other state with a ticket life and a notice wait: its first-call wait (not confirmed; the earlier date). */
  const PB_LOC_RB = { AL: 2, AR: 2, AZ: 2, CO: 2, DC: 3, GA: 3, IA: 2, ID: 2, IN: 2, KY: 2, LA: 3, MA: 3, MD: 3, ME: 3, MI: 3, MN: 2, MS: 3, NH: 3, NJ: 3, OK: 4, OR: 2, TN: 3, TX: 2, UT: 2, VA: 3, VT: 3, WA: 2, WV: 2 };
  const PB_LOC_RB0 = { CA: 1, HI: 1, NV: 1 }, PB_LOC_LAST_DAYS = 14;
  function pbLocRbCode(code) {
    const has = (o) => Object.prototype.hasOwnProperty.call(o, code), R = pbSrRow(code);
    if (!R || !R.life) return null;
    if (has(PB_LOC_RB)) return { n: PB_LOC_RB[code] };
    if (has(PB_LOC_RB0)) return null;
    return R.notice && R.notice.unit === 'wd' && R.notice.n > 0 ? { n: R.notice.n, est: true } : null;
  }
  const pbLocRenewed = (l) => !!l && (pbLocIsDay(String(l.renewed_at || '').slice(0, 10)) || Number(l.renewals) > 0);
  // a ticket that has used every renewal its state allows (Nevada: two): the only way on is a new ticket
  function pbLocLast(l) { if (!l || l.closed) return false; const U = pbLocRenRule(l); return !!(U.max && Number(l.renewals) >= U.max); }
  // the last working day D on which a call still gives a ticket good BEFORE the expiry day (one working day to spare)
  function pbLocBefore(x, n, code) {
    x = String(x || '').slice(0, 10); if (!pbLocIsDay(x) || !(n > 0)) return '';
    let d = x; for (let g = 0; g < 45; g++) { d = pbLocAddDays(d, -1); if (pbSrWorkDay(d, code, false) && pbSrAddWd(d, n, code, false) < x) return d; }
    return '';
  }
  function pbLocRenewBy(l) {
    if (!l || l.closed) return '';
    const code = pbLocSrOf(l).code, R = pbSrRow(code);
    if (pbLocLast(l)) return R && R.notice && R.notice.n > 0 ? pbLocBefore(l.expires_at, R.notice.n, code) : '';
    const B = pbLocRbCode(code); return B ? pbLocBefore(l.expires_at, B.n, code) : '';
  }
  function pbLocRbLeft(l) { const r = pbLocRenewBy(l); if (!r) return null; const a = pbLocDayMs(r), b = pbLocDayMs(pbTkToday()); return isFinite(a) && isFinite(b) ? Math.round((a - b) / 86400000) : null; }
  // the job's other open tickets (the list on screen, or what the phone holds for the company)
  function pbLocSibs(l) {
    let L = []; const key = (l && (l.job_key || (l.job_number ? pbDlyKey(l.job_number) : ''))) || (pbLoc.job && pbLoc.job.key) || '';
    try { if (pbLoc.job && pbLoc.st && pbLoc.job.key === key) L = pbLocRows(key); } catch (e) { L = []; }
    if (!L.length) { try { L = pbLocMineRows().filter(o => o && pbDlyKey(o.job_number) === key); } catch (e) { L = []; } }
    return L.filter(o => o && !o.closed && o.id !== l.id);
  }
  /* a last-extension ticket: is a new ticket on file, and is there a gap? next: a ticket of the same job called in during
     this one's last 28 days that runs longer. gap: the new ticket (or one called in today) can't be dug on by the day this
     one runs out, so digging stops in between. */
  function pbLocLastInfo(l) {
    if (!pbLocLast(l)) return null;
    const x = String(l.expires_at || '').slice(0, 10), left = pbLocLeft(l); if (!pbLocIsDay(x) || left === null || left < 0) return null;
    const code = pbLocSrOf(l).code, today = pbTkToday(), by = pbLocRenewBy(l), from = pbLocAddDays(x, -28);
    const next = pbLocSibs(l).filter(o => pbLocIsDay(String(o.called_at || '').slice(0, 10)) && String(o.called_at).slice(0, 10) >= from && String(o.expires_at || '').slice(0, 10) > x)
      .map(o => ({ o, dig: pbSrCanDig(o.called_at, code) })).filter(z => z.dig).sort((a, b) => a.dig.localeCompare(b.dig))[0] || null;
    const dig = next ? next.dig : pbSrCanDig(today, code);
    return { x, by, left, next: next ? next.o : null, dig, gap: !!dig && dig > x, late: !next && !!by && today > by };
  }
  function pbLocLastNote(l) {
    const I = pbLocLastInfo(l); if (!I) return null;
    const X = pbLocDayW(I.x), D = pbLocDayW(I.dig), ev = ' Wait for every utility to respond.';
    if (I.next) return I.gap ? { bad: true, text: 'Stop digging when this ticket runs out (' + X + '). New ticket ' + I.next.ticket_no + ' can’t be dug on until ' + D + '.' + ev }
      : { bad: false, text: 'This ticket can’t be renewed again. New ticket ' + I.next.ticket_no + ' is on file, good from ' + D + '. Keep digging on this one until it runs out.' };
    if (I.gap) return { bad: true, text: 'Call in a new ticket now — this ticket can’t be renewed again. A ticket called in today can’t be dug on until ' + D + '. Stop digging when this one runs out (' + X + ') until then.' };
    if (I.late || I.left <= PB_LOC_LAST_DAYS) return { bad: I.late, text: 'Call in a new ticket now — this ticket can’t be renewed again. ' + (I.late ? 'Called in today it is good from ' + D + '.' : 'Latest: ' + pbLocDayW(I.by) + ', or digging stops when this one runs out.') + ' You can keep digging on this one until ' + X + '.' };
    return { bad: false, text: 'This ticket can’t be renewed again. Call in a new ticket by ' + pbLocDayW(I.by) + '. You can keep digging on this one until it runs out.' };
  }
  window.__debugLocRen = { rule: pbLocRenRule, exp: pbLocRenExp, table: PB_LOC_REN, rb: PB_LOC_RB, rb0: PB_LOC_RB0, rbCode: pbLocRbCode, renewBy: pbLocRenewBy, before: pbLocBefore, last: pbLocLast, lastInfo: pbLocLastInfo, lastNote: pbLocLastNote, renewed: pbLocRenewed }; /* tests */
""")

# ---- 3. a renewed ticket has no "Can dig from / Start work by" (they count from the first call-in)
rep("""    const s = pbSrStartBy(c, pbLocSrOf(l).code); return s && pbLocIsDay(x) && x < s ? x : s;""",
    """    if (pbLocRenewed(l)) return ''; /* locate_round3 */
    const s = pbSrStartBy(c, pbLocSrOf(l).code); return s && pbLocIsDay(x) && x < s ? x : s;""")
rep("""    if (cd && today < cd && !(left !== null && left < 0)) return { k: 'early', d: cd, text: 'Not valid until ' + pbLocDayW(cd), lv };
    if (lv) return { k: 'exp', text: pbLocLeftText(l), lv };""",
    """    if (!pbLocRenewed(l) && cd && today < cd && !(left !== null && left < 0)) return { k: 'early', d: cd, text: 'Not valid until ' + pbLocDayW(cd), lv };
    if (lv && left !== null && left > 2) { /* locate_round3: the call-ahead day comes before the expiry */
      const rb = pbLocRenewBy(l), I = pbLocLastInfo(l), w = I ? 'New ticket' : 'Renew';
      if (rb && !(I && I.next)) return { k: 'exp', rb, text: today > rb ? w + ' now · ' + pbLocLeftText(l) : today === rb ? w + ' today' : w + ' by ' + pbLocDayW(rb), lv };
    }
    if (lv) return { k: 'exp', text: pbLocLeftText(l), lv };""")
rep("""    return '<div class="pbloc-dates' + (form ? ' two' : '') + '" id="' + id + 'Dates">' + cell('Can dig from', 'Dig', pbLocCanDig(v.called_at, v)) + cell('Start work by', 'Start', pbLocStartBy(v))
      + (form ? '' : cell('Expires', 'Exp', pbLocIsDay(String(v.expires_at || '').slice(0, 10)) ? String(v.expires_at).slice(0, 10) : '')) + '</div>';""",
    """    const ren = pbLocRenewed(v) || !!(form && pbLoc.form && pbLoc.form.renewed), rb = form ? '' : pbLocRenewBy(v); /* locate_round3 */
    if (form && ren) return '<div id="' + id + 'Dates" hidden></div>';
    const cells = (ren ? '' : cell('Can dig from', 'Dig', pbLocCanDig(v.called_at, v)) + cell('Start work by', 'Start', pbLocStartBy(v)))
      + (rb ? cell(pbLocLast(v) ? 'New ticket by' : 'Renew by', 'Rb', rb) : '')
      + (form ? '' : cell('Expires', 'Exp', pbLocIsDay(String(v.expires_at || '').slice(0, 10)) ? String(v.expires_at).slice(0, 10) : ''));
    return '<div class="pbloc-dates' + (form ? ' two' : rb ? ' four' : '') + '" id="' + id + 'Dates">' + cells + '</div>';""")
rep("""  #pbApp .pbloc-dates.two { grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0 0 8px; }
""", """  #pbApp .pbloc-dates.two { grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0 0 8px; }
  #pbApp .pbloc-dates.four { grid-template-columns: repeat(2, minmax(0, 1fr)); } /* locate_round3: with "Renew by" */
  #pbApp .pbloc-last { margin: 6px 0; font-size: 15px; font-weight: 600; }
""")

# ---- 4. the reminder: it turns on before the Renew-by day; a last-extension ticket two weeks before it runs out
rep("""  function pbLocLevel(l) { const d = pbLocLeft(l); return d === null || l.closed ? '' : d <= 2 ? 'red' : d <= 7 ? 'amber' : ''; } // red: 2 days or less, or expired""",
    """  function pbLocLevel(l) { /* red: 2 days or less, expired, or the Renew-by day is here; amber: 7 days, or 2 days before Renew by (locate_round3) */
    const d = pbLocLeft(l); if (d === null || l.closed) return '';
    if (d <= 2) return 'red';
    const I = pbLocLastInfo(l); if (I && I.next) return I.gap ? 'red' : d <= 7 ? 'amber' : '';
    const r = pbLocRbLeft(l);
    return r !== null && r <= 0 ? 'red' : d <= (I ? PB_LOC_LAST_DAYS : 7) || (r !== null && r <= 2) ? 'amber' : '';
  }""")
rep("""  function pbLocDueText(l) { const d = pbLocLeft(l), x = pbLocDay(l.expires_at); return d === null ? '' :""",
    """  function pbLocDueText(l) { const t = pbLocDueText0(l), d = pbLocLeft(l); if (!t || d === null || d < 0 || l.closed) return t; /* locate_round3: + the call-ahead day */
    const I = pbLocLastInfo(l), rb = pbLocRenewBy(l), today = pbTkToday();
    if (I) return t + (I.next ? (I.gap ? ' — stop digging then until new ticket ' + I.next.ticket_no + ' is good (' + pbLocDay(I.dig) + ')' : '') : I.gap ? ' — call in a new ticket now; stop digging when it runs out until the new one is good' : ' — it can’t be renewed again: call in a new ticket ' + (rb && today < rb ? 'by ' + pbLocDay(rb) : 'now'));
    return rb ? t + ' — renew ' + (today < rb ? 'by ' + pbLocDay(rb) : today === rb ? 'today' : 'now') : t;
  }
  function pbLocDueText0(l) { const d = pbLocLeft(l), x = pbLocDay(l.expires_at); return d === null ? '' :""")
# the Home cards: tickets inside the reminder, not only "7 days or less"
rep("""pbLocLeft(l) !== null && pbLocLeft(l) <= 7 ? { k: 'exp' } : null; };""", """pbLocLevel(l) ? { k: 'exp' } : null; };""")
rep("""const near = all.filter(l => (pbLocLeft(l) !== null && pbLocLeft(l) <= 7) || on28(l))""", """const near = all.filter(l => (pbLocLeft(l) !== null && pbLocLeft(l) <= 7) || !!pbLocLevel(l) || on28(l))""")
rep(""".replace(/ — .*$/, '')""", """.replace(/ — don’t dig.*$/, '')""")
rep("""(gone ? (gone === R.length ? 'expired' : 'expired or expiring') : 'expire within 7 days');""",
    """(gone ? (gone === R.length ? 'expired' : 'expired or expiring') : R.some(o => o.x.left > 7) ? 'need renewing soon' : 'expire within 7 days');""")
rep("""(!allExp ? 'need a look' : gone ? 'expired or expiring' : 'expire within 7 days');""",
    """(!allExp ? 'need a look' : gone ? 'expired or expiring' : L.some(l => pbLocLeft(l) > 7) ? 'need renewing soon' : 'expire within 7 days');""")
rep("""const body = R.length === 1 ? pbProdJobLabel(R[0].l.job_number) + (gone ? '. Don’t dig on it until a new ticket is valid.' : '. Call 811 for a refresh.')""",
    """const body = R.length === 1 ? pbProdJobLabel(R[0].l.job_number) + (gone ? '. Don’t dig on it until a new ticket is valid.' : pbLocLast(R[0].l) ? '. Call 811 for a new ticket.' : '. Call 811 for a refresh.')""")
rep("""gone ? '. Call 811 for a new ticket.' : '. Call 811 for a refresh.')""", """gone || pbLocLast(L[0]) ? '. Call 811 for a new ticket.' : '. Call 811 for a refresh.')""")

# ---- 5. the ticket card: the Nevada last-extension line
rep("""+ (l.note && l.note !== addr ? '<p class="pbd-note">' + escapeHtml(l.note) + '</p>' : '') // the job's own address is in the header already""",
    """+ (function() { const N = l.closed ? null : pbLocLastNote(l); return N ? '<p class="pbloc-last' + (N.bad ? ' pbp-err' : '') + '" id="locLast_' + sid + '"' + (N.bad ? ' role="alert"' : '') + '>' + escapeHtml(N.text) + '</p>' : ''; })() /* locate_round3 */
      + (l.note && l.note !== addr ? '<p class="pbd-note">' + escapeHtml(l.note) + '</p>' : '') // the job's own address is in the header already""")

# ---- 6. the rule sheet says what "Renew by" is
rep("""U.no ? 'The app asks for the new ticket number. The old one stays in History.' : 'The app counts a renewal from the day you renew.';""",
    """U.no ? 'The app asks for the new ticket number. The old one stays in History.' : 'The app counts a renewal from the day you renew.';
    const B = pbLocRbCode(code), by = B ? ' “Renew by” on the ticket is ' + B.n + ' working days before it expires, with one day to spare.' : U.max ? ' After the last renewal the ticket shows “New ticket by”: the last day to call a new one in with no gap.' : '';""")
rep("""escapeHtml([R.renew, app].filter(Boolean).join(' ')), 'renew')""", """escapeHtml([R.renew, app].filter(Boolean).join(' ') + (R.life ? by : '')), 'renew')""")

open(dst, 'w', encoding='utf-8').write(s)
print('ok', len(s))
