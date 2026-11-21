# state_audit_nov21/811 Ask cards: how to count the 811 wait (states confirmed in writing), 811 center holidays,
# Oregon 30 days confirmed. Run: python3 build_lib.py   Writes audit811_dig.jsonl (+ report, sql/). Nothing applied.
# The topic matches lib_811_nov20's 'tickets' topic so the cards sit with that state's other 811 cards.
import sys, os
sys.path.insert(0, '/home/claude/index.html-/tests/staged/library_arch_nov20')
from lib_kb import Batch, STATES
OUT = os.path.dirname(os.path.abspath(__file__)); TODAY = '2026-11-20'
TOPIC = '811 tickets: types, ticket life, renewals and updates'
B = Batch('audit811_dig', collection='dig', out_dir=OUT)
def S(id, st, title, text, source, url, ed=None, eff=None, conf='high', sup=None, unc=None, note=None):
    text = ' '.join(text.split())
    B.add(id=id, state=st, tier='core' if len(text) <= 1200 else 'shelf', title=STATES[st] + ' 811: ' + title, topic=TOPIC, text=text,
          source=source, url=url, checked=TODAY, edition=ed, effective=eff, confidence=conf, kind='summary', license='gov-state',
          supersedes=sup, unconfirmed=unc, note=note)

S('dig-mn-wait-1', 'MN', 'when can I dig after I file a ticket (48 hours, the filing day not counted)',
  """Minnesota: wait at least 48 hours before digging, and the 48 hours do not count the day you file the ticket, Saturdays,
  Sundays or holidays (Minn. Stat. 216D.04). Gopher State One Call says the 48 hours begin at 12:01 a.m. on the business day
  after the request. So a ticket filed on a Tuesday can be dug on Friday, and one filed on a Friday can be dug the next
  Wednesday, when there is no holiday in between. File no more than 14 calendar days ahead. The ticket is good for 14
  calendar days from the start date and time printed on it. An Update gets a new ticket number and its own 48-hour wait,
  so send it early enough to keep digging without a gap. Go by the start date and time on your ticket.""",
  'Gopher State One Call web page "when can I dig" (read Nov 20, 2026); Minn. Stat. 216D.04', 'https://gopherstateonecall.org/?p=3558',
  ed='GSOC web page, 2026', conf='medium')
S('dig-ia-wait-1', 'IA', 'when can I dig after I call (the 48 hours start 6 AM the next business day)',
  """Iowa: the law defines the forty-eight-hour wait as beginning at 6:00 a.m. on the next business day after Iowa One Call
  receives the notice, and it skips Saturdays, Sundays and legal holidays (Iowa Code 480.1(6), 480.4). So a notice given on
  a Monday can be dug from 6:00 a.m. Thursday, and one given on a Friday from 6:00 a.m. the next Wednesday, when there is no
  holiday in between. The notice is valid for 25 calendar days beginning on the day the 48-hour period ends. There is no
  renewal: ask for a new ticket before the old one runs out, and it has the same wait.""",
  'Iowa Code 480.1(6) and 480.4 (Iowa Code 2026, chapter 480)', 'https://www.legis.iowa.gov/docs/code//480.pdf', ed='Iowa Code 2026')
S('dig-in-wait-1', 'IN', 'when can I dig after I call (2 full working days, then 7 AM)',
  """Indiana: call at least two full working days and not more than ten calendar days before digging (Ind. Code 8-1-26-16).
  The day you call is not a full working day. Work may start at 7 a.m. on the next working day after the two full working
  days, so a Monday call can be dug from 7 a.m. Thursday when there is no holiday in between. You may start sooner only if
  every operator has posted a positive response. A notice expires at 11:59 p.m. twenty days after it is received.""",
  'Ind. Code 8-1-26-16', 'https://codes.findlaw.com/in/title-8-utilities-and-transportation/in-code-sect-8-1-26-16/', ed='Indiana Code 2026')
S('dig-sd-wait-1', 'SD', 'when can I dig after I call (the 48 hours start 12:01 AM the next day)',
  """South Dakota: give notice at least 48 hours before digging. Under SDCL 49-7A-5 as amended in 2026 (Senate Bill 9), the
  48 hours start at 12:01 a.m. on the day after the notice and skip Saturdays, Sundays and state legal holidays. So a notice
  given on a Monday can be dug Thursday, when there is no holiday in between. Marks are good while clearly visible, but not
  more than 21 calendar days from the start date on the ticket.""",
  'SDCL 49-7A-5 as amended by 2026 Senate Bill 9; ARSD 20:25:03:05.01', 'https://mylrc.sdlegislature.gov/api/Documents/300764.pdf', ed='2026 Session Laws')
S('dig-ok-wait-1', 'OK', 'when can I dig after I call (48 hours, the call day not counted)',
  """Oklahoma: give notice at least 48 hours before digging, not counting the day of the notice, Saturdays, Sundays and legal
  holidays, as the OKIE811 Excavator Guide prints the law. So a notice given on a Monday can be dug Thursday when there is
  no holiday in between. Demolition needs 7 business days. A notice expires 14 calendar days from the excavation start date;
  to keep going, Extend (or Re-Mark if marks are gone) at least 4 business days before it expires.""",
  'OKIE811 Excavator Guide, February 2026 (law text as of Nov 1, 2025), 63 O.S. 142.4 and 142.6', 'https://okie811.org/wp-content/uploads/2026/07/2026-Excavator-Guide-Digital-.pdf',
  ed='February 2026', conf='medium')
S('dig-sc-wait-1', 'SC', 'when can I dig after I call (3 full working days) and SC811 holidays',
  """South Carolina: operators have three full working days to mark, not counting the day you call, so a Monday call can be
  dug Friday when there is no holiday in between. SC811's 2026 holiday list adds days that do not count toward the three
  full working days even though the center is open: Confederate Memorial Day (May 11, 2026), Christmas Eve (December 24)
  and the day after Christmas (observed December 28, 2026); the notice is counted from the next business day. Its other
  2026 holidays are New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day, Independence Day (July 3),
  Labor Day, Veterans Day, Thanksgiving and the day after, and Christmas. Columbus Day and Juneteenth are not on the list.""",
  'SC811 2026 Holidays page (read Nov 20, 2026); SC811 Excavator Manual 2026', 'https://sc811.com/holidays/', ed='2026 holiday list', conf='medium')
S('dig-nv-holidays-1', 'NV', 'which holidays don\'t count as working days for a ticket (USA North 811)',
  """Nevada: working days leave out Saturdays, Sundays and federal or state holidays (NRS 455.105). USA North 811's holiday
  list for Nevada in 2026: New Year's Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day, Juneteenth,
  Independence Day (observed July 3), Labor Day, Nevada Day (the last Friday of October, October 30, 2026), Veterans Day,
  Thanksgiving, Family Day (the Friday after Thanksgiving) and Christmas. Columbus Day is not on the Nevada list. A holiday
  on a Saturday is observed the Friday before; one on a Sunday, the Monday after. Go by the start date on your ticket.""",
  'USA North 811 "List of Holidays" page (read Nov 20, 2026); NRS 455.105', 'https://usanorth811.org/list-of-holidays', ed='2026 holiday list', conf='medium')
S('dig-ut-holidays-1', 'UT', 'which holidays don\'t count for ticket times (Blue Stakes)',
  """Utah: Blue Stakes of Utah 811 treats these 2026 days as closed for all ticket date and time calculations: New Year's
  Day, Martin Luther King Jr. Day, Presidents' Day, Memorial Day, Juneteenth, Independence Day (observed July 3), Pioneer
  Day (July 24), Labor Day, Columbus Day, Veterans Day, Thanksgiving, the day after Thanksgiving, Christmas Eve and
  Christmas. The center is open on Martin Luther King Jr. Day, Juneteenth, Columbus Day and Veterans Day but still counts
  them as closed. Its holiday definition covers the legal holidays in Utah Code 63G-1-301, the Friday after Thanksgiving,
  December 24 and any other day the association observes.""",
  'Blue Stakes of Utah 811, Holiday Closures 2026 (PDF, read Nov 20, 2026)', 'https://bluestakes.org/pdfs/HolidayClosures_2026.pdf', ed='2026', conf='medium')
S('dig-or-tickets-2', 'OR', 'ticket life is 30 days (changed from 45 in 2026), no renewals',
  """Oregon: a locate ticket is good for 30 calendar days. The Oregon Utility Notification Center's 2026 Addendum to the
  Oregon Standards Manual lists the change to OAR 952-001-0010(23), "from 45 days to 30 days," effective January 8, 2026,
  and the center's homeowner page says marks "should no longer be used after 30 days." Older copies of the rule still say
  45. There is no renewal: to keep digging after 30 days, re-notify the center with a new locate request and the normal
  wait of 2 full business days (a request after 5 p.m. counts as the next business day). Do not start more than 10
  business days after the notice without re-notifying. Keep the marks up for the life of the job or of the ticket,
  whichever is shorter. Marks gone: stop and ask for a remark. There is no legal "priority" locate.""",
  '2026 Addendum to the Oregon Standards Manual (OAR 952-001-0010(23), effective Jan 8, 2026); Oregon 811 homeowners page (read Nov 20, 2026)',
  'https://digsafelyoregon.com/homeowners/', ed='2026 Addendum', eff='2026-01-08', conf='medium', sup='dig-or-tickets-1',
  note='lead: also drop "so the current number is not confirmed" from dig-or-overview-1 (lib_811_nov20/tools d*.py)')
if __name__ == '__main__':
    B.write()
    print(len(B.chunks), 'chunks')
