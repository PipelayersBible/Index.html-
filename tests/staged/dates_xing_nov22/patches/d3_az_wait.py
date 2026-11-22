# dates_xing_nov22 d3: Arizona. The Corporation Commission's 811 page (azcc.gov, read Nov 22 2026): "In Arizona,
# locators have two full working days to respond (that excludes weekends and state holidays...)". Two FULL working
# days after the call: a Monday call can be dug Thursday (the app showed Wednesday). A.R.S. 40-360.22(B): in an
# apartment community or mobile home park the landlord has up to 10 working days to respond (and the inquiry goes by
# certified mail) -> one sentence in the wait text. Working days skip weekends, legal holidays and the 4th Friday of
# November (40-360.21). AZ's Renew-by (2: tell the operators before the marks run out) is not a new notice: unchanged.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
from _sr import SR, write_changes
p = P(); CH = []; sr = SR(p, CH)
ACC = {'what': 'Arizona Corporation Commission, Call Before You Dig: "two full working days to respond"', 'url': 'https://azcc.gov/customer-assistance/call-before-you-dig-(az-811)'}
sr.notice_n('AZ', 2, 3, 'Call at least 2 full working days before digging, not counting the call day: a Monday call can be dug Thursday. Working days skip weekends, legal holidays and the Friday after Thanksgiving. In an apartment community or mobile home park, the landlord has up to 10 working days to mark its own lines: ask the landlord early (by certified mail).', [ACC])
p.save(); write_changes(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'results', 'd3_changes.md'), CH)
