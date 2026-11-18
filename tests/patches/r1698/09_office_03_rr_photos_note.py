import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# office2 03: since r16.75 a run's photos go to the company with it and are put back into the office's PDF.
rep("""    let h = '<p class="pbx-note">Last 60 days. Photos stay on the crew’s phone.</p>';""",
    """    let h = '<p class="pbx-note">Last 60 days. Photos come with each report and are in its PDF.</p>'; /* office2 03: r16.75 sends them */""")
open(out, 'w', encoding='utf-8').write(s)
