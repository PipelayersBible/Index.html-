import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# offline audit 01 (Nov 17, on r16.95) [medium]: r16.14's "one No signal line per screen" tidy hides every short leaf line
# that starts "No signal." while there is no signal. It was meant for "... loads with signal" placeholders, but it also
# hides lines that carry information:
#  - r16.95 Crew runs today: "No signal. This is the list as of 9:41 PM." and "No signal. Showing the last copy fetched,
#    9:41 PM." (so offline nothing says how old the copy is; the feature's own promise)
#  - the answer to a Save tapped with no signal: "No signal. Nothing was saved; what you typed is still here.",
#    "No signal. Your changes are still here; save again when you have signal." ... (the button looks dead, or done)
# Fix: the tidy leaves a line that says what happened or how old a copy is (the viewer's wording is unchanged, so the
# repo's t124 still matches it). Test: audit/offline/rig/t05_offhide.js (and t04_cv.js to look at it).
rep("""    const PH = /^(loads with signal\\.?|couldn\\u2019t load\\.?|couldn't load\\.?|couldn\\u2019t load crew runs\\.?|active runs and permits load with signal\\.?|sign in with signal to see the latest\\.?|no signal\\..*|loads with signal \\u2014.*)$/i;""",
    """    const PH = /^(loads with signal\\.?|couldn\\u2019t load\\.?|couldn't load\\.?|couldn\\u2019t load crew runs\\.?|active runs and permits load with signal\\.?|sign in with signal to see the latest\\.?|no signal\\.(?!.*(as of|last copy|nothing was|still here|try again|save again|syncs when|wasn\\u2019t sent|was not sent)).*|loads with signal \\u2014.*)$/i; /* offline audit 01: a line that says what happened, or how old a copy is, stays */""")
open(out, 'w', encoding='utf-8').write(s)
