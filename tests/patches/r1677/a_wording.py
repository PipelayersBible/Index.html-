import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# r16.77 legal review (Nov 17): wording that promised more than the app does
rep('<p class="pb-ai-privacy" id="aiAskPrivacy">Sent to Anthropic to be read; not stored by the app. Don’t use AI with confidential job info.</p>',
    '<p class="pb-ai-privacy" id="aiAskPrivacy">Sent to Anthropic to be read. The app doesn’t keep it, except a question Ask couldn’t answer or an answer you mark Not right, saved without your name so the library can be fixed. Don’t use AI with confidential job info.</p>')
rep("const PB_AI_PRIVACY_LINE = 'Sent to Anthropic to be read; not stored by the app.';",
    "const PB_AI_PRIVACY_LINE = 'Sent to Anthropic to be read. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name so the library can be fixed.';")
rep("const PB_AI_PRIV_V1 = 'Sent to Anthropic to be read; not stored by the app. Don\\u2019t use AI with confidential job info.';",
    "const PB_AI_PRIV_V1 = 'Sent to Anthropic to be read. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name. Don\\u2019t use AI with confidential job info.';")
rep("sends it with your question to Anthropic; not stored by the app.';",
    "sends it with your question to Anthropic. The app doesn\\u2019t keep it, except a question Ask couldn\\u2019t answer or an answer you mark Not right, saved without your name.';")
rep("The app doesn\\u2019t store it: only a count of how many AI requests you used today.",
    "The app doesn\\u2019t keep the file: only a count of your AI requests and what they cost.")
rep("The app keeps only a count of how many AI requests you used today.",
    "The app keeps a count of your AI requests and what they cost.")
rep("The backed-up copy in your account is kept permanently; this removes it from this phone.",
    "The backed-up copy stays in your company\\u2019s account while the account is open; this removes it from this phone.")
rep("' backed up to your account and kept permanently (photos stay on this phone).'",
    "' backed up to your account and kept while the account is open (photos stay on this phone).'")
rep("They can’t be changed or deleted.' + (L.length > 6",
    "Locked on the server: nobody at your company can change or delete them in the app.' + (L.length > 6")
rep("pbAlert('Matches its fingerprint: this is the original, unchanged.\\n\\nFingerprint '",
    "pbAlert('Matches the fingerprint recorded when it was sealed: this file hasn\\u2019t changed since then.\\n\\nFingerprint '")
rep("Backed-up versions cannot be changed or removed.", "Backed-up versions can\\u2019t be changed or removed in the app.")
rep("The backed-up copy cannot be changed or removed.'", "The backed-up copy can\\u2019t be changed or removed in the app.'")
rep("This captures the fields OSHA/Cal-OSHA require on an entry permit and timestamps everything, to reduce missed steps.",
    "Built around the permit items in federal OSHA 29 CFR 1926.1206, with a time on each entry, to reduce missed steps. Check it against your own written program: Cal/OSHA and your company may require more.")
rep("'Your records are safe. New runs and reports wait on this phone", "'Your records stay in your company\\u2019s account. New runs and reports wait on this phone")
rep("unless it starts a plan. Nothing is lost.';", "unless it starts a plan. Nothing is deleted.';")
rep("Everything else in the app still works offline.',", "Runs, calculators and permits still work offline.',")
rep("sub: 'Plain answers from this app’s Education pages'", "sub: 'Plain answers from the app’s library. Can be wrong.'")
open(out, 'w', encoding='utf-8').write(s); print('ok')
