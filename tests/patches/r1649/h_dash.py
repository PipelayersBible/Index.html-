import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, (s.count(old), old[:90])
    s = s.replace(old, new)
# Company production: the materials key sits with the jobs, not under the header; a job card names its project
rep("""      <p class="pbp-key">Materials: used / ordered / expected</p><!-- clean_b: the lead and the "How % complete" fold are gone; the job page keeps the fold -->
      <p id="pdStatus" class="pb-rpt-status" role="status"></p>
      <div id="pdLive" class="pbp-live"></div><!-- batch 14 F: live now (company account) -->
      <div id="pdSummary" class="pbp-summary"></div>
      <div id="pdJobs" class="pbp-jobs"></div>""", """      <p id="pdStatus" class="pb-rpt-status" role="status"></p>
      <div id="pdLive" class="pbp-live"></div><!-- batch 14 F: live now (company account) -->
      <div id="pdSummary" class="pbp-summary"></div>
      <p class="pbp-key" style="margin-top:12px;">Materials: used / ordered / expected</p><!-- r16.49: with the jobs it describes -->
      <div id="pdJobs" class="pbp-jobs"></div>""")
rep("""escapeHtml(pbProdJobLabel(j.job_number)) + '</span>' + (j.jobsite ? '<span class="pbp-jobsite">' + escapeHtml(j.jobsite) + '</span>' : '') + '</span>' + pbProdOve""",
    """escapeHtml(pbProdJobLabel(j.job_number)) + '</span>' + ((j.project_name || j.jobsite) ? '<span class="pbp-jobsite">' + escapeHtml(j.project_name || j.jobsite) + '</span>' : '') + '</span>' + pbProdOve""")
rep("""(p.state === 'on' ? 'On pace' : 'Over the hours pace')""", """(p.state === 'on' ? 'Hours on budget' : 'Hours over budget')""")
open(out, 'w', encoding='utf-8').write(s)
