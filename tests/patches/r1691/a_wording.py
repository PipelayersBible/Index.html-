import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.91 (owner, Nov 17): in-app lines that said more than is true (legal review W7-W12): the real AI limits, what the
# AI keeps, the admin log's real scope, check shots measured against the app's own tolerance, breaks are not a time
# clock, and the crew notice lists breaks, pipe times and check shots (shown again once, as its content changed).
rep("""\\n\\nAI reading is part of the paid plans, up to 20 requests a day per person.'""",
    """\\n\\nAI reading is part of the paid plans and the beta, with limits per person: company plan 100 requests a day; individual plan 15 stake reads and 5 questions a day, 200 a month; beta 30 a day.'""")
rep("""'Sent to Anthropic to be read. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name so the library can be fixed.'""",
    """'Sent to Anthropic to be read. Ask doesn\\u2019t keep your question, except one it couldn\\u2019t answer or an answer you mark Not right, saved without your name so the library can be fixed. Photos and plan sets you save to a run or a job are kept with that run or job.'""")
rep("""'Sent to Anthropic to be read. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name. Don\\u2019t use AI with confidential job info.'""",
    """'Sent to Anthropic to be read. Ask doesn\\u2019t keep your question, except one it couldn\\u2019t answer or an answer you mark Not right, saved without your name. Photos and plan sets you save to a run or a job are kept with it. Don\\u2019t use AI with confidential job info.'""")
rep("""and sends it with your question to Anthropic. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name.'""",
    """and sends it with your question to Anthropic. Ask doesn\\u2019t keep your question, except one it couldn\\u2019t answer or an answer you mark Not right, saved without your name.'""")
rep("""    const head = 'This log lists every change to your company’s records that didn’t come from someone using the app: changes the app’s operator made directly in the database (for example, to fix a problem), changes made with the server key, and the operator’s admin actions on your account (like changing your plan). Records simply being read are not logged. Started ' + sinceTxt + '.';""",
    """    const head = 'This log lists changes to your company’s main records (runs, production, site log, job items, daily reports, permits and tickets) that didn’t come from someone using the app: changes the app’s operator made directly in the database (for example, to fix a problem), changes made with the server key, and some of the operator’s admin actions on your account (like changing your plan). It doesn’t cover stored photos and files, and records simply being read are not logged. Started ' + sinceTxt + '.';""")
rep("""'No entries: nothing about your company has been changed outside the app.'""", """'No entries: the log shows no change to these records from outside the app.'""")
rep("""so it can’t be quietly rewritten later. '""", """so a later change to a stamped day would show. '""")
rep("""On grade = within ' + (window.PB_CS_TOL || 0.02).toFixed(2) + ' ft. ' + (off ? off + ' shot' + (off === 1 ? ' was' : 's were') + ' off grade.' : 'Every shot was on grade.')""",
    """On grade = within ' + (window.PB_CS_TOL || 0.02).toFixed(2) + ' ft of the target. ' + (off ? off + ' reading' + (off === 1 ? ' was' : 's were') + ' more than ' + (window.PB_CS_TOL || 0.02).toFixed(2) + ' ft from the target.' : 'Every reading entered was within ' + (window.PB_CS_TOL || 0.02).toFixed(2) + ' ft of the target.') + ' Readings are typed in by the crew; the tolerance is the app\\u2019s, not the project\\u2019s.'""")
rep("""break time is left out of the time-per-pipe stats.' });""",
    """break time is left out of the time-per-pipe stats. Not a time-clock or meal-and-rest-period record: breaks taken without the button are not shown.' });""")
rep("""class="pb-help">The run\\u2019s clock is stopped and the grade sheet is hidden until the break ends.""",
    """class="pb-help">The run\\u2019s clock is stopped and the grade sheet is hidden until the break ends. This is for the run\\u2019s stats, not a time clock.""")
rep("""run notes, delays, production and footage, permits and daily reports, and when each was made or changed.""",
    """run notes, delays, breaks taken with the Break button, how long pipes took, check shots, production and footage, permits and daily reports, and when each was made or changed.""")
rep("""ok = localStorage.getItem('pbCrewNotice:' + uid); } catch (e) {} if (ok === '1')""", """ok = localStorage.getItem('pbCrewNotice:' + uid); } catch (e) {} if (ok === '2')""")
rep("""localStorage.setItem('pbCrewNotice:' + uid, '1');""", """localStorage.setItem('pbCrewNotice:' + uid, '2');""")
open(out, 'w', encoding='utf-8').write(s)
